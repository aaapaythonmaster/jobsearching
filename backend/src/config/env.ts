import 'dotenv/config'
import { z } from 'zod'

/**
 * Environment variable schema. Validated once at process start; downstream
 * code imports the parsed `env` object and gets full TypeScript types.
 */
const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    HOST: z.string().default('0.0.0.0'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    CORS_ORIGIN: z.string().url().optional(),

    DB_DIALECT: z.enum(['sqlite', 'postgres']).default('sqlite'),
    DB_SQLITE_FILE: z.string().default('./data/dev.db'),
    DATABASE_URL: z.string().url().optional(),

    AI_PROVIDER: z.enum(['openai', 'zhipu']).default('zhipu'),
    AI_API_KEY: z.string().min(1).optional(),
    AI_MODEL: z.string().default('glm-5.2'),
    AI_OCR_MODEL: z.string().default('glm-ocr'),
    AI_VISION_MODEL: z.string().optional(),
    AI_BASE_URL: z.string().url().default('https://api.z.ai/api/paas/v4'),
    AI_PROXY_URL: z.string().url().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.DB_DIALECT === 'postgres' && !value.DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DATABASE_URL'],
        message: 'DATABASE_URL is required when DB_DIALECT=postgres',
      })
    }
  })

export type Env = z.infer<typeof EnvSchema>

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    console.error('Invalid environment configuration:')
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
    }
    process.exit(1)
  }
  return parsed.data
}

export const env: Env = loadEnv()
