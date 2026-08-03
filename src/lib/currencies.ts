/**
 * Country → currency catalog for the Settings region picker.
 * Picking a country selects its currency automatically; amounts are
 * reformatted app-wide (display only — no FX conversion of stored values).
 */
export type CountryOption = {
  code: string;        // ISO 3166-1 alpha-2
  name: string;
  flag: string;
  currency: string;    // ISO 4217
  currencyName: string;
};

export const COUNTRIES: CountryOption[] = [
  { code: "PH", name: "Philippines", flag: "🇵🇭", currency: "PHP", currencyName: "Philippine Peso" },
  { code: "US", name: "United States", flag: "🇺🇸", currency: "USD", currencyName: "US Dollar" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", currency: "GBP", currencyName: "British Pound" },
  { code: "JP", name: "Japan", flag: "🇯🇵", currency: "JPY", currencyName: "Japanese Yen" },
  { code: "KR", name: "South Korea", flag: "🇰🇷", currency: "KRW", currencyName: "South Korean Won" },
  { code: "CN", name: "China", flag: "🇨🇳", currency: "CNY", currencyName: "Chinese Yuan" },
  { code: "HK", name: "Hong Kong", flag: "🇭🇰", currency: "HKD", currencyName: "Hong Kong Dollar" },
  { code: "TW", name: "Taiwan", flag: "🇹🇼", currency: "TWD", currencyName: "New Taiwan Dollar" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", currency: "SGD", currencyName: "Singapore Dollar" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", currency: "MYR", currencyName: "Malaysian Ringgit" },
  { code: "TH", name: "Thailand", flag: "🇹🇭", currency: "THB", currencyName: "Thai Baht" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳", currency: "VND", currencyName: "Vietnamese Dong" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", currency: "IDR", currencyName: "Indonesian Rupiah" },
  { code: "IN", name: "India", flag: "🇮🇳", currency: "INR", currencyName: "Indian Rupee" },
  { code: "AU", name: "Australia", flag: "🇦🇺", currency: "AUD", currencyName: "Australian Dollar" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", currency: "NZD", currencyName: "New Zealand Dollar" },
  { code: "CA", name: "Canada", flag: "🇨🇦", currency: "CAD", currencyName: "Canadian Dollar" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", currency: "AED", currencyName: "UAE Dirham" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", currency: "SAR", currencyName: "Saudi Riyal" },
  { code: "QA", name: "Qatar", flag: "🇶🇦", currency: "QAR", currencyName: "Qatari Riyal" },
  { code: "KW", name: "Kuwait", flag: "🇰🇼", currency: "KWD", currencyName: "Kuwaiti Dinar" },
  { code: "DE", name: "Germany", flag: "🇩🇪", currency: "EUR", currencyName: "Euro" },
  { code: "FR", name: "France", flag: "🇫🇷", currency: "EUR", currencyName: "Euro" },
  { code: "ES", name: "Spain", flag: "🇪🇸", currency: "EUR", currencyName: "Euro" },
  { code: "IT", name: "Italy", flag: "🇮🇹", currency: "EUR", currencyName: "Euro" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", currency: "EUR", currencyName: "Euro" },
  { code: "IE", name: "Ireland", flag: "🇮🇪", currency: "EUR", currencyName: "Euro" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", currency: "CHF", currencyName: "Swiss Franc" },
  { code: "SE", name: "Sweden", flag: "🇸🇪", currency: "SEK", currencyName: "Swedish Krona" },
  { code: "NO", name: "Norway", flag: "🇳🇴", currency: "NOK", currencyName: "Norwegian Krone" },
  { code: "DK", name: "Denmark", flag: "🇩🇰", currency: "DKK", currencyName: "Danish Krone" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", currency: "BRL", currencyName: "Brazilian Real" },
  { code: "MX", name: "Mexico", flag: "🇲🇽", currency: "MXN", currencyName: "Mexican Peso" },
];

export const countryByCode = (code: string) =>
  COUNTRIES.find((country) => country.code === code.toUpperCase()) ?? null;

/** Colloquial singular unit for copy like "Every peso, accounted for." */
const CURRENCY_UNITS: Record<string, string> = {
  PHP: "peso", USD: "dollar", GBP: "pound", JPY: "yen", KRW: "won", CNY: "yuan",
  HKD: "dollar", TWD: "dollar", SGD: "dollar", MYR: "ringgit", THB: "baht",
  VND: "dong", IDR: "rupiah", INR: "rupee", AUD: "dollar", NZD: "dollar",
  CAD: "dollar", AED: "dirham", SAR: "riyal", QAR: "riyal", KWD: "dinar",
  EUR: "euro", CHF: "franc", SEK: "krona", NOK: "krone", DKK: "krone",
  BRL: "real", MXN: "peso",
};

export const currencyUnit = (currency: string) => CURRENCY_UNITS[currency.toUpperCase()] ?? "amount";
