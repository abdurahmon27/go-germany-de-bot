/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean}
 */
function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  // Phone should be at least 9 digits
  return cleaned.length >= 9;
}

/**
 * Format phone number for storage
 * @param {string} phone - Raw phone number
 * @returns {string}
 */
function formatPhone(phone) {
  if (!phone) return null;
  // Keep only digits and leading +
  let formatted = phone.replace(/[^\d+]/g, '');
  // Ensure + prefix for international format
  if (!formatted.startsWith('+')) {
    formatted = '+' + formatted;
  }
  return formatted;
}

/**
 * Validate and sanitize name input
 * @param {string} name - Name to validate
 * @returns {{isValid: boolean, sanitized: string, error?: string}}
 */
function validateName(name) {
  if (!name || typeof name !== 'string') {
    return { isValid: false, sanitized: '', error: 'Ism kiritish shart' };
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { isValid: false, sanitized: '', error: 'Ism juda qisqa' };
  }

  if (trimmed.length > 50) {
    return { isValid: false, sanitized: '', error: 'Ism juda uzun' };
  }

  // Check for invalid characters (allow only letters, spaces, hyphens, apostrophes)
  if (!/^[a-zA-Z\u0400-\u04FF\s'-]+$/.test(trimmed)) {
    return {
      isValid: false,
      sanitized: '',
      error: 'Ismda noto\'g\'ri belgilar mavjud. Faqat harflardan foydalaning.',
    };
  }

  return { isValid: true, sanitized: trimmed.toUpperCase() };
}

/**
 * Parse multiple names from admin input
 * Each name should be on a new line
 * @param {string} input - Multi-line input
 * @returns {string[]}
 */
function parseNameList(input) {
  if (!input || typeof input !== 'string') {
    return [];
  }

  return input
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Escape HTML special characters for Telegram HTML mode
 * @param {string} text - Text to escape
 * @returns {string}
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export {
  isValidPhone,
  formatPhone,
  validateName,
  parseNameList,
  escapeHtml,
};
