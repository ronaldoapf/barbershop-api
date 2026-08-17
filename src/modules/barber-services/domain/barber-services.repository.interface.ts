import { ServiceEntity } from '../../services/domain/service.entity';
import { BarberServiceEntity } from './barber-service.entity';

export abstract class IBarberServicesRepository {
  abstract assign(
    barberId: string,
    serviceId: string,
  ): Promise<BarberServiceEntity>;
  abstract unassign(barberId: string, serviceId: string): Promise<void>;
  abstract listByBarber(barberId: string): Promise<ServiceEntity[]>;
  abstract listServiceIdsByBarber(barberId: string): Promise<string[]>;
}
