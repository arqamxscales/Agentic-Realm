import type { AgentSlug } from '@/lib/agents';

export type SubscriptionPlan = 'silver' | 'gold' | 'premium';

export const WHATSAPP_CONTACT = '+923554776466';

export const planConfig: Record<SubscriptionPlan, { label: string; priceMonthlyUsd: number; promptsPerFieldMonthly: number }> = {
  silver: {
    label: 'Silver',
    priceMonthlyUsd: 0,
    promptsPerFieldMonthly: 2
  },
  gold: {
    label: 'Gold',
    priceMonthlyUsd: 15,
    promptsPerFieldMonthly: 10
  },
  premium: {
    label: 'Premium',
    priceMonthlyUsd: 40,
    promptsPerFieldMonthly: 25
  }
};

export function normalizePlan(plan: string | null | undefined): SubscriptionPlan {
  if (plan === 'gold' || plan === 'premium' || plan === 'silver') {
    return plan;
  }

  return 'silver';
}

export function getPromptsPerFieldLimit(plan: SubscriptionPlan) {
  return planConfig[plan].promptsPerFieldMonthly;
}

export function getMonthlyWindowStartIso(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  return start.toISOString();
}

export function buildQuotaExceededMessage(plan: SubscriptionPlan, agentSlug: AgentSlug) {
  const limit = getPromptsPerFieldLimit(plan);
  const tier = planConfig[plan].label;

  return `Monthly limit reached for ${agentSlug} field on ${tier}. Limit: ${limit} prompts per field. Upgrade via WhatsApp ${WHATSAPP_CONTACT} for quick access.`;
}
