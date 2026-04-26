export type AgentSlug =
  | 'economics'
  | 'finance'
  | 'technology'
  | 'medical'
  | 'law'
  | 'media';

export type AgentConfig = {
  slug: AgentSlug;
  name: string;
  shortName: string;
  description: string;
  accent: string;
  keywords: string[];
  systemPrompt: string;
};

export const agents: AgentConfig[] = [
  {
    slug: 'economics',
    name: 'Economics Agent',
    shortName: 'Economics',
    description: 'Macro, micro, policy, markets, trade, and economic modeling.',
    accent: 'from-sky-500 to-sky-600',
    keywords: ['inflation', 'gdp', 'recession', 'policy', 'unemployment', 'trade', 'macro', 'micro', 'economy'],
    systemPrompt: 'You are an expert economics analyst. Give clear, accurate, practical answers about macroeconomics, microeconomics, policy, trade, markets, and economic forecasts. Use concise structure, mention assumptions, and avoid certainty when data is incomplete.'
  },
  {
    slug: 'finance',
    name: 'Finance Agent',
    shortName: 'Finance',
    description: 'Investing, valuation, portfolio strategy, banking, and corporate finance.',
    accent: 'from-sun-400 to-sun-500',
    keywords: ['stock', 'stocks', 'portfolio', 'valuation', 'cash flow', 'banking', 'equity', 'bond', 'investment', 'finance'],
    systemPrompt: 'You are an expert finance analyst. Help with investments, portfolio strategy, capital markets, risk, valuation, and corporate finance. Be careful to separate education from personalized financial advice and always note risk.'
  },
  {
    slug: 'technology',
    name: 'Technology Agent',
    shortName: 'Technology',
    description: 'Product, software, AI, cloud, cyber, infrastructure, and coding support.',
    accent: 'from-blue-500 to-indigo-600',
    keywords: ['code', 'software', 'ai', 'app', 'api', 'cloud', 'devops', 'security', 'tech', 'system'],
    systemPrompt: 'You are an expert technology advisor. Help with software, product design, AI, cloud, cybersecurity, architecture, and implementation details. Give practical steps, tradeoffs, and clean technical explanations.'
  },
  {
    slug: 'medical',
    name: 'Medical Agent',
    shortName: 'Medical',
    description: 'Health education, symptoms, care pathways, and medical research context.',
    accent: 'from-emerald-400 to-teal-500',
    keywords: ['symptom', 'doctor', 'health', 'medicine', 'medical', 'diagnosis', 'treatment', 'disease', 'clinic', 'hospital'],
    systemPrompt: 'You are a cautious medical education assistant. Provide general health information, explain possible causes, and encourage appropriate professional care. Do not claim to diagnose; include safety guidance when symptoms may be urgent.'
  },
  {
    slug: 'law',
    name: 'Law Agent',
    shortName: 'Law',
    description: 'Legal research support, contracts, compliance, and jurisdiction-aware guidance.',
    accent: 'from-violet-500 to-purple-600',
    keywords: ['legal', 'law', 'contract', 'compliance', 'lawsuit', 'court', 'attorney', 'policy', 'regulation', 'rights'],
    systemPrompt: 'You are a legal information assistant, not a lawyer. Explain legal concepts, summarize likely issues, and encourage users to consult qualified counsel for jurisdiction-specific advice. Be precise and avoid overclaiming.'
  },
  {
    slug: 'media',
    name: 'Media Agent',
    shortName: 'Media',
    description: 'Content strategy, journalism, scripts, campaigns, branding, and publishing.',
    accent: 'from-pink-500 to-rose-500',
    keywords: ['content', 'brand', 'marketing', 'journalism', 'script', 'campaign', 'social', 'media', 'press', 'story'],
    systemPrompt: 'You are a media strategist and content assistant. Help with messaging, scripts, publishing strategy, journalism framing, and campaign ideas. Be creative, clear, and audience-focused.'
  }
];

export function getAgentBySlug(slug: string | undefined) {
  return agents.find((agent) => agent.slug === slug) ?? agents[2];
}

export function routeAgent(query: string) {
  const normalizedQuery = query.toLowerCase();
  const scoredAgents = agents.map((agent) => {
    const score = agent.keywords.reduce((total, keyword) => {
      return total + (normalizedQuery.includes(keyword) ? 1 : 0);
    }, 0);

    return { agent, score };
  });

  scoredAgents.sort((left, right) => right.score - left.score);

  const [bestMatch] = scoredAgents;
  return bestMatch?.score ? bestMatch.agent : agents[2];
}

export function buildSystemPrompt(slug: string) {
  const agent = getAgentBySlug(slug);
  return [
    'You are part of Agentic Nexus, a multi-agent AI assistant platform.',
    `Field: ${agent.name}`,
    agent.systemPrompt,
    'If the user asks for a voice-friendly response, keep sentences crisp and conversational.'
  ].join('\n');
}
