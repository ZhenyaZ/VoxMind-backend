import { Cascade, Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';

import { Users } from './User.entity';

@Entity()
export class ScheduledTasks {
  @PrimaryKey({ type: 'bigint' })
  id: number;

  @ManyToOne(() => Users, { cascade: [Cascade.REMOVE] })
  user: Users;

  @Property()
  taskId: string;
  @Property({ default: 'SCHEDULED' })
  status: string;
  @Property({ type: 'bigint' })
  delay: number;
  @Property()
  message: string;
  @Property({ nullable: true })
  pattern?: string;
  @Property({ default: false })
  repeated?: boolean;
  @Property({ default: false })
  addedByUser?: boolean;
  @Property({ type: 'timestamptz', defaultRaw: 'NOW()', onCreate: () => new Date() })
  createdAt?: Date = new Date();
  @Property({ type: 'timestamptz', defaultRaw: 'NOW()', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
