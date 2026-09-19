import { NextResponse } from "next/server";
import { logAnalyticsEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userAgent = req.headers.get("user-agent") || "";
    const eventType = body.event_type || "page_view";

    await logAnalyticsEvent(eventType, {
      tournament_id: body.tournament_id,
      metadata: body.metadata,
      user_agent: userAgent,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
