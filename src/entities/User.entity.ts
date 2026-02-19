import { Collection, Entity, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';

import { KnowledgeItem } from './KnowledgeItem.entity';
import { ScheduledTasks } from './ScheduledTask.entity';
import { UserPushToken } from './UserPushToken.entity';

@Entity()
export class Users {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id: string;

  @Property({ unique: true })
  email: string;
  @Property()
  name: string;
  @Property()
  password: string;
  @Property({ nullable: false, default: 'en-EN' })
  locale: string;
  @Property({ nullable: false, default: 'Europe/Berlin' })
  timezone: string;
  @Property({ nullable: true })
  provider?: string;

  @Property({ nullable: true })
  providerId?: string;

  @Property({ nullable: true })
  profilePictureUrl?: string;
  @Property({ type: 'timestamptz', onCreate: () => new Date() })
  createdAt?: Date = new Date();
  @Property({ type: 'timestamptz', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  @OneToMany(() => KnowledgeItem, (knowledgeItem) => knowledgeItem.user, { orphanRemoval: true })
  knowledgeItems = new Collection<KnowledgeItem>(this);
  @OneToMany(() => UserPushToken, (UserPushToken) => UserPushToken.user, { orphanRemoval: true })
  userPushTokens = new Collection<UserPushToken>(this);
  @OneToMany(() => ScheduledTasks, (ScheduledTasks) => ScheduledTasks.user, { orphanRemoval: true })
  scheduledTasks = new Collection<ScheduledTasks>(this);
}
