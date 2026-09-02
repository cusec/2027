"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { Auth0User, DbUser } from "@/lib/interface";
import ItemClaim from "./user/ItemClaim";
import InventoryModal from "./user/InventoryModal";
import AdminPanel from "./admin/AdminPanel";
import Modal from "@/components/ui/modal";
import {
  AdminIcon,
  BagIcon,
  HuntIcon,
  OutIcon,
  ProfileIcon,
  ScanIcon,
  SubmitIcon,
} from "./DockIcons";

interface AeroDockProps {
  user: Auth0User;
  dbUser: DbUser;
  linkedEmail?: string | null;
  baseURL: string;
}

/** The hunt's navigation: a left rail on desktop, a bottom bar on phones. */
const AeroDock = ({
  user,
  dbUser,
  linkedEmail,
  baseURL,
}: AeroDockProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = user?.["cusec/roles"]?.includes("Admin") ?? false;
  const isVolunteer = user?.["cusec/roles"]?.includes("Volunteer") ?? false;
  const canScan = Boolean(linkedEmail) && dbUser.active;

  // Resolved during render so the claim is open on first paint.
  const hasCode = Boolean(useSearchParams().get("identifier"));

  const [claimOpen, setClaimOpen] = useState(hasCode && canScan);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [needsEmail, setNeedsEmail] = useState(hasCode && !canScan);

  const scan = () => (canScan ? setClaimOpen(true) : setNeedsEmail(true));

  return (
    <>
      <nav className="aero-dock" aria-label="Scavenger hunt">
        <div className="aero-dock__inner">
          <button
            type="button"
            onClick={scan}
            className="aero-dock__item aero-dock__item--hero"
          >
            <span className="aero-orb aero-orb--scan aero-orb--hero">
              <ScanIcon />
            </span>
            <span className="aero-dock__label">Scan</span>
          </button>

          <Link
            href="/scavenger"
            className={`aero-dock__item${
              pathname === "/scavenger" ? " is-active" : ""
            }`}
          >
            <span className="aero-orb">
              <HuntIcon />
            </span>
            <span className="aero-dock__label">Hunt</span>
          </Link>

          <Link
            href="/scavenger/profile"
            className={`aero-dock__item${
              pathname === "/scavenger/profile" ? " is-active" : ""
            }`}
          >
            <span className="aero-orb">
              <ProfileIcon />
            </span>
            <span className="aero-dock__label">Profile</span>
          </Link>

          <Link
            href="/scavenger/submissions"
            className={`aero-dock__item${
              pathname === "/scavenger/submissions" ? " is-active" : ""
            }`}
          >
            <span className="aero-orb">
              <SubmitIcon />
            </span>
            <span className="aero-dock__label">Submit</span>
          </Link>

          <button
            type="button"
            onClick={() => setInventoryOpen(true)}
            className="aero-dock__item"
          >
            <span className="aero-orb">
              <BagIcon />
            </span>
            <span className="aero-dock__label">Bag</span>
          </button>

          {(isAdmin || isVolunteer) && (
            <button
              type="button"
              onClick={() => setAdminOpen(true)}
              className="aero-dock__item"
            >
              <span className="aero-orb aero-orb--ghost">
                <AdminIcon />
              </span>
              <span className="aero-dock__label">Admin</span>
            </button>
          )}

          <a
            href={`/auth/logout?returnTo=${baseURL}/scavenger`}
            className="aero-dock__item aero-dock__item--end"
          >
            <span className="aero-orb aero-orb--ghost">
              <OutIcon />
            </span>
            <span className="aero-dock__label">Out</span>
          </a>
        </div>
      </nav>

      <ItemClaim
        userId={dbUser._id}
        isOpen={claimOpen}
        onClose={() => setClaimOpen(false)}
        // points live on the server; re-render the tree after a claim
        onPointsUpdate={() => router.refresh()}
      />

      <InventoryModal
        userId={dbUser._id}
        isOpen={inventoryOpen}
        onClose={() => setInventoryOpen(false)}
      />

      {(isAdmin || isVolunteer) && (
        <AdminPanel
          isOpen={adminOpen}
          onClose={() => setAdminOpen(false)}
          isAdmin={isAdmin}
        />
      )}

      <Modal
        isOpen={needsEmail}
        onClose={() => setNeedsEmail(false)}
        title={dbUser.active ? "Link your email first" : "Account inactive"}
        className="max-w-md text-dark-mode"
      >
        <div className="flex flex-col items-center text-center">
          <AlertCircle className="w-10 h-10 mb-3 text-amber-500" />
          <p className="mb-5 text-sm">
            {dbUser.active
              ? "Link the email on your ticket before scanning codes — you'll find it on your profile."
              : "This account is inactive. Please talk to an organizer."}
          </p>
          {dbUser.active && (
            <Link
              href="/scavenger/profile"
              onClick={() => setNeedsEmail(false)}
              className="aero-btn"
            >
              Go to profile
            </Link>
          )}
        </div>
      </Modal>
    </>
  );
};

export default AeroDock;
