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
