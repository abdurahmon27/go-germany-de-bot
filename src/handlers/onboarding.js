import { User, OnboardingState } from '../models/index.js';
import {
  getPhoneRequestKeyboard,
  getChannelCheckKeyboard,
  getNameConfirmationKeyboard,
  getMainMenuKeyboard,
  removeKeyboard,
} from '../utils/keyboards.js';
import { checkAllChannels } from '../utils/channels.js';
import { validateName, formatPhone } from '../utils/validation.js';
import { isAdmin } from '../middlewares/index.js';

/**
 * Messages for different onboarding steps (Uzbek)
 */
const Messages = {
  WELCOME: `🇩🇪 Go Germany botiga xush kelibsiz!

Davom etish uchun quyidagi tugmani bosib telefon raqamingizni yuboring.

Bu bizning xizmatlarimizdan foydalanish uchun majburiydir.`,

  PHONE_RECEIVED: `✅ Rahmat! Telefon raqamingiz saqlandi.

Keyingi qadam - rasmiy kanallarimizga obuna bo'ling:`,

  JOIN_CHANNELS: `📢 Iltimos, quyidagi ikkala kanalga obuna bo'ling va "Tekshirish" tugmasini bosing:`,

  NOT_SUBSCRIBED: `❌ Siz hali barcha kerakli kanallarga obuna bo'lmagansiz.

Iltimos, ikkala kanalga ham obuna bo'ling va qaytadan urinib ko'ring:`,

  CHANNELS_VERIFIED: `✅ Ajoyib! Siz ikkala kanalga ham obuna bo'ldingiz.

Endi O'zbekiston xorijga chiqish pasportingizdagi **Ismingizni** aynan yozing:`,

  ENTER_LAST_NAME: (firstName) =>
    `✅ Ism saqlandi: **${firstName}**

Endi O'zbekiston xorijga chiqish pasportingizdagi **Familiyangizni** aynan yozing:`,

  CONFIRM_NAME: (firstName, lastName) =>
    `📋 Pasport ma'lumotlaringizni tasdiqlang:

**Ism:** ${firstName}
**Familiya:** ${lastName}

Bu to'g'rimi?`,

  NAME_CONFIRMED: `✅ Ma'lumotlaringiz muvaffaqiyatli saqlandi!

Endi barcha xizmatlarimizdan foydalanishingiz mumkin.`,

  INVALID_NAME: (error) => `❌ ${error}\n\nIltimos, qaytadan urinib ko'ring:`,
};

/**
 * Show the appropriate onboarding step based on current state
 * @param {Object} ctx - Telegraf context
 * @param {string} state - Current onboarding state
 */
async function showOnboardingStep(ctx, state) {
  switch (state) {
    case OnboardingState.STARTED:
      return ctx.reply(Messages.WELCOME, getPhoneRequestKeyboard());

    case OnboardingState.PHONE_SHARED:
      return ctx.reply(Messages.JOIN_CHANNELS, getChannelCheckKeyboard());

    case OnboardingState.CHANNELS_JOINED:
    case OnboardingState.AWAITING_FIRST_NAME:
      return ctx.reply(Messages.CHANNELS_VERIFIED, {
        parse_mode: 'Markdown',
        ...removeKeyboard(),
      });

    case OnboardingState.AWAITING_LAST_NAME:
      return ctx.reply(
        Messages.ENTER_LAST_NAME(ctx.user.passportFirstName),
        { parse_mode: 'Markdown' }
      );

    case OnboardingState.AWAITING_NAME_CONFIRMATION:
      return ctx.reply(
        Messages.CONFIRM_NAME(
          ctx.user.passportFirstName,
          ctx.user.passportLastName
        ),
        {
          parse_mode: 'Markdown',
          ...getNameConfirmationKeyboard(),
        }
      );

    case OnboardingState.COMPLETED:
      return ctx.reply(Messages.NAME_CONFIRMED, getMainMenuKeyboard());

    default:
      return ctx.reply(Messages.WELCOME, getPhoneRequestKeyboard());
  }
}

/**
 * Handle /start command
 */
async function handleStart(ctx) {
  const user = ctx.user;

  // Check if user is admin and show admin hint
  const adminHint = isAdmin(ctx.from.id) 
    ? '\n\n🔐 Siz adminsiz. Admin paneliga kirish uchun /admin buyrug\'ini yuboring.'
    : '';

  // If user is already onboarded, show main menu
  if (user.isOnboarded) {
    return ctx.reply(
      '👋 Qaytganingizdan xursandmiz! Quyidagi menyudan tanlang:' + adminHint,
      getMainMenuKeyboard()
    );
  }

  // For admins who haven't onboarded, still show admin hint
  if (isAdmin(ctx.from.id)) {
    await ctx.reply('🔐 Siz adminsiz. Istalgan vaqtda /admin buyrug\'i orqali admin paneliga kirishingiz mumkin.');
  }

  // Otherwise, show current onboarding step
  return showOnboardingStep(ctx, user.onboardingState);
}

/**
 * Handle contact sharing (phone number)
 */
async function handleContact(ctx) {
  const contact = ctx.message?.contact;

  if (!contact) {
    return ctx.reply('❌ Iltimos, telefon raqamingizni yuborish uchun tugmani bosing.', 
      getPhoneRequestKeyboard());
  }

  // Verify the contact belongs to the user
  if (contact.user_id !== ctx.from.id) {
    return ctx.reply(
      '❌ Iltimos, boshqa birovning emas, o\'z telefon raqamingizni yuboring.',
      getPhoneRequestKeyboard()
    );
  }

  const user = ctx.user;
  const phoneNumber = formatPhone(contact.phone_number);

  // Update user with phone number
  user.primaryPhone = phoneNumber;
  user.onboardingState = OnboardingState.PHONE_SHARED;
  await user.save();

  // Show next step
  await ctx.reply(Messages.PHONE_RECEIVED, removeKeyboard());
  return ctx.reply(Messages.JOIN_CHANNELS, getChannelCheckKeyboard());
}

/**
 * Handle channel subscription check
 */
async function handleCheckSubscription(ctx) {
  const user = ctx.user;

  // Verify phone was shared
  if (!user.primaryPhone) {
    await ctx.answerCbQuery('❌ Avval telefon raqamingizni yuboring.');
    return showOnboardingStep(ctx, OnboardingState.STARTED);
  }

  const { isSubscribed, missingChannels } = await checkAllChannels(
    ctx.telegram,
    ctx.from.id
  );

  if (!isSubscribed) {
    await ctx.answerCbQuery('❌ Barcha kanallarga obuna bo\'ling.');
    // Try to edit message, ignore error if content is the same
    try {
      await ctx.editMessageText(
        Messages.NOT_SUBSCRIBED,
        getChannelCheckKeyboard()
      );
    } catch (error) {
      // Ignore "message is not modified" error
      if (!error.message?.includes('message is not modified')) {
        throw error;
      }
    }
    return;
  }

  // Update state
  user.onboardingState = OnboardingState.AWAITING_FIRST_NAME;
  await user.save();

  await ctx.answerCbQuery('✅ Obuna tasdiqlandi!');
  await ctx.editMessageText('✅ Kanallar tasdiqlandi! Quyida davom eting...');
  
  return ctx.reply(
    Messages.CHANNELS_VERIFIED.replace('Ajoyib! Siz ikkala kanalga ham obuna bo\'ldingiz.\n\n', ''),
    { parse_mode: 'Markdown', ...removeKeyboard() }
  );
}

/**
 * Handle text input during onboarding (first name, last name)
 */
async function handleOnboardingText(ctx) {
  const user = ctx.user;
  const text = ctx.message?.text?.trim();

  if (!text) {
    return;
  }

  // Handle first name input
  if (user.onboardingState === OnboardingState.AWAITING_FIRST_NAME) {
    const { isValid, sanitized, error } = validateName(text);

    if (!isValid) {
      return ctx.reply(Messages.INVALID_NAME(error));
    }

    user.passportFirstName = sanitized;
    user.onboardingState = OnboardingState.AWAITING_LAST_NAME;
    await user.save();

    return ctx.reply(Messages.ENTER_LAST_NAME(sanitized), {
      parse_mode: 'Markdown',
    });
  }

  // Handle last name input
  if (user.onboardingState === OnboardingState.AWAITING_LAST_NAME) {
    const { isValid, sanitized, error } = validateName(text);

    if (!isValid) {
      return ctx.reply(Messages.INVALID_NAME(error));
    }

    user.passportLastName = sanitized;
    user.onboardingState = OnboardingState.AWAITING_NAME_CONFIRMATION;
    await user.save();

    return ctx.reply(
      Messages.CONFIRM_NAME(user.passportFirstName, user.passportLastName),
      {
        parse_mode: 'Markdown',
        ...getNameConfirmationKeyboard(),
      }
    );
  }

  return null; // Not in an onboarding text state
}

/**
 * Handle name confirmation
 */
async function handleConfirmName(ctx) {
  const user = ctx.user;

  // Mark original names before any potential changes
  if (!user.originalPassportFirstName) {
    user.originalPassportFirstName = user.passportFirstName;
  }
  if (!user.originalPassportLastName) {
    user.originalPassportLastName = user.passportLastName;
  }

  // Complete onboarding
  user.onboardingState = OnboardingState.COMPLETED;
  user.isOnboarded = true;
  user.onboardedAt = new Date();
  await user.save();

  await ctx.answerCbQuery('✅ Ma\'lumotlar saqlandi!');
  await ctx.editMessageText('✅ Pasport ma\'lumotlaringiz tasdiqlandi.');
  
  return ctx.reply(Messages.NAME_CONFIRMED, getMainMenuKeyboard());
}

/**
 * Handle name re-entry request
 */
async function handleReenterName(ctx) {
  const user = ctx.user;

  // Reset to first name entry
  user.passportFirstName = null;
  user.passportLastName = null;
  user.onboardingState = OnboardingState.AWAITING_FIRST_NAME;
  await user.save();

  await ctx.answerCbQuery('🔄 Ismingizni qayta kiriting.');
  await ctx.editMessageText('🔄 Pasport ismingizni qaytadan kiritamiz.');
  
  return ctx.reply(
    'O\'zbekiston xorijga chiqish pasportingizdagi **Ismingizni** aynan yozing:',
    { parse_mode: 'Markdown' }
  );
}

export {
  showOnboardingStep,
  handleStart,
  handleContact,
  handleCheckSubscription,
  handleOnboardingText,
  handleConfirmName,
  handleReenterName,
  Messages,
};
