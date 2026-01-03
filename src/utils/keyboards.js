import { Markup } from 'telegraf';
import config from '../config/index.js';

/**
 * Button labels - centralized for easy modification (Uzbek)
 */
export const ButtonLabels = {
  // Onboarding
  SHARE_PHONE: '📱 Telefon raqamni yuborish',
  CHECK_SUBSCRIPTION: '✅ Tekshirish',
  CONFIRM_NAME: '✅ Tasdiqlash',
  REENTER_NAME: '🔄 Qayta kiritish',

  // Main menu
  WHATSAPP_LINK: '💬 WhatsApp guruh havolasi',
  WORK_TRAVEL: '✈️ Work & Travel (Germaniya)',
  STUDY: '📚 O\'qish (Germaniya)',
  AUSBILDUNG: '🎓 Ausbildung (Germaniya)',
  ARBEITSVISUM: '💼 Arbeitsvisum (Germaniya)',

  // Phone confirmation
  CONFIRM_PHONE: '✅ Ha, to\'g\'ri',
  DIFFERENT_PHONE: '🔄 Boshqa raqam',

  // Admin (keep in English for admin interface)
  ADMIN_PANEL: '🔐 Admin Panel',
  EXPORT_USERS: '📊 Export Users',
  ADD_NAMES: '➕ Add Allowed Names',
  VIEW_NAMES: '📋 View Allowed Names',
  BROADCAST: '📢 Broadcast Message',
  BACK: '◀️ Orqaga',
};

/**
 * Create keyboard for sharing phone number
 */
export function getPhoneRequestKeyboard() {
  return Markup.keyboard([
    [Markup.button.contactRequest(ButtonLabels.SHARE_PHONE)],
  ]).resize().oneTime();
}

/**
 * Create keyboard for channel subscription check
 */
export function getChannelCheckKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.url('📢 1-kanal', config.channel1Link)],
    [Markup.button.url('📢 2-kanal', config.channel2Link)],
    [Markup.button.callback(ButtonLabels.CHECK_SUBSCRIPTION, 'check_subscription')],
  ]);
}

/**
 * Create keyboard for name confirmation
 */
export function getNameConfirmationKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback(ButtonLabels.CONFIRM_NAME, 'confirm_name')],
    [Markup.button.callback(ButtonLabels.REENTER_NAME, 'reenter_name')],
  ]);
}

/**
 * Create main menu keyboard
 */
export function getMainMenuKeyboard() {
  return Markup.keyboard([
    [ButtonLabels.WHATSAPP_LINK],
    [ButtonLabels.WORK_TRAVEL],
    [ButtonLabels.STUDY],
    [ButtonLabels.AUSBILDUNG],
    [ButtonLabels.ARBEITSVISUM],
  ]).resize();
}

/**
 * Create phone confirmation keyboard
 */
export function getPhoneConfirmationKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback(ButtonLabels.CONFIRM_PHONE, 'confirm_phone')],
    [Markup.button.callback(ButtonLabels.DIFFERENT_PHONE, 'different_phone')],
  ]);
}

/**
 * Create admin panel keyboard
 */
export function getAdminPanelKeyboard() {
  return Markup.keyboard([
    [ButtonLabels.EXPORT_USERS],
    [ButtonLabels.ADD_NAMES, ButtonLabels.VIEW_NAMES],
    [ButtonLabels.BROADCAST],
    [ButtonLabels.BACK],
  ]).resize();
}

/**
 * Remove keyboard
 */
export function removeKeyboard() {
  return Markup.removeKeyboard();
}
