/**
 * Environment Variable Validation
 * Ensures all required environment variables are present at startup
 */

const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
] as const;

const optionalEnvVars = [
  'VITE_LOG_LEVEL',
  'VITE_MOCK_PAYMENT_MODE',
] as const;

export function validateEnvironment(): void {
  const missing: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!import.meta.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map(v => `  - ${v}`).join('\n')}\n\n` +
      `Please create a .env file in the config/ directory with all required variables.\n` +
      `See .env.example for reference.`
    );
  }

  // Validate optional env vars
  const logLevel = import.meta.env.VITE_LOG_LEVEL;
  if (logLevel && !['debug', 'info', 'warn', 'error'].includes(logLevel)) {
    console.warn(`Warning: Invalid VITE_LOG_LEVEL '${logLevel}'. Must be one of: debug, info, warn, error. Defaulting to 'warn'.`);
  }

  const mockPaymentMode = import.meta.env.VITE_MOCK_PAYMENT_MODE;
  if (mockPaymentMode && !['true', 'false'].includes(mockPaymentMode)) {
    console.warn(`Warning: Invalid VITE_MOCK_PAYMENT_MODE '${mockPaymentMode}'. Must be 'true' or 'false'.`);
  }
}

export default validateEnvironment;
