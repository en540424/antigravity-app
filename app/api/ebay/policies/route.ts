import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/api/_lib/auth";
import { supabaseAdmin } from "@/app/lib/supabase/server-admin";
import type { EbayPolicyType } from "@/app/lib/ebay/policies";

const VALID_TYPES: EbayPolicyType[] = ["FULFILLMENT", "PAYMENT", "RETURN"];

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);

    const url = new URL(req.url);
    const type = (url.searchParams.get("type") ?? "").toUpperCase() as EbayPolicyType;

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "invalid_type",
            message: `type は ${VALID_TYPES.join(" / ")} のいずれかを指定してください`,
          },
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("ebay_policy_master")
      .select("policy_id, name, description")
      .eq("policy_type", type)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: { code: "db_error", message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (e: any) {
    const msg = e?.message || "internal_error";
    const status = msg === "認証が必要です" ? 401 : 500;
    return NextResponse.json(
      { ok: false, error: { code: "server_error", message: msg } },
      { status }
    );
  }
}
