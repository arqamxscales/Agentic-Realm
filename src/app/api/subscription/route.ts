import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  normalizePlan,
  planConfig,
  type SubscriptionPlan,
  WHATSAPP_CONTACT,
  getPromptsPerFieldLimit
} from '@/lib/subscription';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .maybeSingle();

    if (error && !error.message.toLowerCase().includes('column') && !error.message.toLowerCase().includes('plan')) {
      throw error;
    }

    const plan = normalizePlan(profile?.plan);

    return NextResponse.json({
      plan,
      plans: planConfig,
      promptsPerFieldMonthly: getPromptsPerFieldLimit(plan),
      whatsappContact: WHATSAPP_CONTACT
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json()) as { plan?: string };
    const requestedPlan = normalizePlan(payload.plan);

    const { error } = await supabase
      .from('profiles')
      .update({ plan: requestedPlan, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      if (error.message.toLowerCase().includes('column') && error.message.toLowerCase().includes('plan')) {
        return NextResponse.json(
          {
            error: 'Subscription schema is not applied yet. Run the latest Supabase migration first.'
          },
          { status: 409 }
        );
      }

      throw error;
    }

    return NextResponse.json({
      plan: requestedPlan,
      plans: planConfig,
      promptsPerFieldMonthly: getPromptsPerFieldLimit(requestedPlan),
      whatsappContact: WHATSAPP_CONTACT,
      note:
        requestedPlan === 'silver'
          ? 'Switched to Silver.'
          : `Selected ${planConfig[requestedPlan as SubscriptionPlan].label}. Contact WhatsApp ${WHATSAPP_CONTACT} for quick access activation.`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
