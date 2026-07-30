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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../decorators/public.decorator';
import { Permissions } from '../../decorators/permissions.decorator';
import { AttributesService } from './attributes.service';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import {
  CreateAttributeValueDto,
  UpdateAttributeValueDto,
} from './dto/attribute-value.dto';

@ApiTags('attributes')
@Controller('attributes')
export class AttributesController {
  constructor(private readonly attributesService: AttributesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List attributes with their values' })
  list() {
    return this.attributesService.list();
  }

  @Post()
  @Permissions('attributes.create')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an attribute (e.g. Size, Color)' })
  create(@Body() dto: CreateAttributeDto) {
    return this.attributesService.create(dto);
  }

  @Patch(':id')
  @Permissions('attributes.update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rename an attribute' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAttributeDto,
  ) {
    return this.attributesService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('attributes.delete')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete an attribute' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.attributesService.remove(id);
  }

  @Post(':id/values')
  @Permissions('attributes.create')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add a value to an attribute (e.g. "XL" under Size)',
  })
  addValue(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAttributeValueDto,
  ) {
    return this.attributesService.addValue(id, dto);
  }

  @Patch(':id/values/:valueId')
  @Permissions('attributes.update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an attribute value' })
  updateValue(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('valueId', ParseUUIDPipe) valueId: string,
    @Body() dto: UpdateAttributeValueDto,
  ) {
    return this.attributesService.updateValue(id, valueId, dto);
  }

  @Delete(':id/values/:valueId')
  @Permissions('attributes.delete')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an attribute value' })
  async removeValue(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('valueId', ParseUUIDPipe) valueId: string,
  ): Promise<void> {
    await this.attributesService.removeValue(id, valueId);
  }
}
