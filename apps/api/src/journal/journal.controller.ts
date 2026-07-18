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
import { CreateJournalDto } from './dto/create-journal.dto';
import { QueryJournalDto } from './dto/query-journal.dto';
import { UpdateJournalDto } from './dto/update-journal.dto';
import { JournalService } from './journal.service';

@Controller('journals')
export class JournalController {
  constructor(private readonly journals: JournalService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: QueryJournalDto) {
    return this.journals.list(user.userId, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateJournalDto) {
    return this.journals.create(user.userId, dto);
  }

  /** Fetch the entry for a specific day (YYYY-MM-DD). Declared before :id. */
  @Get('date/:date')
  getByDate(@CurrentUser() user: AuthUser, @Param('date') date: string) {
    return this.journals.getByDate(user.userId, date);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.journals.get(user.userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJournalDto,
  ) {
    return this.journals.update(user.userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.journals.remove(user.userId, id);
  }
}
