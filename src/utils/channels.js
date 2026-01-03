import config from '../config/index.js';

/**
 * Check if a user is a member of a specific channel
 * @param {Object} telegram - Telegram API instance (ctx.telegram)
 * @param {number} userId - Telegram user ID
 * @param {string} channelId - Channel ID or username
 * @returns {Promise<boolean>}
 */
async function checkChannelMembership(telegram, userId, channelId) {
  try {
    const member = await telegram.getChatMember(channelId, userId);
    const validStatuses = ['member', 'administrator', 'creator'];
    return validStatuses.includes(member.status);
  } catch (error) {
    // If bot can't check (not admin in channel, etc.), log and return false
    console.error(`❌ Error checking channel membership for ${channelId}:`, error.message);
    return false;
  }
}

/**
 * Check if user is subscribed to all required channels
 * @param {Object} telegram - Telegram API instance (ctx.telegram)
 * @param {number} userId - Telegram user ID
 * @returns {Promise<{isSubscribed: boolean, missingChannels: string[]}>}
 */
async function checkAllChannels(telegram, userId) {
  const channels = [
    { id: config.channel1Id, link: config.channel1Link },
    { id: config.channel2Id, link: config.channel2Link },
  ];

  const missingChannels = [];

  for (const channel of channels) {
    const isMember = await checkChannelMembership(telegram, userId, channel.id);
    if (!isMember) {
      missingChannels.push(channel.link);
    }
  }

  return {
    isSubscribed: missingChannels.length === 0,
    missingChannels,
  };
}

export { checkChannelMembership, checkAllChannels };
