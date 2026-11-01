import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import isAdmin from "@/lib/isAdmin";

/** The signed-in admin's email, or a 403 response to return as-is. */
export async function requireScheduleAdmin(): Promise<
	{ email: string; denied?: never } | { email?: never; denied: NextResponse }
> {
	if (!(await isAdmin())) {
		return {
			denied: NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 }),
		};
	}
	const session = await auth0.getSession();
	return { email: session?.user?.email || "unknown" };
}

export function badRequest(error: string, status = 400) {
	return NextResponse.json({ error }, { status });
}
