"use client";

import { useState, useEffect } from "react";
import { ShoppingBag } from "lucide-react";
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

const Shop = ({ user, dbUser }: ShopProps) => {
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState(dbUser?.points || 0);

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

  return (
    <section className="aero-sec" id="shop">
      <h2 className="aero-sec__title">
        <ShoppingBag aria-hidden="true" />
        Shop
      </h2>

      {loading ? (
        <div className="aero-panel aero-note">
          <p>Loading the shop…</p>
        </div>
      ) : error ? (
        <div className="aero-panel aero-note">
          <p>{error}</p>
        </div>
      ) : shopItems.length === 0 && collectibles.length === 0 ? (
        <div className="aero-panel aero-note">
          <p>No items available yet. Check back soon!</p>
        </div>
      ) : (
        <>
          {shopItems.length > 0 && (
            <div className="aero-grid">
              {shopItems.map((item) => (
                <ShopPrize
                  key={item._id}
                  item={item}
                  isVolunteerOrAdmin={isVolunteerOrAdmin}
                  onRedeemSuccess={handleShopPrizeRedeemSuccess}
                />
              ))}
            </div>
          )}

          {collectibles.length > 0 && (
            <div className="aero-grid aero-grid--wide">
              {collectibles.map((collectible) => (
                <ShopCollectible
                  key={collectible._id}
                  collectible={collectible}
                  userPoints={userPoints}
                  onRedeemSuccess={handleCollectibleRedeemSuccess}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default Shop;
