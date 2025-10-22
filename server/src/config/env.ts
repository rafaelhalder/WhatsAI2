import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  
  // Evolution API configuration
  EVOLUTION_API_URL: z.string().url().default('https://hsapi.studio/'),
  EVOLUTION_API_KEY: z.string().default('Pz6qEerZE5IYwaoc8ZCQxmBdLAinX4dl'),
  
  // Multiple Evolution API servers (optional)
  EVOLUTION_API_URL_2: z.string().url().optional(),
  EVOLUTION_API_KEY_2: z.string().optional(),
  EVOLUTION_API_URL_3: z.string().url().optional(),
  EVOLUTION_API_KEY_3: z.string().optional(),
  
  // Database configuration (if needed in future)
  DATABASE_URL: z.string().optional(),
  
  // JWT configuration (if needed in future)
  JWT_SECRET: z.string().default('your-jwt-secret'),
  
  // WebSocket configuration
  WEBSOCKET_PORT: z.string().transform(Number).optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Invalid environment variables:', error);
    process.exit(1);
  }
}

export const env = validateEnv();