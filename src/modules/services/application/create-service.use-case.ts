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
