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
  const [closedGroups, setClosedGroups] = useState({});

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

  function toggleGroup(groupName) {
    setClosedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
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

          <button className="admin-logout-btn" onClick={handleBack}>
            Back
          </button>
        </div>

        {loading ? (
          <div style={styles.emptyCard}>
            <h3>Loading cup...</h3>
          </div>
        ) : groups.length === 0 ? (
          <div style={styles.emptyCard}>
            <h3>No cup groups yet</h3>
            <p>Admin must generate the 12 groups first.</p>
          </div>
        ) : (
          <div style={styles.groupsWrapper}>
            {groups.map((group) => {
              const rows = getStandingsRows(group.name);
              const groupUsers = group.users || [];
              const groupMatches = groupedMatches[group.name] || {};
              const isClosed = !!closedGroups[group.name];

              return (
                <div key={group._id || group.name} style={styles.groupCard}>
                  <button
                    type="button"
                    style={styles.groupHeader}
                    onClick={() => toggleGroup(group.name)}
                  >
                    <div style={styles.groupHeaderLeft}>
                      <span style={styles.groupIcon}>🏆</span>
                      <span style={styles.groupTitle}>{group.name}</span>
                    </div>

                    <div style={styles.groupHeaderRight}>
                      <span style={styles.groupCount}>{groupUsers.length}</span>
                      <span
                        style={{
                          ...styles.arrow,
                          transform: isClosed ? "rotate(-90deg)" : "rotate(0deg)",
                        }}
                      >
                        ▾
                      </span>
                    </div>
                  </button>

                  {!isClosed && (
                    <div style={styles.groupBody}>
                      <div style={styles.section}>
                        <div style={styles.sectionTitle}>Users</div>

                        <div style={styles.userList}>
                          {groupUsers.map((user, index) => {
                            const id = cleanId(user._id || user.id);
                            const isMe = id === getCurrentUserId();

                            return (
                              <div key={id || index} style={styles.userRow}>
                                <span style={styles.userNumber}>{index + 1}</span>
                                <span style={styles.userName}>{getUserName(user)}</span>
                                {isMe && <span style={styles.youBadge}>You</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div style={styles.section}>
                        <div style={styles.sectionTitle}>Group Standings</div>

                        {rows.length === 0 ? (
                          <p style={styles.mutedText}>No standings yet.</p>
                        ) : (
                          <div style={styles.tableWrap}>
                            <table style={styles.table}>
                              <thead>
                                <tr>
                                  <th style={styles.th}>Pos</th>
                                  <th style={styles.thLeft}>User</th>
                                  <th style={styles.th}>GP</th>
                                  <th style={styles.th}>GD</th>
                                  <th style={styles.th}>PF</th>
                                </tr>
                              </thead>

                              <tbody>
                                {rows.map((row) => {
                                  const isMe = row.userId === getCurrentUserId();

                                  return (
                                    <tr
                                      key={row.userId}
                                      style={isMe ? styles.myTableRow : styles.tableRow}
                                    >
                                      <td style={styles.tdCenter}>{row.position}</td>
                                      <td style={styles.tdName}>
                                        {row.userName}
                                        {isMe && <span style={styles.youSmall}> You</span>}
                                      </td>
                                      <td style={styles.tdCenter}>{row.groupPoints}</td>
                                      <td style={styles.tdCenter}>
                                        {row.cupPointsDifference}
                                      </td>
                                      <td style={styles.tdCenter}>{row.cupPointsFor}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      <div style={styles.section}>
                        <div style={styles.sectionTitle}>Group Games</div>

                        {GROUP_ROUNDS.map((round) => {
                          const roundMatches = groupMatches[round] || [];

                          return (
                            <div key={round} style={styles.roundBox}>
                              <div style={styles.roundTitle}>{round}</div>

                              {roundMatches.length === 0 ? (
                                <p style={styles.mutedText}>No games yet.</p>
                              ) : (
                                <div style={styles.matchList}>
                                  {roundMatches.map((match) => {
                                    const winnerLabel = getWinnerLabel(match);

                                    return (
                                      <div key={match.id || match._id} style={styles.matchRow}>
                                        <div style={styles.matchMain}>
                                          <div style={styles.playerSide}>
                                            <span style={styles.playerName}>
                                              {match.userAName || "TBD"}
                                            </span>
                                            <span style={styles.scoreBox}>
                                              {match.cupScoreA || 0}
                                            </span>
                                          </div>

                                          <span style={styles.vsText}>vs</span>

                                          <div style={styles.playerSide}>
                                            <span style={styles.scoreBox}>
                                              {match.cupScoreB || 0}
                                            </span>
                                            <span style={styles.playerName}>
                                              {match.userBName || "TBD"}
                                            </span>
                                          </div>
                                        </div>

                                        <div style={styles.matchMeta}>
                                          <span
                                            style={
                                              match.isCompleted
                                                ? styles.finishedBadge
                                                : match.needsAdminDecision
                                                ? styles.decisionBadge
                                                : styles.pendingBadge
                                            }
                                          >
                                            {getMatchStatus(match)}
                                          </span>

                                          {winnerLabel && (
                                            <span style={styles.winnerText}>
                                              Winner: {winnerLabel}
                                            </span>
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
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  groupsWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    paddingBottom: "30px",
  },

  groupCard: {
    borderRadius: "22px",
    overflow: "hidden",
    background: "rgba(255, 255, 255, 0.94)",
    boxShadow: "0 14px 35px rgba(0, 0, 0, 0.14)",
    border: "1px solid rgba(255, 255, 255, 0.55)",
  },

  groupHeader: {
    width: "100%",
    border: "none",
    outline: "none",
    padding: "17px 18px",
    background:
      "linear-gradient(110deg, #eaffdf 0%, #fff0f0 42%, #c8d7ff 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    userSelect: "none",
  },

  groupHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  groupIcon: {
    fontSize: "18px",
  },

  groupTitle: {
    fontSize: "18px",
    fontWeight: "900",
    color: "#111827",
  },

  groupHeaderRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  groupCount: {
    minWidth: "25px",
    height: "25px",
    padding: "0 8px",
    borderRadius: "999px",
    background: "rgba(0, 0, 0, 0.38)",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "900",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  arrow: {
    display: "inline-block",
    color: "#8b8b8b",
    fontSize: "20px",
    fontWeight: "900",
    transition: "transform 0.2s ease",
  },

  groupBody: {
    padding: "16px",
  },

  section: {
    marginBottom: "18px",
  },

  sectionTitle: {
    fontSize: "15px",
    fontWeight: "900",
    color: "#111827",
    marginBottom: "10px",
  },

  userList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "8px",
  },

  userRow: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    background: "#f8fafc",
    borderRadius: "13px",
    padding: "10px 11px",
    border: "1px solid #edf2f7",
  },

  userNumber: {
    width: "25px",
    height: "25px",
    borderRadius: "50%",
    background: "#111827",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "900",
    flexShrink: 0,
  },

  userName: {
    fontSize: "14px",
    fontWeight: "800",
    color: "#111827",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  youBadge: {
    marginLeft: "auto",
    background: "#16a34a",
    color: "#ffffff",
    borderRadius: "999px",
    padding: "3px 8px",
    fontSize: "11px",
    fontWeight: "900",
  },

  youSmall: {
    color: "#16a34a",
    fontWeight: "900",
    fontSize: "12px",
  },

  tableWrap: {
    overflowX: "auto",
    borderRadius: "15px",
    border: "1px solid #e5e7eb",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "430px",
    background: "#ffffff",
  },

  th: {
    padding: "10px 8px",
    textAlign: "center",
    fontSize: "12px",
    color: "#6b7280",
    background: "#f9fafb",
    fontWeight: "900",
  },

  thLeft: {
    padding: "10px 8px",
    textAlign: "left",
    fontSize: "12px",
    color: "#6b7280",
    background: "#f9fafb",
    fontWeight: "900",
  },

  tableRow: {
    borderTop: "1px solid #edf2f7",
  },

  myTableRow: {
    borderTop: "1px solid #edf2f7",
    background: "#ecfdf5",
  },

  tdCenter: {
    padding: "11px 8px",
    textAlign: "center",
    fontSize: "13px",
    fontWeight: "800",
    color: "#111827",
  },

  tdName: {
    padding: "11px 8px",
    textAlign: "left",
    fontSize: "13px",
    fontWeight: "900",
    color: "#111827",
    whiteSpace: "nowrap",
  },

  roundBox: {
    background: "#f8fafc",
    borderRadius: "16px",
    padding: "12px",
    marginBottom: "10px",
    border: "1px solid #edf2f7",
  },

  roundTitle: {
    fontSize: "14px",
    fontWeight: "900",
    color: "#111827",
    marginBottom: "9px",
  },

  matchList: {
    display: "flex",
    flexDirection: "column",
    gap: "9px",
  },

  matchRow: {
    background: "#ffffff",
    borderRadius: "14px",
    padding: "11px",
    border: "1px solid #e5e7eb",
  },

  matchMain: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
  },

  playerSide: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    minWidth: 0,
    flex: 1,
  },

  playerName: {
    fontSize: "13px",
    fontWeight: "900",
    color: "#111827",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  scoreBox: {
    minWidth: "28px",
    height: "28px",
    borderRadius: "9px",
    background: "#111827",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "900",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  vsText: {
    fontSize: "12px",
    fontWeight: "900",
    color: "#6b7280",
    flexShrink: 0,
  },

  matchMeta: {
    marginTop: "9px",
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "7px",
  },

  finishedBadge: {
    background: "#dcfce7",
    color: "#166534",
    borderRadius: "999px",
    padding: "4px 9px",
    fontSize: "11px",
    fontWeight: "900",
  },

  decisionBadge: {
    background: "#fef3c7",
    color: "#92400e",
    borderRadius: "999px",
    padding: "4px 9px",
    fontSize: "11px",
    fontWeight: "900",
  },

  pendingBadge: {
    background: "#e5e7eb",
    color: "#374151",
    borderRadius: "999px",
    padding: "4px 9px",
    fontSize: "11px",
    fontWeight: "900",
  },

  winnerText: {
    fontSize: "12px",
    fontWeight: "800",
    color: "#111827",
  },

  mutedText: {
    margin: 0,
    color: "#6b7280",
    fontSize: "13px",
    fontWeight: "700",
  },

  emptyCard: {
    background: "rgba(255, 255, 255, 0.94)",
    borderRadius: "20px",
    padding: "22px",
    boxShadow: "0 14px 35px rgba(0, 0, 0, 0.14)",
  },
};

export default Cup;