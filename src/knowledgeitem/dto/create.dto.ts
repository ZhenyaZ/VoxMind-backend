import { IsArray, IsBoolean, IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { Users } from 'src/entities/User.entity';
import { Tag } from 'src/voice/nlp.service';
export default class CreateKnowledgeItemDto {
  user: Users;
  @IsEnum(['reminder', 'fact'])
  type: 'reminder' | 'fact';
  @IsString()
  subject: string;
  @IsString()
  content: string;
  @IsOptional()
  location?: string;
  @IsBoolean()
  isQuestion: boolean;
  @IsDate()
  @IsOptional()
  dueDate?: Date;
  @IsArray()
  @IsOptional()
  tags?: Tag[];
  embedding?: number[];
}
