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
