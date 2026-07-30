import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtConfigService } from '../../config/services/jwt-config.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [JwtConfigService],
      useFactory: (jwtConfig: JwtConfigService) => ({
        privateKey: jwtConfig.accessPrivateKey,
        publicKey: jwtConfig.accessPublicKey,
        signOptions: {
          algorithm: 'RS256',
          expiresIn: jwtConfig.accessTtlSeconds,
          issuer: jwtConfig.issuer,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, JwtStrategy],
  exports: [AuthRepository],
})
export class AuthModule {}
