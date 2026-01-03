import { Markup } from 'telegraf';
import { AllowedName, ActionState } from '../models/index.js';
import config from '../config/index.js';
import { sleep } from '../utils/broadcast.js';
import { getMainMenuKeyboard } from '../utils/keyboards.js';

// Messages in Uzbek
const Messages = {
  NOT_ONBOARDED: '❌ Avval ro\'yxatdan o\'tishni yakunlang.',
  ENTER_FIRST_NAME: `📝 **WhatsApp guruhiga qo'shilish uchun ma'lumotlaringizni kiriting**

Iltimos, pasportingizdagi **ISM**ingizni kiriting (faqat birinchi ism):

_Masalan: ABDURAHMON_`,
  ENTER_LAST_NAME: (firstName) => `✅ Ismingiz: **${firstName}**

Endi pasportingizdagi **FAMILIYA**ngizni kiriting:

_Masalan: ABDULLAYEV_`,
  CONFIRM_DATA: (firstName, lastName) => `📋 **Ma'lumotlaringizni tasdiqlang:**

👤 **Ism:** ${firstName}
👤 **Familiya:** ${lastName}

Ma'lumotlar to'g'rimi?`,
  NOT_ALLOWED: (firstName, lastName) => `❌ **Ruxsat berilmadi**

Sizning ismingiz (${firstName} ${lastName}) tasdiqlangan ro'yxatda yo'q.

Agar bu xatolik deb hisoblasangiz, administrator bilan bog'laning yoki ma'lumotlarni qayta kiritib ko'ring.`,
  LINK_EXPIRED: '⏱ WhatsApp havola xabari muddati tugadi.\n\nAsosiy menyudan qayta so\'rashingiz mumkin.',
  LINK_EXPIRED_EDIT: '⏱ **Havola muddati tugadi**\n\nBu havola endi mavjud emas. Asosiy menyudan yangi so\'rang.',
  CANCELLED: '❌ Bekor qilindi.',
};

// Button labels
const ButtonLabels = {
  CONFIRM: '✅ Tasdiqlash',
  REENTER: '🔄 Qayta kiritish',
  CANCEL: '❌ Bekor qilish',
};

/**
 * Get confirmation keyboard for WhatsApp data
 */
function getWhatsAppConfirmKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(ButtonLabels.CONFIRM, 'whatsapp_confirm'),
      Markup.button.callback(ButtonLabels.REENTER, 'whatsapp_reenter'),
    ],
    [Markup.button.callback(ButtonLabels.CANCEL, 'whatsapp_cancel')],
  ]);
}

/**
 * Get re-enter keyboard after denied access
 */
function getReenterKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback(ButtonLabels.REENTER, 'whatsapp_reenter')],
    [Markup.button.callback(ButtonLabels.CANCEL, 'whatsapp_cancel')],
  ]);
}

/**
 * Handle WhatsApp link request - starts the name collection flow
 */
async function handleWhatsAppLinkRequest(ctx) {
  const user = ctx.user;

  // Ensure user is onboarded
  if (!user.isOnboarded) {
    return ctx.reply(Messages.NOT_ONBOARDED);
  }

  // Start WhatsApp verification flow - ask for first name
  user.actionState = ActionState.AWAITING_WHATSAPP_FIRST_NAME;
  user.whatsappFirstName = null;
  user.whatsappLastName = null;
  await user.save();

  return ctx.reply(Messages.ENTER_FIRST_NAME, { 
    parse_mode: 'Markdown',
    ...getMainMenuKeyboard(),
  });
}

/**
 * Handle first name input for WhatsApp verification
 */
async function handleWhatsAppFirstName(ctx) {
  const user = ctx.user;
  const firstName = ctx.message.text.trim().toUpperCase();

  // Validate name
  if (firstName.length < 2) {
    return ctx.reply('❌ Ism juda qisqa. Iltimos, to\'g\'ri ism kiriting.');
  }

  if (firstName.length > 50) {
    return ctx.reply('❌ Ism juda uzun. Iltimos, to\'g\'ri ism kiriting.');
  }

  // Save first name and ask for last name
  user.whatsappFirstName = firstName;
  user.actionState = ActionState.AWAITING_WHATSAPP_LAST_NAME;
  await user.save();

  return ctx.reply(Messages.ENTER_LAST_NAME(firstName), { parse_mode: 'Markdown' });
}

/**
 * Handle last name input for WhatsApp verification
 */
async function handleWhatsAppLastName(ctx) {
  const user = ctx.user;
  const lastName = ctx.message.text.trim().toUpperCase();

  // Validate name
  if (lastName.length < 2) {
    return ctx.reply('❌ Familiya juda qisqa. Iltimos, to\'g\'ri familiya kiriting.');
  }

  if (lastName.length > 50) {
    return ctx.reply('❌ Familiya juda uzun. Iltimos, to\'g\'ri familiya kiriting.');
  }

  // Save last name and show confirmation
  user.whatsappLastName = lastName;
  user.actionState = ActionState.AWAITING_WHATSAPP_CONFIRMATION;
  await user.save();

  return ctx.reply(
    Messages.CONFIRM_DATA(user.whatsappFirstName, lastName),
    { 
      parse_mode: 'Markdown',
      ...getWhatsAppConfirmKeyboard(),
    }
  );
}

/**
 * Handle confirmation of WhatsApp data
 */
async function handleWhatsAppConfirm(ctx) {
  await ctx.answerCbQuery('⏳ Tekshirilmoqda...');
  
  const user = ctx.user;
  const { whatsappFirstName, whatsappLastName } = user;

  // Check if name is in allowlist
  const isAllowed = await AllowedName.isNameAllowed(
    whatsappFirstName,
    whatsappLastName
  );

  // Reset action state
  user.actionState = ActionState.NONE;
  await user.save();

  if (!isAllowed) {
    await ctx.editMessageText(
      Messages.NOT_ALLOWED(whatsappFirstName, whatsappLastName),
      { 
        parse_mode: 'Markdown',
        ...getReenterKeyboard(),
      }
    );
    return;
  }

  // Access granted - show WhatsApp link with countdown
  await ctx.editMessageText('✅ Ruxsat berildi! Havola tayyorlanmoqda...');
  
  const displaySeconds = config.whatsappLinkDisplaySeconds;
  
  const message = await ctx.reply(
    formatWhatsAppMessage(displaySeconds),
    { 
      parse_mode: 'Markdown',
      protect_content: true, // Prevent forwarding, copying, saving
      ...getWhatsAppLinkKeyboard(config.whatsappGroupLink),
    }
  );

  // Start countdown
  await runCountdown(ctx, message.message_id, displaySeconds);
}

/**
 * Handle re-enter data request
 */
async function handleWhatsAppReenter(ctx) {
  await ctx.answerCbQuery('🔄 Ma\'lumotlarni qayta kiriting');
  
  const user = ctx.user;
  
  // Reset and start over
  user.actionState = ActionState.AWAITING_WHATSAPP_FIRST_NAME;
  user.whatsappFirstName = null;
  user.whatsappLastName = null;
  await user.save();

  await ctx.editMessageText('🔄 Ma\'lumotlarni qayta kiritamiz.');
  
  return ctx.reply(Messages.ENTER_FIRST_NAME, { 
    parse_mode: 'Markdown',
    ...getMainMenuKeyboard(),
  });
}

/**
 * Handle cancel WhatsApp flow
 */
async function handleWhatsAppCancel(ctx) {
  await ctx.answerCbQuery('❌ Bekor qilindi');
  
  const user = ctx.user;
  user.actionState = ActionState.NONE;
  user.whatsappFirstName = null;
  user.whatsappLastName = null;
  await user.save();

  await ctx.editMessageText(Messages.CANCELLED);
  return ctx.reply('📋 Asosiy menyu:', getMainMenuKeyboard());
}

/**
 * Format the WhatsApp link message with countdown (no visible link)
 * @param {number} seconds - Remaining seconds
 * @returns {string}
 */
function formatWhatsAppMessage(seconds) {
  return `✅ **Ruxsat berildi!**

WhatsApp guruhiga qo'shilish uchun quyidagi tugmani bosing.

⏱ Bu xabar **${seconds} soniya**dan keyin o'chiriladi.

⚠️ *Bu havola faqat shaxsiy foydalanish uchun.*`;
}

/**
 * Create inline keyboard with WhatsApp link button
 * @param {string} link - WhatsApp group link
 * @returns {Object}
 */
function getWhatsAppLinkKeyboard(link) {
  return Markup.inlineKeyboard([
    [Markup.button.url('💬 WhatsApp guruhiga qo\'shilish', link)],
  ]);
}

/**
 * Run countdown timer and update message
 * @param {Object} ctx - Telegraf context
 * @param {number} messageId - Message ID to update/delete
 * @param {number} totalSeconds - Total countdown duration
 */
async function runCountdown(ctx, messageId, totalSeconds) {
  const chatId = ctx.chat.id;
  let remaining = totalSeconds;

  // Update intervals (update every 10 seconds to avoid rate limits)
  const updateInterval = 10;

  while (remaining > 0) {
    await sleep(updateInterval * 1000);
    remaining -= updateInterval;

    if (remaining > 0) {
      try {
        await ctx.telegram.editMessageText(
          chatId,
          messageId,
          undefined,
          formatWhatsAppMessage(remaining),
          { 
            parse_mode: 'Markdown',
            ...getWhatsAppLinkKeyboard(config.whatsappGroupLink),
          }
        );
      } catch (error) {
        // Message might have been deleted or edited by user
        if (error.code === 400 && error.message?.includes('message is not modified')) {
          // Same content, ignore
          continue;
        }
        if (error.code === 400) {
          console.log('WhatsApp link message was modified or deleted');
          return;
        }
        console.error('Error updating countdown:', error.message);
      }
    }
  }

  // Delete the message when countdown reaches 0
  try {
    await ctx.telegram.deleteMessage(chatId, messageId);
    await ctx.reply(
      Messages.LINK_EXPIRED,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Error deleting WhatsApp link message:', error.message);
    // Try to edit instead if delete fails
    try {
      await ctx.telegram.editMessageText(
        chatId,
        messageId,
        undefined,
        Messages.LINK_EXPIRED_EDIT,
        { parse_mode: 'Markdown' }
      );
    } catch (editError) {
      console.error('Error editing expired message:', editError.message);
    }
  }
}

export { 
  handleWhatsAppLinkRequest,
  handleWhatsAppFirstName,
  handleWhatsAppLastName,
  handleWhatsAppConfirm,
  handleWhatsAppReenter,
  handleWhatsAppCancel,
};
