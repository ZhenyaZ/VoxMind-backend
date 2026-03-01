import { MikroOrmModule } from '@mikro-orm/nestjs';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import jwtConfig from 'src/auth/config/jwt.config';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { Users } from 'src/entities/User.entity';
import { UserPushToken } from 'src/entities/UserPushToken.entity';
import { ReminderModule } from 'src/reminder/reminder.module';

import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([Users, UserPushToken]),
    ConfigModule.forFeature(jwtConfig),
    forwardRef(() => ReminderModule),
  ],
  controllers: [UserController],
  providers: [UserService, JwtAuthGuard],
  exports: [UserService],
})
export class UserModule {}
