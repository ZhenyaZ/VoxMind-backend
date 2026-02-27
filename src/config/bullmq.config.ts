import { BullModule } from '@nestjs/bullmq';

export const BullMQConfig = BullModule.forRoot({
  connection: {
    host: process.env.ENV === 'prod' ? process.env.REDIS_HOST_PROD : process.env.REDIS_HOST_DEV,
    port: Number(process.env.REDIS_PORT),
  },
});
