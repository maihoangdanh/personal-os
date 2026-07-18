import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { AuthUser } from '../common/auth/auth-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { AiChatService } from './ai-chat.service';
import { AiClassifyService } from './ai-classify.service';
import { AiForecastService } from './ai-forecast.service';
import { AiPlanningService } from './ai-planning.service';
import { AiSummaryService } from './ai-summary.service';
import {
  CreateConversationDto,
  ListConversationsDto,
  SendMessageDto,
} from './dto/chat.dto';
import { ClassifyTaskDto } from './dto/classify.dto';
import { PlanScheduleDto } from './dto/planning.dto';
import { GenerateSummaryDto, ListSummaryDto } from './dto/summary.dto';

@Controller('ai')
export class AiController {
  constructor(
    private readonly chat: AiChatService,
    private readonly summary: AiSummaryService,
    private readonly classify: AiClassifyService,
    private readonly planning: AiPlanningService,
    private readonly forecast: AiForecastService,
  ) {}

  // ---- Feature 1: AI Chat ----

  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  createConversation(@CurrentUser() user: AuthUser, @Body() dto: CreateConversationDto) {
    return this.chat.createConversation(user.userId, dto);
  }

  @Get('conversations')
  listConversations(@CurrentUser() user: AuthUser, @Query() query: ListConversationsDto) {
    return this.chat.listConversations(user.userId, query);
  }

  @Get('conversations/:id')
  getConversation(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chat.getConversation(user.userId, id);
  }

  @Delete('conversations/:id')
  deleteConversation(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chat.deleteConversation(user.userId, id);
  }

  @Post('conversations/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  sendMessage(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chat.sendMessage(user.userId, id, dto);
  }

  // ---- Feature 2: Daily/Weekly/Monthly summary ----

  @Post('summaries')
  @HttpCode(HttpStatus.CREATED)
  generateSummary(@CurrentUser() user: AuthUser, @Body() dto: GenerateSummaryDto) {
    return this.summary.generate(user.userId, dto);
  }

  @Get('summaries')
  listSummaries(@CurrentUser() user: AuthUser, @Query() query: ListSummaryDto) {
    return this.summary.list(user.userId, query);
  }

  // ---- Feature 3: Eisenhower classification ----

  @Post('classify-task')
  @HttpCode(HttpStatus.OK)
  classifyTask(@Body() dto: ClassifyTaskDto) {
    return this.classify.classify(dto);
  }

  // ---- Feature 4: Smart schedule ----

  @Post('plan-schedule')
  @HttpCode(HttpStatus.OK)
  planSchedule(@CurrentUser() user: AuthUser, @Body() dto: PlanScheduleDto) {
    return this.planning.plan(user.userId, dto);
  }

  // ---- Feature 5: KPI/finance forecast ----

  @Get('forecast')
  getForecast(@CurrentUser() user: AuthUser) {
    return this.forecast.forecast(user.userId);
  }
}
