import { BullModule } from '@nestjs/bullmq';

export const BullMQConfig = BullModule.forRoot({
  connection: {
    // host: process.env.ENV === 'prod' ? process.env.REDIS_HOST_PROD : process.env.REDIS_HOST_DEV,
    username: process.env.ENV === 'prod' ? process.env.REDIS_USER_PROD : '',
    password: process.env.ENV === 'prod' ? process.env.REDIS_PWD_PROD : '',
    url: process.env.ENV === 'prod' ? process.env.REDIS_URL_PROD : undefined,
    port: Number(process.env.REDIS_PORT),
  },
});
