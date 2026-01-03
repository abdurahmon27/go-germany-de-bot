import config from '../config/index.js';

/**
 * Middleware to check if user is an admin
 * Blocks non-admin users from accessing admin commands
 */
function adminMiddleware(ctx, next) {
  const userId = ctx.from?.id;

  if (!userId || !config.adminIds.includes(userId)) {
    console.log(`⚠️ Unauthorized admin access attempt by user ${userId}`);
    return ctx.reply('❌ Bu buyruq faqat administratorlar uchun.');
  }

  // Mark context as admin
  ctx.isAdmin = true;
  return next();
}

/**
 * Check if a user ID is an admin (utility function)
 * @param {number} userId - Telegram user ID
 * @returns {boolean}
 */
function isAdmin(userId) {
  return config.adminIds.includes(userId);
}

export { adminMiddleware, isAdmin };
