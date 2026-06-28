import { Injectable, NotFoundException } from '@nestjs/common';
import { ICategoriesRepository } from '../domain/categories.repository.interface';

@Injectable()
export class DeleteCategoryUseCase {
  constructor(private readonly categoriesRepository: ICategoriesRepository) {}
  async execute(id: string): Promise<void> {
    const existing = await this.categoriesRepository.findById(id);
    if (!existing) throw new NotFoundException('Categoria não encontrada');
    await this.categoriesRepository.softDelete(id);
  }
}
