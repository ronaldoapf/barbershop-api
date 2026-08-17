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

export interface SetWeeklyHoursInput {
  isWorking: boolean;
  startTime?: string;
  endTime?: string;
}

@Injectable()
export class SetWeeklyHoursUseCase {
  constructor(
    private readonly workingHoursRepository: IWorkingHoursRepository,
    private readonly barbersRepository: IBarbersRepository,
  ) {}

  async execute(
    requester: UserEntity,
    barberId: string,
    dayOfWeek: number,
    input: SetWeeklyHoursInput,
  ): Promise<BarberWorkingHoursEntity> {
    await this.assertOwnership(requester, barberId);

    if (
      input.isWorking &&
      input.startTime &&
      input.endTime &&
      input.startTime >= input.endTime
    ) {
      throw new BadRequestException(
        'O horário de início deve ser anterior ao horário de término.',
      );
    }

    const startTime = input.isWorking ? (input.startTime ?? null) : null;
    const endTime = input.isWorking ? (input.endTime ?? null) : null;

    const entries = await this.workingHoursRepository.listByBarber(barberId);
    const existing = entries.find(
      (entry) =>
        entry.type === WorkingHoursType.WEEKLY && entry.dayOfWeek === dayOfWeek,
    );

    if (existing) {
      return this.workingHoursRepository.update(existing.id, {
        startTime,
        endTime,
        isWorking: input.isWorking,
      });
    }

    return this.workingHoursRepository.create({
      barberId,
      type: WorkingHoursType.WEEKLY,
      dayOfWeek,
      startTime: startTime ?? undefined,
      endTime: endTime ?? undefined,
      isWorking: input.isWorking,
    });
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
