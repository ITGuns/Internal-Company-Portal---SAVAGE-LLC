/**
 * Utility to fetch real-time exchange rates
 */

const CACHE_KEY = 'usd_to_php_rate';
const CACHE_EXPIRY = 3600000; // 1 hour
const FALLBACK_USD_TO_PHP_RATE = 56.0;

export interface ExchangeRateData {
    rate: number;
    timestamp: number;
}

/**
 * Fetch USD to PHP exchange rate
 */
export async function getUSDToPHPRate(): Promise<number> {
    // Try to get from cache first
    const cached = typeof window !== 'undefined' ? localStorage.getItem(CACHE_KEY) : null;
    if (cached) {
        try {
            const data: ExchangeRateData = JSON.parse(cached);
            if (Date.now() - data.timestamp < CACHE_EXPIRY) {
                return data.rate;
            }
        } catch {
            if (typeof window !== 'undefined') {
                localStorage.removeItem(CACHE_KEY);
            }
        }
    }

    try {
        const response = await fetch('/internal/exchange-rate', { cache: 'no-store' });
        if (!response.ok) throw new Error('Exchange rate request failed');

        const data = await response.json();
        const rate = Number(data.rate);

        if (!Number.isFinite(rate) || rate <= 0) {
            throw new Error('Invalid exchange rate response');
        }

        // Save to cache
        if (typeof window !== 'undefined') {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                rate,
                timestamp: Date.now()
            }));
        }

        return rate;
    } catch {
        // Fallback if API fails
        return FALLBACK_USD_TO_PHP_RATE;
    }
}
