import { CategoryEntity } from './category.entity';

export abstract class ICategoriesRepository {
  abstract create(data: { name: string; order: number }): Promise<CategoryEntity>;
  abstract findById(id: string): Promise<CategoryEntity | null>;
  abstract findAll(): Promise<CategoryEntity[]>;
  abstract update(id: string, data: Partial<{ name: string; order: number }>): Promise<CategoryEntity>;
  abstract softDelete(id: string): Promise<void>;
}
