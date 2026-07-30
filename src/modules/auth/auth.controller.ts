import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../../decorators/public.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { AppConfigService } from '../../config/services/app-config.service';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { AuthService, TokenPair } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { OtpRequestDto } from './dto/otp-request.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';

const REFRESH_COOKIE_NAME = 'refreshToken';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly appConfig: AppConfigService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Create a customer account and send a verification email',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate and receive an access token + refresh cookie',
  })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const pair = await this.authService.login(
      dto,
      req.ip ?? 'unknown',
      req.headers['user-agent'],
    );
    this.setRefreshCookie(res, pair);
    return { accessToken: pair.accessToken, user: pair.user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate the refresh token and issue a new access token',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = (req.cookies as Record<string, string> | undefined)?.[
      REFRESH_COOKIE_NAME
    ];
    if (!raw) {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: this.cookiePath() });
      return { accessToken: null };
    }
    const pair = await this.authService.refresh(
      raw,
      req.ip ?? 'unknown',
      req.headers['user-agent'],
    );
    this.setRefreshCookie(res, pair);
    return { accessToken: pair.accessToken, user: pair.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Revoke the current session (refresh token family)',
  })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const raw = (req.cookies as Record<string, string> | undefined)?.[
      REFRESH_COOKIE_NAME
    ];
    await this.authService.logout(raw);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: this.cookiePath() });
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Send a password reset link if the email is registered',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Consume a reset token and set a new password' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.authService.resetPassword(dto);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Consume an email verification token' })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<void> {
    await this.authService.verifyEmail(dto);
  }

  @Public()
  @Post('otp/request')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Issue a one-time code to a phone number' })
  async requestOtp(@Body() dto: OtpRequestDto): Promise<void> {
    await this.authService.requestOtp(dto);
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a one-time code' })
  verifyOtp(@Body() dto: OtpVerifyDto) {
    return this.authService.verifyOtp(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Current user's profile and resolved permissions" })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.id);
  }

  private setRefreshCookie(res: Response, pair: TokenPair): void {
    res.cookie(REFRESH_COOKIE_NAME, pair.refreshToken, {
      httpOnly: true,
      secure: this.appConfig.isProduction,
      sameSite: 'strict',
      expires: pair.refreshTokenExpiresAt,
      path: this.cookiePath(),
    });
  }

  // Root-scoped, not narrowed to /api/v1/auth: the frontend's Next.js middleware needs to see
  // this cookie on ordinary page navigations (e.g. GET /account) to gate protected routes —
  // a cookie scoped to the auth API path would never be attached to those requests at all.
  // Production runs frontend+backend behind one Nginx origin (docs/20-DOCKER-DEPLOYMENT.md),
  // where this is the only path scoping that works for both the API calls and the page loads.
  private cookiePath(): string {
    return '/';
  }
}
