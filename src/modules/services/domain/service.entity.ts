import { ItemStatus } from './item-status.enum';

export class ServiceEntity {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number;
  status: ItemStatus;
  order: number;
  pointsEarned: number;
  pointsRequired: number;
  createdAt: Date;
  disabledAt: Date | null;
}
