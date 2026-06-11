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

  async function handleGenerateGroupStage() {
    const ok = window.confirm(
      "This will randomly distribute users into 12 groups and randomly generate group-stage games. It will delete old cup groups/games. Continue?"
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

  async function chooseAdminWinner(matchId, winnerId) {
    try {
      setActionLoading(true);

      await apiRequest(`/cup/set-admin-winner/${matchId}`, {
        method: "POST",
        body: JSON.stringify({ winnerId }),
      });

      await loadCup();
    } catch (err) {
      alert(err.message || "Failed to set winner.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="admin-bg-page" style={{ backgroundImage: `url(${bg})` }}>
      <div className="admin-bg-overlay"></div>

      <div className="admin-content">
        <div className="admin-header">
          <div>
            <p className="admin-kicker">Admin Mode</p>
            <h1>Cup Manager</h1>
            <p>Generate random groups and random group-stage games.</p>
          </div>

          <button className="admin-black-btn" onClick={() => navigate("/admin")}>
            Back
          </button>
        </div>

        <div className="cup-admin-actions">
          <button
            className="admin-black-btn"
            onClick={handleGenerateGroupStage}
            disabled={actionLoading}
          >
            Generate Random Group Stage
          </button>

          <button
            className="admin-black-btn"
            onClick={handleRecalculate}
            disabled={actionLoading}
          >
            Recalculate Cup
          </button>

          <button
            className="admin-black-btn"
            onClick={() => navigate("/cup")}
            disabled={actionLoading}
          >
            View Cup Page
          </button>
        </div>

        {loading ? (
          <div className="empty-card">
            <h3>Loading cup...</h3>
          </div>
        ) : groups.length === 0 ? (
          <div className="empty-card">
            <h3>No groups yet</h3>
            <p>Click Generate Random Group Stage to create the 12 groups.</p>
          </div>
        ) : (
          <div className="cup-grid">
            {groups.map((group) => {
              const rows = getGroupStandings(group.name);

              return (
                <div
                  className="cup-group-card"
                  key={group.id || group._id || group.name}
                >
                  <div className="cup-card-header">
                    <div>
                      <p className="cup-label">Group Stage</p>
                      <h2>{group.name}</h2>
                    </div>

                    <div className="cup-count">
                      {(group.users || []).length}
                      <span>users</span>
                    </div>
                  </div>

                  <div className="cup-users">
                    {(group.users || []).map((user, index) => (
                      <div className="cup-user-row" key={user._id || user.id || index}>
                        <span className="cup-user-number">{index + 1}</span>
                        <span className="cup-user-name">
                          {user.fullName || user.email || "User"}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="cup-section-title">Standings</div>

                  {rows.length === 0 ? (
                    <div className="mini-empty">No standings yet.</div>
                  ) : (
                    <div className="cup-standings">
                      <div className="cup-standings-head">
                        <span>Pos</span>
                        <span>User</span>
                        <span>GP</span>
                        <span>GD</span>
                        <span>PF</span>
                      </div>

                      {rows.map((row) => (
                        <div
                          className={`cup-standings-row ${
                            row.position <= 2
                              ? "qualified-row"
                              : row.position === 3
                              ? "third-row"
                              : ""
                          }`}
                          key={row.userId}
                        >
                          <span>{row.position}</span>
                          <span>{row.userName}</span>
                          <span>{row.groupPoints}</span>
                          <span>{row.cupPointsDifference}</span>
                          <span>{row.cupPointsFor}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="cup-section-title">Games</div>

                  <div className="cup-rounds">
                    {GROUP_ROUNDS.map((round) => (
                      <div className="cup-round-block" key={round}>
                        <div className="cup-round-title">{round}</div>

                        {getRoundMatches(group.name, round).length === 0 ? (
                          <div className="mini-empty">No games yet.</div>
                        ) : (
                          getRoundMatches(group.name, round).map((match) => {
                            const winnerText = getWinnerText(match);

                            return (
                              <div className="cup-match-card" key={match.id}>
                                <div className="cup-match-users">
                                  <div
                                    className={`cup-match-user ${
                                      match.winnerId === match.userAId
                                        ? "cup-match-winner"
                                        : ""
                                    }`}
                                  >
                                    <span>{match.userAName || "TBD"}</span>
                                    <strong>{match.cupScoreA || 0}</strong>
                                  </div>

                                  <div className="cup-vs">vs</div>

                                  <div
                                    className={`cup-match-user ${
                                      match.winnerId === match.userBId
                                        ? "cup-match-winner"
                                        : ""
                                    }`}
                                  >
                                    <span>{match.userBName || "TBD"}</span>
                                    <strong>{match.cupScoreB || 0}</strong>
                                  </div>
                                </div>

                                <div className="cup-match-footer">
                                  {match.needsAdminDecision ? (
                                    <span>Needs admin decision</span>
                                  ) : match.isCompleted ? (
                                    <span>Finished</span>
                                  ) : (
                                    <span>Not played yet</span>
                                  )}

                                  {winnerText && <span>Winner: {winnerText}</span>}
                                </div>

                                {match.needsAdminDecision && (
                                  <div className="cup-admin-decision">
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
                          })
                        )}
                      </div>
                    ))}
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