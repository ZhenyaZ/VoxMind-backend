import { Cascade, Entity, ManyToOne, PrimaryKey, Property, Unique } from '@mikro-orm/core';

import { Users } from './User.entity';

@Entity()
export class UserPushToken {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id: string;

  @ManyToOne(() => Users, { cascade: [Cascade.REMOVE] })
  user: Users;

  @Property({ nullable: true })
  @Unique()
  pushToken: string;
  @Property({ nullable: true })
  deviceName: string;
  @Property({ nullable: true })
  deviceId: string;
  @Property({ nullable: true })
  platform: 'android' | 'ios';
  @Property({ type: 'timestamptz', defaultRaw: 'NOW()', onCreate: () => new Date() })
  createdAt?: Date = new Date();
  @Property({ type: 'timestamptz', defaultRaw: 'NOW()', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
