import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg.jpg";
import { gameweekOptions } from "../data/teams";
import { apiRequest } from "../api/api";
import { getCurrentRound } from "../utils/currentRound";

function AdminResults() {
  const navigate = useNavigate();
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState("Round 1");

  async function loadFixtures() {
    try {
      setLoading(true);

      const [data, savedCurrentRound] = await Promise.all([
        apiRequest("/fixtures"),
        getCurrentRound(),
      ]);

      setFixtures(data);
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

  function handleScoreChange(id, field, value) {
    const onlyDigits = value.replace(/\D/g, "");

    let newValue = onlyDigits;

    if (onlyDigits !== "") {
      let numericValue = Number(onlyDigits);
      if (numericValue < 0) numericValue = 0;
      if (numericValue > 20) numericValue = 20;
      newValue = String(numericValue);
    }

    setFixtures((prevFixtures) =>
      prevFixtures.map((fixture) =>
        fixture.id === id
          ? {
              ...fixture,
              [field]: newValue,
            }
          : fixture
      )
    );
  }

  async function handleSaveResult(id) {
    const fixtureToUpdate = fixtures.find((fixture) => fixture.id === id);

    if (!fixtureToUpdate) return;

    if (
      fixtureToUpdate.actualScoreA === "" ||
      fixtureToUpdate.actualScoreB === "" ||
      fixtureToUpdate.actualScoreA === null ||
      fixtureToUpdate.actualScoreB === null ||
      fixtureToUpdate.actualScoreA === undefined ||
      fixtureToUpdate.actualScoreB === undefined
    ) {
      alert("Please enter both scores.");
      return;
    }

    try {
      const data = await apiRequest(`/results/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          actualScoreA: Number(fixtureToUpdate.actualScoreA),
          actualScoreB: Number(fixtureToUpdate.actualScoreB),
        }),
      });

      setFixtures((prevFixtures) =>
        prevFixtures.map((fixture) =>
          fixture.id === id ? data.fixture : fixture
        )
      );

      alert("Result saved and points calculated.");
    } catch (err) {
      alert(err.message || "Failed to save result");
    }
  }

  async function handleResetResult(id) {
    const confirmed = window.confirm("Reset this result?");
    if (!confirmed) return;

    try {
      const data = await apiRequest(`/results/${id}`, {
        method: "DELETE",
      });

      setFixtures((prevFixtures) =>
        prevFixtures.map((fixture) =>
          fixture.id === id ? data.fixture : fixture
        )
      );

      alert("Result reset and points removed.");
    } catch (err) {
      alert(err.message || "Failed to reset result");
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
            <h1>Set Results</h1>
            <p>Enter final scores after each match finishes.</p>
          </div>

          <button className="admin-black-btn" onClick={() => navigate("/admin")}>
            Back
          </button>
        </div>

        <div className="admin-glass-card results-card">
          <div className="section-title-row fixtures-round-select-row">
            <div>
              <h2>Results</h2>
              <p>
                {selectedRoundFixtures.length} fixture(s) in {selectedRound}
              </p>
            </div>

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
          </div>

          {loading ? (
            <div className="empty-state">
              <h3>Loading fixtures...</h3>
            </div>
          ) : fixtures.length === 0 ? (
            <div className="empty-state">
              <h3>No fixtures yet</h3>
              <p>Add fixtures first before setting results.</p>
            </div>
          ) : selectedRoundFixtures.length === 0 ? (
            <div className="empty-state">
              <h3>No fixtures in {selectedRound}</h3>
              <p>Choose another round or add fixtures for this round first.</p>
            </div>
          ) : (
            <div className="gw-list">
              <div className="gw-block">
                <h3>{selectedRound}</h3>

                {selectedRoundFixtures.map((fixture) => (
                  <div className="result-row" key={fixture.id}>
                    <div className="result-info">
                      <div className="teams">
                        <span>{fixture.teamA}</span>
                        <strong>vs</strong>
                        <span>{fixture.teamB}</span>
                      </div>

                      <p>
                        {fixture.gameweek} · {fixture.kickoffTime || "No time"}
                      </p>

                      <span className={`fixture-status ${fixture.status}`}>
                        {fixture.status}
                      </span>
                    </div>

                    <div className="score-box">
                      <input
                        className="score-input"
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        value={
                          fixture.actualScoreA === null ||
                          fixture.actualScoreA === undefined
                            ? ""
                            : fixture.actualScoreA
                        }
                        onChange={(e) =>
                          handleScoreChange(
                            fixture.id,
                            "actualScoreA",
                            e.target.value
                          )
                        }
                      />

                      <span>-</span>

                      <input
                        className="score-input"
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        value={
                          fixture.actualScoreB === null ||
                          fixture.actualScoreB === undefined
                            ? ""
                            : fixture.actualScoreB
                        }
                        onChange={(e) =>
                          handleScoreChange(
                            fixture.id,
                            "actualScoreB",
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className="result-actions">
                      <button
                        className="admin-submit-btn"
                        onClick={() => handleSaveResult(fixture.id)}
                      >
                        Save
                      </button>

                      <button
                        className="delete-small-btn"
                        onClick={() => handleResetResult(fixture.id)}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminResults;