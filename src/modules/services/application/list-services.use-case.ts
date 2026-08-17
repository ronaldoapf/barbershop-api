import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { UserRole } from '../../users/domain/user-role.enum';
import { IServicesRepository } from '../domain/services.repository.interface';
import { ItemStatus } from '../domain/item-status.enum';
import { ServiceEntity } from '../domain/service.entity';

@Injectable()
export class ListServicesUseCase {
  constructor(private readonly servicesRepository: IServicesRepository) {}

  async execute(
    requesterRole: UserRole,
    page: number,
    limit: number,
    status?: ItemStatus,
  ): Promise<PaginatedResult<ServiceEntity>> {
    const effectiveStatus =
      requesterRole === UserRole.OWNER ? status : ItemStatus.ACTIVE;

    return this.servicesRepository.list(page, limit, effectiveStatus);
  }
}
