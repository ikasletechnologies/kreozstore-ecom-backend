import { z } from 'zod';

/**
 * Validated at bootstrap via ConfigModule's `validate` option — an invalid or missing
 * required variable crashes startup immediately instead of surfacing a confusing runtime
 * error later. See docs/19-ENVIRONMENT-VARIABLES.md for the full reference.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  API_PREFIX: z.string().min(1).default('api/v1'),
  CORS_ORIGINS: z.string().min(1),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1),

  JWT_ACCESS_PRIVATE_KEY: z.string().min(1),
  JWT_ACCESS_PUBLIC_KEY: z.string().min(1),
  JWT_ACCESS_TTL: z.string().min(1).default('15m'),
  JWT_REFRESH_TTL: z.string().min(1).default('30d'),
  JWT_ISSUER: z.string().min(1).default('ecommerce-platform'),

  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.coerce.number().int().positive(),
  REDIS_PASSWORD: z.string().optional().default(''),

  UPLOAD_ROOT_PATH: z.string().min(1),
  UPLOAD_MAX_IMAGE_SIZE_MB: z.coerce.number().positive().default(5),
  UPLOAD_MAX_DOC_SIZE_MB: z.coerce.number().positive().default(10),

  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM_NAME: z.string().default('Enterprise Store'),
  SMTP_FROM_EMAIL: z.string().default('no-reply@example.com'),

  RAZORPAY_KEY_ID: z.string().optional().default(''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),

  THROTTLE_TTL: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),

  SWAGGER_ENABLED: z.coerce.boolean().default(true),
  SWAGGER_PATH: z.string().min(1).default('api/docs'),

  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'debug', 'verbose'])
    .default('info'),

  SEED_SUPER_ADMIN_EMAIL: z.string().email().default('superadmin@example.com'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}
