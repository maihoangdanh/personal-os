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
import { PaginationQueryDto } from '../common/http/pagination-query.dto';
import { CreateVisionDto } from './dto/create-vision.dto';
import { UpdateVisionDto } from './dto/update-vision.dto';
import { VisionService } from './vision.service';

@Controller('visions')
export class VisionController {
  constructor(private readonly visions: VisionService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: PaginationQueryDto) {
    return this.visions.list(user.userId, q.page, q.pageSize, q.sortOrder);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateVisionDto) {
    return this.visions.create(user.userId, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.visions.get(user.userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVisionDto,
  ) {
    return this.visions.update(user.userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.visions.remove(user.userId, id);
  }
}
