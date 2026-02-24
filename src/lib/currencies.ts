// src/lib/currencies.ts

export interface SupportedCurrency {
  code: string
  name: string
  symbol: string
}

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = [
  { code: 'USD', name: 'US Dollar',            symbol: '$'   },
  { code: 'EUR', name: 'Euro',                 symbol: '€'   },
  { code: 'GBP', name: 'British Pound',        symbol: '£'   },
  { code: 'INR', name: 'Indian Rupee',         symbol: '₹'   },
  { code: 'AUD', name: 'Australian Dollar',    symbol: 'A$'  },
  { code: 'JPY', name: 'Japanese Yen',         symbol: '¥'   },
  { code: 'SGD', name: 'Singapore Dollar',     symbol: 'S$'  },
  { code: 'THB', name: 'Thai Baht',            symbol: '฿'   },
  { code: 'AED', name: 'UAE Dirham',           symbol: 'د.إ' },
  { code: 'CAD', name: 'Canadian Dollar',      symbol: 'CA$' },
  { code: 'CHF', name: 'Swiss Franc',          symbol: 'Fr'  },
  { code: 'MYR', name: 'Malaysian Ringgit',    symbol: 'RM'  },
  { code: 'IDR', name: 'Indonesian Rupiah',    symbol: 'Rp'  },
  { code: 'VND', name: 'Vietnamese Dong',      symbol: '₫'   },
  { code: 'PHP', name: 'Philippine Peso',      symbol: '₱'   },
]

export const getCurrencySymbol = (code: string): string =>
  SUPPORTED_CURRENCIES.find(c => c.code === code)?.symbol ?? code
