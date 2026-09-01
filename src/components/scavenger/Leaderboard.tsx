"use client";

import { useState, useEffect } from "react";
import { Trophy } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
}

interface LeaderboardResponse {
  success: boolean;
  leaderboard: LeaderboardEntry[];
}

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/leaderboard");

      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }

      const data: LeaderboardResponse = await response.json();

      if (data.success) {
        setLeaderboard(data.leaderboard);
      } else {
        throw new Error("Failed to load leaderboard data");
      }
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      setError("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="aero-sec" id="leaderboard">
      <h2 className="aero-sec__title">
        <Trophy aria-hidden="true" />
        Leaderboard
      </h2>

      {loading ? (
        <div className="aero-panel aero-board">
          <ol className="aero-board__rows">
            {[...Array(5)].map((_, i) => (
              <li key={i} className="is-ghost" />
            ))}
          </ol>
        </div>
      ) : error ? (
        <div className="aero-panel aero-note">
          <p>{error}</p>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="aero-panel aero-note">
          <p>No scores yet — be the first to earn points.</p>
        </div>
      ) : (
        <div className="aero-panel aero-board">
          <ol className="aero-board__rows">
            {leaderboard.map((entry) => (
              <li
                key={entry.rank}
                className={entry.rank <= 3 ? `is-top is-top-${entry.rank}` : undefined}
              >
                <span className="aero-board__rank">{entry.rank}</span>
                <span className="aero-board__name">{entry.name}</span>
                <span className="aero-board__score">{entry.score}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
};

export default Leaderboard;
