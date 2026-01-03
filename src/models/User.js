import mongoose from 'mongoose';

/**
 * User onboarding states
 */
export const OnboardingState = {
  STARTED: 'started',
  PHONE_SHARED: 'phone_shared',
  CHANNELS_JOINED: 'channels_joined',
  AWAITING_FIRST_NAME: 'awaiting_first_name',
  AWAITING_LAST_NAME: 'awaiting_last_name',
  AWAITING_NAME_CONFIRMATION: 'awaiting_name_confirmation',
  COMPLETED: 'completed',
};

/**
 * User action states for service flows
 */
export const ActionState = {
  NONE: 'none',
  AWAITING_PHONE_CONFIRMATION: 'awaiting_phone_confirmation',
  AWAITING_SECONDARY_PHONE: 'awaiting_secondary_phone',
  // WhatsApp verification flow
  AWAITING_WHATSAPP_FIRST_NAME: 'awaiting_whatsapp_first_name',
  AWAITING_WHATSAPP_LAST_NAME: 'awaiting_whatsapp_last_name',
  AWAITING_WHATSAPP_CONFIRMATION: 'awaiting_whatsapp_confirmation',
};

const userSchema = new mongoose.Schema(
  {
    telegramId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      default: null,
    },
    telegramFirstName: {
      type: String,
      default: null,
    },
    telegramLastName: {
      type: String,
      default: null,
    },
    // Primary phone (from contact sharing)
    primaryPhone: {
      type: String,
      default: null,
    },
    // Secondary phone (if user provides different number for services)
    secondaryPhone: {
      type: String,
      default: null,
    },
    // Passport name as entered by user
    passportFirstName: {
      type: String,
      default: null,
    },
    passportLastName: {
      type: String,
      default: null,
    },
    // Original passport names (preserved if user changes them)
    originalPassportFirstName: {
      type: String,
      default: null,
    },
    originalPassportLastName: {
      type: String,
      default: null,
    },
    // WhatsApp verification names (entered when requesting WhatsApp link)
    whatsappFirstName: {
      type: String,
      default: null,
    },
    whatsappLastName: {
      type: String,
      default: null,
    },
    // Onboarding state tracking
    onboardingState: {
      type: String,
      enum: Object.values(OnboardingState),
      default: OnboardingState.STARTED,
    },
    // Current action state for menu flows
    actionState: {
      type: String,
      enum: Object.values(ActionState),
      default: ActionState.NONE,
    },
    // Track which service the user selected
    currentService: {
      type: String,
      enum: ['work_travel', 'study', 'ausbildung', 'arbeitsvisum', null],
      default: null,
    },
    // Whether onboarding is fully completed
    isOnboarded: {
      type: Boolean,
      default: false,
    },
    // Registration timestamp
    registeredAt: {
      type: Date,
      default: null,
    },
    // Onboarding completion timestamp
    onboardedAt: {
      type: Date,
      default: null,
    },
    // Last activity timestamp
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
userSchema.index({ isOnboarded: 1 });
userSchema.index({ onboardingState: 1 });

/**
 * Get the full passport name
 */
userSchema.methods.getFullPassportName = function () {
  if (!this.passportFirstName || !this.passportLastName) {
    return null;
  }
  return `${this.passportFirstName} ${this.passportLastName}`.toUpperCase();
};

/**
 * Check if user has completed a specific onboarding step
 */
userSchema.methods.hasCompletedStep = function (step) {
  const stateOrder = Object.values(OnboardingState);
  const currentIndex = stateOrder.indexOf(this.onboardingState);
  const targetIndex = stateOrder.indexOf(step);
  return currentIndex >= targetIndex;
};

/**
 * Update user's last activity
 */
userSchema.methods.updateActivity = function () {
  this.lastActivityAt = new Date();
  return this.save();
};

const User = mongoose.model('User', userSchema);

export default User;
