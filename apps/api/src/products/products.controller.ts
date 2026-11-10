import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
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
}
