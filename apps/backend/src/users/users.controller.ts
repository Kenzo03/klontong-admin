import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { CurrentActor, Roles } from '../common/decorators';
import type { Actor } from '../common/decorators';
import { UsersService } from './users.service';
import { ListUsersDto, UpdateUserDto } from './users.dto';

@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Query() q: ListUsersDto) {
    return this.users.list(q);
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto, @CurrentActor() actor: Actor) {
    return { data: await this.users.update(id, dto, actor) };
  }
}