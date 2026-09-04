#!/usr/bin/env node

/**
 * RamroXa Email Diagnostic Utility
 *
 * Usage:
 *   node src/scripts/testEmail.js --verify-only
 *   node src/scripts/testEmail.js --to=your_email@domain.com
 *   npm run email:test
 */

import env from '../config/env.js';
import { getEmailConfig, maskEmail } from '../config/email.config.js';
import { verifyTransporter, sendEmail, getTransporter } from '../services/email.service.js';

async function runDiagnostic() {
  console.log('\n========================================================');
  console.log('🔍 RAMROXA EMAIL CONFIGURATION & DIAGNOSTIC SUITE');
  console.log('========================================================\n');

  const config = getEmailConfig();

  console.log('📋 CURRENT CONFIGURATION STATUS:');
  console.log(`  • Environment Mode:    ${env.NODE_ENV}`);
  console.log(`  • Detected Email Mode: ${config.mode}`);
  console.log(`  • Service / Provider:  ${config.service || 'Custom SMTP / Fallback'}`);
  console.log(`  • Host:                ${config.host}`);
  console.log(`  • Port:                ${config.port}`);
  console.log(`  • Secure (TLS):        ${config.secure}`);
  console.log(`  • Sender (FROM):       ${config.from}`);
  console.log(`  • Auth Username:       ${maskEmail(config.user)}`);
  console.log(`  • Auth Password Set:   ${config.pass ? `YES (${config.pass.length} chars)` : 'NO'}`);
  console.log(`  • Frontend Base URL:   ${config.frontendUrl}`);

  if (config.isPlaceholderUser || config.isPlaceholderPass) {
    console.log('\n⚠️  NOTICE: Placeholder credentials detected in server/.env.');
    console.log('    SMTP_USER or SMTP_PASS contain default boilerplates (e.g. your_email@gmail.com).');
    console.log('    The application will operate in DEVELOPMENT PREVIEW mode (Ethereal test mailbox).');
  }

  console.log('\n--------------------------------------------------------');
  console.log('🔌 STEP 1: VERIFYING SMTP CONNECTION & AUTHENTICATION...');
  console.log('--------------------------------------------------------');

  const verifyResult = await verifyTransporter();

  if (verifyResult.success) {
    console.log('✅ SUCCESS: Transporter connection and credentials verified!');
    console.log(`   Provider: ${verifyResult.provider}`);
  } else {
    console.log(`❌ VERIFICATION FAILED: [${verifyResult.code}]`);
    console.log(`   Reason: ${verifyResult.message}`);
    if (verifyResult.code === 'AUTH_FAILED') {
      console.log('\n💡 TROUBLESHOOTING GMAIL:');
      console.log('   1. Gmail requires 2-Step Verification enabled.');
      console.log('   2. Generate a 16-character App Password at: https://myaccount.google.com/apppasswords');
      console.log('   3. Put the 16-character password into server/.env as SMTP_PASS (without spaces).');
      console.log('   4. Set SMTP_SERVICE=gmail and SMTP_USER=your_real_email@gmail.com.');
    }
  }

  // Check for target recipient
  const args = process.argv.slice(2);
  const verifyOnly = args.includes('--verify-only');
  let toArg = args.find((a) => a.startsWith('--to='));
  let targetRecipient = toArg ? toArg.split('=')[1] : null;

  if (verifyOnly) {
    console.log('\n[--verify-only specified. Skipping test email send.]\n');
    process.exit(verifyResult.success ? 0 : 1);
  }

  if (!targetRecipient && config.hasValidCredentials) {
    targetRecipient = config.user;
  }

  if (!targetRecipient && config.mode === 'DEV_FALLBACK') {
    targetRecipient = 'developer.test@ramroxa.local';
  }

  console.log('\n--------------------------------------------------------');
  console.log(`📬 STEP 2: SENDING TEST EMAIL TO: ${targetRecipient || '[None]'}`);
  console.log('--------------------------------------------------------');

  if (!targetRecipient) {
    console.log('ℹ️  No recipient specified. Run with: node src/scripts/testEmail.js --to=your_email@domain.com');
    process.exit(verifyResult.success ? 0 : 1);
  }

  const sendResult = await sendEmail({
    to: targetRecipient,
    subject: `Ramroxa Diagnostic Test Email [${new Date().toISOString()}]`,
    text: `This is an automated diagnostic test from the Ramroxa verification email service.\nMode: ${config.mode}\nTimestamp: ${new Date().toISOString()}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #000; letter-spacing: 2px;">RAMROXA EMAIL DIAGNOSTIC</h2>
        <p>This email confirms that your email transporter is configured and working properly!</p>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <ul>
          <li><strong>Delivery Mode:</strong> ${config.mode}</li>
          <li><strong>Host / Provider:</strong> ${config.host}</li>
          <li><strong>Port:</strong> ${config.port}</li>
          <li><strong>Recipient:</strong> ${targetRecipient}</li>
          <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
        </ul>
      </div>
    `
  });

  if (sendResult.success) {
    console.log('✅ SUCCESS: Test email sent successfully!');
    console.log(`   Message ID: ${sendResult.messageId}`);
    if (sendResult.previewUrl) {
      console.log(`   🌐 Ethereal Web Preview: ${sendResult.previewUrl}`);
    } else {
      console.log(`   📬 Check your inbox at: ${targetRecipient}`);
    }
  } else {
    console.log(`❌ SEND FAILED: [${sendResult.code}]`);
    console.log(`   Reason: ${sendResult.error}`);
  }

  console.log('\n========================================================\n');
  process.exit(sendResult.success ? 0 : 1);
}

runDiagnostic().catch((err) => {
  console.error('\n💥 Unexpected diagnostic error:', err.message);
  process.exit(1);
});
