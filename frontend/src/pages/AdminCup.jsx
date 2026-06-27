import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg.jpg";
import { apiRequest } from "../api/api";

const GROUP_ROUNDS = ["Round 1", "Round 2", "Round 3"];

const KNOCKOUT_ROUNDS = [
  "Round of 32",
  "Round of 16",
  "Quarter Final",
  "Semi Final",
  "Final",
];

const ALL_CUP_ROUNDS = [...GROUP_ROUNDS, ...KNOCKOUT_ROUNDS];

function AdminCup() {
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [openGroups, setOpenGroups] = useState({});

  function applyCupData(data) {
    const safeData = data || {};
    const safeGroups = Array.isArray(safeData.groups) ? safeData.groups : [];

    setGroups(safeGroups);
    setMatches(Array.isArray(safeData.matches) ? safeData.matches : []);
    setStandings(Array.isArray(safeData.standings) ? safeData.standings : []);

    setOpenGroups((prev) => {
      const next = { ...prev };

      safeGroups.forEach((group, index) => {
        if (next[group.name] === undefined) {
          next[group.name] = index === 0;
        }
      });

      return next;
    });
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
        .sort((a, b) => Number(a.matchNumber || 0) - Number(b.matchNumber || 0));
    });

    return map;
  }, [matches]);

  async function handleGenerateGroupStage() {
    const ok = window.confirm(
      "This will randomly distribute users into groups and delete old cup games. Continue?"
    );

    if (!ok) return;

    try {
      setActionLoading(true);

      const data = await apiRequest("/cup/generate-group-stage", {
        method: "POST",
      });

      applyCupData(data);
      alert(data?.message || "Random group stage generated successfully.");
    } catch (err) {
      alert(err.message || "Failed to generate group stage.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSubmitRound(round) {
    const ok = window.confirm(
      `Submit ${round}? This will calculate scores and winners.`
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
      `Reset ${round}? This will reset this round and delete future rounds.`
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

  async function handleRecalculate() {
    try {
      setActionLoading(true);

      const data = await apiRequest("/cup/recalculate", {
        method: "POST",
      });

      applyCupData(data);
      alert(data?.message || "Cup recalculated successfully.");
    } catch (err) {
      alert(err.message || "Failed to recalculate cup.");
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

  function getGroupMatches(groupName) {
    return matches
      .filter((match) => match.phase === "Group Stage")
      .filter((match) => match.groupName === groupName)
      .sort((a, b) => Number(a.matchNumber || 0) - Number(b.matchNumber || 0));
  }

  function getRoundMatches(groupName, round) {
    return getGroupMatches(groupName).filter((match) => match.gameweek === round);
  }

  function getGroupStandings(groupName) {
    return standings.find((group) => group.groupName === groupName)?.rows || [];
  }

  function getWinnerText(match) {
    if (!match.winnerId) return "";
    if (match.winnerId === match.userAId) return match.userAName;
    if (match.winnerId === match.userBId) return match.userBName;
    return match.winnerName || "";
  }

  function getRoundStatus(round) {
    const roundMatches = matches.filter((match) => match.gameweek === round);

    if (roundMatches.length === 0) return "Not generated";
    if (roundMatches.some((match) => match.needsAdminDecision)) {
      return "Tie decision";
    }
    if (roundMatches.every((match) => match.isCompleted)) return "Submitted";

    return "Not submitted";
  }

  function toggleGroup(groupName) {
    setOpenGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  }

  function renderMatch(match) {
    const winnerText = getWinnerText(match);

    return (
      <div className="cup-clean-match" key={match.id}>
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
            <p>Group stage, qualifications, and full knockout bracket.</p>
          </div>

          <button className="admin-logout-btn" onClick={() => navigate("/admin")}>
            Back
          </button>
        </div>

        <div className="admin-section-card">
          <h2>Cup Controls</h2>
          <p>
            After submitting Round 3, Round of 32 is created automatically from
            top 2 of every group + best 8 third-place users.
          </p>

          <div className="cup-admin-actions">
            <button
              className="admin-black-btn"
              onClick={handleGenerateGroupStage}
              disabled={actionLoading}
            >
              Generate Group Stage
            </button>

            <button
              className="admin-black-btn"
              onClick={handleRecalculate}
              disabled={actionLoading}
            >
              Recalculate / Generate Next
            </button>

            <button
              className="admin-black-btn"
              onClick={() => navigate("/cup")}
              disabled={actionLoading}
            >
              View Cup Page
            </button>
          </div>
        </div>

        <div className="admin-section-card">
          <h2>Submit Rounds</h2>

          <div className="cup-admin-rounds">
            {ALL_CUP_ROUNDS.map((round) => {
              const status = getRoundStatus(round);

              return (
                <div className="cup-admin-round-card" key={round}>
                  <strong>{round}</strong>
                  <span>{status}</span>

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
        ) : groups.length === 0 ? (
          <div className="admin-section-card">
            <h3>No groups yet</h3>
            <p>Click Generate Group Stage to create the groups.</p>
          </div>
        ) : (
          <>
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

            <div className="cup-clean-groups">
              {groups.map((group) => {
                const rows = getGroupStandings(group.name);
                const isOpen = openGroups[group.name] !== false;

                return (
                  <div className="cup-clean-group-card" key={group._id || group.name}>
                    <button
                      type="button"
                      className="cup-clean-group-title cup-group-toggle"
                      onClick={() => toggleGroup(group.name)}
                    >
                      <div className="cup-group-title-left">
                        <span className="cup-group-dot"></span>
                        <h2>{group.name}</h2>
                      </div>

                      <span className="cup-group-arrow">
                        {isOpen ? "⌃" : "⌄"}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="cup-group-body">
                        <div className="cup-clean-table-wrap">
                          <table className="cup-clean-table">
                            <thead>
                              <tr>
                                <th>Pos</th>
                                <th>User</th>
                                <th>GP</th>
                                <th>For</th>
                                <th>Against</th>
                                <th>GD</th>
                                <th>PTS</th>
                              </tr>
                            </thead>

                            <tbody>
                              {rows.length === 0 ? (
                                <tr>
                                  <td colSpan="7" className="cup-empty-cell">
                                    No standings yet.
                                  </td>
                                </tr>
                              ) : (
                                rows.map((row) => (
                                  <tr key={row.userId}>
                                    <td>{row.position}</td>
                                    <td>{row.userName}</td>
                                    <td>{row.played}</td>
                                    <td>{row.cupPointsFor}</td>
                                    <td>{row.cupPointsAgainst}</td>
                                    <td>{row.cupPointsDifference}</td>
                                    <td>{row.groupPoints}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>

                        <div className="cup-clean-rounds">
                          {GROUP_ROUNDS.map((round) => {
                            const roundMatches = getRoundMatches(group.name, round);

                            return (
                              <div className="cup-clean-round-card" key={round}>
                                <h3>{round}</h3>

                                {roundMatches.length === 0 ? (
                                  <p className="cup-no-games">No games yet.</p>
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
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AdminCup;