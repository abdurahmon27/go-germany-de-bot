import { getMainMenuKeyboard, ButtonLabels } from '../utils/keyboards.js';

/**
 * Show main menu to onboarded users
 */
async function showMainMenu(ctx) {
  return ctx.reply(
    '📋 **Asosiy Menyu**\n\nQuyidagi variantlardan birini tanlang:',
    {
      parse_mode: 'Markdown',
      ...getMainMenuKeyboard(),
    }
  );
}

/**
 * Service types mapping
 */
export const ServiceTypes = {
  [ButtonLabels.WORK_TRAVEL]: 'work_travel',
  [ButtonLabels.STUDY]: 'study',
  [ButtonLabels.AUSBILDUNG]: 'ausbildung',
  [ButtonLabels.ARBEITSVISUM]: 'arbeitsvisum',
};

/**
 * Service names for display (Uzbek)
 */
export const ServiceNames = {
  work_travel: 'Work & Travel (Germaniya)',
  study: 'O\'qish (Germaniya)',
  ausbildung: 'Ausbildung (Germaniya)',
  arbeitsvisum: 'Arbeitsvisum (Germaniya)',
};

export { showMainMenu };
