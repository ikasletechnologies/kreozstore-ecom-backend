import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttributesRepository } from './attributes.repository';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import {
  CreateAttributeValueDto,
  UpdateAttributeValueDto,
} from './dto/attribute-value.dto';

@Injectable()
export class AttributesService {
  constructor(private readonly attributesRepository: AttributesRepository) {}

  list() {
    return this.attributesRepository.findAll();
  }

  async create(dto: CreateAttributeDto) {
    const existing = await this.attributesRepository.findByName(dto.name);
    if (existing)
      throw new ConflictException('An attribute with this name already exists');
    return this.attributesRepository.create(dto.name);
  }

  async update(id: string, dto: UpdateAttributeDto) {
    const existing = await this.attributesRepository.findById(id);
    if (!existing) throw new NotFoundException('Attribute not found');

    if (dto.name !== existing.name) {
      const clash = await this.attributesRepository.findByName(dto.name);
      if (clash)
        throw new ConflictException(
          'An attribute with this name already exists',
        );
    }
    return this.attributesRepository.update(id, dto.name);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.attributesRepository.findById(id);
    if (!existing) throw new NotFoundException('Attribute not found');
    await this.attributesRepository.softDelete(id);
  }

  async addValue(attributeId: string, dto: CreateAttributeValueDto) {
    const attribute = await this.attributesRepository.findById(attributeId);
    if (!attribute) throw new NotFoundException('Attribute not found');

    const clash = await this.attributesRepository.findValueByAttributeAndValue(
      attributeId,
      dto.value,
    );
    if (clash)
      throw new ConflictException(
        'This value already exists for the attribute',
      );

    return this.attributesRepository.createValue(
      attributeId,
      dto.value,
      dto.swatchHex,
    );
  }

  async updateValue(
    attributeId: string,
    valueId: string,
    dto: UpdateAttributeValueDto,
  ) {
    const value = await this.attributesRepository.findValueById(valueId);
    if (!value || value.attributeId !== attributeId) {
      throw new NotFoundException('Attribute value not found');
    }

    if (dto.value && dto.value !== value.value) {
      const clash =
        await this.attributesRepository.findValueByAttributeAndValue(
          attributeId,
          dto.value,
        );
      if (clash)
        throw new ConflictException(
          'This value already exists for the attribute',
        );
    }

    return this.attributesRepository.updateValue(valueId, dto);
  }

  async removeValue(attributeId: string, valueId: string): Promise<void> {
    const value = await this.attributesRepository.findValueById(valueId);
    if (!value || value.attributeId !== attributeId) {
      throw new NotFoundException('Attribute value not found');
    }
    await this.attributesRepository.softDeleteValue(valueId);
  }
}
