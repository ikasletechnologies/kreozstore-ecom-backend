import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { Public } from '../../decorators/public.decorator';

interface DependencyStatus {
  status: 'up' | 'down';
  error?: string;
}

interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  dependencies: {
    postgres: DependencyStatus;
    redis: DependencyStatus;
  };
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({
    summary:
      'Liveness/readiness check — verifies Postgres and Redis connectivity',
  })
  async check(@Res() res: Response): Promise<void> {
    const [postgres, redis] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
    ]);

    const allUp = postgres.status === 'up' && redis.status === 'up';
    const body: HealthResponse = {
      status: allUp ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      dependencies: { postgres, redis },
    };

    res
      .status(allUp ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json(body);
  }

  private async checkPostgres(): Promise<DependencyStatus> {
    try {
      await this.prisma.ping();
      return { status: 'up' };
    } catch (err) {
      return {
        status: 'down',
        error: err instanceof Error ? err.message : 'unknown error',
      };
    }
  }

  private async checkRedis(): Promise<DependencyStatus> {
    try {
      await this.redis.ping();
      return { status: 'up' };
    } catch (err) {
      return {
        status: 'down',
        error: err instanceof Error ? err.message : 'unknown error',
      };
    }
  }
}
