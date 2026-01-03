import { OnboardingState } from '../models/index.js';
import { showOnboardingStep } from '../handlers/onboarding.js';

/**
 * Middleware to ensure user has completed onboarding before accessing main features
 * Redirects to appropriate onboarding step if not completed
 */
async function onboardingGuard(ctx, next) {
  const user = ctx.user;

  if (!user) {
    return ctx.reply('❌ Xatolik yuz berdi. Iltimos, /start buyrug\'ini qaytadan bosing.');
  }

  // If user is fully onboarded, allow access
  if (user.isOnboarded) {
    return next();
  }

  // Otherwise, redirect to current onboarding step
  console.log(`⚠️ User ${user.telegramId} not onboarded, redirecting to step: ${user.onboardingState}`);
  return showOnboardingStep(ctx, user.onboardingState);
}

/**
 * Middleware to check if user has shared phone number
 * This is the minimum requirement to interact with the bot
 */
async function phoneRequiredGuard(ctx, next) {
  const user = ctx.user;

  if (!user) {
    return ctx.reply('❌ Xatolik yuz berdi. Iltimos, /start buyrug\'ini qaytadan bosing.');
  }

  if (!user.primaryPhone) {
    return showOnboardingStep(ctx, OnboardingState.STARTED);
  }

  return next();
}

export { onboardingGuard, phoneRequiredGuard };
