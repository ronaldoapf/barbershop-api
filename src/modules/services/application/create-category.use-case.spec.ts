import { CreateCategoryUseCase } from './create-category.use-case';
import { ICategoriesRepository } from '../domain/categories.repository.interface';
import { CategoryEntity } from '../domain/category.entity';

const mockRepo = (): jest.Mocked<ICategoriesRepository> => ({
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
});

describe('CreateCategoryUseCase', () => {
  it('creates and returns category', async () => {
    const repo = mockRepo();
    const expected = { id: '1', name: 'Hair', order: 1 } as CategoryEntity;
    repo.create.mockResolvedValue(expected);
    const result = await new CreateCategoryUseCase(repo).execute({ name: 'Hair', order: 1 });
    expect(repo.create).toHaveBeenCalledWith({ name: 'Hair', order: 1 });
    expect(result).toBe(expected);
  });
});
