import config from '../config/index.js';
import { User } from '../models/index.js';

/**
 * Broadcast a message to all onboarded users
 * Handles rate limiting and errors gracefully
 * 
 * @param {Object} telegram - Telegram API instance (ctx.telegram)
 * @param {Object} message - Original message to forward/copy
 * @param {Function} progressCallback - Callback for progress updates
 * @returns {Promise<{success: number, failed: number, blocked: number}>}
 */
async function broadcastMessage(telegram, message, progressCallback = null) {
  const users = await User.find({ isOnboarded: true }).select('telegramId').lean();
  
  let success = 0;
  let failed = 0;
  let blocked = 0;

  const total = users.length;

  for (let i = 0; i < users.length; i++) {
    const user = users[i];

    try {
      // Copy the message to preserve formatting and media
      await telegram.copyMessage(
        user.telegramId,
        message.chat.id,
        message.message_id
      );
      success++;
    } catch (error) {
      if (error.code === 403 || error.description?.includes('blocked')) {
        // User blocked the bot
        blocked++;
      } else {
        failed++;
        console.error(`❌ Failed to send to ${user.telegramId}:`, error.message);
      }
    }

    // Progress callback
    if (progressCallback && (i + 1) % 50 === 0) {
      await progressCallback({
        current: i + 1,
        total,
        success,
        failed,
        blocked,
      });
    }

    // Rate limiting delay
    await sleep(config.broadcastDelayMs);
  }

  return { success, failed, blocked, total };
}

/**
 * Send a text message to all onboarded users
 * 
 * @param {Object} telegram - Telegram API instance (ctx.telegram)
 * @param {string} text - Text to send
 * @param {Object} options - Extra Telegram options
 * @returns {Promise<{success: number, failed: number, blocked: number}>}
 */
async function broadcastText(telegram, text, options = {}) {
  const users = await User.find({ isOnboarded: true }).select('telegramId').lean();
  
  let success = 0;
  let failed = 0;
  let blocked = 0;

  for (const user of users) {
    try {
      await telegram.sendMessage(user.telegramId, text, options);
      success++;
    } catch (error) {
      if (error.code === 403 || error.description?.includes('blocked')) {
        blocked++;
      } else {
        failed++;
        console.error(`❌ Failed to send to ${user.telegramId}:`, error.message);
      }
    }

    // Rate limiting delay
    await sleep(config.broadcastDelayMs);
  }

  return { success, failed, blocked, total: users.length };
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { broadcastMessage, broadcastText, sleep };
