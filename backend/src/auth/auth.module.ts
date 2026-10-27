import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const configuredSecret = config.get<string>('JWT_SECRET');
        if (
          config.get<string>('NODE_ENV') === 'production' &&
          !configuredSecret
        ) {
          throw new Error('JWT_SECRET must be configured in production');
        }

        return {
          secret:
            configuredSecret ??
            'unicen-local-development-secret-change-before-deploy',
          signOptions: { expiresIn: '1h' },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
