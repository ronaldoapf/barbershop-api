import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { IBarbersRepository } from '../../barbers/domain/barbers.repository.interface';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';
import { BarberWorkingHoursEntity } from '../domain/barber-working-hours.entity';
import { WorkingHoursType } from '../domain/working-hours-type.enum';
import { IWorkingHoursRepository } from '../domain/working-hours.repository.interface';
import { DEFAULT_BUSINESS_DAYS } from '../dto/set-default-schedule.dto';

export interface SetDefaultScheduleInput {
  startTime: string;
  endTime: string;
  workingDays?: number[];
}

const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

@Injectable()
export class SetDefaultScheduleUseCase {
  constructor(
    private readonly workingHoursRepository: IWorkingHoursRepository,
    private readonly barbersRepository: IBarbersRepository,
  ) {}

  async execute(
    requester: UserEntity,
    barberId: string,
    input: SetDefaultScheduleInput,
  ): Promise<BarberWorkingHoursEntity[]> {
    await this.assertOwnership(requester, barberId);

    if (input.startTime >= input.endTime) {
      throw new BadRequestException(
        'O horário de início deve ser anterior ao horário de término.',
      );
    }

    const workingDays = input.workingDays ?? DEFAULT_BUSINESS_DAYS;
    const entries = await this.workingHoursRepository.listByBarber(barberId);

    const results: BarberWorkingHoursEntity[] = [];
    for (const dayOfWeek of ALL_WEEKDAYS) {
      const isWorking = workingDays.includes(dayOfWeek);
      const startTime = isWorking ? input.startTime : null;
      const endTime = isWorking ? input.endTime : null;

      const existing = entries.find(
        (entry) =>
          entry.type === WorkingHoursType.WEEKLY &&
          entry.dayOfWeek === dayOfWeek,
      );

      if (existing) {
        results.push(
          await this.workingHoursRepository.update(existing.id, {
            startTime,
            endTime,
            isWorking,
          }),
        );
        continue;
      }

      results.push(
        await this.workingHoursRepository.create({
          barberId,
          type: WorkingHoursType.WEEKLY,
          dayOfWeek,
          startTime: startTime ?? undefined,
          endTime: endTime ?? undefined,
          isWorking,
        }),
      );
    }

    return results;
  }

  private async assertOwnership(
    requester: UserEntity,
    barberId: string,
  ): Promise<void> {
    if (requester.role === UserRole.OWNER) {
      return;
    }

    const barber = await this.barbersRepository.findByUserId(requester.id);
    if (!barber || barber.id !== barberId) {
      throw new ForbiddenException(
        'Você não tem permissão para gerenciar os horários deste barbeiro.',
      );
    }
  }
}
