import { Injectable } from '@nestjs/common';
import { ICategoriesRepository } from '../domain/categories.repository.interface';
import { CategoryEntity } from '../domain/category.entity';
import { CreateCategoryDto } from '../dto/create-category.dto';

@Injectable()
export class CreateCategoryUseCase {
  constructor(private readonly categoriesRepository: ICategoriesRepository) {}
  async execute(dto: CreateCategoryDto): Promise<CategoryEntity> {
    return this.categoriesRepository.create(dto);
  }
}
