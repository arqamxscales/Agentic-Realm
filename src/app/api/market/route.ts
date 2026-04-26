import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type YahooQuote = {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
};

export async function GET() {
  try {
    const symbols = ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'BTC-USD'];
    const endpoint = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'User-Agent': 'agentic-realm/1.0'
      },
      next: {
        revalidate: 45
      }
    });

    if (!response.ok) {
      throw new Error('Market provider unavailable');
    }

    const payload = (await response.json()) as {
      quoteResponse?: {
        result?: YahooQuote[];
      };
    };

    const tickerMap = new Map((payload.quoteResponse?.result ?? []).map((entry) => [entry.symbol, entry]));

    const tickers = symbols.map((symbol) => {
      const row = tickerMap.get(symbol);
      const displaySymbol = symbol === 'BTC-USD' ? 'BTC' : symbol;

      return {
        symbol: displaySymbol,
        value: Number((row?.regularMarketPrice ?? 0).toFixed(2)),
        change: Number((row?.regularMarketChangePercent ?? 0).toFixed(2))
      };
    });

    return NextResponse.json({
      source: 'Yahoo Finance',
      updatedAt: new Date().toISOString(),
      tickers
    });
  } catch {
    return NextResponse.json({
      source: 'fallback',
      updatedAt: new Date().toISOString(),
      tickers: [
        { symbol: 'NVDA', value: 914.12, change: 0.82 },
        { symbol: 'AAPL', value: 197.32, change: -0.34 },
        { symbol: 'MSFT', value: 422.18, change: 0.41 },
        { symbol: 'TSLA', value: 171.03, change: -0.92 },
        { symbol: 'BTC', value: 64220.51, change: 1.04 }
      ]
    });
  }
}
