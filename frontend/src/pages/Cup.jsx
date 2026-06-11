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

  function getUserName(user) {
    return user?.fullName || user?.name || user?.email || "User";
  }

  function getMatchStatus(match) {
    if (match.needsAdminDecision) return "Admin decision";
    if (match.isCompleted) return "Finished";
    return "Not played yet";
  }

  function getWinnerLabel(match) {
    if (!match.winnerId) return "";

    if (match.winnerId === match.userAId) return match.userAName;
    if (match.winnerId === match.userBId) return match.userBName;

    return match.winnerName || "";
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

      <div className="admin-content">
        <div className="admin-header">
          <div>
            <p className="admin-kicker">
              {currentUser?.role === "admin" ? "Admin Mode" : "User Mode"}
            </p>
            <h1>Cup</h1>
            <p>Groups, H2H games, standings, and qualification path.</p>
          </div>

          <button className="admin-black-btn" onClick={handleBack}>
            Back
          </button>
        </div>

        {loading ? (
          <div className="empty-card">
            <h3>Loading cup...</h3>
          </div>
        ) : groups.length === 0 ? (
          <div className="empty-card">
            <h3>No cup groups yet</h3>
            <p>Admin must generate the 12 groups first.</p>
          </div>
        ) : (
          <div className="cup-grid">
            {groups.map((group) => {
              const rows = getStandingsRows(group.name);
              const groupUsers = group.users || [];
              const groupMatches = groupedMatches[group.name] || {};

              return (
                <div className="cup-group-card" key={group.id || group._id || group.name}>
                  <div className="cup-card-header">
                    <div>
                      <p className="cup-label">WC26 Cup</p>
                      <h2>{group.name}</h2>
                    </div>

                    <div className="cup-count">
                      {groupUsers.length}
                      <span>users</span>
                    </div>
                  </div>

                  <div className="cup-users">
                    {groupUsers.map((user, index) => {
                      const id = cleanId(user._id || user.id);
                      const isMe = id === getCurrentUserId();

                      return (
                        <div
                          className={`cup-user-row ${isMe ? "cup-user-me" : ""}`}
                          key={id || index}
                        >
                          <span className="cup-user-number">{index + 1}</span>
                          <span className="cup-user-name">{getUserName(user)}</span>
                          {isMe && <span className="you-badge">You</span>}
                        </div>
                      );
                    })}
                  </div>

                  <div className="cup-section-title">Group Standings</div>

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

                  <div className="cup-section-title">Group Games</div>

                  <div className="cup-rounds">
                    {GROUP_ROUNDS.map((round) => {
                      const roundMatches = groupMatches[round] || [];

                      return (
                        <div className="cup-round-block" key={round}>
                          <div className="cup-round-title">{round}</div>

                          {roundMatches.length === 0 ? (
                            <div className="mini-empty">No games yet.</div>
                          ) : (
                            roundMatches.map((match) => {
                              const winnerLabel = getWinnerLabel(match);

                              return (
                                <div
                                  className="cup-match-card"
                                  key={match.id || match._id || match.matchNumber}
                                >
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
                                    <span>{getMatchStatus(match)}</span>
                                    {winnerLabel && <span>Winner: {winnerLabel}</span>}
                                  </div>
                                </div>
                              );
                            })
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