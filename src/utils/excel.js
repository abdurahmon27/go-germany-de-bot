import * as XLSX from 'xlsx';
import { User } from '../models/index.js';

/**
 * Export all onboarded users to Excel buffer
 * @returns {Promise<Buffer>}
 */
async function exportUsersToExcel() {
  const users = await User.find({ isOnboarded: true })
    .sort({ registeredAt: -1 })
    .lean();

  const data = users.map((user, index) => ({
    '#': index + 1,
    'Telegram ID': user.telegramId,
    'Username': user.username ? `@${user.username}` : 'N/A',
    'Telegram Name': [user.telegramFirstName, user.telegramLastName]
      .filter(Boolean)
      .join(' ') || 'N/A',
    'Primary Phone': user.primaryPhone || 'N/A',
    'Secondary Phone': user.secondaryPhone || 'N/A',
    'Passport First Name': user.passportFirstName || 'N/A',
    'Passport Last Name': user.passportLastName || 'N/A',
    'Original Passport First Name': user.originalPassportFirstName || 'Same',
    'Original Passport Last Name': user.originalPassportLastName || 'Same',
    'Registered At': user.registeredAt
      ? new Date(user.registeredAt).toISOString().split('T')[0]
      : 'N/A',
    'Onboarded At': user.onboardedAt
      ? new Date(user.onboardedAt).toISOString().split('T')[0]
      : 'N/A',
    'Last Activity': user.lastActivityAt
      ? new Date(user.lastActivityAt).toISOString().split('T')[0]
      : 'N/A',
  }));

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-size columns
  const maxWidths = {};
  const keys = data.length > 0 ? Object.keys(data[0]) : [];
  
  keys.forEach((key) => {
    maxWidths[key] = Math.max(
      key.length,
      ...data.map((row) => String(row[key]).length)
    );
  });

  worksheet['!cols'] = keys.map((key) => ({ wch: Math.min(maxWidths[key] + 2, 50) }));

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}

/**
 * Get user statistics
 * @returns {Promise<Object>}
 */
async function getUserStats() {
  const [total, onboarded, today] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isOnboarded: true }),
    User.countDocuments({
      registeredAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    }),
  ]);

  return {
    total,
    onboarded,
    pending: total - onboarded,
    today,
  };
}

export { exportUsersToExcel, getUserStats };
