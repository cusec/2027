"use client";

import { useState, useEffect } from "react";
import { Megaphone } from "lucide-react";
import { Notice } from "@/lib/interface";

interface NoticeResponse {
  success: boolean;
  notices: Notice[];
}

const NoticeBoard = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/notices");

      if (!response.ok) {
        throw new Error("Failed to fetch notices");
      }

      const data: NoticeResponse = await response.json();

      if (data.success) {
        setNotices(data.notices);
      } else {
        throw new Error("Failed to load notices");
      }
    } catch (err) {
      console.error("Error fetching notices:", err);
      setError("Failed to load notices");
    } finally {
      setLoading(false);
    }
  };

  if (loading || (!error && notices.length === 0)) return null;

  return (
    <section className="aero-sec aero-sec--notices">
      <h2 className="aero-sec__title">
        <Megaphone aria-hidden="true" />
        Notice board
      </h2>

      {error ? (
        <div className="v2-card v2-glass aero-note">
          <p>{error}</p>
          <button type="button" onClick={fetchNotices} className="aero-btn aero-btn--glass">
            Try again
          </button>
        </div>
      ) : (
        <div className="aero-notes">
          {notices.map((notice) => (
            <article key={notice._id} className="v2-card v2-glass aero-note">
              <h3>{notice.title}</h3>
              <p>{notice.description}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default NoticeBoard;
