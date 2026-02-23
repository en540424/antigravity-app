import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/utils/supabase/server";
import { requireAuth } from "@/app/api/_lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();

    const supabase = await getServerSupabase();

    let query = supabase
      .from("sku_list")
      .select("sku,title")
      .order("created_at", { ascending: false })
      .limit(50);

    if (q) {
      query = query.or(`sku.ilike.%${q}%,title.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []).map((r: any) => ({
      sku: r.sku,
      title: r.title ?? "",
      label: r.title ? `${r.sku} — ${r.title}` : r.sku,
    }));

    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unauthorized" }, { status: 401 });
  }
}
