import { Users } from 'src/entities/User.entity';

export default class SearchKnowledgeItemDto {
  user: Users;
  subject: string;
}
