import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentActor, Roles } from '../common/decorators';
import type { Actor } from '../common/decorators';
import { ProductsService } from './products.service';
import { CreateProductDto, ListProductsDto, UpdateProductDto } from './products.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@Query() q: ListProductsDto, @CurrentActor() actor: Actor) {
    return this.products.list(q, actor);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentActor() actor: Actor) {
    return { data: await this.products.findOne(id, actor) };
  }

  @Get(':id/history')
  async history(@Param('id', ParseIntPipe) id: number, @CurrentActor() actor: Actor) {
    return { data: await this.products.history(id, actor) };
  }

  @Post()
  async create(@Body() dto: CreateProductDto, @CurrentActor() actor: Actor) {
    return { data: await this.products.create(dto, actor) };
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto, @CurrentActor() actor: Actor) {
    return { data: await this.products.update(id, dto, actor) };
  }

  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(204)
  archive(@Param('id', ParseIntPipe) id: number, @CurrentActor() actor: Actor) {
    return this.products.archive(id, actor);
  }

  @Roles('ADMIN')
  @Post(':id/restore')
  @HttpCode(200)
  async restore(@Param('id', ParseIntPipe) id: number, @CurrentActor() actor: Actor) {
    return { data: await this.products.restore(id, actor) };
  }
}