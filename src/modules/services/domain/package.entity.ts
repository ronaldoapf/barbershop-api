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
