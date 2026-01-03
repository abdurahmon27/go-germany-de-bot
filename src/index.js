import { Telegraf } from 'telegraf';
import config from './config/index.js';
import { connectDB, disconnectDB } from './database/connection.js';
import { userMiddleware, adminMiddleware, isAdmin } from './middlewares/index.js';
import { OnboardingState, ActionState } from './models/index.js';
import {
  handleStart,
  handleContact,
  handleCheckSubscription,
  handleOnboardingText,
  handleConfirmName,
  handleReenterName,
  showOnboardingStep,
} from './handlers/onboarding.js';
import { showMainMenu, ServiceTypes } from './handlers/menu.js';
import { 
  handleWhatsAppLinkRequest,
  handleWhatsAppFirstName,
  handleWhatsAppLastName,
  handleWhatsAppConfirm,
  handleWhatsAppReenter,
  handleWhatsAppCancel,
} from './handlers/whatsapp.js';
import {
  handleServiceSelection,
  handleConfirmPhone,
  handleDifferentPhone,
  handleSecondaryPhoneInput,
} from './handlers/services.js';
import {
  handleAdminCommand,
  handleExportUsers,
  handleAddNamesRequest,
  handleViewNames,
  handleBroadcastRequest,
  handleBackFromAdmin,
  handleAdminText,
  isAdminInSpecialState,
  handleBroadcastInput,
} from './handlers/admin.js';
import { ButtonLabels, getMainMenuKeyboard } from './utils/keyboards.js';

// Initialize bot
const bot = new Telegraf(config.botToken);

// Global error handler
bot.catch((err, ctx) => {
  console.error(`❌ Error for ${ctx.updateType}:`, err);
  try {
    ctx.reply('❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring yoki /start buyrug\'ini bosing.');
  } catch (replyError) {
    console.error('Failed to send error message:', replyError);
  }
});

// Register middleware
bot.use(userMiddleware);

// ============================================
// COMMAND HANDLERS
// ============================================

// /start command
bot.start(handleStart);

// /admin command (admin only)
bot.command('admin', adminMiddleware, handleAdminCommand);

// /menu command - show main menu
bot.command('menu', async (ctx) => {
  if (!ctx.user.isOnboarded) {
    return showOnboardingStep(ctx, ctx.user.onboardingState);
  }
  return showMainMenu(ctx);
});

// /cancel command - cancel current operation
bot.command('cancel', async (ctx) => {
  const user = ctx.user;
  
  // Reset action state
  user.actionState = ActionState.NONE;
  user.currentService = null;
  user.whatsappFirstName = null;
  user.whatsappLastName = null;
  await user.save();

  if (user.isOnboarded) {
    return ctx.reply('❌ Amal bekor qilindi.', getMainMenuKeyboard());
  } else {
    return showOnboardingStep(ctx, user.onboardingState);
  }
});

// ============================================
// CALLBACK QUERY HANDLERS
// ============================================

// Channel subscription check
bot.action('check_subscription', handleCheckSubscription);

// Name confirmation
bot.action('confirm_name', handleConfirmName);
bot.action('reenter_name', handleReenterName);

// Phone confirmation for services
bot.action('confirm_phone', handleConfirmPhone);
bot.action('different_phone', handleDifferentPhone);

// WhatsApp verification flow
bot.action('whatsapp_confirm', handleWhatsAppConfirm);
bot.action('whatsapp_reenter', handleWhatsAppReenter);
bot.action('whatsapp_cancel', handleWhatsAppCancel);

// ============================================
// CONTACT HANDLER
// ============================================

bot.on('contact', handleContact);

// ============================================
// TEXT MESSAGE HANDLERS
// ============================================

bot.on('text', async (ctx) => {
  const user = ctx.user;
  const text = ctx.message.text;

  // Check if admin is in special state (adding names or broadcasting)
  if (isAdmin(ctx.from.id) && isAdminInSpecialState(ctx.from.id)) {
    const handled = await handleAdminText(ctx);
    if (handled) return;
  }

  // Handle admin panel buttons
  if (isAdmin(ctx.from.id)) {
    switch (text) {
      case ButtonLabels.EXPORT_USERS:
        return handleExportUsers(ctx);
      case ButtonLabels.ADD_NAMES:
        return handleAddNamesRequest(ctx);
      case ButtonLabels.VIEW_NAMES:
        return handleViewNames(ctx);
      case ButtonLabels.BROADCAST:
        return handleBroadcastRequest(ctx);
      case ButtonLabels.BACK:
        return handleBackFromAdmin(ctx);
    }
  }

  // Handle onboarding text input (first name, last name)
  if (!user.isOnboarded) {
    const handled = await handleOnboardingText(ctx);
    if (handled) return;

    // If not in text input state, redirect to current step
    if (
      user.onboardingState !== OnboardingState.AWAITING_FIRST_NAME &&
      user.onboardingState !== OnboardingState.AWAITING_LAST_NAME
    ) {
      return showOnboardingStep(ctx, user.onboardingState);
    }
    return;
  }

  // Handle secondary phone input
  if (user.actionState === ActionState.AWAITING_SECONDARY_PHONE) {
    return handleSecondaryPhoneInput(ctx);
  }

  // Handle WhatsApp verification flow text inputs
  if (user.actionState === ActionState.AWAITING_WHATSAPP_FIRST_NAME) {
    return handleWhatsAppFirstName(ctx);
  }
  
  if (user.actionState === ActionState.AWAITING_WHATSAPP_LAST_NAME) {
    return handleWhatsAppLastName(ctx);
  }

  // Handle main menu buttons
  switch (text) {
    case ButtonLabels.WHATSAPP_LINK:
      return handleWhatsAppLinkRequest(ctx);

    case ButtonLabels.WORK_TRAVEL:
      return handleServiceSelection(ctx, ServiceTypes[text]);

    case ButtonLabels.STUDY:
      return handleServiceSelection(ctx, ServiceTypes[text]);

    case ButtonLabels.AUSBILDUNG:
      return handleServiceSelection(ctx, ServiceTypes[text]);

    case ButtonLabels.ARBEITSVISUM:
      return handleServiceSelection(ctx, ServiceTypes[text]);

    default:
      // Unknown text, show main menu
      return ctx.reply(
        '❓ Tushunmadim. Iltimos, menyu tugmalaridan foydalaning.',
        getMainMenuKeyboard()
      );
  }
});

// ============================================
// MEDIA HANDLERS (for broadcast)
// ============================================

// Handle media messages from admin for broadcast
bot.on(['photo', 'video', 'document', 'audio', 'voice'], async (ctx) => {
  if (isAdmin(ctx.from.id) && isAdminInSpecialState(ctx.from.id)) {
    return handleBroadcastInput(ctx);
  }
  
  // For regular users, ignore or show help
  if (ctx.user.isOnboarded) {
    return ctx.reply(
      '❓ Men faqat matn buyruqlarini qabul qilaman. Iltimos, menyu tugmalaridan foydalaning.',
      getMainMenuKeyboard()
    );
  }
});

// ============================================
// STARTUP
// ============================================

async function startBot() {
  try {
    // Connect to database
    await connectDB();

    // Launch bot
    await bot.launch();
    console.log('🤖 Bot started successfully!');
    console.log(`📋 Admin IDs: ${config.adminIds.join(', ') || 'None configured'}`);
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

async function shutdown(signal) {
  console.log(`\n📴 ${signal} received. Shutting down gracefully...`);
  
  try {
    bot.stop(signal);
    await disconnectDB();
    console.log('✅ Shutdown complete.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the bot
startBot();
