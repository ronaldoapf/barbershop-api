import { Test, TestingModule } from '@nestjs/testing';
import { UnassignServiceFromBarberUseCase } from './unassign-service-from-barber.use-case';
import { IBarberServicesRepository } from '../domain/barber-services.repository.interface';

describe('UnassignServiceFromBarberUseCase', () => {
  let useCase: UnassignServiceFromBarberUseCase;

  const barberServicesRepository = {
    assign: jest.fn(),
    unassign: jest.fn(),
    listByBarber: jest.fn(),
    listServiceIdsByBarber: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnassignServiceFromBarberUseCase,
        {
          provide: IBarberServicesRepository,
          useValue: barberServicesRepository,
        },
      ],
    }).compile();

    useCase = module.get(UnassignServiceFromBarberUseCase);
  });

  it('delegates unassignment to the repository', async () => {
    barberServicesRepository.unassign.mockResolvedValue(undefined);

    await useCase.execute('barber-1', 'service-1');

    expect(barberServicesRepository.unassign).toHaveBeenCalledWith(
      'barber-1',
      'service-1',
    );
  });
});
