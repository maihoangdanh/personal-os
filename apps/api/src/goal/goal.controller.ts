import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AuthUser } from '../common/auth/auth-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { CreateGoalDto } from './dto/create-goal.dto';
import { QueryGoalDto } from './dto/query-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalService } from './goal.service';

@Controller('goals')
export class GoalController {
  constructor(private readonly goals: GoalService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: QueryGoalDto) {
    return this.goals.list(user.userId, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateGoalDto) {
    return this.goals.create(user.userId, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.goals.get(user.userId, id);
  }

  @Get(':id/progress')
  progress(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.goals.getProgress(user.userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.goals.update(user.userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.goals.remove(user.userId, id);
  }
}
