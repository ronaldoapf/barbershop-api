import { Injectable } from '@nestjs/common';
import { AvailabilityWindow } from '../domain/availability-window';
import { isSameCalendarDate } from '../domain/same-calendar-date.util';
import { WorkingHoursType } from '../domain/working-hours-type.enum';
import { IWorkingHoursRepository } from '../domain/working-hours.repository.interface';

const NOT_WORKING: AvailabilityWindow = {
  isWorking: false,
  startTime: null,
  endTime: null,
};

@Injectable()
export class GetAvailabilityWindowUseCase {
  constructor(
    private readonly workingHoursRepository: IWorkingHoursRepository,
  ) {}

  async execute(barberId: string, date: Date): Promise<AvailabilityWindow> {
    const entries = await this.workingHoursRepository.listByBarber(barberId);

    const exception = entries.find(
      (entry) =>
        entry.type === WorkingHoursType.SPECIFIC_DATE &&
        entry.date &&
        isSameCalendarDate(entry.date, date),
    );
    if (exception) {
      return this.toWindow(exception);
    }

    const dayOfWeek = date.getUTCDay();
    const weekly = entries.find(
      (entry) =>
        entry.type === WorkingHoursType.WEEKLY && entry.dayOfWeek === dayOfWeek,
    );
    if (weekly) {
      return this.toWindow(weekly);
    }

    return NOT_WORKING;
  }

  private toWindow(entry: {
    isWorking: boolean;
    startTime: string | null;
    endTime: string | null;
  }): AvailabilityWindow {
    if (!entry.isWorking) {
      return NOT_WORKING;
    }

    return {
      isWorking: true,
      startTime: entry.startTime,
      endTime: entry.endTime,
    };
  }
}
