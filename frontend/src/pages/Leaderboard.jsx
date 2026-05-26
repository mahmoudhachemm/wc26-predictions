import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg.jpg";
import { apiRequest } from "../api/api";
import { getCurrentRound } from "../utils/currentRound";

function Leaderboard({ currentUser }) {
  const navigate = useNavigate();

  const [fixtures, setFixtures] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedRound, setSelectedRound] = useState("");
  const [sortBy, setSortBy] = useState("total");

  async function loadInitialData() {
    try {
      setLoading(true);
      const [fixturesData, savedCurrentRound] = await Promise.all([
        apiRequest("/fixtures"),
        getCurrentRound(),
      ]);

      setFixtures(fixturesData);

      const rounds = fixturesData.map((fixture) => fixture.gameweek).filter(Boolean);
      const uniqueRounds = [...new Set(rounds)];
      const firstRound = uniqueRounds.includes(savedCurrentRound)
        ? savedCurrentRound
        : uniqueRounds[0] || "";

      setSelectedRound(firstRound);

      const leaderboardData = await apiRequest(
        `/leaderboard${firstRound ? `?round=${encodeURIComponent(firstRound)}` : ""}`
      );

      setLeaderboard(leaderboardData);
    } catch (err) {
      alert(err.message || "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    async function loadLeaderboardForRound() {
      try {
        const leaderboardData = await apiRequest(
          `/leaderboard${
            selectedRound ? `?round=${encodeURIComponent(selectedRound)}` : ""
          }`
        );

        setLeaderboard(leaderboardData);
      } catch (err) {
        alert(err.message || "Failed to update leaderboard");
      }
    }

    if (!loading) {
      loadLeaderboardForRound();
    }
  }, [selectedRound]);

  const roundOptions = useMemo(() => {
    const rounds = fixtures.map((fixture) => fixture.gameweek).filter(Boolean);
    return [...new Set(rounds)];
  }, [fixtures]);

  const sortedLeaderboard = useMemo(() => {
    const rows = [...leaderboard];

    if (sortBy === "round") {
      return rows.sort(
        (a, b) =>
          b.currentRoundPoints - a.currentRoundPoints ||
          b.totalPoints - a.totalPoints
      );
    }

    return rows.sort(
      (a, b) =>
        b.totalPoints - a.totalPoints ||
        b.currentRoundPoints - a.currentRoundPoints
    );
  }, [leaderboard, sortBy]);

  function handleBack() {
    if (currentUser?.role === "admin") {
      navigate("/admin");
    } else {
      navigate("/user");
    }
  }

  async function handleReset() {
    setSortBy("total");

    const savedCurrentRound = await getCurrentRound();

    if (roundOptions.includes(savedCurrentRound)) {
      setSelectedRound(savedCurrentRound);
    } else if (roundOptions.length > 0) {
      setSelectedRound(roundOptions[0]);
    }
  }

  return (
    <div className="leaderboard-page" style={{ backgroundImage: `url(${bg})` }}>
      <div className="leaderboard-overlay"></div>

      <div className="leaderboard-content">
        <div className="leaderboard-top">
          <div>
            <p className="admin-kicker">
              {currentUser?.role === "admin" ? "Admin Mode" : "User Mode"}
            </p>
            <h1>Leaderboard</h1>
            <p>View current round points and total points.</p>
          </div>

          <button className="leaderboard-back-btn" onClick={handleBack}>
            Back
          </button>
        </div>

        <div className="leaderboard-filter-card">
          <div>
            <label>Round</label>
            <select
              value={selectedRound}
              onChange={(e) => setSelectedRound(e.target.value)}
            >
              {roundOptions.length === 0 ? (
                <option value="">No rounds yet</option>
              ) : (
                roundOptions.map((round) => (
                  <option key={round} value={round}>
                    {round}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label>Sort by</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="total">Total Points</option>
              <option value="round">Selected Round Points</option>
            </select>
          </div>

          <button className="leaderboard-apply-btn" type="button">
            Apply
          </button>

          <button
            className="leaderboard-reset-btn"
            onClick={handleReset}
            type="button"
          >
            Reset
          </button>
        </div>

        <div className="leaderboard-table-card">
          {loading ? (
            <div className="empty-state">
              <h3>Loading leaderboard...</h3>
            </div>
          ) : sortedLeaderboard.length === 0 ? (
            <div className="empty-state">
              <h3>No users yet</h3>
              <p>Users will appear here after signup.</p>
            </div>
          ) : (
            <div className="leaderboard-table compact-mobile-board">
              <div className="leaderboard-table-head">
                <span>#</span>
                <span>User</span>
                <span>{selectedRound || "Round"} Points</span>
                <span>Total Points</span>
              </div>

              {sortedLeaderboard.map((user, index) => (
                <div
                  className={`leaderboard-table-row compact-board-row ${
                    currentUser?.id === user.userId ? "my-leaderboard-row" : ""
                  }`}
                  key={user.userId}
                >
                  <span className="lb-rank-cell">{index + 1}</span>

                  <span className="leaderboard-user-name lb-user-cell">
                    <span className="lb-user-main">{user.userName}</span>
                    {currentUser?.id === user.userId && (
                      <small className="lb-you-pill">You</small>
                    )}
                  </span>

                  <span className="lb-round-cell">{user.currentRoundPoints}</span>

                  <span className="leaderboard-total-points lb-total-cell">
                    {user.totalPoints}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Leaderboard;