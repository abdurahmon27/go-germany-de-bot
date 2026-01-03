import mongoose from 'mongoose';

const allowedNameSchema = new mongoose.Schema(
  {
    // Full name stored in uppercase for consistent matching
    fullName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Original name as entered by admin
    originalEntry: {
      type: String,
      required: true,
    },
    // Admin who added this name
    addedBy: {
      type: Number,
      required: true,
    },
    // Whether this name is currently active
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Text index for search
allowedNameSchema.index({ fullName: 'text' });

/**
 * Static method to check if a name is allowed
 * @param {string} firstName - Passport first name
 * @param {string} lastName - Passport last name
 * @returns {Promise<boolean>}
 */
allowedNameSchema.statics.isNameAllowed = async function (firstName, lastName) {
  if (!firstName || !lastName) {
    return false;
  }
  const fullName = `${firstName} ${lastName}`.toUpperCase().trim();
  const found = await this.findOne({ fullName, isActive: true });
  return !!found;
};

/**
 * Static method to add multiple names
 * @param {string[]} names - Array of full names
 * @param {number} adminId - Admin Telegram ID
 * @returns {Promise<{added: number, duplicates: number}>}
 */
allowedNameSchema.statics.addNames = async function (names, adminId) {
  let added = 0;
  let duplicates = 0;

  for (const name of names) {
    const trimmedName = name.trim();
    if (!trimmedName) continue;

    const fullName = trimmedName.toUpperCase();

    try {
      await this.create({
        fullName,
        originalEntry: trimmedName,
        addedBy: adminId,
      });
      added++;
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error
        duplicates++;
      } else {
        throw error;
      }
    }
  }

  return { added, duplicates };
};

/**
 * Static method to get all allowed names
 * @returns {Promise<Array>}
 */
allowedNameSchema.statics.getAllNames = async function () {
  return this.find({ isActive: true }).sort({ fullName: 1 });
};

const AllowedName = mongoose.model('AllowedName', allowedNameSchema);

export default AllowedName;
