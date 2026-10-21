import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    return { data: await this.prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }) };
  }
}