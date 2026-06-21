import { NextResponse } from "next/server";

const USD_TO_PHP_SOURCE_URL = "https://api.frankfurter.app/latest?from=USD&to=PHP";
const FALLBACK_USD_TO_PHP_RATE = 56.0;
const CACHE_SECONDS = 60 * 60;

export const revalidate = 3600;

export async function GET() {
  try {
    const response = await fetch(USD_TO_PHP_SOURCE_URL, {
      next: { revalidate: CACHE_SECONDS },
    });

    if (!response.ok) {
      throw new Error(`Exchange rate source returned ${response.status}`);
    }

    const data = await response.json();
    const rate = Number(data?.rates?.PHP);

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error("Exchange rate source returned an invalid PHP rate");
    }

    return NextResponse.json({
      rate,
      fallback: false,
      source: "frankfurter",
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      rate: FALLBACK_USD_TO_PHP_RATE,
      fallback: true,
      source: "fallback",
      updatedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Failed to load exchange rate",
    });
  }
}
