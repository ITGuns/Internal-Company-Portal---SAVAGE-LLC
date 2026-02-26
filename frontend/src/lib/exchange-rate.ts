/**
 * Utility to fetch real-time exchange rates
 */

const CACHE_KEY = 'usd_to_php_rate';
const CACHE_EXPIRY = 3600000; // 1 hour

export interface ExchangeRateData {
    rate: number;
    timestamp: number;
}

/**
 * Fetch USD to PHP exchange rate
 */
export async function getUSDToPHPRate(): Promise<number> {
    // Try to get from cache first
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        try {
            const data: ExchangeRateData = JSON.parse(cached);
            if (Date.now() - data.timestamp < CACHE_EXPIRY) {
                return data.rate;
            }
        } catch (e) {
            console.error('Failed to parse cached exchange rate', e);
        }
    }

    try {
        // API: frankfurter.app (free, no API key required)
        const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=PHP');
        if (!response.ok) throw new Error('API request failed');

        const data = await response.json();
        const rate = data.rates.PHP;

        // Save to cache
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            rate,
            timestamp: Date.now()
        }));

        return rate;
    } catch (err) {
        console.error('Failed to fetch real-time exchange rate:', err);
        // Fallback if API fails
        return 56.0;
    }
}
