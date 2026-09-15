import { getTicketTypes } from "@/lib/ticketTailor";

export async function GET() {
  const { tickets, source } = await getTicketTypes();

  if (source === "error") {
    return Response.json(
      { tickets: [] },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  return Response.json(
    { tickets, source },
    { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" } }
  );
}
