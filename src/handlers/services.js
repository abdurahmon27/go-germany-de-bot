import { ActionState } from '../models/index.js';
import {
  getPhoneConfirmationKeyboard,
  getMainMenuKeyboard,
  removeKeyboard,
} from '../utils/keyboards.js';
import { formatPhone, isValidPhone } from '../utils/validation.js';
import { ServiceNames } from './menu.js';
import config from '../config/index.js';

/**
 * Handle service selection (Work & Travel, Study, Ausbildung, Arbeitsvisum)
 * @param {Object} ctx - Telegraf context
 * @param {string} serviceType - Type of service selected
 */
async function handleServiceSelection(ctx, serviceType) {
  const user = ctx.user;

  // Store current service selection
  user.currentService = serviceType;
  user.actionState = ActionState.AWAITING_PHONE_CONFIRMATION;
  await user.save();

  const serviceName = ServiceNames[serviceType] || serviceType;
  const phoneDisplay = user.primaryPhone || 'Mavjud emas';

  return ctx.reply(
    `📋 **${serviceName}**

Siz ushbu xizmatni tanladingiz. Davom etishdan oldin telefon raqamingizni tasdiqlang:

📱 **Joriy raqam:** ${phoneDisplay}

Siz bilan bog'lanishimiz uchun bu raqam to'g'rimi?`,
    {
      parse_mode: 'Markdown',
      ...getPhoneConfirmationKeyboard(),
    }
  );
}

/**
 * Handle phone confirmation
 */
async function handleConfirmPhone(ctx) {
  const user = ctx.user;

  if (user.actionState !== ActionState.AWAITING_PHONE_CONFIRMATION) {
    return ctx.answerCbQuery('❌ Noto\'g\'ri amal.');
  }

  const serviceName = ServiceNames[user.currentService] || user.currentService;

  // Reset action state
  user.actionState = ActionState.NONE;
  await user.save();

  await ctx.answerCbQuery('✅ Raqam tasdiqlandi!');
  await ctx.editMessageText(
    `✅ **So'rov yuborildi**

Xizmat: ${serviceName}
Telefon: ${user.primaryPhone}

📞 Administrator tez orada siz bilan ushbu raqam orqali bog'lanadi.

Qiziqishingiz uchun rahmat!`,
    { parse_mode: 'Markdown' }
  );

  // Notify admins
  await notifyAdminsAboutServiceRequest(ctx, user, serviceName);

  return ctx.reply('📋 Asosiy menyuga qaytish...', getMainMenuKeyboard());
}

/**
 * Handle request for different phone number
 */
async function handleDifferentPhone(ctx) {
  const user = ctx.user;

  if (user.actionState !== ActionState.AWAITING_PHONE_CONFIRMATION) {
    return ctx.answerCbQuery('❌ Noto\'g\'ri amal.');
  }

  user.actionState = ActionState.AWAITING_SECONDARY_PHONE;
  await user.save();

  await ctx.answerCbQuery('📱 Telefon raqamingizni kiriting');
  return ctx.editMessageText(
    `📱 **Telefon raqamni kiriting**

Siz bilan bog'lanishimiz kerak bo'lgan telefon raqamni kiriting.

Format: +998901234567 (mamlakat kodi bilan)`,
    { parse_mode: 'Markdown' }
  );
}

/**
 * Handle secondary phone number input
 */
async function handleSecondaryPhoneInput(ctx) {
  const user = ctx.user;
  const text = ctx.message?.text?.trim();

  if (user.actionState !== ActionState.AWAITING_SECONDARY_PHONE) {
    return null; // Not in the correct state
  }

  if (!text) {
    return ctx.reply('❌ Iltimos, to\'g\'ri telefon raqam kiriting.');
  }

  // Validate phone
  if (!isValidPhone(text)) {
    return ctx.reply(
      '❌ Telefon raqam formati noto\'g\'ri.\n\nIltimos, mamlakat kodi bilan to\'g\'ri raqam kiriting (masalan: +998901234567):'
    );
  }

  const formattedPhone = formatPhone(text);
  const serviceName = ServiceNames[user.currentService] || user.currentService;

  // Store as secondary phone (preserving primary)
  user.secondaryPhone = formattedPhone;
  user.actionState = ActionState.NONE;
  await user.save();

  await ctx.reply(
    `✅ **So'rov yuborildi**

Xizmat: ${serviceName}
Telefon: ${formattedPhone}

📞 Administrator tez orada siz bilan ushbu raqam orqali bog'lanadi.

Qiziqishingiz uchun rahmat!`,
    { parse_mode: 'Markdown' }
  );

  // Notify admins
  await notifyAdminsAboutServiceRequest(ctx, user, serviceName, formattedPhone);

  return ctx.reply('📋 Asosiy menyuga qaytish...', getMainMenuKeyboard());
}

/**
 * Notify admins about new service request
 * @param {Object} ctx - Telegraf context
 * @param {Object} user - User document
 * @param {string} serviceName - Name of the service
 * @param {string} contactPhone - Phone to contact (optional, uses primary if not provided)
 */
async function notifyAdminsAboutServiceRequest(ctx, user, serviceName, contactPhone = null) {
  const phone = contactPhone || user.primaryPhone;
  const username = user.username ? `@${user.username}` : 'N/A';

  const notification = `🔔 **New Service Request**

📋 **Service:** ${serviceName}
👤 **User:** ${user.telegramFirstName || ''} ${user.telegramLastName || ''}
🆔 **Username:** ${username}
📱 **Contact Phone:** ${phone}
🪪 **Passport Name:** ${user.passportFirstName} ${user.passportLastName}
📅 **Time:** ${new Date().toISOString()}

Please contact the user to proceed.`;

  for (const adminId of config.adminIds) {
    try {
      await ctx.telegram.sendMessage(adminId, notification, {
        parse_mode: 'Markdown',
      });
    } catch (error) {
      console.error(`Failed to notify admin ${adminId}:`, error.message);
    }
  }
}

export {
  handleServiceSelection,
  handleConfirmPhone,
  handleDifferentPhone,
  handleSecondaryPhoneInput,
};
