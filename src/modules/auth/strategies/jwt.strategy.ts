import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtConfigService } from '../../../config/services/jwt-config.service';
import { AuthRepository } from '../auth.repository';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.interface';

interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    jwtConfig: JwtConfigService,
    private readonly authRepository: AuthRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.accessPublicKey,
      algorithms: ['RS256'],
      issuer: jwtConfig.issuer,
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    const user = await this.authRepository.findAuthableUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User no longer exists or is inactive');
    }
    return { id: user.id, email: user.email, role: user.role };
  }
}
