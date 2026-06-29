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
