"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import TicketsSection from "@/app/components/Tickets/TicketsSection";
import type { TicketType, TicketWidgetConfig } from "@/lib/ticketTailor";

interface PurchaseStepClientProps {
  tickets: TicketType[];
  widgetConfig: TicketWidgetConfig;
  alreadyComplete: boolean;
  purchasedTicketName: string | null;
  accountEmail: string;
}

// Idle pages barely poll; an open checkout polls often; the window right
// after checkout closes polls hard, because that is when the order actually
// lands and the delegate is watching a spinner.
const POLL_IDLE_MS = 12000;
const POLL_OPEN_MS = 4000;
const POLL_BURST_MS = 1500;
const BURST_MS = 90000;
// Ticket Tailor's checkout announces itself with `tt-checkout-ready`. Silence
// past this means it never ran inline - blocked cookies, or a bad embed URL.
const READY_TIMEOUT_MS = 8000;
const REDIRECT_MS = 1600;
// Survives the round trip when checkout takes over the tab, so the page knows
// to look for an order the moment the delegate lands back here.
const RESUME_KEY = "cusec:checkout-open";
// Ticket Tailor appends these when its "Redirect order confirmation page"
// setting sends the buyer back to us. Their presence means a purchase just
// completed; the values are not trusted for anything beyond that hint.
const RETURN_PARAMS = ["tt_order_id", "tt_order_value", "tt_currency", "tt_event_id"];

type EmbedState = "loading" | "ready" | "blocked";

// Ticket Tailor serves its custom domain with
// `frame-ancestors 'self' https://cusec.net https://*.cusec.net` (plus an
// X-Frame-Options fallback), so only a page on cusec.net or a subdomain of it
// may embed checkout. Anywhere else - localhost, a *.vercel.app preview - the
// browser refuses the frame outright, and the honest move is to not render one.
function canFrameCheckout(checkoutOrigin: string | null): boolean {
  if (!checkoutOrigin || typeof window === "undefined") return false;
  try {
    const labels = new URL(checkoutOrigin).hostname.split(".");
    const registrable = labels.slice(-2).join(".");
    const { protocol, hostname } = window.location;
    return (
      protocol === "https:" &&
      (hostname === registrable || hostname.endsWith(`.${registrable}`))
    );
  } catch {
    return false;
  }
}

// There is no payment callback across a cross-origin iframe, so completion is
// established server-side: the order.created webhook links the account, and
// /api/ticket-wizard/status reconciles against Ticket Tailor's API for every
// case the webhook misses. The iframe's own postMessage events (documented
// only by reading widget.js) are used for what they can actually tell us -
// whether the embed came up, and when it asks to be closed - and never as
// proof of payment.
export default function PurchaseStepClient({
  tickets,
  widgetConfig,
  alreadyComplete,
  purchasedTicketName,
  accountEmail,
}: PurchaseStepClientProps) {
  const t = useTranslations("TicketWizard");
  const router = useRouter();

  const [complete, setComplete] = useState(alreadyComplete);
  const [ticketName, setTicketName] = useState(purchasedTicketName);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [embedState, setEmbedState] = useState<EmbedState>("loading");
  const [verifying, setVerifying] = useState(false);
  const [verifyFailed, setVerifyFailed] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  // Only someone who actually got as far as the checkout form is told we're
  // looking for their order; backing out of the ticket list says nothing.
  const [reachedCheckout, setReachedCheckout] = useState(false);
  // Resolved after mount: the answer depends on window.location, and guessing
  // it during SSR would mismatch on hydration.
  const [canFrame, setCanFrame] = useState(true);

  const [claimOpen, setClaimOpen] = useState(false);
  const [claimEmail, setClaimEmail] = useState("");
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Checkout having been opened at all is what earns the more expensive
  // reconciling poll, so an abandoned tab doesn't hammer Ticket Tailor.
  const openedRef = useRef(false);
  const burstUntilRef = useRef(0);
  const completedRef = useRef(alreadyComplete);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [frameSrc, setFrameSrc] = useState<string | null>(null);

  const { checkoutEmbedUrl, checkoutPageUrl, checkoutOrigin, eventUrl, inlineCapable } =
    widgetConfig;
  const checkoutConfigured = Boolean(widgetConfig.boxOfficeName && checkoutEmbedUrl);

  useEffect(() => {
    setCanFrame(inlineCapable && canFrameCheckout(checkoutOrigin));
  }, [inlineCapable, checkoutOrigin]);

  const markComplete = useCallback(
    (name: string | null) => {
      if (completedRef.current) return;
      completedRef.current = true;

      setComplete(true);
      setTicketName(name);
      setCheckoutOpen(false);
      setVerifying(false);
      setVerifyFailed(false);
      setRedirecting(true);

      // The session already exists - the wizard signed them in at step one -
      // so "log into the dashboard" is really "let the server re-read the now
      // linked account, then go". refresh() first so /scavenger renders with
      // the ticket attached rather than the unlinked onboarding screen.
      router.refresh();
      setTimeout(() => router.push("/scavenger"), REDIRECT_MS);
    },
    [router]
  );

  // One shared status read. `reconcile` asks the server to also check Ticket
  // Tailor's API, which is what catches a purchase whose webhook never came.
  const readStatus = useCallback(
    async (reconcile: boolean) => {
      try {
        const res = await fetch(
          `/api/ticket-wizard/status${reconcile ? "?reconcile=1" : ""}`,
          { cache: "no-store" }
        );
        if (!res.ok) return false;
        const data = await res.json();
        if (data.purchaseComplete) {
          markComplete(data.purchasedTicketName ?? null);
          return true;
        }
      } catch {
        // transient - the next tick tries again
      }
      return false;
    },
    [markComplete]
  );

  const startVerifying = useCallback(() => {
    burstUntilRef.current = Date.now() + BURST_MS;
    setVerifying(true);
    setVerifyFailed(false);
    void readStatus(true);
    setTimeout(() => {
      setVerifying(false);
      if (!completedRef.current) setVerifyFailed(true);
    }, BURST_MS);
  }, [readStatus]);

  // Self-scheduling poll rather than a fixed interval: the cadence changes
  // with what the page is doing, and a slow request must not stack up behind
  // the next tick.
  useEffect(() => {
    if (complete || !checkoutConfigured) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const delay = () => {
      if (Date.now() < burstUntilRef.current) return POLL_BURST_MS;
      if (checkoutOpen) return POLL_OPEN_MS;
      return POLL_IDLE_MS;
    };

    const tick = async () => {
      if (cancelled) return;
      // A hidden tab is either mid-checkout elsewhere or forgotten; either
      // way the visibility handler below catches it up on return.
      if (document.visibilityState === "visible") {
        const done = await readStatus(openedRef.current);
        if (done || cancelled) return;
      }
      timer = setTimeout(tick, delay());
    };

    timer = setTimeout(tick, delay());
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [complete, checkoutConfigured, checkoutOpen, readStatus]);

  // Coming back to the tab is the strongest signal there is that something
  // happened elsewhere - most often checkout finished in the new tab.
  useEffect(() => {
    if (complete || !checkoutConfigured) return;
    const onVisible = () => {
      if (document.visibilityState === "visible" && openedRef.current) {
        void readStatus(true);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [complete, checkoutConfigured, readStatus]);

  // Coming back from a full-page checkout: either Ticket Tailor redirected the
  // buyer here with its order params, or they used the back button and the
  // resume flag is still set. Both mean "look for the order now".
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current || complete || !checkoutConfigured) return;
    resumedRef.current = true;

    let resumed = false;
    try {
      resumed = sessionStorage.getItem(RESUME_KEY) === "1";
      if (resumed) sessionStorage.removeItem(RESUME_KEY);
    } catch {
      // private mode - the return params below still cover the redirect path
    }

    const params = new URLSearchParams(window.location.search);
    const returned = params.has("tt_order_id");
    if (returned) {
      // Strip them so a refresh doesn't replay the arrival.
      RETURN_PARAMS.forEach(key => params.delete(key));
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        window.location.pathname + (query ? `?${query}` : "")
      );
    }

    if (resumed || returned) {
      openedRef.current = true;
      setReachedCheckout(true);
      startVerifying();
    }
  }, [complete, checkoutConfigured, startVerifying]);

  const closeCheckout = useCallback(
    (verify: boolean) => {
      setCheckoutOpen(false);
      // Closing is not proof of purchase, so this starts a hard look rather
      // than a celebration: if an order exists, it surfaces within seconds.
      if (verify && openedRef.current) startVerifying();
    },
    [startVerifying]
  );

  // Ticket Tailor's event page does not walk itself to checkout when embedded
  // - it asks its parent to, and stalls if nobody answers. widget.js answers
  // by navigating the whole host page; we answer inside our own frame, so the
  // delegate never leaves the wizard.
  const openInFrame = useCallback(
    (rawUrl: unknown) => {
      if (typeof rawUrl !== "string" || !checkoutOrigin) return;
      let url: URL;
      try {
        url = new URL(rawUrl, checkoutOrigin);
      } catch {
        return;
      }
      // Only ever follow a link back to the checkout host itself.
      if (url.origin !== checkoutOrigin) return;

      setReachedCheckout(true);

      url.searchParams.set("widget", "true");
      url.searchParams.set("modal_widget", "true");
      url.searchParams.set("bg_fill", "true");

      // Naming the frame is what makes Ticket Tailor treat it as its own
      // modal: from here it reports ready and posts tt-checkout-close on the
      // way out, instead of reaching for a parent document it cannot touch.
      setEmbedState("loading");
      setFrameSrc(url.toString());
    },
    [checkoutOrigin]
  );

  // Ticket Tailor's checkout posts to its parent. Nothing here is trusted as
  // payment - only "the embed is alive", "take me to checkout" and "close me"
  // - and anything from an origin other than the checkout's is dropped.
  useEffect(() => {
    if (!checkoutOrigin) return;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== checkoutOrigin) return;

      // iframe-resizer's channel is plain strings. We don't resize with it,
      // but its traffic proves the frame booted, and it carries the close.
      if (typeof event.data === "string") {
        if (!event.data.startsWith("[iFrameSizer]")) return;
        setEmbedState("ready");
        if (event.data.endsWith(":close")) closeCheckout(true);
        return;
      }

      const data = event.data as { type?: string; url?: unknown } | null;
      switch (data?.type) {
        case "tt-checkout-ready":
        case "tt-checkout-version":
          setEmbedState("ready");
          break;
        case "tt-event-page-checkout-open":
        case "tt-basket-widget-open":
          openInFrame(data.url);
          break;
        case "tt-checkout-close":
        case "tt-checkout-overlay-close":
        case "tt-basket-overlay-close":
          closeCheckout(true);
          break;
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [checkoutOrigin, closeCheckout, openInFrame]);

  // If the embed never reports in, say so rather than leaving the delegate
  // staring at a blank frame - the new-tab link is then the way through.
  useEffect(() => {
    if (!checkoutOpen || embedState === "ready") return;
    const timer = setTimeout(() => {
      setEmbedState(prev => (prev === "ready" ? prev : "blocked"));
    }, READY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [checkoutOpen, embedState]);

  useEffect(() => {
    if (!checkoutOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCheckout(true);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [checkoutOpen, closeCheckout]);

  const rememberResume = useCallback(() => {
    openedRef.current = true;
    try {
      sessionStorage.setItem(RESUME_KEY, "1");
    } catch {
      // best effort
    }
  }, []);

  const openCheckout = useCallback(() => {
    openedRef.current = true;
    setEmbedState("loading");
    setVerifyFailed(false);

    // Where the frame would only be refused, hand the whole tab over to
    // checkout instead of spawning a second one. Ticket Tailor's "Redirect
    // order confirmation page" setting brings them back here, and the resume
    // flag covers a back-button return.
    if (!canFrame && checkoutPageUrl) {
      try {
        sessionStorage.setItem(RESUME_KEY, "1");
      } catch {
        // no resume flag, but the redirect back still carries tt_order_id
      }
      window.location.assign(checkoutPageUrl);
      return;
    }

    // The embed is the checkout widget itself, so the delegate is already at
    // the paying stage rather than browsing an event page.
    setReachedCheckout(true);
    setFrameSrc(checkoutEmbedUrl);
    setCheckoutOpen(true);
  }, [canFrame, checkoutEmbedUrl, checkoutPageUrl]);

  // Mirrors widget.js: the checkout waits on this handshake from its parent
  // before it will talk back.
  const onFrameLoad = useCallback(
    (event: React.SyntheticEvent<HTMLIFrameElement>) => {
      if (!checkoutOrigin) return;
      try {
        event.currentTarget.contentWindow?.postMessage(
          { type: "tt-widget-frame-init" },
          checkoutOrigin
        );
      } catch {
        // a refused handshake is survivable - polling still confirms
      }
    },
    [checkoutOrigin]
  );

  const submitClaim = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setClaimBusy(true);
      setClaimError(null);
      try {
        const res = await fetch("/api/ticket-wizard/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: claimEmail }),
        });
        const data = await res.json();
        if (res.ok && data.purchaseComplete) {
          markComplete(data.purchasedTicketName ?? null);
          return;
        }
        setClaimError(
          data?.error === "no-order"
            ? t("purchase-claim-error-no-order")
            : data?.error === "ticket-taken"
              ? t("purchase-claim-error-taken")
              : data?.error === "invalid-email"
                ? t("purchase-claim-error-invalid")
                : t("error-generic")
        );
      } catch {
        setClaimError(t("error-generic"));
      } finally {
        setClaimBusy(false);
      }
    },
    [claimEmail, markComplete, t]
  );

  if (complete) {
    return (
      <div className="wizard-intro-card">
        <p>
          {ticketName
            ? t("purchase-already-complete-named", { ticket: ticketName })
            : t("purchase-already-complete")}
        </p>
        {redirecting && (
          <p className="wizard-purchase-status">{t("purchase-redirecting")}</p>
        )}
        <Link href="/scavenger" className="cta-btn wizard-intro-cta">
          {t("purchase-go-to-dashboard")}
        </Link>
      </div>
    );
  }

  return (
    <>
      <TicketsSection
        tickets={tickets}
        widgetConfig={widgetConfig}
        purchasedTicketName={ticketName}
        onBuy={openCheckout}
      />

      {verifying && reachedCheckout && !checkoutOpen && (
        <p className="wizard-purchase-status">{t("purchase-verifying")}</p>
      )}

      {verifyFailed && reachedCheckout && !checkoutOpen && (
        <div className="wizard-verify-card">
          <p className="wizard-purchase-status wizard-purchase-status--timeout">
            {t("purchase-verify-failed", { email: accountEmail })}
          </p>
          <div className="wizard-verify-actions">
            <button type="button" className="cta-btn" onClick={startVerifying}>
              {t("purchase-check-again")}
            </button>
            <button
              type="button"
              className="wizard-verify-link"
              onClick={() => setClaimOpen(open => !open)}
            >
              {t("purchase-claim-toggle")}
            </button>
          </div>

          {claimOpen && (
            <form className="wizard-claim-form" onSubmit={submitClaim}>
              <label htmlFor="claim-email">{t("purchase-claim-label")}</label>
              <input
                id="claim-email"
                type="email"
                required
                value={claimEmail}
                onChange={e => setClaimEmail(e.target.value)}
                placeholder={accountEmail}
              />
              <button type="submit" className="cta-btn" disabled={claimBusy}>
                {claimBusy ? t("submitting") : t("purchase-claim-submit")}
              </button>
              {claimError && (
                <p className="wizard-purchase-status wizard-purchase-status--timeout">
                  {claimError}
                </p>
              )}
            </form>
          )}
        </div>
      )}

      {checkoutOpen && (
        <div
          className="wizard-checkout-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={t("purchase-heading")}
          onClick={() => closeCheckout(true)}
        >
          <div className="wizard-checkout-modal" onClick={e => e.stopPropagation()}>
            <div className="wizard-checkout-modal-bar">
              <span>{t("purchase-heading")}</span>
              <button
                type="button"
                className="wizard-checkout-close"
                onClick={() => closeCheckout(true)}
                aria-label={t("purchase-close-checkout")}
              >
                ×
              </button>
            </div>
            {/*
              Rendered as a plain iframe rather than via Ticket Tailor's
              widget.js: that script swaps itself for an iframe-resizer frame
              with scrolling="no" and relies on a cross-origin height
              handshake. When the handshake doesn't land the frame stays at
              its initial size with scrolling disabled - which is exactly the
              "cut off and non-interactive" state. Owning the iframe lets us
              size it and keep it scrollable ourselves.
            */}
            <iframe
              ref={frameRef}
              // Ticket Tailor recognises a frame with this name as its own
              // modal: it then reports `tt-checkout-ready` and asks to be
              // closed via `tt-checkout-close` rather than reaching for a
              // parent document it cannot touch. Safe on the checkout URL -
              // its auto-close path only fires on an `/events/...` page.
              name="tt-widget-modal"
              className="wizard-checkout-frame"
              src={frameSrc ?? checkoutEmbedUrl ?? undefined}
              title={t("purchase-heading")}
              scrolling="yes"
              allow="fullscreen; payment *"
              onLoad={onFrameLoad}
            />
            <p className="wizard-purchase-status">
              {embedState === "blocked"
                ? t("purchase-embed-blocked")
                : t("purchase-waiting-confirmation")}
            </p>
            {/*
              Offered up front only where checkout cannot be first-party
              anyway (no custom domain, or localhost), and otherwise held back
              until the embed fails to report in - so the happy path isn't
              cluttered with an escape hatch nobody needs. Polling runs either
              way, so a purchase finished in the new tab still lands here.
            */}
            {(!inlineCapable || embedState === "blocked") && (
              <p className="wizard-checkout-newtab">
                <a href={checkoutPageUrl ?? eventUrl ?? undefined} onClick={rememberResume}>
                  {t("purchase-continue-checkout")}
                </a>
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
