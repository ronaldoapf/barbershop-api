import { ForbiddenException, Injectable } from '@nestjs/common';
import { IBarbersRepository } from '../../barbers/domain/barbers.repository.interface';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';
import { BarberWorkingHoursEntity } from '../domain/barber-working-hours.entity';
import { IWorkingHoursRepository } from '../domain/working-hours.repository.interface';

@Injectable()
export class ListWorkingHoursUseCase {
  constructor(
    private readonly workingHoursRepository: IWorkingHoursRepository,
    private readonly barbersRepository: IBarbersRepository,
  ) {}

  async execute(
    requester: UserEntity,
    barberId: string,
  ): Promise<BarberWorkingHoursEntity[]> {
    if (requester.role !== UserRole.OWNER) {
      const barber = await this.barbersRepository.findByUserId(requester.id);
      if (!barber || barber.id !== barberId) {
        throw new ForbiddenException(
          'Você não tem permissão para ver os horários deste barbeiro.',
        );
      }
    }

    return this.workingHoursRepository.listByBarber(barberId);
  }
}
