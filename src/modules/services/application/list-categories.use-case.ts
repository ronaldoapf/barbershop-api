import { Injectable } from '@nestjs/common';
import { ICategoriesRepository } from '../domain/categories.repository.interface';
import { CategoryEntity } from '../domain/category.entity';

@Injectable()
export class ListCategoriesUseCase {
  constructor(private readonly categoriesRepository: ICategoriesRepository) {}
  async execute(): Promise<CategoryEntity[]> {
    return this.categoriesRepository.findAll();
  }
}
