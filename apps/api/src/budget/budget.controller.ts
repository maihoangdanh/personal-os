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
import { IsOptional, IsString } from 'class-validator';
import { AuthUser } from '../common/auth/auth-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { PaginationQueryDto } from '../common/http/pagination-query.dto';
import { BudgetService } from './budget.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

class QueryBudgetDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  category?: string;
}

@Controller('budgets')
export class BudgetController {
  constructor(private readonly budgets: BudgetService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: QueryBudgetDto) {
    return this.budgets.list(user.userId, q.page, q.pageSize, q.sortOrder, q.category);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBudgetDto) {
    return this.budgets.create(user.userId, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.budgets.get(user.userId, id);
  }

  @Get(':id/status')
  status(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.budgets.status(user.userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgets.update(user.userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.budgets.remove(user.userId, id);
  }
}
