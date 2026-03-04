import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase/server-admin";
import {
  listFulfillmentPolicies,
  listPaymentPolicies,
  listReturnPolicies,
} from "@/app/lib/ebay/account/policies";

function assertSecret(req: NextRequest) {
  const secret =
    process.env.CRON_SECRET || process.env.INTERNAL_API_SECRET || "";
  const got =
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    "";
  if (!secret || got !== secret) throw new Error("unauthorized");
}

export async function POST(req: NextRequest) {
  try {
    assertSecret(req);

    const runStartedAt = new Date().toISOString();

    const [fulfillment, payment, returns] = await Promise.all([
      listFulfillmentPolicies(),
      listPaymentPolicies(),
      listReturnPolicies(),
    ]);

    const rows = [
      ...(fulfillment.fulfillmentPolicies ?? []).map((p: any) => ({
        policy_type:  "FULFILLMENT",
        policy_id:    p.fulfillmentPolicyId as string,
        name:         p.name as string,
        description:  (p.description as string | undefined) ?? null,
        is_active:    true,
        last_seen_at: runStartedAt,
        updated_at:   runStartedAt,
      })),
      ...(payment.paymentPolicies ?? []).map((p: any) => ({
        policy_type:  "PAYMENT",
        policy_id:    p.paymentPolicyId as string,
        name:         p.name as string,
        description:  (p.description as string | undefined) ?? null,
        is_active:    true,
        last_seen_at: runStartedAt,
        updated_at:   runStartedAt,
      })),
      ...(returns.returnPolicies ?? []).map((p: any) => ({
        policy_type:  "RETURN",
        policy_id:    p.returnPolicyId as string,
        name:         p.name as string,
        description:  (p.description as string | undefined) ?? null,
        is_active:    true,
        last_seen_at: runStartedAt,
        updated_at:   runStartedAt,
      })),
    ];

    const { error: upsertError } = await supabaseAdmin
      .from("ebay_policy_master")
      .upsert(rows, { onConflict: "policy_type,policy_id" });

    if (upsertError) throw upsertError;

    // 今回の同期で見えなかったポリシーを無効化（削除ではなく is_active=false）
    const { data: deactivatedRows, error: deactivateError } = await supabaseAdmin
      .from("ebay_policy_master")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .lt("last_seen_at", runStartedAt)
      .eq("is_active", true)
      .select("id");

    if (deactivateError) {
      console.error("[policies/sync] deactivate error:", deactivateError.message);
    }

    return NextResponse.json({
      ok: true,
      count: rows.length,
      deactivated: deactivatedRows?.length ?? 0,
    });
  } catch (e: any) {
    const msg = e?.message || "internal_error";
    const status = msg === "unauthorized" ? 401 : 500;
    return NextResponse.json(
      { ok: false, error: { code: "server_error", message: msg } },
      { status }
    );
  }
}
