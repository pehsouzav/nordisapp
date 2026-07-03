import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Hotmart sends a POST with JSON body on every purchase event.
// We look for PURCHASE_APPROVED or PURCHASE_COMPLETE, grab the buyer email,
// find their Supabase user, and set paid = true in user_meta.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const event = body.event as string | undefined;
  if (event !== "PURCHASE_APPROVED" && event !== "PURCHASE_COMPLETE") {
    // Ignore refunds, cancellations, etc.
    return NextResponse.json({ ok: true });
  }

  // Hotmart payload: data.buyer.email
  const email = (body as { data?: { buyer?: { email?: string } } })
    ?.data?.buyer?.email;

  if (!email) {
    return NextResponse.json({ error: "no email in payload" }, { status: 400 });
  }

  // Look up Supabase user by email using the admin client
  const { data: users, error: listErr } = await getSupabaseAdmin().auth.admin.listUsers();
  if (listErr) {
    console.error("listUsers error", listErr);
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }

  const user = users.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (!user) {
    // Buyer hasn't created an account yet — store the email so we can
    // unlock when they eventually sign up (future improvement).
    console.warn("Hotmart webhook: no Supabase user found for", email);
    return NextResponse.json({ ok: true, note: "user not found" });
  }

  // Upsert into user_meta to set paid = true
  const { error: upsertErr } = await getSupabaseAdmin()
    .from("user_meta")
    .upsert({ user_id: user.id, paid: true }, { onConflict: "user_id" });

  if (upsertErr) {
    console.error("upsert error", upsertErr);
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
