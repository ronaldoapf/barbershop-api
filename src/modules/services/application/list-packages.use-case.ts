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
