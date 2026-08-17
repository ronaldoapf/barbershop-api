import { WorkingHoursType } from './working-hours-type.enum';

export class BarberWorkingHoursEntity {
  id!: string;
  barberId!: string;
  type!: WorkingHoursType;
  dayOfWeek!: number | null;
  date!: Date | null;
  startTime!: string | null;
  endTime!: string | null;
  isWorking!: boolean;
  createdAt!: Date;
  disabledAt!: Date | null;
}
