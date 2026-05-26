import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg.jpg";
import { teams, gameweekOptions, matchDates, hourOptions } from "../data/teams";
import { apiRequest } from "../api/api";
import { getCurrentRound, updateCurrentRound } from "../utils/currentRound";

function AdminFixtures() {
  const navigate = useNavigate();

  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState("Round 1");
  const [currentRound, setCurrentRound] = useState("Round 1");

  const [gameweek, setGameweek] = useState("");
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchHour, setMatchHour] = useState("");
  const [matchPeriod, setMatchPeriod] = useState("PM");

  const [editingId, setEditingId] = useState(null);
  const [editGameweek, setEditGameweek] = useState("");
  const [editTeamA, setEditTeamA] = useState("");
  const [editTeamB, setEditTeamB] = useState("");
  const [editMatchDate, setEditMatchDate] = useState("");
  const [editMatchHour, setEditMatchHour] = useState("");
  const [editMatchPeriod, setEditMatchPeriod] = useState("PM");

  async function loadFixtures() {
    try {
      setLoading(true);

      const [data, savedCurrentRound] = await Promise.all([
        apiRequest("/fixtures"),
        getCurrentRound(),
      ]);

      setFixtures(data);
      setCurrentRound(savedCurrentRound);
      setSelectedRound(savedCurrentRound);
    } catch (err) {
      alert(err.message || "Failed to load fixtures");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFixtures();
  }, []);

  function buildKickoffTime(date, hour, period) {
    return `${date} 2026, ${hour}:00 ${period}`;
  }

  function parseKickoffTime(kickoffTime) {
    if (!kickoffTime) {
      return {
        date: "",
        hour: "",
        period: "PM",
      };
    }

    const parts = kickoffTime.split(",");
    const datePart = parts[0]?.replace(" 2026", "").trim() || "";

    const timePart = parts[1]?.trim() || "";
    const timePieces = timePart.split(" ");
    const hourPart = timePieces[0]?.split(":")[0] || "";
    const periodPart = timePieces[1] || "PM";

    return {
      date: datePart,
      hour: hourPart,
      period: periodPart,
    };
  }

  async function handleAddFixture(e) {
    e.preventDefault();

    if (teamA === teamB) {
      alert("Team A and Team B cannot be the same.");
      return;
    }

    const kickoffTime = buildKickoffTime(matchDate, matchHour, matchPeriod);

    try {
      const newFixture = await apiRequest("/fixtures", {
        method: "POST",
        body: JSON.stringify({
          gameweek,
          teamA,
          teamB,
          kickoffTime,
        }),
      });

      setFixtures((prevFixtures) => [...prevFixtures, newFixture]);

      setGameweek("");
      setTeamA("");
      setTeamB("");
      setMatchDate("");
      setMatchHour("");
      setMatchPeriod("PM");
    } catch (err) {
      alert(err.message || "Failed to add fixture");
    }
  }

  function handleStartEdit(fixture) {
    const parsed = parseKickoffTime(fixture.kickoffTime);

    setEditingId(fixture.id);
    setEditGameweek(fixture.gameweek || "");
    setEditTeamA(fixture.teamA || "");
    setEditTeamB(fixture.teamB || "");
    setEditMatchDate(parsed.date);
    setEditMatchHour(parsed.hour);
    setEditMatchPeriod(parsed.period);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditGameweek("");
    setEditTeamA("");
    setEditTeamB("");
    setEditMatchDate("");
    setEditMatchHour("");
    setEditMatchPeriod("PM");
  }

  async function handleSaveEdit(e) {
    e.preventDefault();

    if (editTeamA === editTeamB) {
      alert("Team A and Team B cannot be the same.");
      return;
    }

    const oldFixture = fixtures.find((fixture) => fixture.id === editingId);

    if (!oldFixture) {
      alert("Fixture not found.");
      return;
    }

    const kickoffTime = buildKickoffTime(
      editMatchDate,
      editMatchHour,
      editMatchPeriod
    );

    try {
      const newFixture = await apiRequest("/fixtures", {
        method: "POST",
        body: JSON.stringify({
          gameweek: editGameweek,
          teamA: editTeamA,
          teamB: editTeamB,
          kickoffTime,
        }),
      });

      await apiRequest(`/fixtures/${editingId}`, {
        method: "DELETE",
      });

      setFixtures((prevFixtures) =>
        prevFixtures
          .filter((fixture) => fixture.id !== editingId)
          .concat(newFixture)
      );

      handleCancelEdit();
    } catch (err) {
      alert(err.message || "Failed to edit fixture");
    }
  }

  async function handleDeleteFixture(id) {
    const confirmed = window.confirm("Delete this fixture?");
    if (!confirmed) return;

    try {
      await apiRequest(`/fixtures/${id}`, {
        method: "DELETE",
      });

      setFixtures((prevFixtures) =>
        prevFixtures.filter((fixture) => fixture.id !== id)
      );
    } catch (err) {
      alert(err.message || "Failed to delete fixture");
    }
  }

  async function handleToggleFixtureLock(fixture) {
    try {
      const updatedFixture = await apiRequest(
        `/fixtures/${fixture.id}/${fixture.isLocked ? "unlock" : "lock"}`,
        {
          method: "PATCH",
        }
      );

      setFixtures((prevFixtures) =>
        prevFixtures.map((item) =>
          item.id === fixture.id ? updatedFixture : item
        )
      );
    } catch (err) {
      alert(err.message || "Failed to update fixture lock");
    }
  }

  async function handleLockRound(roundName) {
    const confirmed = window.confirm(`Lock all games in ${roundName}?`);
    if (!confirmed) return;

    try {
      const updatedRoundFixtures = await apiRequest(
        `/fixtures/round/${roundName}/lock`,
        {
          method: "PATCH",
        }
      );

      setFixtures((prevFixtures) =>
        prevFixtures.map((fixture) => {
          const updated = updatedRoundFixtures.find(
            (item) => item.id === fixture.id
          );

          return updated || fixture;
        })
      );
    } catch (err) {
      alert(err.message || "Failed to lock round");
    }
  }

  async function handleUnlockRound(roundName) {
    const confirmed = window.confirm(`Unlock all games in ${roundName}?`);
    if (!confirmed) return;

    try {
      const updatedRoundFixtures = await apiRequest(
        `/fixtures/round/${roundName}/unlock`,
        {
          method: "PATCH",
        }
      );

      setFixtures((prevFixtures) =>
        prevFixtures.map((fixture) => {
          const updated = updatedRoundFixtures.find(
            (item) => item.id === fixture.id
          );

          return updated || fixture;
        })
      );
    } catch (err) {
      alert(err.message || "Failed to unlock round");
    }
  }

  async function handleSetCurrentRound() {
    try {
      const savedRound = await updateCurrentRound(selectedRound);
      setCurrentRound(savedRound);
      alert(`${savedRound} is now the current round for everyone.`);
    } catch (err) {
      alert(err.message || "Failed to update current round");
    }
  }

  const selectedRoundFixtures = fixtures.filter(
    (fixture) => fixture.gameweek === selectedRound
  );

  return (
    <div className="admin-bg-page" style={{ backgroundImage: `url(${bg})` }}>
      <div className="admin-bg-overlay"></div>

      <div className="admin-content">
        <div className="admin-header">
          <div>
            <p className="admin-kicker">Admin Mode</p>
            <h1>Set Fixtures</h1>
            <p>Add fixtures, edit mistakes, and lock games when needed.</p>
          </div>

          <button className="admin-black-btn" onClick={() => navigate("/admin")}>
            Back
          </button>
        </div>

        <div className="fixtures-layout">
          <form
            className="admin-glass-card fixture-form"
            onSubmit={handleAddFixture}
          >
            <h2>Add Fixture</h2>

            <label>Round</label>
            <select
              className="admin-input admin-select"
              value={gameweek}
              onChange={(e) => setGameweek(e.target.value)}
              required
            >
              <option value="">Select round</option>
              {gameweekOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <div className="two-col">
              <div>
                <label>Team A</label>
                <select
                  className="admin-input admin-select"
                  value={teamA}
                  onChange={(e) => setTeamA(e.target.value)}
                  required
                >
                  <option value="">Select team</option>
                  {teams.map((team) => (
                    <option key={team.code} value={team.name}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Team B</label>
                <select
                  className="admin-input admin-select"
                  value={teamB}
                  onChange={(e) => setTeamB(e.target.value)}
                  required
                >
                  <option value="">Select team</option>
                  {teams.map((team) => (
                    <option key={team.code} value={team.name}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label>Date</label>
            <select
              className="admin-input admin-select"
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
              required
            >
              <option value="">Select date</option>
              {matchDates.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>

            <div className="two-col">
              <div>
                <label>Hour</label>
                <select
                  className="admin-input admin-select"
                  value={matchHour}
                  onChange={(e) => setMatchHour(e.target.value)}
                  required
                >
                  <option value="">Hour</option>
                  {hourOptions.map((hour) => (
                    <option key={hour} value={hour}>
                      {hour}:00
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>AM / PM</label>
                <select
                  className="admin-input admin-select"
                  value={matchPeriod}
                  onChange={(e) => setMatchPeriod(e.target.value)}
                  required
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>

            <button className="admin-submit-btn" type="submit">
              Add Fixture
            </button>
          </form>

          <div className="admin-glass-card fixtures-list-card">
            <div className="section-title-row fixtures-round-select-row">
              <div>
                <h2>Fixtures</h2>
                <p>
                  {selectedRoundFixtures.length} fixture(s) in {selectedRound}
                </p>
              </div>

              <div className="current-round-controls">
                <select
                  className="admin-input admin-select round-view-select"
                  value={selectedRound}
                  onChange={(e) => setSelectedRound(e.target.value)}
                >
                  {gameweekOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="set-current-round-btn"
                  onClick={handleSetCurrentRound}
                >
                  {selectedRound === currentRound ? "Current Round" : "Set Current"}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="empty-state">
                <h3>Loading fixtures...</h3>
              </div>
            ) : selectedRoundFixtures.length === 0 ? (
              <div className="empty-state">
                <h3>No fixtures in {selectedRound}</h3>
                <p>Add fixtures for this round from the form.</p>
              </div>
            ) : (
              <div className="gw-list">
                <div className="gw-block">
                  <div className="round-lock-header">
                    <h3>{selectedRound}</h3>

                    <div className="round-lock-actions">
                      <button
                        className="lock-round-btn"
                        onClick={() => handleLockRound(selectedRound)}
                      >
                        Lock Round
                      </button>

                      <button
                        className="unlock-round-btn"
                        onClick={() => handleUnlockRound(selectedRound)}
                      >
                        Unlock
                      </button>
                    </div>
                  </div>

                  {selectedRoundFixtures.map((fixture) => (
                    <div className="fixture-row" key={fixture.id}>
                      {editingId === fixture.id ? (
                        <form
                          className="fixture-edit-form"
                          onSubmit={handleSaveEdit}
                        >
                          <div className="fixture-edit-grid">
                            <div>
                              <label>Round</label>
                              <select
                                className="admin-input admin-select"
                                value={editGameweek}
                                onChange={(e) =>
                                  setEditGameweek(e.target.value)
                                }
                                required
                              >
                                <option value="">Select round</option>
                                {gameweekOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label>Team A</label>
                              <select
                                className="admin-input admin-select"
                                value={editTeamA}
                                onChange={(e) => setEditTeamA(e.target.value)}
                                required
                              >
                                <option value="">Select team</option>
                                {teams.map((team) => (
                                  <option key={team.code} value={team.name}>
                                    {team.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label>Team B</label>
                              <select
                                className="admin-input admin-select"
                                value={editTeamB}
                                onChange={(e) => setEditTeamB(e.target.value)}
                                required
                              >
                                <option value="">Select team</option>
                                {teams.map((team) => (
                                  <option key={team.code} value={team.name}>
                                    {team.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label>Date</label>
                              <select
                                className="admin-input admin-select"
                                value={editMatchDate}
                                onChange={(e) =>
                                  setEditMatchDate(e.target.value)
                                }
                                required
                              >
                                <option value="">Select date</option>
                                {matchDates.map((date) => (
                                  <option key={date} value={date}>
                                    {date}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label>Hour</label>
                              <select
                                className="admin-input admin-select"
                                value={editMatchHour}
                                onChange={(e) =>
                                  setEditMatchHour(e.target.value)
                                }
                                required
                              >
                                <option value="">Hour</option>
                                {hourOptions.map((hour) => (
                                  <option key={hour} value={hour}>
                                    {hour}:00
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label>AM / PM</label>
                              <select
                                className="admin-input admin-select"
                                value={editMatchPeriod}
                                onChange={(e) =>
                                  setEditMatchPeriod(e.target.value)
                                }
                                required
                              >
                                <option value="AM">AM</option>
                                <option value="PM">PM</option>
                              </select>
                            </div>
                          </div>

                          <div className="fixture-edit-actions">
                            <button className="save-small-btn" type="submit">
                              Save
                            </button>

                            <button
                              className="cancel-small-btn"
                              type="button"
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="fixture-main">
                            <div className="teams">
                              <span>{fixture.teamA}</span>
                              <strong>vs</strong>
                              <span>{fixture.teamB}</span>
                            </div>

                            <p>
                              {fixture.gameweek} ·{" "}
                              {fixture.kickoffTime || "No time"}
                            </p>

                            <span
                              className={`fixture-status ${
                                fixture.isLocked ? "locked" : fixture.status
                              }`}
                            >
                              {fixture.isLocked ? "locked" : fixture.status}
                            </span>
                          </div>

                          <div className="fixture-admin-actions">
                            <button
                              className="edit-small-btn"
                              onClick={() => handleStartEdit(fixture)}
                            >
                              Edit
                            </button>

                            <button
                              className={
                                fixture.isLocked
                                  ? "unlock-round-btn"
                                  : "lock-round-btn"
                              }
                              onClick={() => handleToggleFixtureLock(fixture)}
                            >
                              {fixture.isLocked ? "Unlock" : "Lock"}
                            </button>

                            <button
                              className="delete-small-btn"
                              onClick={() => handleDeleteFixture(fixture.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminFixtures;