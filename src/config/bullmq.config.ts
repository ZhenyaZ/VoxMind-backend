import { BullModule } from '@nestjs/bullmq';

export const BullMQConfig = BullModule.forRoot({
  connection: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  },
});
