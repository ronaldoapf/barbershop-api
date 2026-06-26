# Barbershop API — Service Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the complete service catalog — categories, services (with status toggle and ordering), and packages (bundles with their own price and point values).

**Architecture:** Single NestJS module `services` owns CategoryEntity, ServiceEntity, PackageEntity and their repositories. All catalog endpoints are public for reads; writes are owner-only.

**Tech Stack:** NestJS 11, Prisma 7, class-validator, @nestjs/swagger

**Prerequisite:** Plan 1 (Foundation) and Plan 2 (Auth & Users) must be complete.

## Global Constraints

- Package manager: npm only
- All source code in English; user-facing messages in pt-BR
- Soft deletes: reads filter `disabledAt: null`
- Never read `process.env` directly; prices in integer cents

---

## File Structure

```
src/modules/services/
  application/
    create-category.use-case.ts + spec
    update-category.use-case.ts + spec
    delete-category.use-case.ts + spec
    list-categories.use-case.ts + spec
    create-service.use-case.ts + spec
    update-service.use-case.ts + spec
    delete-service.use-case.ts + spec
    list-services.use-case.ts + spec
    toggle-service-status.use-case.ts + spec
    create-package.use-case.ts + spec
    update-package.use-case.ts + spec
    delete-package.use-case.ts + spec
    list-packages.use-case.ts + spec
    toggle-package-status.use-case.ts + spec
  domain/
    category.entity.ts
    service.entity.ts
    item-status.enum.ts
    package.entity.ts
    categories.repository.interface.ts
    services.repository.interface.ts
    packages.repository.interface.ts
  dto/
    create-category.dto.ts
    update-category.dto.ts
    category-response.dto.ts
    create-service.dto.ts
    update-service.dto.ts
    service-response.dto.ts
    list-services-query.dto.ts
    create-package.dto.ts
    update-package.dto.ts
    package-response.dto.ts
  infrastructure/
    categories.repository.ts
    services.repository.ts
    packages.repository.ts
    services.controller.ts
    services.module.ts
```

---

### Task 1: Domain — Entities, Enums & Repository Interfaces

**Files:** All `domain/` files listed above

**Interfaces:**
- Produces: `CategoryEntity`, `ServiceEntity`, `PackageEntity`, `ItemStatus`, `ICategoriesRepository`, `IServicesRepository`, `IPackagesRepository`

- [ ] **Step 1: Create `src/modules/services/domain/item-status.enum.ts`**

```typescript
export enum ItemStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}
```

- [ ] **Step 2: Create `src/modules/services/domain/category.entity.ts`**

```typescript
export class CategoryEntity {
  id: string;
  name: string;
  order: number;
  createdAt: Date;
  disabledAt: Date | null;
}
```

- [ ] **Step 3: Create `src/modules/services/domain/service.entity.ts`**

```typescript
import { ItemStatus } from './item-status.enum';

export class ServiceEntity {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number;
  status: ItemStatus;
  order: number;
  pointsEarned: number;
  pointsRequired: number;
  createdAt: Date;
  disabledAt: Date | null;
}
```

- [ ] **Step 4: Create `src/modules/services/domain/package.entity.ts`**

```typescript
import { ItemStatus } from './item-status.enum';
import { ServiceEntity } from './service.entity';

export class PackageEntity {
  id: string;
  name: string;
  description: string | null;
  price: number;
  status: ItemStatus;
  order: number;
  pointsEarned: number;
  pointsRequired: number;
  services: ServiceEntity[];
  createdAt: Date;
  disabledAt: Date | null;
}
```

- [ ] **Step 5: Create `src/modules/services/domain/categories.repository.interface.ts`**

```typescript
import { CategoryEntity } from './category.entity';

export abstract class ICategoriesRepository {
  abstract create(data: { name: string; order: number }): Promise<CategoryEntity>;
  abstract findById(id: string): Promise<CategoryEntity | null>;
  abstract findAll(): Promise<CategoryEntity[]>;
  abstract update(id: string, data: Partial<{ name: string; order: number }>): Promise<CategoryEntity>;
  abstract softDelete(id: string): Promise<void>;
}
```

- [ ] **Step 6: Create `src/modules/services/domain/services.repository.interface.ts`**

```typescript
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { ServiceEntity } from './service.entity';
import { ItemStatus } from './item-status.enum';

export abstract class IServicesRepository {
  abstract create(data: {
    categoryId: string | null;
    name: string;
    description: string | null;
    price: number;
    durationMinutes: number;
    order: number;
    pointsEarned: number;
    pointsRequired: number;
  }): Promise<ServiceEntity>;
  abstract findById(id: string): Promise<ServiceEntity | null>;
  abstract findAll(params: { categoryId?: string; status?: ItemStatus; page: number; limit: number }): Promise<PaginatedResult<ServiceEntity>>;
  abstract update(id: string, data: Partial<Omit<ServiceEntity, 'id' | 'createdAt' | 'disabledAt'>>): Promise<ServiceEntity>;
  abstract updateStatus(id: string, status: ItemStatus): Promise<ServiceEntity>;
  abstract softDelete(id: string): Promise<void>;
}
```

- [ ] **Step 7: Create `src/modules/services/domain/packages.repository.interface.ts`**

```typescript
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { PackageEntity } from './package.entity';
import { ItemStatus } from './item-status.enum';

export abstract class IPackagesRepository {
  abstract create(data: {
    name: string;
    description: string | null;
    price: number;
    order: number;
    pointsEarned: number;
    pointsRequired: number;
    serviceIds: string[];
  }): Promise<PackageEntity>;
  abstract findById(id: string): Promise<PackageEntity | null>;
  abstract findAll(params: { page: number; limit: number }): Promise<PaginatedResult<PackageEntity>>;
  abstract update(id: string, data: Partial<{ name: string; description: string | null; price: number; order: number; pointsEarned: number; pointsRequired: number; serviceIds: string[] }>): Promise<PackageEntity>;
  abstract updateStatus(id: string, status: ItemStatus): Promise<PackageEntity>;
  abstract softDelete(id: string): Promise<void>;
}
```

- [ ] **Step 8: Commit**

```bash
git add src/modules/services/domain/
git commit -m "feat(services): add domain entities and repository interfaces"
```

---

### Task 2: DTOs

**Files:** All `dto/` files

- [ ] **Step 1: Create category DTOs**

`src/modules/services/dto/create-category.dto.ts`:
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) order: number;
}
```

`src/modules/services/dto/update-category.dto.ts`:
```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) order?: number;
}
```

`src/modules/services/dto/category-response.dto.ts`:
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { CategoryEntity } from '../domain/category.entity';

export class CategoryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() order: number;
  @ApiProperty() createdAt: Date;
}

export function toCategoryResponseDto(e: CategoryEntity): CategoryResponseDto {
  return { id: e.id, name: e.name, order: e.order, createdAt: e.createdAt };
}
```

- [ ] **Step 2: Create service DTOs**

`src/modules/services/dto/create-service.dto.ts`:
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateServiceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ description: 'Price in cents' }) @IsInt() @Min(0) price: number;
  @ApiProperty() @IsInt() @Min(1) durationMinutes: number;
  @ApiProperty() @IsInt() @Min(0) order: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) pointsEarned?: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) pointsRequired?: number;
}
```

`src/modules/services/dto/update-service.dto.ts`:
```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateServiceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) price?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) durationMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) order?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) pointsEarned?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) pointsRequired?: number;
}
```

`src/modules/services/dto/service-response.dto.ts`:
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItemStatus } from '../domain/item-status.enum';
import { ServiceEntity } from '../domain/service.entity';

export class ServiceResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional() categoryId: string | null;
  @ApiProperty() name: string;
  @ApiPropertyOptional() description: string | null;
  @ApiProperty() price: number;
  @ApiProperty() durationMinutes: number;
  @ApiProperty({ enum: ItemStatus }) status: ItemStatus;
  @ApiProperty() order: number;
  @ApiProperty() pointsEarned: number;
  @ApiProperty() pointsRequired: number;
  @ApiProperty() createdAt: Date;
}

export function toServiceResponseDto(e: ServiceEntity): ServiceResponseDto {
  return { id: e.id, categoryId: e.categoryId, name: e.name, description: e.description, price: e.price, durationMinutes: e.durationMinutes, status: e.status, order: e.order, pointsEarned: e.pointsEarned, pointsRequired: e.pointsRequired, createdAt: e.createdAt };
}
```

- [ ] **Step 3: Create package DTOs**

`src/modules/services/dto/create-package.dto.ts`:
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreatePackageDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ description: 'Price in cents' }) @IsInt() @Min(0) price: number;
  @ApiProperty() @IsInt() @Min(0) order: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) pointsEarned?: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) pointsRequired?: number;
  @ApiProperty({ type: [String] }) @IsArray() @IsUUID('4', { each: true }) serviceIds: string[];
}
```

`src/modules/services/dto/update-package.dto.ts`:
```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class UpdatePackageDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) price?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) order?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) pointsEarned?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) pointsRequired?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsUUID('4', { each: true }) serviceIds?: string[];
}
```

`src/modules/services/dto/package-response.dto.ts`:
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItemStatus } from '../domain/item-status.enum';
import { PackageEntity } from '../domain/package.entity';
import { ServiceResponseDto, toServiceResponseDto } from './service-response.dto';

export class PackageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() description: string | null;
  @ApiProperty() price: number;
  @ApiProperty({ enum: ItemStatus }) status: ItemStatus;
  @ApiProperty() order: number;
  @ApiProperty() pointsEarned: number;
  @ApiProperty() pointsRequired: number;
  @ApiProperty({ type: [ServiceResponseDto] }) services: ServiceResponseDto[];
  @ApiProperty() createdAt: Date;
}

export function toPackageResponseDto(e: PackageEntity): PackageResponseDto {
  return { id: e.id, name: e.name, description: e.description, price: e.price, status: e.status, order: e.order, pointsEarned: e.pointsEarned, pointsRequired: e.pointsRequired, services: e.services.map(toServiceResponseDto), createdAt: e.createdAt };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/services/dto/
git commit -m "feat(services): add catalog DTOs"
```

---

### Task 3: Use Cases — Categories

**Files:** Category use cases + specs

**Interfaces:**
- Consumes: `ICategoriesRepository`
- Produces: `CreateCategoryUseCase`, `UpdateCategoryUseCase`, `DeleteCategoryUseCase`, `ListCategoriesUseCase`

- [ ] **Step 1: Write failing tests for CreateCategoryUseCase**

`src/modules/services/application/create-category.use-case.spec.ts`:
```typescript
import { CreateCategoryUseCase } from './create-category.use-case';
import { ICategoriesRepository } from '../domain/categories.repository.interface';
import { CategoryEntity } from '../domain/category.entity';

const mockRepo = (): jest.Mocked<ICategoriesRepository> => ({
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
});

describe('CreateCategoryUseCase', () => {
  it('creates and returns category', async () => {
    const repo = mockRepo();
    const expected = { id: '1', name: 'Hair', order: 1 } as CategoryEntity;
    repo.create.mockResolvedValue(expected);
    const result = await new CreateCategoryUseCase(repo).execute({ name: 'Hair', order: 1 });
    expect(repo.create).toHaveBeenCalledWith({ name: 'Hair', order: 1 });
    expect(result).toBe(expected);
  });
});
```

- [ ] **Step 2: Implement all category use cases**

`src/modules/services/application/create-category.use-case.ts`:
```typescript
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
```

`src/modules/services/application/update-category.use-case.ts`:
```typescript
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
```

`src/modules/services/application/delete-category.use-case.ts`:
```typescript
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
```

`src/modules/services/application/list-categories.use-case.ts`:
```typescript
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
```

- [ ] **Step 3: Run category tests**

```bash
npx jest src/modules/services/application/create-category.use-case.spec.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/modules/services/application/
git commit -m "feat(services): add category use cases"
```

---

### Task 4: Use Cases — Services & Packages

**Files:** Service and package use cases + specs

**Interfaces:**
- Consumes: `IServicesRepository`, `IPackagesRepository`
- Produces: all service and package use cases

- [ ] **Step 1: Implement service use cases**

`src/modules/services/application/create-service.use-case.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { IServicesRepository } from '../domain/services.repository.interface';
import { ServiceEntity } from '../domain/service.entity';
import { CreateServiceDto } from '../dto/create-service.dto';

@Injectable()
export class CreateServiceUseCase {
  constructor(private readonly servicesRepository: IServicesRepository) {}
  async execute(dto: CreateServiceDto): Promise<ServiceEntity> {
    return this.servicesRepository.create({
      categoryId: dto.categoryId ?? null,
      name: dto.name,
      description: dto.description ?? null,
      price: dto.price,
      durationMinutes: dto.durationMinutes,
      order: dto.order,
      pointsEarned: dto.pointsEarned ?? 0,
      pointsRequired: dto.pointsRequired ?? 0,
    });
  }
}
```

`src/modules/services/application/update-service.use-case.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { IServicesRepository } from '../domain/services.repository.interface';
import { ServiceEntity } from '../domain/service.entity';
import { UpdateServiceDto } from '../dto/update-service.dto';

@Injectable()
export class UpdateServiceUseCase {
  constructor(private readonly servicesRepository: IServicesRepository) {}
  async execute(id: string, dto: UpdateServiceDto): Promise<ServiceEntity> {
    const existing = await this.servicesRepository.findById(id);
    if (!existing) throw new NotFoundException('Serviço não encontrado');
    return this.servicesRepository.update(id, dto);
  }
}
```

`src/modules/services/application/delete-service.use-case.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { IServicesRepository } from '../domain/services.repository.interface';

@Injectable()
export class DeleteServiceUseCase {
  constructor(private readonly servicesRepository: IServicesRepository) {}
  async execute(id: string): Promise<void> {
    const existing = await this.servicesRepository.findById(id);
    if (!existing) throw new NotFoundException('Serviço não encontrado');
    await this.servicesRepository.softDelete(id);
  }
}
```

`src/modules/services/application/list-services.use-case.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { IServicesRepository } from '../domain/services.repository.interface';
import { ItemStatus } from '../domain/item-status.enum';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { ServiceEntity } from '../domain/service.entity';

@Injectable()
export class ListServicesUseCase {
  constructor(private readonly servicesRepository: IServicesRepository) {}
  async execute(params: { categoryId?: string; status?: ItemStatus; page: number; limit: number }): Promise<PaginatedResult<ServiceEntity>> {
    return this.servicesRepository.findAll(params);
  }
}
```

`src/modules/services/application/toggle-service-status.use-case.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { IServicesRepository } from '../domain/services.repository.interface';
import { ServiceEntity } from '../domain/service.entity';
import { ItemStatus } from '../domain/item-status.enum';

@Injectable()
export class ToggleServiceStatusUseCase {
  constructor(private readonly servicesRepository: IServicesRepository) {}
  async execute(id: string): Promise<ServiceEntity> {
    const service = await this.servicesRepository.findById(id);
    if (!service) throw new NotFoundException('Serviço não encontrado');
    const next = service.status === ItemStatus.ACTIVE ? ItemStatus.INACTIVE : ItemStatus.ACTIVE;
    return this.servicesRepository.updateStatus(id, next);
  }
}
```

- [ ] **Step 2: Write and implement package use cases**

`src/modules/services/application/create-package.use-case.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { IPackagesRepository } from '../domain/packages.repository.interface';
import { PackageEntity } from '../domain/package.entity';
import { CreatePackageDto } from '../dto/create-package.dto';

@Injectable()
export class CreatePackageUseCase {
  constructor(private readonly packagesRepository: IPackagesRepository) {}
  async execute(dto: CreatePackageDto): Promise<PackageEntity> {
    return this.packagesRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      price: dto.price,
      order: dto.order,
      pointsEarned: dto.pointsEarned ?? 0,
      pointsRequired: dto.pointsRequired ?? 0,
      serviceIds: dto.serviceIds,
    });
  }
}
```

`src/modules/services/application/update-package.use-case.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { IPackagesRepository } from '../domain/packages.repository.interface';
import { PackageEntity } from '../domain/package.entity';
import { UpdatePackageDto } from '../dto/update-package.dto';

@Injectable()
export class UpdatePackageUseCase {
  constructor(private readonly packagesRepository: IPackagesRepository) {}
  async execute(id: string, dto: UpdatePackageDto): Promise<PackageEntity> {
    const existing = await this.packagesRepository.findById(id);
    if (!existing) throw new NotFoundException('Pacote não encontrado');
    return this.packagesRepository.update(id, dto);
  }
}
```

`src/modules/services/application/delete-package.use-case.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { IPackagesRepository } from '../domain/packages.repository.interface';

@Injectable()
export class DeletePackageUseCase {
  constructor(private readonly packagesRepository: IPackagesRepository) {}
  async execute(id: string): Promise<void> {
    const existing = await this.packagesRepository.findById(id);
    if (!existing) throw new NotFoundException('Pacote não encontrado');
    await this.packagesRepository.softDelete(id);
  }
}
```

`src/modules/services/application/list-packages.use-case.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { IPackagesRepository } from '../domain/packages.repository.interface';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { PackageEntity } from '../domain/package.entity';

@Injectable()
export class ListPackagesUseCase {
  constructor(private readonly packagesRepository: IPackagesRepository) {}
  async execute(params: { page: number; limit: number }): Promise<PaginatedResult<PackageEntity>> {
    return this.packagesRepository.findAll(params);
  }
}
```

`src/modules/services/application/toggle-package-status.use-case.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { IPackagesRepository } from '../domain/packages.repository.interface';
import { PackageEntity } from '../domain/package.entity';
import { ItemStatus } from '../domain/item-status.enum';

@Injectable()
export class TogglePackageStatusUseCase {
  constructor(private readonly packagesRepository: IPackagesRepository) {}
  async execute(id: string): Promise<PackageEntity> {
    const pkg = await this.packagesRepository.findById(id);
    if (!pkg) throw new NotFoundException('Pacote não encontrado');
    const next = pkg.status === ItemStatus.ACTIVE ? ItemStatus.INACTIVE : ItemStatus.ACTIVE;
    return this.packagesRepository.updateStatus(id, next);
  }
}
```

- [ ] **Step 3: Run all use case tests**

```bash
npx jest src/modules/services/application/ --no-coverage
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/modules/services/application/
git commit -m "feat(services): add service and package use cases"
```

---

### Task 5: Infrastructure — Repositories, Controller & Module

**Files:** All `infrastructure/` files

- [ ] **Step 1: Create `src/modules/services/infrastructure/categories.repository.ts`**

```typescript
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
```

- [ ] **Step 2: Create `src/modules/services/infrastructure/services.repository.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { Prisma, Service } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { IServicesRepository } from '../domain/services.repository.interface';
import { ServiceEntity } from '../domain/service.entity';
import { ItemStatus } from '../domain/item-status.enum';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { PaginationHelper } from '../../../shared/application/pagination.helper';

@Injectable()
export class ServicesRepository implements IServicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { categoryId: string | null; name: string; description: string | null; price: number; durationMinutes: number; order: number; pointsEarned: number; pointsRequired: number }): Promise<ServiceEntity> {
    return this.toEntity(await this.prisma.service.create({ data }));
  }

  async findById(id: string): Promise<ServiceEntity | null> {
    const r = await this.prisma.service.findFirst({ where: { id, disabledAt: null } });
    return r ? this.toEntity(r) : null;
  }

  async findAll(params: { categoryId?: string; status?: ItemStatus; page: number; limit: number }): Promise<PaginatedResult<ServiceEntity>> {
    const { skip, take } = PaginationHelper.getSkipTake(params.page, params.limit);
    const where: Prisma.ServiceWhereInput = { disabledAt: null };
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.status) where.status = params.status;

    const [records, total] = await this.prisma.$transaction([
      this.prisma.service.findMany({ where, skip, take, orderBy: { order: 'asc' } }),
      this.prisma.service.count({ where }),
    ]);
    return { data: records.map((r) => this.toEntity(r)), total, page: params.page, limit: params.limit };
  }

  async update(id: string, data: Partial<Omit<ServiceEntity, 'id' | 'createdAt' | 'disabledAt'>>): Promise<ServiceEntity> {
    return this.toEntity(await this.prisma.service.update({ where: { id }, data }));
  }

  async updateStatus(id: string, status: ItemStatus): Promise<ServiceEntity> {
    return this.toEntity(await this.prisma.service.update({ where: { id }, data: { status } }));
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.service.update({ where: { id }, data: { disabledAt: new Date() } });
  }

  private toEntity(r: Service): ServiceEntity {
    const e = new ServiceEntity();
    e.id = r.id; e.categoryId = r.categoryId; e.name = r.name; e.description = r.description;
    e.price = r.price; e.durationMinutes = r.durationMinutes; e.status = r.status as ItemStatus;
    e.order = r.order; e.pointsEarned = r.pointsEarned; e.pointsRequired = r.pointsRequired;
    e.createdAt = r.createdAt; e.disabledAt = r.disabledAt;
    return e;
  }
}
```

- [ ] **Step 3: Create `src/modules/services/infrastructure/packages.repository.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { Package, Service } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { IPackagesRepository } from '../domain/packages.repository.interface';
import { PackageEntity } from '../domain/package.entity';
import { ServiceEntity } from '../domain/service.entity';
import { ItemStatus } from '../domain/item-status.enum';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { PaginationHelper } from '../../../shared/application/pagination.helper';

type PackageWithServices = Package & { packageServices: Array<{ service: Service }> };

@Injectable()
export class PackagesRepository implements IPackagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string; description: string | null; price: number; order: number; pointsEarned: number; pointsRequired: number; serviceIds: string[] }): Promise<PackageEntity> {
    const { serviceIds, ...rest } = data;
    const record = await this.prisma.package.create({
      data: {
        ...rest,
        packageServices: { create: serviceIds.map((serviceId) => ({ serviceId })) },
      },
      include: { packageServices: { include: { service: true } } },
    });
    return this.toEntity(record);
  }

  async findById(id: string): Promise<PackageEntity | null> {
    const r = await this.prisma.package.findFirst({
      where: { id, disabledAt: null },
      include: { packageServices: { include: { service: true } } },
    });
    return r ? this.toEntity(r) : null;
  }

  async findAll(params: { page: number; limit: number }): Promise<PaginatedResult<PackageEntity>> {
    const { skip, take } = PaginationHelper.getSkipTake(params.page, params.limit);
    const where = { disabledAt: null };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.package.findMany({ where, skip, take, orderBy: { order: 'asc' }, include: { packageServices: { include: { service: true } } } }),
      this.prisma.package.count({ where }),
    ]);
    return { data: records.map((r) => this.toEntity(r)), total, page: params.page, limit: params.limit };
  }

  async update(id: string, data: Partial<{ name: string; description: string | null; price: number; order: number; pointsEarned: number; pointsRequired: number; serviceIds: string[] }>): Promise<PackageEntity> {
    const { serviceIds, ...rest } = data;
    const updateData: Record<string, unknown> = { ...rest };
    if (serviceIds) {
      await this.prisma.packageService.deleteMany({ where: { packageId: id } });
      updateData.packageServices = { create: serviceIds.map((serviceId) => ({ serviceId })) };
    }
    const record = await this.prisma.package.update({ where: { id }, data: updateData, include: { packageServices: { include: { service: true } } } });
    return this.toEntity(record);
  }

  async updateStatus(id: string, status: ItemStatus): Promise<PackageEntity> {
    const record = await this.prisma.package.update({ where: { id }, data: { status }, include: { packageServices: { include: { service: true } } } });
    return this.toEntity(record);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.package.update({ where: { id }, data: { disabledAt: new Date() } });
  }

  private toEntity(r: PackageWithServices): PackageEntity {
    const e = new PackageEntity();
    e.id = r.id; e.name = r.name; e.description = r.description; e.price = r.price;
    e.status = r.status as ItemStatus; e.order = r.order; e.pointsEarned = r.pointsEarned;
    e.pointsRequired = r.pointsRequired; e.createdAt = r.createdAt; e.disabledAt = r.disabledAt;
    e.services = r.packageServices.map(({ service: s }) => {
      const se = new ServiceEntity();
      se.id = s.id; se.categoryId = s.categoryId; se.name = s.name; se.description = s.description;
      se.price = s.price; se.durationMinutes = s.durationMinutes; se.status = s.status as ItemStatus;
      se.order = s.order; se.pointsEarned = s.pointsEarned; se.pointsRequired = s.pointsRequired;
      se.createdAt = s.createdAt; se.disabledAt = s.disabledAt;
      return se;
    });
    return e;
  }
}
```

- [ ] **Step 4: Create `src/modules/services/infrastructure/services.controller.ts`**

```typescript
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../../shared/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { UserRole } from '../../users/domain/user-role.enum';
import { PaginationQueryDto } from '../../../shared/application/pagination-query.dto';
import { CreateCategoryUseCase } from '../application/create-category.use-case';
import { UpdateCategoryUseCase } from '../application/update-category.use-case';
import { DeleteCategoryUseCase } from '../application/delete-category.use-case';
import { ListCategoriesUseCase } from '../application/list-categories.use-case';
import { CreateServiceUseCase } from '../application/create-service.use-case';
import { UpdateServiceUseCase } from '../application/update-service.use-case';
import { DeleteServiceUseCase } from '../application/delete-service.use-case';
import { ListServicesUseCase } from '../application/list-services.use-case';
import { ToggleServiceStatusUseCase } from '../application/toggle-service-status.use-case';
import { CreatePackageUseCase } from '../application/create-package.use-case';
import { UpdatePackageUseCase } from '../application/update-package.use-case';
import { DeletePackageUseCase } from '../application/delete-package.use-case';
import { ListPackagesUseCase } from '../application/list-packages.use-case';
import { TogglePackageStatusUseCase } from '../application/toggle-package-status.use-case';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CreateServiceDto } from '../dto/create-service.dto';
import { UpdateServiceDto } from '../dto/update-service.dto';
import { CreatePackageDto } from '../dto/create-package.dto';
import { UpdatePackageDto } from '../dto/update-package.dto';
import { CategoryResponseDto, toCategoryResponseDto } from '../dto/category-response.dto';
import { ServiceResponseDto, toServiceResponseDto } from '../dto/service-response.dto';
import { PackageResponseDto, toPackageResponseDto } from '../dto/package-response.dto';
import { ItemStatus } from '../domain/item-status.enum';

@ApiTags('catalog')
@Controller()
export class ServicesController {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly deleteCategoryUseCase: DeleteCategoryUseCase,
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly createServiceUseCase: CreateServiceUseCase,
    private readonly updateServiceUseCase: UpdateServiceUseCase,
    private readonly deleteServiceUseCase: DeleteServiceUseCase,
    private readonly listServicesUseCase: ListServicesUseCase,
    private readonly toggleServiceStatusUseCase: ToggleServiceStatusUseCase,
    private readonly createPackageUseCase: CreatePackageUseCase,
    private readonly updatePackageUseCase: UpdatePackageUseCase,
    private readonly deletePackageUseCase: DeletePackageUseCase,
    private readonly listPackagesUseCase: ListPackagesUseCase,
    private readonly togglePackageStatusUseCase: TogglePackageStatusUseCase,
  ) {}

  // --- Categories ---
  @Get('categories')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List all categories' })
  @ApiResponse({ status: 200, type: [CategoryResponseDto] })
  async listCategories(): Promise<CategoryResponseDto[]> {
    return (await this.listCategoriesUseCase.execute()).map(toCategoryResponseDto);
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create category' })
  @ApiResponse({ status: 201, type: CategoryResponseDto })
  async createCategory(@Body() dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    return toCategoryResponseDto(await this.createCategoryUseCase.execute(dto));
  }

  @Patch('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category' })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    return toCategoryResponseDto(await this.updateCategoryUseCase.execute(id, dto));
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete category' })
  @ApiResponse({ status: 200 })
  async deleteCategory(@Param('id') id: string): Promise<void> {
    await this.deleteCategoryUseCase.execute(id);
  }

  // --- Services ---
  @Get('services')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List services' })
  @ApiResponse({ status: 200 })
  async listServices(@Query() query: PaginationQueryDto & { categoryId?: string; status?: ItemStatus }) {
    const result = await this.listServicesUseCase.execute({ categoryId: query.categoryId, status: query.status, page: query.page, limit: query.limit });
    return { ...result, data: result.data.map(toServiceResponseDto) };
  }

  @Post('services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create service' })
  @ApiResponse({ status: 201, type: ServiceResponseDto })
  async createService(@Body() dto: CreateServiceDto): Promise<ServiceResponseDto> {
    return toServiceResponseDto(await this.createServiceUseCase.execute(dto));
  }

  @Patch('services/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update service' })
  @ApiResponse({ status: 200, type: ServiceResponseDto })
  async updateService(@Param('id') id: string, @Body() dto: UpdateServiceDto): Promise<ServiceResponseDto> {
    return toServiceResponseDto(await this.updateServiceUseCase.execute(id, dto));
  }

  @Patch('services/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle service ACTIVE/INACTIVE' })
  @ApiResponse({ status: 200, type: ServiceResponseDto })
  async toggleServiceStatus(@Param('id') id: string): Promise<ServiceResponseDto> {
    return toServiceResponseDto(await this.toggleServiceStatusUseCase.execute(id));
  }

  @Delete('services/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete service' })
  @ApiResponse({ status: 200 })
  async deleteService(@Param('id') id: string): Promise<void> {
    await this.deleteServiceUseCase.execute(id);
  }

  // --- Packages ---
  @Get('packages')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List packages' })
  @ApiResponse({ status: 200 })
  async listPackages(@Query() query: PaginationQueryDto) {
    const result = await this.listPackagesUseCase.execute({ page: query.page, limit: query.limit });
    return { ...result, data: result.data.map(toPackageResponseDto) };
  }

  @Post('packages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create package' })
  @ApiResponse({ status: 201, type: PackageResponseDto })
  async createPackage(@Body() dto: CreatePackageDto): Promise<PackageResponseDto> {
    return toPackageResponseDto(await this.createPackageUseCase.execute(dto));
  }

  @Patch('packages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update package' })
  @ApiResponse({ status: 200, type: PackageResponseDto })
  async updatePackage(@Param('id') id: string, @Body() dto: UpdatePackageDto): Promise<PackageResponseDto> {
    return toPackageResponseDto(await this.updatePackageUseCase.execute(id, dto));
  }

  @Patch('packages/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle package ACTIVE/INACTIVE' })
  @ApiResponse({ status: 200, type: PackageResponseDto })
  async togglePackageStatus(@Param('id') id: string): Promise<PackageResponseDto> {
    return toPackageResponseDto(await this.togglePackageStatusUseCase.execute(id));
  }

  @Delete('packages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete package' })
  @ApiResponse({ status: 200 })
  async deletePackage(@Param('id') id: string): Promise<void> {
    await this.deletePackageUseCase.execute(id);
  }
}
```

- [ ] **Step 5: Create `src/modules/services/infrastructure/services.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { ICategoriesRepository } from '../domain/categories.repository.interface';
import { IServicesRepository } from '../domain/services.repository.interface';
import { IPackagesRepository } from '../domain/packages.repository.interface';
import { CategoriesRepository } from './categories.repository';
import { ServicesRepository } from './services.repository';
import { PackagesRepository } from './packages.repository';
import { ServicesController } from './services.controller';
import { CreateCategoryUseCase } from '../application/create-category.use-case';
import { UpdateCategoryUseCase } from '../application/update-category.use-case';
import { DeleteCategoryUseCase } from '../application/delete-category.use-case';
import { ListCategoriesUseCase } from '../application/list-categories.use-case';
import { CreateServiceUseCase } from '../application/create-service.use-case';
import { UpdateServiceUseCase } from '../application/update-service.use-case';
import { DeleteServiceUseCase } from '../application/delete-service.use-case';
import { ListServicesUseCase } from '../application/list-services.use-case';
import { ToggleServiceStatusUseCase } from '../application/toggle-service-status.use-case';
import { CreatePackageUseCase } from '../application/create-package.use-case';
import { UpdatePackageUseCase } from '../application/update-package.use-case';
import { DeletePackageUseCase } from '../application/delete-package.use-case';
import { ListPackagesUseCase } from '../application/list-packages.use-case';
import { TogglePackageStatusUseCase } from '../application/toggle-package-status.use-case';

@Module({
  controllers: [ServicesController],
  providers: [
    { provide: ICategoriesRepository, useClass: CategoriesRepository },
    { provide: IServicesRepository, useClass: ServicesRepository },
    { provide: IPackagesRepository, useClass: PackagesRepository },
    CreateCategoryUseCase, UpdateCategoryUseCase, DeleteCategoryUseCase, ListCategoriesUseCase,
    CreateServiceUseCase, UpdateServiceUseCase, DeleteServiceUseCase, ListServicesUseCase, ToggleServiceStatusUseCase,
    CreatePackageUseCase, UpdatePackageUseCase, DeletePackageUseCase, ListPackagesUseCase, TogglePackageStatusUseCase,
  ],
  exports: [IServicesRepository, IPackagesRepository],
})
export class ServicesModule {}
```

- [ ] **Step 6: Add `ServicesModule` to `src/app.module.ts`**

Add `ServicesModule` to the `imports` array in `AppModule`.

- [ ] **Step 7: Run tests and verify server**

```bash
npm run test
npm run start:dev
```

Open http://localhost:3000/api — verify categories, services, and packages endpoints appear.

- [ ] **Step 8: Commit**

```bash
git add src/modules/services/ src/app.module.ts
git commit -m "feat(services): add full service catalog module (categories, services, packages)"
```
