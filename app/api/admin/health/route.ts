import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger({ module: 'health-check' });

const startTime = Date.now();

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
  heapUsedMB?: number;
  heapTotalMB?: number;
  error?: string;
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', latencyMs: Date.now() - start };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown DB error';
    return { status: 'unhealthy', latencyMs: Date.now() - start, error: message };
  }
}

function checkMemory(): HealthCheck {
  const mem = process.memoryUsage();
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const ratio = mem.heapUsed / mem.heapTotal;

  return {
    status: ratio > 0.9 ? 'degraded' : 'healthy',
    heapUsedMB,
    heapTotalMB,
  };
}

function overallStatus(checks: Record<string, HealthCheck>): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(checks).map((c) => c.status);
  if (statuses.includes('unhealthy')) return 'unhealthy';
  if (statuses.includes('degraded')) return 'degraded';
  return 'healthy';
}

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [dbCheck, memCheck] = await Promise.all([
      checkDatabase(),
      Promise.resolve(checkMemory()),
    ]);

    const checks = { database: dbCheck, memory: memCheck };
    const status = overallStatus(checks);

    const response = {
      status,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round((Date.now() - startTime) / 1000),
      version: '0.3.0',
      checks,
    };

    log.info('Health check completed', { status });

    return NextResponse.json(response, {
      status: status === 'unhealthy' ? 503 : 200,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('Health check failed', { error: message });
    return NextResponse.json(
      { status: 'unhealthy', error: message },
      { status: 503 }
    );
  }
}
