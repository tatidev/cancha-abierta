import { NextResponse } from "next/server";
import { getAnalyticsSummary } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pin =
      req.headers.get("x-metrics-pin") ||
      url.searchParams.get("pin");

    const validPin = process.env.METRICS_PIN || "1979";

    if (!pin || pin.trim() !== validPin.trim()) {
      return NextResponse.json(
        { error: "Acceso no autorizado. PIN incorrecto." },
        { status: 401 }
      );
    }

    const data = await getAnalyticsSummary();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error al obtener estadísticas";
    console.error("Error in GET /api/analytics:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
