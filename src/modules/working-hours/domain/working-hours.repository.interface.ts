import { BarberWorkingHoursEntity } from './barber-working-hours.entity';
import { WorkingHoursType } from './working-hours-type.enum';

export interface CreateWorkingHoursData {
  barberId: string;
  type: WorkingHoursType;
  dayOfWeek?: number;
  date?: Date;
  startTime?: string;
  endTime?: string;
  isWorking: boolean;
}

export interface UpdateWorkingHoursData {
  startTime?: string | null;
  endTime?: string | null;
  isWorking?: boolean;
}

export abstract class IWorkingHoursRepository {
  abstract listByBarber(barberId: string): Promise<BarberWorkingHoursEntity[]>;
  abstract create(
    data: CreateWorkingHoursData,
  ): Promise<BarberWorkingHoursEntity>;
  abstract update(
    id: string,
    data: UpdateWorkingHoursData,
  ): Promise<BarberWorkingHoursEntity>;
  abstract softDelete(id: string): Promise<void>;
}
