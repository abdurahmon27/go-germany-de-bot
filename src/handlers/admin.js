import { Markup } from 'telegraf';
import { AllowedName, User } from '../models/index.js';
import { 
  getAdminPanelKeyboard, 
  getMainMenuKeyboard, 
  ButtonLabels,
  removeKeyboard,
} from '../utils/keyboards.js';
import { exportUsersToExcel, getUserStats } from '../utils/excel.js';
import { broadcastMessage } from '../utils/broadcast.js';
import { parseNameList } from '../utils/validation.js';

/**
 * Admin action states
 */
const AdminState = {
  NONE: 'none',
  AWAITING_NAMES: 'awaiting_names',
  AWAITING_BROADCAST: 'awaiting_broadcast',
};

// Store admin states in memory (could be moved to Redis for production scale)
const adminStates = new Map();

/**
 * Get admin state
 * @param {number} adminId - Admin Telegram ID
 * @returns {string}
 */
function getAdminState(adminId) {
  return adminStates.get(adminId) || AdminState.NONE;
}

/**
 * Set admin state
 * @param {number} adminId - Admin Telegram ID
 * @param {string} state - New state
 */
function setAdminState(adminId, state) {
  adminStates.set(adminId, state);
}

/**
 * Handle /admin command
 */
async function handleAdminCommand(ctx) {
  const stats = await getUserStats();

  return ctx.reply(
    `🔐 **Admin Panel**

📊 **Statistics:**
• Total users: ${stats.total}
• Onboarded: ${stats.onboarded}
• Pending onboarding: ${stats.pending}
• Registered today: ${stats.today}

Select an action below:`,
    {
      parse_mode: 'Markdown',
      ...getAdminPanelKeyboard(),
    }
  );
}

/**
 * Handle export users request
 */
async function handleExportUsers(ctx) {
  try {
    await ctx.reply('⏳ Generating Excel file...');

    const buffer = await exportUsersToExcel();
    const stats = await getUserStats();
    const filename = `users_export_${new Date().toISOString().split('T')[0]}.xlsx`;

    await ctx.replyWithDocument(
      { source: buffer, filename },
      {
        caption: `📊 User Export\n\nTotal onboarded users: ${stats.onboarded}\nGenerated: ${new Date().toISOString()}`,
      }
    );
  } catch (error) {
    console.error('Error exporting users:', error);
    await ctx.reply('❌ Failed to export users. Please try again later.');
  }
}

/**
 * Handle add names request
 */
async function handleAddNamesRequest(ctx) {
  setAdminState(ctx.from.id, AdminState.AWAITING_NAMES);

  return ctx.reply(
    `📝 **Add Allowed Names**

Send me a list of full names (first name and last name), one per line.

Example:
\`\`\`
JOHN DOE
JANE SMITH
ALEX JOHNSON
\`\`\`

Names will be converted to uppercase automatically.

Send /cancel to cancel this operation.`,
    { 
      parse_mode: 'Markdown',
      ...removeKeyboard(),
    }
  );
}

/**
 * Handle names input from admin
 */
async function handleNamesInput(ctx) {
  const adminId = ctx.from.id;
  
  if (getAdminState(adminId) !== AdminState.AWAITING_NAMES) {
    return null;
  }

  const text = ctx.message?.text;
  
  if (!text) {
    return ctx.reply('❌ Please send text containing the names.');
  }

  if (text === '/cancel') {
    setAdminState(adminId, AdminState.NONE);
    return ctx.reply('❌ Operation cancelled.', getAdminPanelKeyboard());
  }

  const names = parseNameList(text);

  if (names.length === 0) {
    return ctx.reply('❌ No valid names found. Please try again with names on separate lines.');
  }

  try {
    const result = await AllowedName.addNames(names, adminId);
    setAdminState(adminId, AdminState.NONE);

    return ctx.reply(
      `✅ **Names Added**

• Added: ${result.added}
• Duplicates skipped: ${result.duplicates}
• Total processed: ${names.length}`,
      {
        parse_mode: 'Markdown',
        ...getAdminPanelKeyboard(),
      }
    );
  } catch (error) {
    console.error('Error adding names:', error);
    return ctx.reply('❌ Failed to add names. Please try again.', getAdminPanelKeyboard());
  }
}

/**
 * Handle view allowed names request
 */
async function handleViewNames(ctx) {
  try {
    const names = await AllowedName.getAllNames();
    
    if (names.length === 0) {
      return ctx.reply(
        '📋 **Allowed Names List**\n\nNo names have been added yet.\n\nUse "➕ Add Allowed Names" to add names.',
        { parse_mode: 'Markdown' }
      );
    }

    // Split into chunks if too many names
    const nameList = names.map((n, i) => `${i + 1}. ${n.fullName}`).join('\n');
    
    // Telegram message limit is 4096 characters
    if (nameList.length > 3500) {
      const chunks = [];
      let currentChunk = '';
      const lines = nameList.split('\n');
      
      for (const line of lines) {
        if ((currentChunk + '\n' + line).length > 3500) {
          chunks.push(currentChunk);
          currentChunk = line;
        } else {
          currentChunk += (currentChunk ? '\n' : '') + line;
        }
      }
      if (currentChunk) chunks.push(currentChunk);
      
      await ctx.reply(`📋 **Allowed Names List** (${names.length} total)\n\nSending in multiple messages...`, { parse_mode: 'Markdown' });
      
      for (const chunk of chunks) {
        await ctx.reply(chunk);
      }
    } else {
      await ctx.reply(
        `📋 **Allowed Names List** (${names.length} total)\n\n${nameList}`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (error) {
    console.error('Error fetching allowed names:', error);
    return ctx.reply('❌ Failed to fetch names. Please try again.');
  }
}

/**
 * Handle broadcast request
 */
async function handleBroadcastRequest(ctx) {
  setAdminState(ctx.from.id, AdminState.AWAITING_BROADCAST);

  const stats = await getUserStats();

  return ctx.reply(
    `📢 **Broadcast Message**

Send me the message you want to broadcast to all ${stats.onboarded} onboarded users.

You can send:
• Text messages
• Photos with captions
• Videos with captions
• Documents

Send /cancel to cancel this operation.`,
    { 
      parse_mode: 'Markdown',
      ...removeKeyboard(),
    }
  );
}

/**
 * Handle broadcast message input
 */
async function handleBroadcastInput(ctx) {
  const adminId = ctx.from.id;
  
  if (getAdminState(adminId) !== AdminState.AWAITING_BROADCAST) {
    return null;
  }

  const message = ctx.message;

  if (message?.text === '/cancel') {
    setAdminState(adminId, AdminState.NONE);
    return ctx.reply('❌ Broadcast cancelled.', getAdminPanelKeyboard());
  }

  setAdminState(adminId, AdminState.NONE);

  // Confirm before broadcasting
  await ctx.reply(
    '⏳ Starting broadcast...\n\nThis may take a while depending on the number of users.',
    getAdminPanelKeyboard()
  );

  try {
    const result = await broadcastMessage(ctx.telegram, message, async (progress) => {
      // Progress update every 50 users
      await ctx.reply(
        `📢 Broadcast progress: ${progress.current}/${progress.total}\n✅ Sent: ${progress.success}\n❌ Failed: ${progress.failed}\n🚫 Blocked: ${progress.blocked}`
      );
    });

    return ctx.reply(
      `✅ **Broadcast Complete**

📊 Results:
• Total users: ${result.total}
• Successfully sent: ${result.success}
• Failed: ${result.failed}
• Users who blocked bot: ${result.blocked}`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Broadcast error:', error);
    return ctx.reply('❌ Broadcast failed. Please try again later.');
  }
}

/**
 * Handle back to main menu from admin panel
 */
async function handleBackFromAdmin(ctx) {
  setAdminState(ctx.from.id, AdminState.NONE);
  return ctx.reply('📋 Returning to main menu...', getMainMenuKeyboard());
}

/**
 * Handle admin text messages
 * Routes to appropriate handler based on admin state
 */
async function handleAdminText(ctx) {
  const adminId = ctx.from.id;
  const state = getAdminState(adminId);

  switch (state) {
    case AdminState.AWAITING_NAMES:
      return handleNamesInput(ctx);
    case AdminState.AWAITING_BROADCAST:
      return handleBroadcastInput(ctx);
    default:
      return null;
  }
}

/**
 * Check if admin is in a special state
 * @param {number} adminId - Admin Telegram ID
 * @returns {boolean}
 */
function isAdminInSpecialState(adminId) {
  return getAdminState(adminId) !== AdminState.NONE;
}

export {
  handleAdminCommand,
  handleExportUsers,
  handleAddNamesRequest,
  handleNamesInput,
  handleViewNames,
  handleBroadcastRequest,
  handleBroadcastInput,
  handleBackFromAdmin,
  handleAdminText,
  isAdminInSpecialState,
  AdminState,
  getAdminState,
  setAdminState,
};
