import { User, OnboardingState, ActionState } from '../models/index.js';

/**
 * Middleware to register/update user in database and attach to context
 * Creates new user if not exists, updates activity if exists
 */
async function userMiddleware(ctx, next) {
  try {
    const telegramUser = ctx.from;
    if (!telegramUser) {
      return next();
    }

    let user = await User.findOne({ telegramId: telegramUser.id });

    if (!user) {
      // Create new user
      user = new User({
        telegramId: telegramUser.id,
        username: telegramUser.username || null,
        telegramFirstName: telegramUser.first_name || null,
        telegramLastName: telegramUser.last_name || null,
        onboardingState: OnboardingState.STARTED,
        actionState: ActionState.NONE,
        registeredAt: new Date(),
      });
      await user.save();
      console.log(`📝 New user registered: ${telegramUser.id} (@${telegramUser.username})`);
    } else {
      // Update user info if changed
      let needsUpdate = false;

      if (user.username !== (telegramUser.username || null)) {
        user.username = telegramUser.username || null;
        needsUpdate = true;
      }
      if (user.telegramFirstName !== (telegramUser.first_name || null)) {
        user.telegramFirstName = telegramUser.first_name || null;
        needsUpdate = true;
      }
      if (user.telegramLastName !== (telegramUser.last_name || null)) {
        user.telegramLastName = telegramUser.last_name || null;
        needsUpdate = true;
      }

      user.lastActivityAt = new Date();
      
      if (needsUpdate) {
        await user.save();
      } else {
        // Only update activity timestamp
        await User.updateOne(
          { telegramId: telegramUser.id },
          { lastActivityAt: new Date() }
        );
      }
    }

    // Attach user to context
    ctx.user = user;

    return next();
  } catch (error) {
    console.error('❌ User middleware error:', error);
    return next();
  }
}

export default userMiddleware;
