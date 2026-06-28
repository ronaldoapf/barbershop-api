import { ArgumentsHost } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseExceptionFilter } from './database-exception.filter';

function makeMockHost(statusFn: jest.Mock, jsonFn: jest.Mock): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getResponse: () => ({ status: statusFn, json: jsonFn }),
    }),
  } as unknown as ArgumentsHost;
}

describe('DatabaseExceptionFilter', () => {
  let filter: DatabaseExceptionFilter;

  beforeEach(() => {
    filter = new DatabaseExceptionFilter();
  });

  it('maps P2002 to 409', () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const exception = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: '7.0.0',
      },
    );

    filter.catch(exception, makeMockHost(status, json));

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        message: 'Já existe um registro com esses dados.',
      }),
    );
  });

  it('maps P2025 to 404', () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const exception = new Prisma.PrismaClientKnownRequestError(
      'Record not found',
      {
        code: 'P2025',
        clientVersion: '7.0.0',
      },
    );

    filter.catch(exception, makeMockHost(status, json));

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Registro não encontrado.',
      }),
    );
  });

  it('maps unknown Prisma codes to 500', () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const exception = new Prisma.PrismaClientKnownRequestError(
      'Unknown error',
      {
        code: 'P9999',
        clientVersion: '7.0.0',
      },
    );

    filter.catch(exception, makeMockHost(status, json));

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Erro interno no servidor.',
      }),
    );
  });
});
