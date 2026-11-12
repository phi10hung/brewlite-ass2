import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { AvailabilityDto } from './dto/availability.dto.js';
import { ProductsService } from './products.service.js';

const parseProductId = new ParseIntPipe({
  exceptionFactory: () => new BadRequestException('Mã món không hợp lệ'),
});

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query('category') category?: string) {
    return this.productsService.findAll(category);
  }

  @Get(':id')
  findOne(@Param('id', parseProductId) id: number) {
    return this.productsService.findOne(id);
  }

  // Chỉ đọc dữ liệu nên trả 200, không cần đăng nhập (giỏ hàng của khách vãng lai cũng dùng)
  @Post('availability')
  @HttpCode(200)
  availability(@Body() dto: AvailabilityDto) {
    return this.productsService.availability(dto);
  }
}
