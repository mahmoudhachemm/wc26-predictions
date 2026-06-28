import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg.jpg";
import { apiRequest } from "../api/api";

const KNOCKOUT_ROUNDS = [
  "Round of 32",
  "Round of 16",
  "Quarter Final",
  "Semi Final",
  "Final",
];

function AdminCup() {
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  function applyCupData(data) {
    const safeData = data || {};

    setGroups(Array.isArray(safeData.groups) ? safeData.groups : []);
    setMatches(Array.isArray(safeData.matches) ? safeData.matches : []);
    setStandings(Array.isArray(safeData.standings) ? safeData.standings : []);
  }

  async function loadCup() {
    try {
      setLoading(true);
      const data = await apiRequest("/cup");
      applyCupData(data);
    } catch (err) {
      alert(err.message || "Failed to load cup.");
      setGroups([]);
      setMatches([]);
      setStandings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCup();
  }, []);

  const knockoutMatchesByRound = useMemo(() => {
    const map = {};

    KNOCKOUT_ROUNDS.forEach((round) => {
      map[round] = matches
        .filter((match) => match.gameweek === round)
        .sort((a, b) => {
          const aNo = Number(a.cupBracketMatchNumber || a.matchNumber || 0);
          const bNo = Number(b.cupBracketMatchNumber || b.matchNumber || 0);
          return aNo - bNo;
        });
    });

    return map;
  }, [matches]);

  async function handleGenerateRound(round) {
    const ok = window.confirm(`Generate ${round}?`);

    if (!ok) return;

    try {
      setActionLoading(true);

      const data = await apiRequest(
        `/cup/generate-round/${encodeURIComponent(round)}`,
        {
          method: "POST",
        }
      );

      applyCupData(data);
      alert(data?.message || `${round} generated successfully.`);
    } catch (err) {
      alert(err.message || `Failed to generate ${round}.`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSubmitRound(round) {
    const ok = window.confirm(
      `Submit ${round}? This will calculate Cup scores and winners.`
    );

    if (!ok) return;

    try {
      setActionLoading(true);

      const data = await apiRequest(
        `/cup/submit-round/${encodeURIComponent(round)}`,
        {
          method: "POST",
        }
      );

      applyCupData(data);
      alert(data?.message || `${round} submitted successfully.`);
    } catch (err) {
      alert(err.message || `Failed to submit ${round}.`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResetRound(round) {
    const ok = window.confirm(
      `Reset ${round}? This will delete this round and all future knockout rounds.`
    );

    if (!ok) return;

    try {
      setActionLoading(true);

      const data = await apiRequest(
        `/cup/reset-round/${encodeURIComponent(round)}`,
        {
          method: "POST",
        }
      );

      applyCupData(data);
      alert(data?.message || `${round} reset successfully.`);
    } catch (err) {
      alert(err.message || `Failed to reset ${round}.`);
    } finally {
      setActionLoading(false);
    }
  }

  async function chooseAdminWinner(matchId, winnerId) {
    try {
      setActionLoading(true);

      const data = await apiRequest(`/cup/set-admin-winner/${matchId}`, {
        method: "POST",
        body: JSON.stringify({ winnerId }),
      });

      applyCupData(data);
    } catch (err) {
      alert(err.message || "Failed to set winner.");
    } finally {
      setActionLoading(false);
    }
  }

  function getWinnerText(match) {
    if (!match.winnerId) return "";
    if (match.winnerId === match.userAId) return match.userAName;
    if (match.winnerId === match.userBId) return match.userBName;
    return match.winnerName || "";
  }

  function getRoundStatus(round) {
    const roundMatches = knockoutMatchesByRound[round] || [];

    if (roundMatches.length === 0) return "Not generated";
    if (roundMatches.some((match) => match.needsAdminDecision)) {
      return "Tie decision";
    }
    if (roundMatches.every((match) => match.isCompleted)) return "Submitted";

    return "Not submitted";
  }

  function renderMatch(match) {
    const winnerText = getWinnerText(match);

    return (
      <div className="cup-clean-match" key={match.id}>
        {match.cupBracketMatchNumber && (
          <div className="cup-match-number">
            Match {match.cupBracketMatchNumber}: {match.bracketSlotA} vs{" "}
            {match.bracketSlotB}
          </div>
        )}

        <div className="cup-clean-scoreline">
          <div className="cup-clean-team cup-left-team">
            {match.userAName || "TBD"}
          </div>

          <div className="cup-clean-score">
            <span>{match.isCompleted ? Number(match.cupScoreA || 0) : "-"}</span>
            <b>-</b>
            <span>{match.isCompleted ? Number(match.cupScoreB || 0) : "-"}</span>
          </div>

          <div className="cup-clean-team cup-right-team">
            {match.userBName || "TBD"}
          </div>
        </div>

        <div className="cup-clean-match-meta">
          {match.needsAdminDecision ? (
            <span className="cup-status-open">Tie decision needed</span>
          ) : match.isCompleted ? (
            <span className="cup-status-finished">Finished</span>
          ) : (
            <span className="cup-status-open">Not submitted</span>
          )}

          {winnerText && <strong>Winner: {winnerText}</strong>}
        </div>

        {match.needsAdminDecision && (
          <div className="cup-admin-choice-row">
            <button
              className="admin-black-btn"
              onClick={() => chooseAdminWinner(match.id, match.userAId)}
              disabled={actionLoading}
            >
              Choose {match.userAName}
            </button>

            <button
              className="admin-black-btn"
              onClick={() => chooseAdminWinner(match.id, match.userBId)}
              disabled={actionLoading}
            >
              Choose {match.userBName}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="admin-bg-page" style={{ backgroundImage: `url(${bg})` }}>
      <div className="admin-bg-overlay"></div>

      <div className="admin-content cup-clean-page">
        <div className="admin-header">
          <div>
            <p className="admin-kicker">Admin Mode</p>
            <h1>Cup Manager</h1>
            <p>Generate, submit, and reset knockout rounds.</p>
          </div>

          <button className="admin-logout-btn" onClick={() => navigate("/admin")}>
            Back
          </button>
        </div>

        <div className="admin-section-card">
          <h2>Knockout Controls</h2>
          <p>
            Generate Round of 32 after Round 3 is submitted. Then submit each
            knockout round and generate the next one.
          </p>

          <div className="cup-admin-rounds">
            {KNOCKOUT_ROUNDS.map((round) => {
              const status = getRoundStatus(round);

              return (
                <div className="cup-admin-round-card" key={round}>
                  <strong>{round}</strong>
                  <span>{status}</span>

                  <button
                    className="admin-black-btn"
                    onClick={() => handleGenerateRound(round)}
                    disabled={actionLoading || status !== "Not generated"}
                  >
                    Generate
                  </button>

                  <button
                    className="admin-black-btn"
                    onClick={() => handleSubmitRound(round)}
                    disabled={actionLoading || status === "Not generated"}
                  >
                    Submit
                  </button>

                  <button
                    className="admin-small-danger-btn"
                    onClick={() => handleResetRound(round)}
                    disabled={actionLoading || status === "Not generated"}
                  >
                    Reset
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="admin-section-card">
            <h3>Loading cup...</h3>
          </div>
        ) : (
          <div className="admin-section-card">
            <h2>Knockout Stage</h2>

            <div className="cup-clean-rounds">
              {KNOCKOUT_ROUNDS.map((round) => {
                const roundMatches = knockoutMatchesByRound[round] || [];

                return (
                  <div className="cup-clean-round-card" key={round}>
                    <h3>{round}</h3>

                    {roundMatches.length === 0 ? (
                      <p className="cup-no-games">Not generated yet.</p>
                    ) : (
                      <div className="cup-clean-match-list">
                        {roundMatches.map((match) => renderMatch(match))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminCup;