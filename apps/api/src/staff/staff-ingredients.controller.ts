import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { StaffGuard } from '../auth/staff.guard.js';
import { RestockDto } from './dto/restock.dto.js';
import { StaffIngredientsService } from './staff-ingredients.service.js';

const parseIngredientId = new ParseIntPipe({
  exceptionFactory: () =>
    new BadRequestException('Mã nguyên liệu không hợp lệ'),
});

// Chỉ Nhân viên gọi được; khách gọi trả 403 (FR-24, NFR-05)
@Controller('staff/ingredients')
@UseGuards(JwtAuthGuard, StaffGuard)
export class StaffIngredientsController {
  constructor(private readonly ingredients: StaffIngredientsService) {}

  @Get()
  list() {
    return this.ingredients.list();
  }

  // Nhập kho trả 200 kèm tồn kho mới
  @Post(':id/restock')
  @HttpCode(200)
  restock(@Param('id', parseIngredientId) id: number, @Body() dto: RestockDto) {
    return this.ingredients.restock(id, dto.amount);
  }
}
