// src/dictionaries/currencies/index.js

/**
 * Currency Dictionary based on ISO 4217
 * Used for DDEX pricing and commercial terms
 */

// Most commonly used currencies for music distribution
export const MAJOR_CURRENCIES = [
  { code: 'USD', numeric: '840', name: 'US Dollar', symbol: '$', decimals: 2 },
  { code: 'EUR', numeric: '978', name: 'Euro', symbol: '€', decimals: 2 },
  { code: 'GBP', numeric: '826', name: 'Pound Sterling', symbol: '£', decimals: 2 },
  { code: 'JPY', numeric: '392', name: 'Japanese Yen', symbol: '¥', decimals: 0 },
  { code: 'AUD', numeric: '036', name: 'Australian Dollar', symbol: 'A$', decimals: 2 },
  { code: 'CAD', numeric: '124', name: 'Canadian Dollar', symbol: 'C$', decimals: 2 },
  { code: 'CHF', numeric: '756', name: 'Swiss Franc', symbol: 'Fr', decimals: 2 },
  { code: 'CNY', numeric: '156', name: 'Chinese Yuan', symbol: '¥', decimals: 2 },
  { code: 'SEK', numeric: '752', name: 'Swedish Krona', symbol: 'kr', decimals: 2 },
  { code: 'NZD', numeric: '554', name: 'New Zealand Dollar', symbol: 'NZ$', decimals: 2 }
];

// Complete currency list for DDEX compliance
export const CURRENCIES = [
  ...MAJOR_CURRENCIES,
  { code: 'AED', numeric: '784', name: 'UAE Dirham', symbol: 'د.إ', decimals: 2 },
  { code: 'ARS', numeric: '032', name: 'Argentine Peso', symbol: '$', decimals: 2 },
  { code: 'BGN', numeric: '975', name: 'Bulgarian Lev', symbol: 'лв', decimals: 2 },
  { code: 'BRL', numeric: '986', name: 'Brazilian Real', symbol: 'R$', decimals: 2 },
  { code: 'CLP', numeric: '152', name: 'Chilean Peso', symbol: '$', decimals: 0 },
  { code: 'COP', numeric: '170', name: 'Colombian Peso', symbol: '$', decimals: 2 },
  { code: 'CZK', numeric: '203', name: 'Czech Koruna', symbol: 'Kč', decimals: 2 },
  { code: 'DKK', numeric: '208', name: 'Danish Krone', symbol: 'kr', decimals: 2 },
  { code: 'EGP', numeric: '818', name: 'Egyptian Pound', symbol: '£', decimals: 2 },
  { code: 'HKD', numeric: '344', name: 'Hong Kong Dollar', symbol: 'HK$', decimals: 2 },
  { code: 'HRK', numeric: '191', name: 'Croatian Kuna', symbol: 'kn', decimals: 2 },
  { code: 'HUF', numeric: '348', name: 'Hungarian Forint', symbol: 'Ft', decimals: 2 },
  { code: 'IDR', numeric: '360', name: 'Indonesian Rupiah', symbol: 'Rp', decimals: 2 },
  { code: 'ILS', numeric: '376', name: 'Israeli Shekel', symbol: '₪', decimals: 2 },
  { code: 'INR', numeric: '356', name: 'Indian Rupee', symbol: '₹', decimals: 2 },
  { code: 'ISK', numeric: '352', name: 'Icelandic Króna', symbol: 'kr', decimals: 0 },
  { code: 'KRW', numeric: '410', name: 'South Korean Won', symbol: '₩', decimals: 0 },
  { code: 'MAD', numeric: '504', name: 'Moroccan Dirham', symbol: 'د.م.', decimals: 2 },
  { code: 'MXN', numeric: '484', name: 'Mexican Peso', symbol: '$', decimals: 2 },
  { code: 'MYR', numeric: '458', name: 'Malaysian Ringgit', symbol: 'RM', decimals: 2 },
  { code: 'NGN', numeric: '566', name: 'Nigerian Naira', symbol: '₦', decimals: 2 },
  { code: 'NOK', numeric: '578', name: 'Norwegian Krone', symbol: 'kr', decimals: 2 },
  { code: 'PEN', numeric: '604', name: 'Peruvian Sol', symbol: 'S/', decimals: 2 },
  { code: 'PHP', numeric: '608', name: 'Philippine Peso', symbol: '₱', decimals: 2 },
  { code: 'PKR', numeric: '586', name: 'Pakistani Rupee', symbol: '₨', decimals: 2 },
  { code: 'PLN', numeric: '985', name: 'Polish Złoty', symbol: 'zł', decimals: 2 },
  { code: 'RON', numeric: '946', name: 'Romanian Leu', symbol: 'lei', decimals: 2 },
  { code: 'RUB', numeric: '643', name: 'Russian Ruble', symbol: '₽', decimals: 2 },
  { code: 'SAR', numeric: '682', name: 'Saudi Riyal', symbol: '﷼', decimals: 2 },
  { code: 'SGD', numeric: '702', name: 'Singapore Dollar', symbol: 'S$', decimals: 2 },
  { code: 'THB', numeric: '764', name: 'Thai Baht', symbol: '฿', decimals: 2 },
  { code: 'TRY', numeric: '949', name: 'Turkish Lira', symbol: '₺', decimals: 2 },
  { code: 'TWD', numeric: '901', name: 'Taiwan Dollar', symbol: 'NT$', decimals: 2 },
  { code: 'UAH', numeric: '980', name: 'Ukrainian Hryvnia', symbol: '₴', decimals: 2 },
  { code: 'VND', numeric: '704', name: 'Vietnamese Dong', symbol: '₫', decimals: 0 },
  { code: 'ZAR', numeric: '710', name: 'South African Rand', symbol: 'R', decimals: 2 }
];

// Helper functions
export function getCurrency(code) {
  return CURRENCIES.find(c => c.code === code);
}

export function getCurrencyByNumeric(numeric) {
  return CURRENCIES.find(c => c.numeric === numeric);
}

export function formatCurrency(amount, currencyCode) {
  const currency = getCurrency(currencyCode);
  if (!currency) return amount.toString();
  
  const formatted = (amount / Math.pow(10, currency.decimals)).toFixed(currency.decimals);
  return `${currency.symbol}${formatted}`;
}

export function getCurrencyOptions() {
  return CURRENCIES.map(c => ({
    value: c.code,
    label: `${c.code} - ${c.name}`,
    symbol: c.symbol
  }));
}

export function getMajorCurrencyOptions() {
  return MAJOR_CURRENCIES.map(c => ({
    value: c.code,
    label: `${c.code} - ${c.name}`,
    symbol: c.symbol
  }));
}

// Default export
export default {
  CURRENCIES,
  MAJOR_CURRENCIES,
  getCurrency,
  getCurrencyByNumeric,
  formatCurrency,
  getCurrencyOptions,
  getMajorCurrencyOptions
};