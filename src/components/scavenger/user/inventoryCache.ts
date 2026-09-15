"use client";

import { HuntItem, ShopItem, Submission } from "@/lib/interface";

/** Instance-specific fields the inventory route adds on top of a collectible. */
export interface InventoryCollectible {
  _id: string;
  collectibleId: string;
  used: boolean;
  addedAt: string;
  name: string;
  description: string;
  cost: number;
  imageData?: string;
  imageContentType?: string;
}

export interface InventorySnapshot {
  claimedItems: HuntItem[];
  shopPrizes: ShopItem[];
  collectibles: InventoryCollectible[];
  approved: Submission[];
}

interface InventoryResponse {
  success: boolean;
  inventory: {
    claimedItems: HuntItem[];
    shopPrizes: ShopItem[];
    collectibles: InventoryCollectible[];
  };
}

/**
 * A one-entry cache for the signed-in delegate's bag.
 *
 * The inventory used to be fetched only when the modal opened, so every delegate
 * paid a cold round trip while standing in front of a QR code. It is warmed in
 * the background once the dashboard mounts instead, and the modal renders from
 * the cache immediately and revalidates behind the visible content.
 *
 * Module scope rather than React state on purpose: the dashboard warms it and
 * the modal reads it, and those two are not in the same tree.
 */
const FRESH_MS = 60_000;

let entry: { userId: string; data: InventorySnapshot; at: number } | null = null;
/** Shared so a prefetch and an immediate open cannot both hit the network. */
let inflight: { userId: string; promise: Promise<InventorySnapshot> } | null =
  null;

async function fetchInventory(userId: string): Promise<InventorySnapshot> {
  const [response, submissionRes] = await Promise.all([
    fetch(`/api/users/${userId}/inventory`),
    // Outside the inventory document; a failure here must not empty the bag.
    fetch("/api/submissions").catch(() => null),
  ]);

  const data: InventoryResponse = await response.json();
  if (!data.success) throw new Error("Failed to load inventory");

  const submissionData = submissionRes ? await submissionRes.json() : null;

  return {
    claimedItems: data.inventory.claimedItems || [],
    shopPrizes: data.inventory.shopPrizes || [],
    collectibles: data.inventory.collectibles || [],
    approved: submissionData?.success
      ? (submissionData.submissions as Submission[]).filter(
          (submission) => submission.status === "approved",
        )
      : [],
  };
}

/** Cached data for this user, fresh or stale, or null if we hold none. */
export function peekInventory(userId: string): InventorySnapshot | null {
  return entry && entry.userId === userId ? entry.data : null;
}

export function isInventoryStale(userId: string): boolean {
  if (!entry || entry.userId !== userId) return true;
  return Date.now() - entry.at > FRESH_MS;
}

export async function loadInventory(
  userId: string,
  { force = false } = {},
): Promise<InventorySnapshot> {
  if (!force && entry && entry.userId === userId && !isInventoryStale(userId)) {
    return entry.data;
  }

  if (inflight && inflight.userId === userId) return inflight.promise;

  const promise = fetchInventory(userId)
    .then((data) => {
      entry = { userId, data, at: Date.now() };
      return data;
    })
    .finally(() => {
      if (inflight?.promise === promise) inflight = null;
    });

  inflight = { userId, promise };
  return promise;
}

/**
 * Warms the cache without blocking anything, and without surfacing an error:
 * a failed prefetch just means the modal fetches normally when it opens.
 */
export function prefetchInventory(userId: string) {
  if (!userId || (entry?.userId === userId && !isInventoryStale(userId))) return;

  const run = () => {
    loadInventory(userId).catch(() => {});
  };

  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    (window as Window & {
      requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void;
    }).requestIdleCallback(run, { timeout: 2000 });
  } else {
    setTimeout(run, 300);
  }
}

/** Called after anything that changes the bag: a claim, a redeem, a purchase. */
export function invalidateInventory() {
  entry = null;
}
