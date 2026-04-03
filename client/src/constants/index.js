// ─── Today's date helper (always fresh, never stale) ───────────────────────
export const getToday = () => new Date().toISOString().slice(0, 10);

// ─── Pagination ────────────────────────────────────────────────────────────
export const PAGE_SIZE = 10;

// ─── Banks ─────────────────────────────────────────────────────────────────
// Key = IFSC prefix (bank code), Value = full bank name
export const BANKS = {
    SBIN: 'State Bank of India',
    BARB: 'Bank of Baroda',
    PUNB: 'Punjab National Bank',
    CNRB: 'Canara Bank',
    UBIN: 'Union Bank of India',
    BKID: 'Bank of India',
    IDIB: 'Indian Bank',
    CBIN: 'Central Bank of India',
    IOBA: 'Indian Overseas Bank',
    MAHB: 'Bank of Maharashtra',
    UCBA: 'UCO Bank',
    PSIB: 'Punjab & Sind Bank',
    HDFC: 'HDFC Bank',
    ICIC: 'ICICI Bank',
    UTIB: 'Axis Bank',
    KKBK: 'Kotak Mahindra Bank',
    INDB: 'IndusInd Bank',
    YESB: 'YES Bank',
    RATN: 'RBL Bank',
    IDFB: 'IDFC FIRST Bank',
    FDRL: 'Federal Bank',
    SIBL: 'South Indian Bank',
    KARB: 'Karnataka Bank',
    KVBL: 'Karur Vysya Bank',
    BDBL: 'Bandhan Bank',
    IBKL: 'IDBI Bank',
    AUBL: 'AU Small Finance Bank',
    ESFB: 'Equitas Small Finance Bank',
    AMEX: 'American Express Banking Corp.',
    SCBL: 'Standard Chartered Bank',
    HSBC: 'HSBC India',
    DBSS: 'DBS Bank India',
};

/** Sorted array of bank names for datalist / dropdowns */
export const BANK_NAMES = Object.values(BANKS).sort((a, b) => a.localeCompare(b));

/** Lookup: bank name → IFSC prefix */
export const BANK_NAME_TO_CODE = Object.fromEntries(
    Object.entries(BANKS).map(([code, name]) => [name, code])
);

// ─── Card Networks ─────────────────────────────────────────────────────────
export const CARD_NETWORKS = ['Visa', 'Mastercard', 'AmEx', 'RuPay'];

// ─── Cashback Periods ──────────────────────────────────────────────────────
export const CASHBACK_PERIODS = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'half-yearly', label: 'Half-Yearly' },
    { value: 'yearly', label: 'Yearly' },
];

// ─── Card network display config ───────────────────────────────────────────
export const NETWORK_COLORS = {
    Visa: { bg: '#1a1f6e', text: '#fff', label: 'VISA' },
    Mastercard: { bg: '#eb001b', text: '#fff', label: 'MC' },
    AmEx: { bg: '#007bc1', text: '#fff', label: 'AMEX' },
    RuPay: { bg: '#2c7a3e', text: '#fff', label: 'RuPay' },
};

// ─── E-commerce sites ──────────────────────────────────────────────────────
export const ECOMM_SITES = [
    'Amazon',
    'Flipkart',
    'Myntra',
    'Ajio',
    'Samsung Store',
    'Oneplus Store',
    'Realme Store',
    'Reliance Digital',
    'Tata Neu',
    'Other'
];

// ─── Phone/device variants ─────────────────────────────────────────────────
export const VARIANTS = [
    'NA',
    '6/128',
    '8/128',
    '8/256',
    '12/256',
    '4/64',
    '4/128',
    '12/1024',
    '12/512'
];

// ─── Order delivery status ─────────────────────────────────────────────────
export const DELIVERY_STATUS_OPTIONS = [
    { label: 'Pending (No)', value: 'No' },
    { label: 'Delivered (Yes)', value: 'Yes' },
    { label: 'Cancelled', value: 'Cancelled' },
];

// Simple label list for filter dropdowns (prepend "All")
export const STATUS_FILTER_OPTIONS = ['All', 'Pending', 'Delivered', 'Cancelled'];
