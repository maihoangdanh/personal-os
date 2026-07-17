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
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { QueryMilestoneDto } from './dto/query-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { MilestoneService } from './milestone.service';

@Controller('milestones')
export class MilestoneController {
  constructor(private readonly milestones: MilestoneService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: QueryMilestoneDto) {
    return this.milestones.list(user.userId, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateMilestoneDto) {
    return this.milestones.create(user.userId, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.milestones.get(user.userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.milestones.update(user.userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.milestones.remove(user.userId, id);
  }
}
