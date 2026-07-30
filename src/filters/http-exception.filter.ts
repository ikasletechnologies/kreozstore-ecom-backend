import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
  correlationId: string;
}

interface ResolvedError {
  statusCode: number;
  message: string | string[];
  error: string;
}

/**
 * Single global catch-all producing the standardized error shape from
 * docs/02-ARCHITECTURE.md §6. Handles ordinary HttpExceptions (including ValidationPipe's
 * array-of-messages payload), Prisma's known request errors (translated to the right HTTP
 * status instead of leaking a 500 for a unique-constraint violation), and anything
 * unexpected as a generic 500 — deliberately one file rather than a separate
 * PrismaExceptionFilter, since NestJS's multi-filter resolution order for overlapping
 * @Catch() types is easy to get subtly wrong; isolating the Prisma-specific mapping in
 * `resolvePrismaError` keeps the same separation of concerns without that risk.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = request.correlationId ?? 'unknown';

    const resolved = this.resolve(exception);

    const body: ErrorResponseBody = {
      ...resolved,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
      correlationId,
    };

    if (resolved.statusCode >= 500) {
      this.logger.error(
        `[${correlationId}] ${request.method} ${request.originalUrl} -> ${resolved.statusCode}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `[${correlationId}] ${request.method} ${request.originalUrl} -> ${resolved.statusCode}`,
      );
    }

    response.status(resolved.statusCode).json(body);
  }

  private resolve(exception: unknown): ResolvedError {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        return { statusCode: status, message: payload, error: exception.name };
      }
      const payloadObj = payload as {
        message?: string | string[];
        error?: string;
      };
      return {
        statusCode: status,
        message: payloadObj.message ?? exception.message,
        error: payloadObj.error ?? exception.name,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.resolvePrismaError(exception);
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'InternalServerError',
    };
  }

  private resolvePrismaError(
    exception: Prisma.PrismaClientKnownRequestError,
  ): ResolvedError {
    switch (exception.code) {
      case 'P2002': {
        const target =
          (exception.meta?.target as string[] | undefined)?.join(', ') ??
          'field';
        return {
          statusCode: HttpStatus.CONFLICT,
          message: `A record with this ${target} already exists`,
          error: 'Conflict',
        };
      }
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          error: 'NotFound',
        };
      case 'P2003':
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'This action violates a related record constraint',
          error: 'Conflict',
        };
      default:
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Database request error',
          error: 'BadRequest',
        };
    }
  }
}
