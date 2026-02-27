import { defineConfig, p } from '@mikro-orm/postgresql';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { KnowledgeItem } from 'src/entities/KnowledgeItem.entity';
import { Users } from 'src/entities/User.entity';
import dotenv from 'dotenv'
import { UserPushToken } from 'src/entities/UserPushToken.entity';
import { ScheduledTasks } from 'src/entities/ScheduledTask.entity';

dotenv.config();

export default defineConfig({
  driver: PostgreSqlDriver,
  dbName: process.env.ENV === 'prod' ? process.env.DB_NAME_PROD : process.env.DB_NAME,
  user: process.env.ENV === 'prod' ? process.env.DB_USER_PROD : process.env.DB_USER,
  password: process.env.ENV === 'prod' ? process.env.DB_PWD_PROD : process.env.DB_PWD,
  host: process.env.ENV === 'prod' ? process.env.DB_HOST_PROD : process.env.DB_HOST_DEV,
  clientUrl: process.env.ENV === 'prod' ? process.env.DB_PROD_URL : undefined,
  port: Number(process.env.DB_PORT),
  entities: [Users, KnowledgeItem, UserPushToken, ScheduledTasks],
  entitiesTs: [Users, KnowledgeItem, UserPushToken, ScheduledTasks],
  debug: process.env.ENV !== 'prod',
});
