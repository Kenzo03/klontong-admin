import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../generated/prisma/client';

const PRISMA_ERRORS: Record<string, [HttpStatus, string]> = {
  P2002: [HttpStatus.CONFLICT, 'UNIQUE_VIOLATION'],
  P2003: [HttpStatus.BAD_REQUEST, 'INVALID_REFERENCE'],
  P2025: [HttpStatus.NOT_FOUND, 'NOT_FOUND'],
};

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: Record<string, unknown> = { code: 'INTERNAL_ERROR', message: 'Internal server error' };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      body = typeof r === 'string' ? { message: r } : { ...(r as Record<string, unknown>) };
      body.code ??= HttpStatus[status];
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code in PRISMA_ERRORS) {
      const [s, code] = PRISMA_ERRORS[exception.code];
      status = s;
      body = { code, message: code.toLowerCase().replace(/_/g, ' ') };
    } else {
      this.logger.error(exception); // unexpected: log it, never leak details to the client
    }

    res.status(status).json({ ...body, statusCode: status, error: HttpStatus[status] });
  }
}