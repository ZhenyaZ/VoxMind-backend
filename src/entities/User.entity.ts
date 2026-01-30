import { Collection, Entity, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';

import { KnowledgeItem } from './KnowledgeItem.entity';

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
  @Property({ nullable: true })
  provider?: string;

  @Property({ nullable: true })
  providerId?: string;

  @Property({ nullable: true })
  profilePictureUrl?: string;
  @OneToMany(() => KnowledgeItem, (knowledgeItem) => knowledgeItem.user)
  knowledgeItems = new Collection<KnowledgeItem>(this);
}
