import { auth0 } from "@/lib/auth0";
import isAdmin from "@/lib/isAdmin";
import { EventSignup } from "@/lib/models";
import connectMongoDB from "@/lib/mongodb";
import { EVENT_ID_PATTERN } from "@/lib/eventLinks";

function cell(value: string) {
  const safe = /^\s*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  if (!(await auth0.getSession()) || !(await isAdmin())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const event = new URL(request.url).searchParams.get("event");
  if (event && !EVENT_ID_PATTERN.test(event)) {
    return new Response("Invalid event", { status: 400 });
  }

  try {
    await connectMongoDB();
    const signups = await EventSignup.find(event ? { event } : {})
      .sort({ createdAt: 1 })
      .select("event email name consentedAt")
      .lean();
    const rows = ["event,email,name,consented_at", ...signups.map((signup) => [
      signup.event,
      signup.email,
      signup.name,
      new Date(signup.consentedAt).toISOString(),
    ].map(cell).join(","))];

    return new Response(`\uFEFF${rows.join("\r\n")}\r\n`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="event-signups${event ? `-${event}` : ""}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Event signup export failed:", error);
    return new Response("Export unavailable", { status: 500 });
  }
}
