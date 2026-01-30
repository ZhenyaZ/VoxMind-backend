import { defineConfig } from '@mikro-orm/postgresql';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { KnowledgeItem } from 'src/entities/KnowledgeItem.entity';
import { Users } from 'src/entities/User.entity';
import dotenv from 'dotenv'

dotenv.config();

export default defineConfig({
  driver: PostgreSqlDriver,
  dbName: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PWD,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  entities: [Users, KnowledgeItem],
  entitiesTs: [Users, KnowledgeItem],
  debug: true,
});
