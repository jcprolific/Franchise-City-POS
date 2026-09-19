import { supabase, isSupabaseConfigured } from './supabase';
import type { SupplyOrderLineInput } from './supplyOrderService';

export interface StartSupplyPaymentInput {
  brandId: string;
  branchId: string;
  notes?: string;
  placedBy?: string;
  orderId?: string;
  lines?: SupplyOrderLineInput[];
}

export interface StartSupplyPaymentResult {
  checkoutUrl: string | null;
  referenceNo: string | null;
  orderId: string | null;
  error: string | null;
}

function invokeErrorMessage(error: { message: string; context?: Response }, fallback: string) {
  return error.message || fallback;
}

export async function startSupplyOrderPayment(
  input: StartSupplyPaymentInput
): Promise<StartSupplyPaymentResult> {
  if (!isSupabaseConfigured()) {
    return { checkoutUrl: null, referenceNo: null, orderId: null, error: 'not-configured' };
  }

  const { data, error } = await supabase.functions.invoke('create-hitpay-payment', {
    body: {
      brandId: input.brandId,
      branchId: input.branchId,
      notes: input.notes ?? '',
      placedBy: input.placedBy ?? '',
      origin: window.location.origin,
      orderId: input.orderId,
      lines: input.lines,
    },
  });

  if (error) {
    let message = invokeErrorMessage(error, 'Could not start HitPay checkout.');
    try {
      const ctx = error.context;
      if (ctx && typeof ctx.json === 'function') {
        const body = (await ctx.json()) as { error?: string };
        if (body?.error) message = body.error;
      }
    } catch {
      /* keep default */
    }
    return { checkoutUrl: null, referenceNo: null, orderId: null, error: message };
  }

  if (data?.error) {
    return {
      checkoutUrl: null,
      referenceNo: data.referenceNo ?? null,
      orderId: data.orderId ?? null,
      error: String(data.error),
    };
  }

  if (!data?.checkoutUrl) {
    return {
      checkoutUrl: null,
      referenceNo: data?.referenceNo ?? null,
      orderId: data?.orderId ?? null,
      error: 'HitPay did not return a checkout link.',
    };
  }

  return {
    checkoutUrl: data.checkoutUrl as string,
    referenceNo: (data.referenceNo as string) ?? null,
    orderId: (data.orderId as string) ?? null,
    error: null,
  };
}
