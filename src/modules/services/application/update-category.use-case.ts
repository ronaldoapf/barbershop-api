import { Injectable, NotFoundException } from '@nestjs/common';
import { ICategoriesRepository } from '../domain/categories.repository.interface';
import { CategoryEntity } from '../domain/category.entity';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@Injectable()
export class UpdateCategoryUseCase {
  constructor(private readonly categoriesRepository: ICategoriesRepository) {}
  async execute(id: string, dto: UpdateCategoryDto): Promise<CategoryEntity> {
    const existing = await this.categoriesRepository.findById(id);
    if (!existing) throw new NotFoundException('Categoria não encontrada');
    return this.categoriesRepository.update(id, dto);
  }
}
