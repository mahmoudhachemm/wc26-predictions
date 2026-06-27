import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg.jpg";
import { apiRequest } from "../api/api";

const GROUP_ROUNDS = ["Round 1", "Round 2", "Round 3"];

const KNOCKOUT_ROUNDS = [
  { key: "round32", label: "Round of 32", round: "Round of 32" },
  { key: "round16", label: "Round of 16", round: "Round of 16" },
  { key: "quarter", label: "Quarter Final", round: "Quarter Final" },
  { key: "semi", label: "Semi Final", round: "Semi Final" },
  { key: "final", label: "Final", round: "Final" },
];

function Cup({ currentUser }) {
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openGroups, setOpenGroups] = useState({});
  const [activePage, setActivePage] = useState("groups");

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
      const safeGroups = Array.isArray(safeData.groups) ? safeData.groups : [];

      setGroups(safeGroups);
      setMatches(Array.isArray(safeData.matches) ? safeData.matches : []);
      setStandings(
        Array.isArray(safeData.standings) ? safeData.standings : []
      );

      const defaultOpen = {};
      safeGroups.forEach((group, index) => {
        defaultOpen[group.name] = index === 0;
      });
      setOpenGroups(defaultOpen);
    } catch (err) {
      alert(err.message || "Failed to load cup.");
      setGroups([]);
      setMatches([]);
      setStandings([]);
      setOpenGroups({});
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

  const knockoutMatchesByRound = useMemo(() => {
    const map = {};

    KNOCKOUT_ROUNDS.forEach((item) => {
      map[item.round] = matches
        .filter((match) => match.gameweek === item.round)
        .sort((a, b) => {
          const aNo = Number(a.cupBracketMatchNumber || a.matchNumber || 0);
          const bNo = Number(b.cupBracketMatchNumber || b.matchNumber || 0);
          return aNo - bNo;
        });
    });

    return map;
  }, [matches]);

  const bestThirdPlacedUsers = useMemo(() => {
    const thirdRows = [];

    standings.forEach((group) => {
      const rows = Array.isArray(group.rows) ? group.rows : [];
      const third = rows[2];

      if (third) {
        thirdRows.push({
          ...third,
          groupName: group.groupName,
        });
      }
    });

    thirdRows.sort((a, b) => {
      if (b.groupPoints !== a.groupPoints) return b.groupPoints - a.groupPoints;

      if (b.cupPointsDifference !== a.cupPointsDifference) {
        return b.cupPointsDifference - a.cupPointsDifference;
      }

      if (b.cupPointsFor !== a.cupPointsFor) {
        return b.cupPointsFor - a.cupPointsFor;
      }

      if (a.cupPointsAgainst !== b.cupPointsAgainst) {
        return a.cupPointsAgainst - b.cupPointsAgainst;
      }

      if (b.leaderboardPoints !== a.leaderboardPoints) {
        return b.leaderboardPoints - a.leaderboardPoints;
      }

      return a.userName.localeCompare(b.userName);
    });

    return thirdRows.map((row, index) => ({
      ...row,
      bestThirdPosition: index + 1,
      isQualified: index < 8,
    }));
  }, [standings]);

  function getStandingsRows(groupName) {
    const groupStanding = standings.find((item) => item.groupName === groupName);
    return groupStanding?.rows || [];
  }

  function getWinnerLabel(match) {
    if (!match.winnerId) return "";

    if (cleanId(match.winnerId) === cleanId(match.userAId)) {
      return match.userAName;
    }

    if (cleanId(match.winnerId) === cleanId(match.userBId)) {
      return match.userBName;
    }

    return match.winnerName || "";
  }

  function getMatchStatus(match) {
    if (match.needsAdminDecision) return "Tie decision needed";
    if (match.isCompleted) return "Finished";
    return "Not submitted";
  }

  function toggleGroup(groupName) {
    setOpenGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  }

  function handleBack() {
    if (currentUser?.role === "admin") {
      navigate("/admin/cup");
    } else {
      navigate("/user");
    }
  }

  function renderCupMatch(match) {
    const winnerLabel = getWinnerLabel(match);

    return (
      <div className="cup-clean-match" key={match._id || match.id}>
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
            <span>
              {match.isCompleted ? Number(match.cupScoreA || 0) : "-"}
            </span>

            <b>-</b>

            <span>
              {match.isCompleted ? Number(match.cupScoreB || 0) : "-"}
            </span>
          </div>

          <div className="cup-clean-team cup-right-team">
            {match.userBName || "TBD"}
          </div>
        </div>

        <div className="cup-clean-match-meta">
          <span
            className={
              match.isCompleted ? "cup-status-finished" : "cup-status-open"
            }
          >
            {getMatchStatus(match)}
          </span>

          {winnerLabel && <strong>Winner: {winnerLabel}</strong>}
        </div>
      </div>
    );
  }

  function renderGroupsPage() {
    return (
      <div className="cup-clean-groups">
        {groups.map((group) => {
          const rows = getStandingsRows(group.name);
          const groupMatches = groupedMatches[group.name] || {};
          const isOpen = openGroups[group.name] !== false;

          return (
            <div
              className="cup-clean-group-card"
              key={group._id || group.name}
            >
              <button
                type="button"
                className="cup-clean-group-title cup-group-toggle"
                onClick={() => toggleGroup(group.name)}
              >
                <div className="cup-group-title-left">
                  <span className="cup-group-dot"></span>
                  <h2>{group.name}</h2>
                </div>

                <span className="cup-group-arrow">{isOpen ? "⌃" : "⌄"}</span>
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
                          rows.map((row) => {
                            const isMe =
                              cleanId(row.userId) === getCurrentUserId();

                            return (
                              <tr
                                key={row.userId}
                                className={isMe ? "cup-me-row" : ""}
                              >
                                <td>{row.position}</td>

                                <td>
                                  <strong>{row.userName}</strong>
                                  {isMe && (
                                    <span className="cup-you-pill">You</span>
                                  )}
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
                              {roundMatches.map((match) =>
                                renderCupMatch(match)
                              )}
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
    );
  }

  function renderBestThirdPage() {
    return (
      <div className="cup-best-third-card">
        <div className="cup-best-third-head">
          <div>
            <p className="admin-kicker">Qualification</p>
            <h2>Best 3rd Placed Users</h2>
            <p>Top 8 third-place users currently qualify to Round of 32.</p>
          </div>

          <span className="cup-qualified-count">
            {bestThirdPlacedUsers.filter((row) => row.isQualified).length}/8
            Qualified
          </span>
        </div>

        <div className="cup-clean-table-wrap">
          <table className="cup-clean-table cup-best-third-table">
            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                <th>Group</th>
                <th>GP</th>
                <th>For</th>
                <th>Against</th>
                <th>GD</th>
                <th>PTS</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {bestThirdPlacedUsers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="cup-empty-cell">
                    No third-place users yet.
                  </td>
                </tr>
              ) : (
                bestThirdPlacedUsers.map((row) => {
                  const isMe = cleanId(row.userId) === getCurrentUserId();

                  return (
                    <tr
                      key={`${row.groupName}-${row.userId}`}
                      className={isMe ? "cup-me-row" : ""}
                    >
                      <td>{row.bestThirdPosition}</td>

                      <td>
                        <strong>{row.userName}</strong>
                        {isMe && <span className="cup-you-pill">You</span>}
                      </td>

                      <td>{row.groupName}</td>
                      <td>{row.played}</td>
                      <td>{row.cupPointsFor}</td>
                      <td>{row.cupPointsAgainst}</td>
                      <td>{row.cupPointsDifference}</td>

                      <td>
                        <strong>{row.groupPoints}</strong>
                      </td>

                      <td>
                        {row.isQualified ? (
                          <span className="cup-qualified-pill">Qualified</span>
                        ) : (
                          <span className="cup-out-pill">Out</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderKnockoutPage(round) {
    const roundMatches = knockoutMatchesByRound[round] || [];

    return (
      <div className="admin-section-card">
        <h2>{round}</h2>

        {roundMatches.length === 0 ? (
          <p className="cup-no-games">Not generated yet.</p>
        ) : (
          <div className="cup-clean-match-list">
            {roundMatches.map((match) => renderCupMatch(match))}
          </div>
        )}
      </div>
    );
  }

  function renderActivePage() {
    if (activePage === "groups") return renderGroupsPage();
    if (activePage === "best3rd") return renderBestThirdPage();

    const knockoutItem = KNOCKOUT_ROUNDS.find((item) => item.key === activePage);

    if (knockoutItem) return renderKnockoutPage(knockoutItem.round);

    return renderGroupsPage();
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
            <p>Group stage, best thirds, and knockout bracket.</p>
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
          <>
            <div className="cup-page-tabs">
              <button
                className={activePage === "groups" ? "active" : ""}
                onClick={() => setActivePage("groups")}
              >
                Group Stage
              </button>

              <button
                className={activePage === "best3rd" ? "active" : ""}
                onClick={() => setActivePage("best3rd")}
              >
                Best 3rd
              </button>

              {KNOCKOUT_ROUNDS.map((item) => (
                <button
                  key={item.key}
                  className={activePage === item.key ? "active" : ""}
                  onClick={() => setActivePage(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {renderActivePage()}
          </>
        )}
      </div>
    </div>
  );
}

export default Cup;