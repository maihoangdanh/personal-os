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
import { CreateKpiDto } from './dto/create-kpi.dto';
import { QueryKpiDto } from './dto/query-kpi.dto';
import { UpdateKpiDto } from './dto/update-kpi.dto';
import { KpiService } from './kpi.service';

@Controller('kpis')
export class KpiController {
  constructor(private readonly kpis: KpiService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: QueryKpiDto) {
    return this.kpis.list(user.userId, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateKpiDto) {
    return this.kpis.create(user.userId, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.kpis.get(user.userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateKpiDto,
  ) {
    return this.kpis.update(user.userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.kpis.remove(user.userId, id);
  }
}
