import { Entity, Enum, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';

import { Users } from './User.entity';

@Entity()
export class KnowledgeItem {
  @PrimaryKey()
  id: number;

  @ManyToOne(() => Users)
  user: Users;

  @Enum(() => ['reminder', 'fact'])
  type: 'reminder' | 'fact';

  @Property()
  subject: string;

  @Property()
  content: string;

  @Property({ nullable: true })
  location?: string;

  @Property()
  isQuestion: boolean;

  @Property({ nullable: true })
  dueDate?: Date;

  @Property()
  createdAt: Date = new Date();
}
