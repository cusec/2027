"use client";

import { useState } from "react";
import { Collectible } from "@/lib/interface";
import { resolveImageSrc } from "@/lib/imageSrc";
import Modal from "@/components/ui/modal";
import { Loader2 } from "lucide-react";

interface ShopCollectibleProps {
  collectible: Collectible;
  userPoints: number;
  onRedeemSuccess?: (newPoints: number) => void;
}

// Helper function to get image source from collectible
const getCollectibleImageSrc = (item: Collectible): string | null =>
  resolveImageSrc(item.imageData, item.imageContentType);

const ShopCollectible = ({
  collectible,
  userPoints,
  onRedeemSuccess,
}: ShopCollectibleProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);

  const canAfford =
    collectible.discountedCost != null
      ? userPoints >= collectible.discountedCost
      : userPoints >= collectible.cost;

  const isSoldOut = collectible.limited && collectible.remaining <= 0;

  const openModal = () => {
    setIsModalOpen(true);
    setRedeemError(null);
    setRedeemSuccess(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setRedeemError(null);
    setRedeemSuccess(null);
  };

  const handleRedeem = async () => {
    if (!canAfford) return;

    setIsRedeeming(true);
    setRedeemError(null);

    try {
      const response = await fetch("/api/collectibles/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collectibleId: collectible._id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRedeemSuccess(data.message);
        // Update points after successful redemption
        onRedeemSuccess?.(data.redemption.user.newPoints);
        setTimeout(() => {
          closeModal();
        }, 2000);
      } else {
        setRedeemError(data.error || "Failed to purchase collectible");
      }
    } catch (error) {
      console.error("Error purchasing collectible:", error);
      setRedeemError("Failed to purchase collectible. Please try again.");
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <>
      <div
        onClick={openModal}
        className="v2-card v2-glass aero-tile flex flex-col sm:flex-row gap-2 mx-auto justify-center items-center text-center h-62 w-62 sm:h-32 sm:w-95"
      >
        {getCollectibleImageSrc(collectible) && (
          <div className="w-24 h-24 rounded-lg overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getCollectibleImageSrc(collectible)!}
              alt={collectible.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div
          className={`flex flex-col gap-2 pl-1 ${
            collectible.imageData && collectible.imageContentType
              ? "items-center md:items-start"
              : "items-center"
          }`}
        >
          <p>{collectible.name}</p>

          <div className="flex items-center justify-center space-x-1 text-xs md:text-sm">
            <div className="aero-tile__cost">
              {collectible.discountedCost != null ? (
                <>
                  <s>{collectible.cost} </s>&nbsp;
                  {`-> ${collectible.discountedCost}`}
                </>
              ) : (
                <>{collectible.cost}</>
              )}
            </div>

            {collectible.limited && (
              <span className="aero-tile__left">
                {collectible.remaining} left
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Collectible Detail Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={
          collectible.discountedCost != null
            ? `${collectible.name} (Price Updated)`
            : collectible.name
        }
        className="max-w-md text-light-mode"
      >
        {redeemSuccess ? (
          <div className="text-center py-4">
            <div className="text-green-300 font-semibold mb-2">
              ✓ {redeemSuccess}
            </div>
            <p className="text-sm">
              Check your inventory to see your new collectible!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Collectible Image */}
            {getCollectibleImageSrc(collectible) && (
              <div className="w-50 h-50 mx-auto rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getCollectibleImageSrc(collectible)!}
                  alt={collectible.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Description */}
            {collectible.description && <p>{collectible.description}</p>}

            {/* Details */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Cost:</span>
                <span className="font-medium">
                  {collectible.discountedCost != null ? (
                    <>
                      <s>{collectible.cost} </s>&nbsp;
                      {`-> ${collectible.discountedCost}`}
                    </>
                  ) : (
                    <>{collectible.cost}</>
                  )}{" "}
                  points
                </span>
              </div>
              {collectible.limited && (
                <div className="flex justify-between">
                  <span className="font-medium">Availability:</span>
                  <span
                    className={
                      collectible.remaining > 0
                        ? "text-orange-300"
                        : "text-red-300"
                    }
                  >
                    {collectible.remaining > 0
                      ? `${collectible.remaining} remaining`
                      : "Sold out"}
                  </span>
                </div>
              )}
            </div>

            {/* Sold Out Warning */}
            {isSoldOut && (
              <div className="p-3 bg-red-500/15 border border-red-400/40 text-red-200 rounded-lg text-sm">
                This collectible is sold out.
              </div>
            )}

            {/* Points Warning */}
            {!canAfford && !isSoldOut && (
              <div className="v2-modal__row p-3 text-sm">
                You need{" "}
                {Math.abs(
                  (collectible.discountedCost ?? collectible.cost) - userPoints
                )}{" "}
                more points to purchase this collectible.
              </div>
            )}

            {/* Error Message */}
            {redeemError && (
              <div className="p-3 bg-red-500/15 border border-red-400/40 text-red-200 rounded-lg text-sm">
                {redeemError}
              </div>
            )}

            {/* Redeem Button */}
            <button
              onClick={handleRedeem}
              disabled={!canAfford || isRedeeming || isSoldOut}
              className="aero-btn w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRedeeming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Purchasing...
                </>
              ) : isSoldOut ? (
                "Sold Out"
              ) : canAfford ? (
                "Purchase Collectible"
              ) : (
                "Not Enough Points"
              )}
            </button>
          </div>
        )}
      </Modal>
    </>
  );
};

export default ShopCollectible;
