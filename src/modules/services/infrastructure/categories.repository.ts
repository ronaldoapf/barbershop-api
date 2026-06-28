import { Injectable } from '@nestjs/common';
import { Category } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { ICategoriesRepository } from '../domain/categories.repository.interface';
import { CategoryEntity } from '../domain/category.entity';

@Injectable()
export class CategoriesRepository implements ICategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string; order: number }): Promise<CategoryEntity> {
    return this.toEntity(await this.prisma.category.create({ data }));
  }

  async findById(id: string): Promise<CategoryEntity | null> {
    const r = await this.prisma.category.findFirst({ where: { id, disabledAt: null } });
    return r ? this.toEntity(r) : null;
  }

  async findAll(): Promise<CategoryEntity[]> {
    const records = await this.prisma.category.findMany({ where: { disabledAt: null }, orderBy: { order: 'asc' } });
    return records.map((r) => this.toEntity(r));
  }

  async update(id: string, data: Partial<{ name: string; order: number }>): Promise<CategoryEntity> {
    return this.toEntity(await this.prisma.category.update({ where: { id }, data }));
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.category.update({ where: { id }, data: { disabledAt: new Date() } });
  }

  private toEntity(r: Category): CategoryEntity {
    const e = new CategoryEntity();
    e.id = r.id; e.name = r.name; e.order = r.order; e.createdAt = r.createdAt; e.disabledAt = r.disabledAt;
    return e;
  }
}
