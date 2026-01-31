import { Entity, Enum, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { VectorType } from 'src/types/VectorType';

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

  @Property({ nullable: true })
  tags?: [string];
  @Property({ type: new VectorType(), nullable: true })
  embedding?: number[];
  @Property()
  createdAt: Date = new Date();
}
