"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getUSDToPHPRate } from "@/lib/exchange-rate";

interface ExchangeRateContextType {
    usdToPhp: number;
    isLoading: boolean;
    error: string | null;
    refreshRate: () => Promise<void>;
}

const ExchangeRateContext = createContext<ExchangeRateContextType | undefined>(undefined);

export function ExchangeRateProvider({ children }: { children: React.ReactNode }) {
    const [usdToPhp, setUsdToPhp] = useState<number>(56.0); // Default fallback
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRate = async () => {
        setIsLoading(true);
        try {
            const rate = await getUSDToPHPRate();
            setUsdToPhp(rate);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load exchange rate");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRate();
    }, []);

    return (
        <ExchangeRateContext.Provider value={{ usdToPhp, isLoading, error, refreshRate: fetchRate }}>
            {children}
        </ExchangeRateContext.Provider>
    );
}

export function useExchangeRate() {
    const context = useContext(ExchangeRateContext);
    if (!context) {
        throw new Error("useExchangeRate must be used within an ExchangeRateProvider");
    }
    return context;
}
