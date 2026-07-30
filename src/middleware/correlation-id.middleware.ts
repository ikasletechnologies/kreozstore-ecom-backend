import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

const HEADER = 'x-correlation-id';

/**
 * Runs before guards/interceptors/filters (NestJS middleware is the earliest hook in the
 * pipeline), so `req.correlationId` is always set by the time either the LoggingInterceptor
 * or the HttpExceptionFilter needs it — including for errors thrown before any interceptor
 * gets to run.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.header(HEADER);
    const correlationId =
      incoming && incoming.length > 0 ? incoming : randomUUID();
    req.correlationId = correlationId;
    res.setHeader(HEADER, correlationId);
    next();
  }
}
