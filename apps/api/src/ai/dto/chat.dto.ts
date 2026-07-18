import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';

export class CreateConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
}

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;
}

export class ListConversationsDto extends PaginationQueryDto {}
