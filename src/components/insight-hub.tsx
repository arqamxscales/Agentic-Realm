'use client';

import { useEffect, useMemo, useState } from 'react';

type NewsItem = {
  title: string;
  url: string;
  source: string;
};

type CareerItem = {
  role: string;
  location: string;
  type: string;
  team: string;
};

type Ticker = {
  symbol: string;
  value: number;
  change: number;
};

const starterTickers: Ticker[] = [
  { symbol: 'NVDA', value: 914.12, change: 0.82 },
  { symbol: 'AAPL', value: 197.32, change: -0.34 },
  { symbol: 'MSFT', value: 422.18, change: 0.41 },
  { symbol: 'TSLA', value: 171.03, change: -0.92 },
  { symbol: 'BTC', value: 64220.51, change: 1.04 }
];

const supportFaq = [
  {
    q: 'How do I upgrade my plan?',
    a: 'Open the subscription cards and choose Gold or Premium. For fast activation, contact WhatsApp +923554776466.'
  },
  {
    q: 'What happens when quota is reached?',
    a: 'The app blocks further prompts for that field until reset/upgrade and shows a clear upgrade message.'
  },
  {
    q: 'How does AI failover work?',
    a: 'The app tries OpenAI first, then Gemini. If both fail, continuity fallback guidance is returned.'
  }
] as const;

const careers: CareerItem[] = [
  { role: 'AI Product Manager', location: 'Remote', type: 'Full-time', team: 'Product' },
  { role: 'Frontend Engineer (Next.js)', location: 'Remote', type: 'Full-time', team: 'Engineering' },
  { role: 'Prompt Engineer', location: 'Hybrid', type: 'Contract', team: 'AI Ops' },
  { role: 'Growth Marketer', location: 'Remote', type: 'Part-time', team: 'Growth' }
];

const fallbackNews: NewsItem[] = [
  { title: 'AI toolchains consolidate around multi-provider failover', url: 'https://news.ycombinator.com', source: 'HN' },
  { title: 'Voice-enabled assistants drive higher engagement in SaaS', url: 'https://news.ycombinator.com', source: 'HN' },
  { title: 'Teams prioritize cost governance for LLM usage', url: 'https://news.ycombinator.com', source: 'HN' }
];

export function InsightHub() {
  const [activeTab, setActiveTab] = useState<'support' | 'market' | 'careers'>('support');
  const [supportInput, setSupportInput] = useState('');
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportMessages, setSupportMessages] = useState<Array<{ role: 'user' | 'bot'; text: string }>>([
    {
      role: 'bot',
      text: 'Hi, I am Support Bot. Ask about plans, quota, billing, deployment, or contact options.'
    }
  ]);
  const [weather, setWeather] = useState<{ city: string; tempC: number; wind: number; code: number } | null>(null);
  const [clock, setClock] = useState(new Date());
  const [timezone, setTimezone] = useState('Asia/Karachi');
  const [tickers, setTickers] = useState<Ticker[]>(starterTickers);
  const [marketSource, setMarketSource] = useState('loading');
  const [news, setNews] = useState<NewsItem[]>(fallbackNews);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadMarket() {
      try {
        const response = await fetch('/api/market', {
          method: 'GET'
        });

        if (!response.ok) {
          throw new Error('Unable to fetch market data');
        }

        const data = (await response.json()) as {
          source?: string;
          tickers?: Ticker[];
        };

        if (data.tickers?.length) {
          setTickers(data.tickers);
        }

        setMarketSource(data.source ?? 'unknown');
      } catch {
        setMarketSource('fallback');
      }
    }

    void loadMarket();

    const timer = window.setInterval(() => {
      void loadMarket();
    }, 45000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadWeather() {
      try {
        const geoResponse = await fetch('https://ipapi.co/json/');
        const geo = (await geoResponse.json()) as { city?: string; latitude?: number; longitude?: number };
        const lat = geo.latitude ?? 24.8607;
        const lon = geo.longitude ?? 67.0011;
        const city = geo.city ?? 'Your location';

        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,weather_code`
        );
        const payload = (await weatherResponse.json()) as {
          current?: { temperature_2m?: number; wind_speed_10m?: number; weather_code?: number };
        };

        setWeather({
          city,
          tempC: Number(payload.current?.temperature_2m ?? 0),
          wind: Number(payload.current?.wind_speed_10m ?? 0),
          code: Number(payload.current?.weather_code ?? 0)
        });
      } catch {
        setWeather({ city: 'Karachi', tempC: 29, wind: 11, code: 1 });
      }
    }

    void loadWeather();
  }, []);

  useEffect(() => {
    async function loadNews() {
      try {
        const response = await fetch('https://hn.algolia.com/api/v1/search?query=ai%20startup&tags=story');
        const payload = (await response.json()) as {
          hits?: Array<{ title?: string; url?: string }>;
        };

        const items = (payload.hits ?? [])
          .filter((item) => item.title && item.url)
          .slice(0, 5)
          .map((item) => ({
            title: item.title as string,
            url: item.url as string,
            source: 'Hacker News'
          }));

        if (items.length) {
          setNews(items);
        }
      } catch {
        setNews(fallbackNews);
      }
    }

    void loadNews();
  }, []);

  async function askSupport() {
    const query = supportInput.trim();
    if (!query) {
      return;
    }

    setSupportMessages((current) => [...current, { role: 'user', text: query }]);
    setSupportLoading(true);

    try {
      const response = await fetch('/api/support/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      const data = (await response.json()) as {
        answer?: string;
      };

      const answer =
        data.answer ??
        'For quick support, share your issue with plan/email on WhatsApp +923554776466. I can also help with weather, market, careers, and prompt quota questions.';

      setSupportMessages((current) => [...current, { role: 'bot', text: answer }]);
    } catch {
      const normalized = query.toLowerCase();
      const matched = supportFaq.find((item) =>
        item.q
          .toLowerCase()
          .split(' ')
          .some((word) => word.length > 3 && normalized.includes(word))
      );

      setSupportMessages((current) => [
        ...current,
        {
          role: 'bot',
          text:
            matched?.a ??
            'Support service is busy. Contact WhatsApp +923554776466 and include your account email for fast handling.'
        }
      ]);
    } finally {
      setSupportLoading(false);
    }

    setSupportInput('');
  }

  const localTime = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: 'short',
        timeZone: timezone
      }).format(clock);
    } catch {
      return clock.toLocaleString();
    }
  }, [clock, timezone]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-600">Advanced hub</p>
          <h3 className="text-lg font-semibold text-slate-900">Support, market, weather, careers</h3>
        </div>
        <div className="flex gap-2 text-xs">
          <TabButton active={activeTab === 'support'} onClick={() => setActiveTab('support')} label="Support" />
          <TabButton active={activeTab === 'market'} onClick={() => setActiveTab('market')} label="Market" />
          <TabButton active={activeTab === 'careers'} onClick={() => setActiveTab('careers')} label="Careers" />
        </div>
      </div>

      {activeTab === 'support' ? (
        <div className="mt-4 space-y-3">
          <div className="max-h-52 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
            {supportMessages.map((message, idx) => (
              <div
                key={`${message.role}-${idx}`}
                className={`rounded-xl px-3 py-2 text-sm ${message.role === 'bot' ? 'border border-sky-100 bg-white text-slate-700' : 'ml-auto max-w-[85%] bg-slate-900 text-white'}`}
              >
                {message.text}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={supportInput}
              onChange={(event) => setSupportInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void askSupport();
                }
              }}
              placeholder="Ask support about plans, billing, quota..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-300 focus:bg-white"
            />
            <button
              type="button"
              onClick={() => {
                void askSupport();
              }}
              disabled={supportLoading}
              className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              {supportLoading ? 'Thinking...' : 'Ask'}
            </button>
          </div>
        </div>
      ) : null}

      {activeTab === 'market' ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Local weather</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{weather?.city ?? 'Loading...'}</p>
              <p className="text-sm text-slate-600">
                {weather ? `${weather.tempC}°C • Wind ${weather.wind} km/h` : 'Fetching current weather...'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">World clock</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{localTime}</p>
              <select
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none"
              >
                <option value="Asia/Karachi">Asia/Karachi</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Asia/Dubai">Asia/Dubai</option>
                <option value="Asia/Singapore">Asia/Singapore</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Live tickers</p>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {marketSource}
              </span>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {tickers.map((ticker) => (
                <div key={ticker.symbol} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-500">{ticker.symbol}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">{ticker.value.toLocaleString()}</p>
                    <p className={`text-xs font-semibold ${ticker.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {ticker.change >= 0 ? '+' : ''}
                      {ticker.change}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">News feed</p>
            <div className="mt-2 space-y-2">
              {news.map((item) => (
                <a
                  key={item.title}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:border-sky-200 hover:bg-sky-50"
                >
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{item.source}</p>
                </a>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'careers' ? (
        <div className="mt-4 space-y-2">
          {careers.map((career) => (
            <div key={career.role} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{career.role}</p>
                  <p className="text-xs text-slate-600">
                    {career.team} • {career.type} • {career.location}
                  </p>
                </div>
                <a
                  href="https://wa.me/923554776466"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700"
                >
                  Apply
                </a>
              </div>
            </div>
          ))}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            For fast-track hiring support, WhatsApp directly: +923554776466.
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 font-semibold transition ${active ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
    >
      {label}
    </button>
  );
}
