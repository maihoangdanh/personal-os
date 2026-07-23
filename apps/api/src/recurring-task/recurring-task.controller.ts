import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { AuthUser } from '../common/auth/auth-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { CreateRecurringTaskDto } from './dto/create-recurring-task.dto';
import { RecurringTaskService } from './recurring-task.service';

@Controller('recurring-tasks')
export class RecurringTaskController {
  constructor(private readonly service: RecurringTaskService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRecurringTaskDto) {
    return this.service.create(user.userId, dto);
  }

  /** Action-style endpoint (khớp convention /tasks/:id/complete đã có) thay vì PATCH chung. */
  @Post(':id/stop')
  @HttpCode(HttpStatus.OK)
  stop(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.stop(user.userId, id);
  }
}
