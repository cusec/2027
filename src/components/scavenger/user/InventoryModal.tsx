"use client";

import { useState, useEffect } from "react";
import { Package, Gem, Gift, Send, ExternalLink } from "lucide-react";
import Modal from "@/components/ui/modal";
import { HuntItem, ShopItem, Submission, Challenge } from "@/lib/interface";
import { resolveImageSrc } from "@/lib/imageSrc";

// Extended collectible interface for inventory (includes instance-specific fields)
interface InventoryCollectible {
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

interface InventoryModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface InventoryResponse {
  success: boolean;
  inventory: {
    claimedItems: HuntItem[];
    shopPrizes: ShopItem[];
    collectibles: InventoryCollectible[];
  };
}

/** Approved entries carry the challenge they answered, populated by the API. */
const challengeOf = (submission: Submission): Challenge | null =>
  typeof submission.challengeId === "object" ? submission.challengeId : null;

const teamNameOf = (submission: Submission): string | null =>
  submission.teamId && typeof submission.teamId === "object"
    ? submission.teamId.name
    : null;

// Helper function to get image source from shop item
const getShopItemImageSrc = (item: ShopItem): string | null =>
  resolveImageSrc(item.imageData, item.imageContentType);

// Interface for grouped collectibles
interface GroupedCollectible {
  name: string;
  description: string;
  imageData?: string;
  imageContentType?: string;
  available: number;
  used: number;
}

// Helper function to group collectibles by name
const groupCollectiblesByName = (
  collectibles: InventoryCollectible[]
): GroupedCollectible[] => {
  const grouped = new Map<string, GroupedCollectible>();

  for (const collectible of collectibles) {
    const existing = grouped.get(collectible.name);
    if (existing) {
      if (collectible.used) {
        existing.used++;
      } else {
        existing.available++;
      }
    } else {
      grouped.set(collectible.name, {
        name: collectible.name,
        description: collectible.description,
        imageData: collectible.imageData,
        imageContentType: collectible.imageContentType,
        available: collectible.used ? 0 : 1,
        used: collectible.used ? 1 : 0,
      });
    }
  }

  return Array.from(grouped.values());
};

const InventoryModal = ({ userId, isOpen, onClose }: InventoryModalProps) => {
  const [claimedItems, setClaimedItems] = useState<HuntItem[]>([]);
  const [shopPrizes, setShopPrizes] = useState<ShopItem[]>([]);
  const [collectibles, setCollectibles] = useState<InventoryCollectible[]>([]);
  const [approved, setApproved] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError(null);

      const [response, submissionRes] = await Promise.all([
        fetch(`/api/users/${userId}/inventory`),
        // Approved entries live outside the inventory document, so they are
        // fetched alongside it. A failure here must not empty the bag.
        fetch("/api/submissions").catch(() => null),
      ]);
      const data: InventoryResponse = await response.json();

      if (data.success) {
        setClaimedItems(data.inventory.claimedItems || []);
        setShopPrizes(data.inventory.shopPrizes || []);
        setCollectibles(data.inventory.collectibles || []);
      } else {
        throw new Error("Failed to load inventory");
      }

      const submissionData = submissionRes ? await submissionRes.json() : null;
      setApproved(
        submissionData?.success
          ? (submissionData.submissions as Submission[]).filter(
              (submission) => submission.status === "approved"
            )
          : []
      );
    } catch (err) {
      console.error("Error fetching inventory:", err);
      setError("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInventory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Your Inventory"
      className="mx-4 max-w-[90vw] md:max-w-2xl max-h-[80vh] text-light-mode"
    >
      <>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-light-mode mx-auto mb-4"></div>
            <p className="text-light-mode/70">Loading inventory...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchInventory}
              className="px-4 py-2 bg-light-mode/10 hover:bg-light-mode/20 rounded-lg transition"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Hunt Items Section */}
            <div>
              <div className="flex items-center gap-2 mb-4 top-0 py-2">
                <Package className="w-5 h-5 text-sea" />
                <h3 className="text-lg font-semibold">
                  Hunt Items ({claimedItems.length})
                </h3>
              </div>
              {claimedItems.length === 0 ? (
                <div className="text-center py-6 rounded-lg">
                  <Package className="w-12 h-12 mx-auto mb-2 text-light-mode/30" />
                  <p className="text-light-mode/50">
                    No hunt items claimed yet.
                  </p>
                  <p className="text-light-mode/40 text-sm mt-1">
                    Scan QR codes to claim items!
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {claimedItems.map((item) => (
                    <div
                      key={item._id}
                      className="v2-modal__row flex items-center gap-4 p-4"
                    >
                      <div className="w-10 h-10 hidden md:flex rounded-full bg-light-mode/10  items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-light-mode" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold wrap-break-word text-light-mode">
                          {item.name}
                        </p>
                        {item.description && (
                          <p className="text-sm text-light-mode/60 wrap-break-word">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-light-mode font-bold">
                          {item.points}
                        </span>
                        <span className="text-light-mode/60 text-sm ml-1">
                          pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-light-mode/20"></div>

            {/* Shop Prizes Section */}
            <div>
              <div className="flex items-center gap-2 mb-4 top-0 py-2">
                <Gift className="w-5 h-5 text-accent" />
                <h3 className="text-lg font-semibold">
                  Shop Prizes ({shopPrizes.length})
                </h3>
              </div>
              {shopPrizes.length === 0 ? (
                <div className="text-center py-6 rounded-lg">
                  <Gift className="w-12 h-12 mx-auto mb-2 text-light-mode/30" />
                  <p className="text-light-mode/50">
                    No shop prizes redeemed yet.
                  </p>
                  <p className="text-light-mode/40 text-sm mt-1">
                    Visit the shop to redeem prizes!
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {shopPrizes.map((prize) => (
                    <div
                      key={prize._id}
                      className="v2-modal__row flex items-center gap-4 p-4"
                    >
                      {getShopItemImageSrc(prize) && (
                        <div className="w-10 h-10 hidden md:flex rounded-full overflow-hidden shrink-0 bg-light-mode/10">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getShopItemImageSrc(prize)!}
                            alt={prize.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold wrap-break-word text-light-mode">
                          {prize.count || 0 > 1 ? `(${prize.count}x) ` : ""}
                          {prize.name}
                        </p>
                        {prize.description && (
                          <p className="text-sm text-light-mode/60 wrap-break-word">
                            {prize.description}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-light-mode font-bold">
                          {prize.cost}
                        </span>
                        <span className="text-light-mode/60 text-sm ml-1">
                          pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-light-mode/20"></div>

            {/* Collectibles Section */}
            <div>
              <div className="flex items-center gap-2 mb-4 top-0 py-2">
                <Gem className="w-5 h-5 text-secondary" />
                <h3 className="text-lg font-semibold">
                  Collectibles ({collectibles.length})
                </h3>
              </div>
              {collectibles.length === 0 ? (
                <div className="text-center py-6 rounded-lg">
                  <Gem className="w-12 h-12 mx-auto mb-2 text-light-mode/30" />
                  <p className="text-light-mode/50">No collectibles yet.</p>
                  <p className="text-light-mode/40 text-sm mt-1">
                    Claim hunt items or purchase from the shop!
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {groupCollectiblesByName(collectibles).map((collectible) => (
                    <div
                      key={collectible.name}
                      className="v2-modal__row flex items-center gap-4 p-4"
                    >
                      {resolveImageSrc(
                        collectible.imageData,
                        collectible.imageContentType
                      ) && (
                        <div className="w-10 h-10 hidden md:flex rounded-full overflow-hidden shrink-0 bg-light-mode/10">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              resolveImageSrc(
                                collectible.imageData,
                                collectible.imageContentType
                              )!
                            }
                            alt={collectible.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold wrap-break-word text-light-mode">
                          {collectible.name}
                        </p>
                        {collectible.description && (
                          <p className="text-xs text-light-mode/60 mt-1 wrap-break-word">
                            {collectible.description}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-light-mode">
                          <span className="text-light-mode/60 text-sm">
                            Available:{" "}
                          </span>
                          <span className="font-bold">
                            {collectible.available}
                          </span>
                        </div>
                        <div className="text-light-mode">
                          <span className="text-light-mode/60 text-sm">
                            Used:{" "}
                          </span>
                          <span className="font-bold">{collectible.used}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-light-mode/20"></div>

            {/* Approved Submissions Section */}
            <div>
              <div className="flex items-center gap-2 mb-4 top-0 py-2">
                <Send className="w-5 h-5 text-sea" />
                <h3 className="text-lg font-semibold">
                  Approved Submissions ({approved.length})
                </h3>
              </div>
              {approved.length === 0 ? (
                <div className="text-center py-6 rounded-lg">
                  <Send className="w-12 h-12 mx-auto mb-2 text-light-mode/30" />
                  <p className="text-light-mode/50">
                    No approved submissions yet.
                  </p>
                  <p className="text-light-mode/40 text-sm mt-1">
                    Enter a challenge — approved entries land here.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {approved.map((submission) => {
                    const challenge = challengeOf(submission);
                    const team = teamNameOf(submission);

                    return (
                      <div
                        key={submission._id}
                        className="v2-modal__row flex items-center gap-4 p-4"
                      >
                        <div className="w-10 h-10 hidden md:flex rounded-full bg-light-mode/10 items-center justify-center shrink-0">
                          <Send className="w-5 h-5 text-light-mode" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold wrap-break-word text-light-mode">
                            {challenge?.title ?? "Challenge"}
                          </p>
                          <p className="text-sm text-light-mode/60 wrap-break-word">
                            {challenge?.eventName}
                            {team ? ` · with ${team}` : ""}
                          </p>
                          <a
                            href={submission.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 mt-1 text-sm text-light-mode/70 hover:text-light-mode underline underline-offset-2 wrap-break-word"
                          >
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            View entry
                          </a>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-light-mode font-bold">
                            {submission.pointsAwarded}
                          </span>
                          <span className="text-light-mode/60 text-sm ml-1">
                            pts
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </>
    </Modal>
  );
};

export default InventoryModal;
