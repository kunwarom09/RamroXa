import env from './env.js';
import logger from './logger.js';

/**
 * Categorized Email Transporter Modes:
 * - 'LIVE_SMTP': Fully configured external SMTP (e.g. Gmail with App Password, AWS SES, Resend, SendGrid)
 * - 'DEV_FALLBACK': Development mode with Ethereal test inbox or stream logger
 * - 'TEST_MOCK': Vitest / automated testing mock transport
 * - 'UNCONFIGURED': Missing or invalid configuration in production
 */
export function getEmailConfig() {
  const isTest = env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
  const isProd = env.NODE_ENV === 'production';

  const user = env.SMTP_USER || '';
  const pass = env.SMTP_PASS || '';
  const host = env.SMTP_HOST || '';
  const service = env.SMTP_SERVICE || '';
  const port = Number(env.SMTP_PORT) || 587;
  const secure = Boolean(env.SMTP_SECURE);
  const from = env.SMTP_FROM || (user ? `"Ramroxa" <${user}>` : '"Ramroxa" <noreply@ramroxa.com>');
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:3000';

  // Check if credentials are user-provided real values (not boilerplate placeholders)
  const isPlaceholderUser = !user || user.includes('your_email') || user.includes('example.com');
  const isPlaceholderPass = !pass || pass === 'your_app_password' || pass === 'mock_secret';
  const hasValidCredentials = !isPlaceholderUser && !isPlaceholderPass;

  let mode = 'DEV_FALLBACK';
  if (isTest) {
    mode = 'TEST_MOCK';
  } else if (hasValidCredentials && (service || host)) {
    mode = 'LIVE_SMTP';
  } else if (isProd) {
    mode = 'UNCONFIGURED';
  }

  return {
    mode,
    service: service ? service.toLowerCase() : null,
    host: host || (service ? `${service} (built-in)` : 'smtp.ethereal.email'),
    port,
    secure,
    user,
    pass,
    from,
    frontendUrl,
    hasValidCredentials,
    isPlaceholderUser,
    isPlaceholderPass
  };
}

/**
 * Mask an email address or credential for safe diagnostic logging
 * e.g., 'john.doe@gmail.com' -> 'j***e@gmail.com'
 */
export function maskEmail(email) {
  if (!email || typeof email !== 'string') return '[NOT SET]';
  const parts = email.split('@');
  if (parts.length !== 2) return '[INVALID EMAIL]';
  const [local, domain] = parts;
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Validate email configuration on server startup and emit clear, safe diagnostic logs
 */
export function validateEmailConfig() {
  const config = getEmailConfig();

  if (config.mode === 'LIVE_SMTP') {
    logger.info(
      {
        provider: config.service || config.host,
        port: config.port,
        secure: config.secure,
        sender: config.from,
        authAccount: maskEmail(config.user)
      },
      '📧 Email service configured in LIVE_SMTP mode'
    );
    return { valid: true, mode: config.mode, config };
  }

  if (config.mode === 'TEST_MOCK') {
    return { valid: true, mode: config.mode, config };
  }

  if (config.mode === 'UNCONFIGURED') {
    const errorMsg =
      'CRITICAL: Email configuration is incomplete or uses placeholder values in PRODUCTION mode. ' +
      'Please configure valid SMTP_USER and SMTP_PASS environment variables.';
    logger.error(errorMsg);
    return { valid: false, mode: config.mode, error: errorMsg, config };
  }

  // Development Fallback
  logger.warn(
    '📧 Email service running in DEVELOPMENT PREVIEW mode. Real emails will NOT be delivered to outside inboxes. ' +
    'To send real emails, set valid SMTP_USER and SMTP_PASS (Gmail 16-character App Password) in server/.env.'
  );

  return { valid: true, mode: config.mode, config };
}

export default {
  getEmailConfig,
  maskEmail,
  validateEmailConfig
};
