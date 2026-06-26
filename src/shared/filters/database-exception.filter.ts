import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const statusMap: Record<string, number> = {
      P2002: HttpStatus.CONFLICT,
      P2025: HttpStatus.NOT_FOUND,
    };

    const messageMap: Record<string, string> = {
      P2002: 'Já existe um registro com esses dados.',
      P2025: 'Registro não encontrado.',
    };

    const status = statusMap[exception.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const message = messageMap[exception.code] ?? 'Erro interno no servidor.';

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception);
    }

    response.status(status).json({
      statusCode: status,
      message,
    });
  }
}
