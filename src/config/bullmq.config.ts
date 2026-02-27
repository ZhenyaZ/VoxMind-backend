import { BullModule } from '@nestjs/bullmq';

export const BullMQConfig = BullModule.forRoot({
  connection: {
    url: process.env.ENV === 'prod' ? process.env.REDIS_URL_PROD : undefined,
    port: Number(process.env.REDIS_PORT),
  },
});
