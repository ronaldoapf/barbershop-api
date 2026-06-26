import { PaginationHelper } from './pagination.helper';

describe('PaginationHelper.getSkipTake', () => {
  it('returns skip=0 take=20 for page 1 limit 20', () => {
    expect(PaginationHelper.getSkipTake(1, 20)).toEqual({ skip: 0, take: 20 });
  });

  it('returns skip=20 take=20 for page 2 limit 20', () => {
    expect(PaginationHelper.getSkipTake(2, 20)).toEqual({ skip: 20, take: 20 });
  });

  it('returns skip=40 take=10 for page 5 limit 10', () => {
    expect(PaginationHelper.getSkipTake(5, 10)).toEqual({ skip: 40, take: 10 });
  });
});
