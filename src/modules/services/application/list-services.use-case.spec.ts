import { Test, TestingModule } from '@nestjs/testing';
import { ListServicesUseCase } from './list-services.use-case';
import { IServicesRepository } from '../domain/services.repository.interface';
import { ItemStatus } from '../domain/item-status.enum';
import { UserRole } from '../../users/domain/user-role.enum';

describe('ListServicesUseCase', () => {
  let useCase: ListServicesUseCase;

  const servicesRepository = {
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    softDelete: jest.fn(),
  };

  const paginatedResult = { data: [], total: 0, page: 1, limit: 20 };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListServicesUseCase,
        { provide: IServicesRepository, useValue: servicesRepository },
      ],
    }).compile();

    useCase = module.get(ListServicesUseCase);
  });

  it('forces the ACTIVE filter for non-OWNER callers regardless of the requested status', async () => {
    servicesRepository.list.mockResolvedValue(paginatedResult);

    await useCase.execute(UserRole.CUSTOMER, 1, 20, ItemStatus.INACTIVE);

    expect(servicesRepository.list).toHaveBeenCalledWith(
      1,
      20,
      ItemStatus.ACTIVE,
    );
  });

  it('lets OWNER callers filter by any status, including none', async () => {
    servicesRepository.list.mockResolvedValue(paginatedResult);

    await useCase.execute(UserRole.OWNER, 1, 20, ItemStatus.INACTIVE);
    expect(servicesRepository.list).toHaveBeenCalledWith(
      1,
      20,
      ItemStatus.INACTIVE,
    );

    await useCase.execute(UserRole.OWNER, 1, 20);
    expect(servicesRepository.list).toHaveBeenCalledWith(1, 20, undefined);
  });
});
