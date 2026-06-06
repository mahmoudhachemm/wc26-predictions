import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg.jpg";
import { apiRequest } from "../api/api";
import { getCurrentRound } from "../utils/currentRound";

function AdminPredictions() {
  const navigate = useNavigate();

  const [predictions, setPredictions] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedRound, setSelectedRound] = useState("");
  const [selectedFixture, setSelectedFixture] = useState("");

  async function loadData() {
    try {
      setLoading(true);

      const [fixturesData, predictionsData, savedCurrentRound] = await Promise.all([
        apiRequest("/fixtures"),
        apiRequest("/predictions/all"),
        getCurrentRound(),
      ]);

      setFixtures(fixturesData);
      setPredictions(predictionsData);

      if (fixturesData.some((fixture) => fixture.gameweek === savedCurrentRound)) {
        setSelectedRound(savedCurrentRound);
        setSelectedFixture("");
      }
    } catch (err) {
      alert(err.message || "Failed to load predictions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function getFixture(fixtureId) {
    return fixtures.find((fixture) => fixture.id === fixtureId);
  }

  const roundOptions = useMemo(() => {
    const rounds = fixtures.map((fixture) => fixture.gameweek).filter(Boolean);
    return [...new Set(rounds)];
  }, [fixtures]);

  const matchOptions = useMemo(() => {
    return fixtures.filter((fixture) => {
      if (!selectedRound) return true;
      return fixture.gameweek === selectedRound;
    });
  }, [fixtures, selectedRound]);

  const filteredPredictions = useMemo(() => {
    return predictions.filter((prediction) => {
      const fixture = getFixture(prediction.fixtureId);

      if (selectedRound && fixture?.gameweek !== selectedRound) {
        return false;
      }

      if (selectedFixture && prediction.fixtureId !== selectedFixture) {
        return false;
      }

      return true;
    });
  }, [predictions, selectedRound, selectedFixture, fixtures]);

  async function handleDeletePrediction(predictionId) {
    const confirmed = window.confirm("Delete this prediction?");
    if (!confirmed) return;

    try {
      await apiRequest(`/predictions/${predictionId}`, {
        method: "DELETE",
      });

      setPredictions((prevPredictions) =>
        prevPredictions.filter((prediction) => prediction.id !== predictionId)
      );
    } catch (err) {
      alert(err.message || "Failed to delete prediction");
    }
  }

  async function handleResetFilters() {
    try {
      const savedCurrentRound = await getCurrentRound();

      if (roundOptions.includes(savedCurrentRound)) {
        setSelectedRound(savedCurrentRound);
      } else {
        setSelectedRound("");
      }

      setSelectedFixture("");
    } catch {
      setSelectedRound("");
      setSelectedFixture("");
    }
  }

  return (
    <div className="admin-bg-page" style={{ backgroundImage: `url(${bg})` }}>
      <div className="admin-bg-overlay"></div>

      <div className="admin-content">
        <div className="admin-header">
          <div>
            <p className="admin-kicker">Admin Mode</p>
            <h1>View Predictions</h1>
            <p>Check all users’ predictions, jokers, and points.</p>
          </div>

          <button className="admin-black-btn" onClick={() => navigate("/admin")}>
            Back
          </button>
        </div>

        <div className="admin-prediction-filter-card">
          <div>
            <label>Round</label>
            <select
              value={selectedRound}
              onChange={(e) => {
                setSelectedRound(e.target.value);
                setSelectedFixture("");
              }}
            >
              <option value="">All Rounds</option>
              {roundOptions.map((round) => (
                <option key={round} value={round}>
                  {round}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Match</label>
            <select
              value={selectedFixture}
              onChange={(e) => setSelectedFixture(e.target.value)}
            >
              <option value="">All Matches</option>
              {matchOptions.map((fixture) => (
                <option key={fixture.id} value={fixture.id}>
                  {fixture.teamA} vs {fixture.teamB}
                </option>
              ))}
            </select>
          </div>

          <button className="admin-filter-reset-btn" onClick={handleResetFilters}>
            Reset
          </button>
        </div>

        <div className="admin-glass-card admin-predictions-card">
          {loading ? (
            <div className="empty-state">
              <h3>Loading predictions...</h3>
            </div>
          ) : filteredPredictions.length === 0 ? (
            <div className="empty-state">
              <h3>No predictions yet</h3>
              <p>Predictions will appear here after users save them.</p>
            </div>
          ) : (
            <div className="admin-predictions-table">
              <div className="admin-predictions-head">
                <span>Round</span>
                <span>Match</span>
                <span>User</span>
                <span>Prediction</span>
                <span>Joker</span>
                <span>Points</span>
                <span>Status</span>
                <span></span>
              </div>

              {filteredPredictions.map((prediction) => {
                const fixture = getFixture(prediction.fixtureId);

                return (
                  <div className="admin-predictions-row" key={prediction.id}>
                    <span>{fixture?.gameweek || prediction.gameweek}</span>

                    <span>
                      {fixture
                        ? `${fixture.teamA} vs ${fixture.teamB}`
                        : `${prediction.teamA} vs ${prediction.teamB}`}
                    </span>

                    <span>{prediction.userName}</span>

                    <span className="prediction-score-pill">
                      {prediction.predictedScoreA} - {prediction.predictedScoreB}
                    </span>

                    <span>
                      {prediction.isJoker ? (
                        <strong className="joker-admin-pill">🃏 Joker</strong>
                      ) : (
                        "-"
                      )}
                    </span>

                    <span className="admin-points-pill">
                      {prediction.points || 0}
                    </span>

                    <span
                      className={`fixture-status ${
                        fixture?.isLocked ? "locked" : fixture?.status || "upcoming"
                      }`}
                    >
                      {fixture?.isLocked
                        ? "locked"
                        : fixture?.status || "upcoming"}
                    </span>

                    <button
                      className="delete-small-btn"
                      onClick={() => handleDeletePrediction(prediction.id)}
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPredictions;