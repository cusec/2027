const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// forwards a submitted email to a Google Apps Script web app that appends it to
// a Sheet. The webhook URL is server-only (WAITLIST_WEBHOOK_URL) so it is never
// exposed to the client and there are no CORS constraints
export async function POST(request: Request) {
    let email = '';
    try {
        const body = await request.json();
        email = String(body?.email ?? '').trim();
    } catch {
        return Response.json({ ok: false, error: 'bad-request' }, { status: 400 });
    }

    if (!EMAIL_RE.test(email)) {
        return Response.json({ ok: false, error: 'invalid-email' }, { status: 400 });
    }

    const webhook = process.env.WAITLIST_WEBHOOK_URL;
    if (!webhook) {
        return Response.json({ ok: false, error: 'not-configured' }, { status: 500 });
    }

    try {
        const res = await fetch(webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        const data = (await res.json().catch(() => null)) as
            | { ok?: boolean; error?: string }
            | null;

        if (data?.ok) {
            return Response.json({ ok: true });
        }
        if (data?.error === 'duplicate') {
            return Response.json({ ok: false, error: 'duplicate' }, { status: 409 });
        }
        throw new Error('sheet rejected');
    } catch {
        return Response.json({ ok: false, error: 'sheet-error' }, { status: 502 });
    }
}
