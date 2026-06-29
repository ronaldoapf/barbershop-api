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
