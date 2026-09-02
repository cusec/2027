"use client";

import { useState, useEffect, useMemo } from "react";
import { Gem, ShoppingBag, Wallet } from "lucide-react";
import { ShopItem, Collectible, Auth0User, DbUser } from "@/lib/interface";
import ShopPrize from "./user/ShopPrize";
import ShopCollectible from "./user/ShopCollectible";

interface ShopProps {
  user?: Auth0User | null;
  dbUser?: DbUser | null;
}

interface ShopResponse {
  success: boolean;
  shopItems: ShopItem[];
}

interface CollectiblesResponse {
  success: boolean;
  collectibles: Collectible[];
}

/** What the delegate would actually pay, discount included. */
const priceOf = (item: ShopItem | Collectible) =>
  item.discountedCost ?? item.cost;

const Shop = ({ user, dbUser }: ShopProps) => {
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState(dbUser?.points || 0);
  // The shop lists everything by default; the filter narrows it to what the
  // delegate can pay for right now, which is the question they are actually
  // asking when they open it.
  const [affordableOnly, setAffordableOnly] = useState(false);

  // Check if user is volunteer or admin
  const isAdmin = user?.["cusec/roles"]?.includes("Admin") ?? false;
  const isVolunteer = user?.["cusec/roles"]?.includes("Volunteer") ?? false;
  const isVolunteerOrAdmin = isAdmin || isVolunteer;

  useEffect(() => {
    fetchShopItems();
  }, []);

  // Update userPoints when dbUser changes
  useEffect(() => {
    setUserPoints(dbUser?.points || 0);
  }, [dbUser?.points]);

  const fetchShopItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const [shopResponse, collectiblesResponse] = await Promise.all([
        fetch("/api/shop"),
        fetch("/api/collectibles"),
      ]);

      if (!shopResponse.ok) {
        throw new Error("Failed to fetch shop items");
      }

      const shopData: ShopResponse = await shopResponse.json();
      const collectiblesData: CollectiblesResponse =
        await collectiblesResponse.json();

      if (shopData.success) {
        setShopItems(shopData.shopItems);
      } else {
        throw new Error("Failed to load shop data");
      }

      if (collectiblesData.success) {
        // Only show purchasable collectibles in the shop
        setCollectibles(
          collectiblesData.collectibles.filter((c) => c.purchasable)
        );
      }
    } catch (err) {
      console.error("Error fetching shop items:", err);
      setError("Failed to load shop");
    } finally {
      setLoading(false);
    }
  };

  const handleShopPrizeRedeemSuccess = () => {
    // Refresh shop items to update stock counts
    fetchShopItems();
  };

  const handleCollectibleRedeemSuccess = (newPoints: number) => {
    // Update user points after collectible purchase
    setUserPoints(newPoints);
  };

  const visiblePrizes = useMemo(
    () =>
      affordableOnly
        ? shopItems.filter((item) => priceOf(item) <= userPoints)
        : shopItems,
    [shopItems, affordableOnly, userPoints]
  );

  const visibleCollectibles = useMemo(
    () =>
      affordableOnly
        ? collectibles.filter((item) => priceOf(item) <= userPoints)
        : collectibles,
    [collectibles, affordableOnly, userPoints]
  );

  const hasStock = shopItems.length > 0 || collectibles.length > 0;
  const nothingAffordable =
    visiblePrizes.length === 0 && visibleCollectibles.length === 0;

  return (
    <section className="aero-sec" id="shop">
      <h2 className="aero-sec__title">
        <ShoppingBag aria-hidden="true" />
        Shop
      </h2>

      {loading ? (
        <div className="v2-card v2-glass aero-note">
          <p>Loading the shop…</p>
        </div>
      ) : error ? (
        <div className="v2-card v2-glass aero-note">
          <p>{error}</p>
        </div>
      ) : !hasStock ? (
        <div className="v2-card v2-glass aero-note">
          <p>No items available yet. Check back soon!</p>
        </div>
      ) : (
        <>
          <div className="aero-shop__bar">
            <p className="aero-shop__points">
              You have <b>{userPoints}</b> points
            </p>
            <button
              type="button"
              aria-pressed={affordableOnly}
              onClick={() => setAffordableOnly((on) => !on)}
              className={`aero-chip${affordableOnly ? " is-on" : ""}`}
            >
              <Wallet aria-hidden="true" />
              Within my points
            </button>
          </div>

          {nothingAffordable ? (
            <div className="v2-card v2-glass aero-note">
              <p>
                Nothing costs {userPoints} points or less yet. Keep claiming
                items, or turn the filter off to see the whole shop.
              </p>
            </div>
          ) : (
            <>
              {visiblePrizes.length > 0 && (
                <div className="aero-grid">
                  {visiblePrizes.map((item) => (
                    <ShopPrize
                      key={item._id}
                      item={item}
                      isVolunteerOrAdmin={isVolunteerOrAdmin}
                      onRedeemSuccess={handleShopPrizeRedeemSuccess}
                    />
                  ))}
                </div>
              )}

              {visibleCollectibles.length > 0 && (
                <>
                  {/* Collectibles are bought here like anything else, but they
                      look different enough from the prize tiles that delegates
                      were not finding them. */}
                  <p className="aero-shop__note">
                    <Gem aria-hidden="true" />
                    Collectibles are sold here too &mdash; buy them with points
                    and they land in your bag.
                  </p>
                  <div className="aero-grid aero-grid--wide">
                    {visibleCollectibles.map((collectible) => (
                      <ShopCollectible
                        key={collectible._id}
                        collectible={collectible}
                        userPoints={userPoints}
                        onRedeemSuccess={handleCollectibleRedeemSuccess}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
};

export default Shop;
