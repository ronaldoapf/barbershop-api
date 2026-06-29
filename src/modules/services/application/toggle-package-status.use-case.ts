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
