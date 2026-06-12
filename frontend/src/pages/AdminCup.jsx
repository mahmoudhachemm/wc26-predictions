import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg.jpg";
import { apiRequest } from "../api/api";

const GROUP_ROUNDS = ["Round 1", "Round 2", "Round 3"];

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

  async function handleSubmitRound(round) {
    const ok = window.confirm(
      `Submit ${round}? This will calculate Cup scores and winners for ${round}.`
    );

    if (!ok) return;

    try {
      setActionLoading(true);

      const data = await apiRequest(`/cup/submit-round/${encodeURIComponent(round)}`, {
        method: "POST",
      });

      applyCupData(data);
      alert(data?.message || `${round} submitted successfully.`);
    } catch (err) {
      alert(err.message || `Failed to submit ${round}.`);
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
    const roundMatches = matches.filter(
      (match) => match.phase === "Group Stage" && match.gameweek === round
    );

    if (roundMatches.length === 0) return "No games";
    if (roundMatches.every((match) => match.isCompleted)) return "Submitted";
    return "Not submitted";
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

  return (
    <div className="admin-bg-page" style={{ backgroundImage: `url(${bg})` }}>
      <div className="admin-bg-overlay"></div>

      <div className="admin-content cup-clean-page">
        <div className="admin-header">
          <div>
            <p className="admin-kicker">Admin Mode</p>
            <h1>Cup Manager</h1>
            <p>Submit each round only when you want to calculate scores.</p>
          </div>

          <button className="admin-logout-btn" onClick={() => navigate("/admin")}>
            Back
          </button>
        </div>

        <div className="cup-admin-submit-card">
          <div>
            <h2>Submit Cup Rounds</h2>
            <p>Games stay not submitted until you click a round button.</p>
          </div>

          <div className="cup-admin-submit-actions">
            {GROUP_ROUNDS.map((round) => (
              <button
                key={round}
                className={
                  getRoundStatus(round) === "Submitted"
                    ? "cup-submit-btn submitted"
                    : "cup-submit-btn"
                }
                onClick={() => handleSubmitRound(round)}
                disabled={actionLoading || getRoundStatus(round) === "No games"}
              >
                <span>{round}</span>
                <strong>{getRoundStatus(round)}</strong>
              </button>
            ))}

            <button
              className="cup-view-btn"
              onClick={() => navigate("/cup")}
              disabled={actionLoading}
            >
              View Cup
            </button>
          </div>
        </div>

        {loading ? (
          <div className="admin-section-card">
            <h3>Loading cup...</h3>
          </div>
        ) : groups.length === 0 ? (
          <div className="admin-section-card">
            <h3>No groups found</h3>
            <p>
              No cup groups found. If you need the generate button again, tell me.
            </p>
          </div>
        ) : (
          <div className="cup-clean-groups">
            {groups.map((group) => {
              const rows = getGroupStandings(group.name);

              return (
                <div className="cup-clean-group-card" key={group._id || group.name}>
                  <div className="cup-clean-group-title">
                    <span>🏆</span>
                    <h2>{group.name}</h2>
                  </div>

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
                              <td>
                                <strong>{row.userName}</strong>
                              </td>
                              <td>{row.played}</td>
                              <td>{row.cupPointsFor}</td>
                              <td>{row.cupPointsAgainst}</td>
                              <td>{row.cupPointsDifference}</td>
                              <td>
                                <strong>{row.groupPoints}</strong>
                              </td>
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
                              {roundMatches.map((match) => {
                                const winnerText = getWinnerText(match);

                                return (
                                  <div className="cup-clean-match" key={match.id}>
                                    <div className="cup-clean-scoreline">
                                      <div className="cup-clean-team cup-left-team">
                                        {match.userAName || "TBD"}
                                      </div>

                                      <div className="cup-clean-score">
                                        <span>
                                          {match.isCompleted
                                            ? Number(match.cupScoreA || 0)
                                            : "-"}
                                        </span>
                                        <b>-</b>
                                        <span>
                                          {match.isCompleted
                                            ? Number(match.cupScoreB || 0)
                                            : "-"}
                                        </span>
                                      </div>

                                      <div className="cup-clean-team cup-right-team">
                                        {match.userBName || "TBD"}
                                      </div>
                                    </div>

                                    <div className="cup-clean-match-meta">
                                      {match.needsAdminDecision ? (
                                        <span className="cup-status-tie">
                                          Tie decision needed
                                        </span>
                                      ) : match.isCompleted ? (
                                        <span className="cup-status-finished">
                                          Finished
                                        </span>
                                      ) : (
                                        <span className="cup-status-open">
                                          Not submitted
                                        </span>
                                      )}

                                      {winnerText && (
                                        <strong>Winner: {winnerText}</strong>
                                      )}
                                    </div>

                                    {match.needsAdminDecision && (
                                      <div className="cup-admin-tie-actions">
                                        <button
                                          onClick={() =>
                                            chooseAdminWinner(match.id, match.userAId)
                                          }
                                          disabled={actionLoading}
                                        >
                                          Choose {match.userAName}
                                        </button>

                                        <button
                                          onClick={() =>
                                            chooseAdminWinner(match.id, match.userBId)
                                          }
                                          disabled={actionLoading}
                                        >
                                          Choose {match.userBName}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminCup;