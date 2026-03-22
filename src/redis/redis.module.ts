import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS } from './redis.constants';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProd = configService.get<string>('ENV') === 'prod';

        const redisUrl = isProd ? configService.get<string>('REDIS_URL_PROD') : configService.get<string>('REDIS_URL_DEV');

        if (!redisUrl) {
          throw new Error('Redis URL is not defined');
        }

        const redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          lazyConnect: false,
        });

        redis.on('connect', () => {
          console.log('Redis connected');
        });

        redis.on('error', (err) => {
          console.error('Redis error:', err);
        });

        return redis;
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
