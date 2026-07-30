import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

/**
 * Structured request logging keyed by the correlation id set in CorrelationIdMiddleware.
 * Errors are logged by HttpExceptionFilter, not here, to avoid double-logging the same
 * failed request from two places.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const correlationId = request.correlationId ?? 'unknown';
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - startedAt;
        this.logger.log(
          `[${correlationId}] ${request.method} ${request.originalUrl} -> ${response.statusCode} (${durationMs}ms)`,
        );
      }),
    );
  }
}
