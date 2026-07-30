import { Injectable } from '@nestjs/common';
import type { Attribute, AttributeValue } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { notDeleted } from '../../prisma/soft-delete.util';

@Injectable()
export class AttributesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.attribute.findMany({
      where: notDeleted(),
      orderBy: { name: 'asc' },
      include: { values: { where: notDeleted(), orderBy: { value: 'asc' } } },
    });
  }

  findById(id: string) {
    return this.prisma.attribute.findFirst({
      where: notDeleted({ id }),
      include: { values: { where: notDeleted(), orderBy: { value: 'asc' } } },
    });
  }

  findByName(name: string) {
    return this.prisma.attribute.findFirst({ where: notDeleted({ name }) });
  }

  create(name: string): Promise<Attribute> {
    return this.prisma.attribute.create({ data: { name } });
  }

  update(id: string, name: string): Promise<Attribute> {
    return this.prisma.attribute.update({ where: { id }, data: { name } });
  }

  softDelete(id: string): Promise<Attribute> {
    return this.prisma.attribute.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  findValueById(id: string) {
    return this.prisma.attributeValue.findFirst({ where: notDeleted({ id }) });
  }

  findValueByAttributeAndValue(attributeId: string, value: string) {
    return this.prisma.attributeValue.findFirst({
      where: notDeleted({ attributeId, value }),
    });
  }

  createValue(
    attributeId: string,
    value: string,
    swatchHex?: string,
  ): Promise<AttributeValue> {
    return this.prisma.attributeValue.create({
      data: { attributeId, value, swatchHex },
    });
  }

  updateValue(
    id: string,
    data: { value?: string; swatchHex?: string },
  ): Promise<AttributeValue> {
    return this.prisma.attributeValue.update({ where: { id }, data });
  }

  softDeleteValue(id: string): Promise<AttributeValue> {
    return this.prisma.attributeValue.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
