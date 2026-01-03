import dotenv from 'dotenv';

dotenv.config();

/**
 * Validates that a required environment variable is set
 * @param {string} name - Variable name
 * @param {string} value - Variable value
 */
function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Parses a comma-separated string into an array of numbers
 * @param {string} value - Comma-separated string
 * @returns {number[]}
 */
function parseNumberArray(value) {
  if (!value) return [];
  return value.split(',').map((id) => parseInt(id.trim(), 10)).filter((id) => !isNaN(id));
}

const config = {
  // Bot Configuration
  botToken: requireEnv('BOT_TOKEN', process.env.BOT_TOKEN),
  
  // MongoDB Configuration
  mongoUri: requireEnv('MONGO_URI', process.env.MONGO_URI),
  
  // Admin Configuration
  adminIds: parseNumberArray(process.env.ADMIN_IDS),
  
  // Channel Configuration
  channel1Id: requireEnv('CHANNEL_1_ID', process.env.CHANNEL_1_ID),
  channel2Id: requireEnv('CHANNEL_2_ID', process.env.CHANNEL_2_ID),
  channel1Link: requireEnv('CHANNEL_1_LINK', process.env.CHANNEL_1_LINK),
  channel2Link: requireEnv('CHANNEL_2_LINK', process.env.CHANNEL_2_LINK),
  
  // WhatsApp Configuration
  whatsappGroupLink: requireEnv('WHATSAPP_GROUP_LINK', process.env.WHATSAPP_GROUP_LINK),
  whatsappLinkDisplaySeconds: parseInt(process.env.WHATSAPP_LINK_DISPLAY_SECONDS, 10) || 60,
  
  // Rate Limiting
  broadcastDelayMs: parseInt(process.env.BROADCAST_DELAY_MS, 10) || 50,
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

// Validate admin IDs
if (config.adminIds.length === 0) {
  console.warn('Warning: No admin IDs configured. Admin features will be inaccessible.');
}

export default config;
