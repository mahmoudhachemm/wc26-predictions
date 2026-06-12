import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg.jpg";
import { apiRequest } from "../api/api";

const GROUP_ROUNDS = ["Round 1", "Round 2", "Round 3"];

function Cup({ currentUser }) {
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  function cleanId(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
    return String(value);
  }

  function getCurrentUserId() {
    return cleanId(currentUser?._id || currentUser?.id);
  }

  async function loadCup() {
    try {
      setLoading(true);

      const data = await apiRequest("/cup");
      const safeData = data || {};

      setGroups(Array.isArray(safeData.groups) ? safeData.groups : []);
      setMatches(Array.isArray(safeData.matches) ? safeData.matches : []);
      setStandings(Array.isArray(safeData.standings) ? safeData.standings : []);
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

  const groupedMatches = useMemo(() => {
    const map = {};

    matches
      .filter((match) => match.phase === "Group Stage")
      .forEach((match) => {
        if (!map[match.groupName]) {
          map[match.groupName] = {};
        }

        if (!map[match.groupName][match.gameweek]) {
          map[match.groupName][match.gameweek] = [];
        }

        map[match.groupName][match.gameweek].push(match);
      });

    Object.keys(map).forEach((groupName) => {
      Object.keys(map[groupName]).forEach((round) => {
        map[groupName][round].sort(
          (a, b) => Number(a.matchNumber || 0) - Number(b.matchNumber || 0)
        );
      });
    });

    return map;
  }, [matches]);

  function getStandingsRows(groupName) {
    const groupStanding = standings.find((item) => item.groupName === groupName);
    return groupStanding?.rows || [];
  }

  function getWinnerLabel(match) {
    if (!match.winnerId) return "";
    if (match.winnerId === match.userAId) return match.userAName;
    if (match.winnerId === match.userBId) return match.userBName;
    return match.winnerName || "";
  }

  function getMatchStatus(match) {
    if (match.needsAdminDecision) return "Tie decision needed";
    if (match.isCompleted) return "Finished";
    return "Not submitted";
  }

  function handleBack() {
    if (currentUser?.role === "admin") {
      navigate("/admin/cup");
    } else {
      navigate("/user");
    }
  }

  return (
    <div className="admin-bg-page" style={{ backgroundImage: `url(${bg})` }}>
      <div className="admin-bg-overlay"></div>

      <div className="admin-content cup-clean-page">
        <div className="admin-header">
          <div>
            <p className="admin-kicker">
              {currentUser?.role === "admin" ? "Admin Mode" : "User Mode"}
            </p>
            <h1>Cup</h1>
            <p>Group standings and H2H games.</p>
          </div>

          <button className="admin-logout-btn" onClick={handleBack}>
            Back
          </button>
        </div>

        {loading ? (
          <div className="admin-section-card">
            <h3>Loading cup...</h3>
          </div>
        ) : groups.length === 0 ? (
          <div className="admin-section-card">
            <h3>No cup groups yet</h3>
            <p>Admin must generate the groups first.</p>
          </div>
        ) : (
          <div className="cup-clean-groups">
            {groups.map((group) => {
              const rows = getStandingsRows(group.name);
              const groupMatches = groupedMatches[group.name] || {};

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
                          rows.map((row) => {
                            const isMe = row.userId === getCurrentUserId();

                            return (
                              <tr key={row.userId} className={isMe ? "cup-me-row" : ""}>
                                <td>{row.position}</td>
                                <td>
                                  <strong>{row.userName}</strong>
                                  {isMe && <span className="cup-you-pill">You</span>}
                                </td>
                                <td>{row.played}</td>
                                <td>{row.cupPointsFor}</td>
                                <td>{row.cupPointsAgainst}</td>
                                <td>{row.cupPointsDifference}</td>
                                <td>
                                  <strong>{row.groupPoints}</strong>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="cup-clean-rounds">
                    {GROUP_ROUNDS.map((round) => {
                      const roundMatches = groupMatches[round] || [];

                      return (
                        <div className="cup-clean-round-card" key={round}>
                          <h3>{round}</h3>

                          {roundMatches.length === 0 ? (
                            <p className="cup-no-games">No games yet.</p>
                          ) : (
                            <div className="cup-clean-match-list">
                              {roundMatches.map((match) => {
                                const winnerLabel = getWinnerLabel(match);

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
                                      <span
                                        className={
                                          match.isCompleted
                                            ? "cup-status-finished"
                                            : "cup-status-open"
                                        }
                                      >
                                        {getMatchStatus(match)}
                                      </span>

                                      {winnerLabel && (
                                        <strong>Winner: {winnerLabel}</strong>
                                      )}
                                    </div>
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

export default Cup;