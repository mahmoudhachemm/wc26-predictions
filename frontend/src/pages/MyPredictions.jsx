import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg.jpg";
import { apiRequest } from "../api/api";
import { getCurrentRound } from "../utils/currentRound";

function MyPredictions() {
  const navigate = useNavigate();

  const [predictions, setPredictions] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedRound, setSelectedRound] = useState("");

  async function loadData() {
    try {
      setLoading(true);

      const [fixturesData, predictionsData, savedCurrentRound] = await Promise.all([
        apiRequest("/fixtures"),
        apiRequest("/predictions/mine"),
        getCurrentRound(),
      ]);

      setFixtures(fixturesData);
      setPredictions(predictionsData);

      if (fixturesData.some((fixture) => fixture.gameweek === savedCurrentRound)) {
        setSelectedRound(savedCurrentRound);
      }
    } catch (err) {
      alert(err.message || "Failed to load your predictions");
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

  function getStatus(fixture) {
    if (!fixture) return "unknown";
    if (fixture.status === "finished") return "finished";
    if (fixture.isLocked) return "locked";
    return "open";
  }

  const roundOptions = useMemo(() => {
    const rounds = fixtures.map((fixture) => fixture.gameweek).filter(Boolean);
    return [...new Set(rounds)];
  }, [fixtures]);

  const filteredPredictions = useMemo(() => {
    return predictions.filter((prediction) => {
      const fixture = getFixture(prediction.fixtureId);

      if (selectedRound && fixture?.gameweek !== selectedRound) {
        return false;
      }

      return true;
    });
  }, [predictions, fixtures, selectedRound]);

  const totalPoints = predictions.reduce(
    (sum, prediction) => sum + Number(prediction.points || 0),
    0
  );

  const selectedRoundPoints = filteredPredictions.reduce(
    (sum, prediction) => sum + Number(prediction.points || 0),
    0
  );

  return (
    <div className="leaderboard-page" style={{ backgroundImage: `url(${bg})` }}>
      <div className="leaderboard-overlay"></div>

      <div className="leaderboard-content">
        <div className="leaderboard-top">
          <div>
            <p className="admin-kicker">User Mode</p>
            <h1>My Predictions</h1>
            <p>Track your scores, joker, status, and points.</p>
          </div>

          <button className="leaderboard-back-btn" onClick={() => navigate("/user")}>
            Back
          </button>
        </div>

        <div className="my-prediction-stats">
          <div>
            <span>{selectedRound || "Current Round"} Points</span>
            <strong>{selectedRound ? selectedRoundPoints : totalPoints}</strong>
          </div>

          <div>
            <span>Total Points</span>
            <strong>{totalPoints}</strong>
          </div>
        </div>

        <div className="leaderboard-filter-card my-prediction-filter">
          <div>
            <label>Round</label>
            <select
              value={selectedRound}
              onChange={(e) => setSelectedRound(e.target.value)}
            >
              <option value="">All Rounds</option>
              {roundOptions.map((round) => (
                <option key={round} value={round}>
                  {round}
                </option>
              ))}
            </select>
          </div>

          <button
            className="leaderboard-reset-btn"
            onClick={async () => {
              const savedCurrentRound = await getCurrentRound();
              setSelectedRound(
                roundOptions.includes(savedCurrentRound) ? savedCurrentRound : ""
              );
            }}
          >
            Reset
          </button>
        </div>

        <div className="my-predictions-modern-card">
          {loading ? (
            <div className="empty-state">
              <h3>Loading predictions...</h3>
            </div>
          ) : filteredPredictions.length === 0 ? (
            <div className="empty-state">
              <h3>No predictions yet</h3>
              <p>Your saved predictions will appear here.</p>
            </div>
          ) : (
            <div className="my-predictions-table">
              <div className="my-predictions-head">
                <span>Round</span>
                <span>Match</span>
                <span>Prediction</span>
                <span>Joker</span>
                <span>Status</span>
                <span>Result</span>
                <span>Points</span>
              </div>

              {filteredPredictions.map((prediction) => {
                const fixture = getFixture(prediction.fixtureId);
                const status = getStatus(fixture);

                return (
                  <div className="my-predictions-row" key={prediction.id}>
                    <span>{fixture?.gameweek || prediction.gameweek}</span>

                    <span className="my-match-name">
                      {fixture
                        ? `${fixture.teamA} vs ${fixture.teamB}`
                        : `${prediction.teamA} vs ${prediction.teamB}`}
                    </span>

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

                    <span className={`my-status-pill ${status}`}>{status}</span>

                    <span>
                      {fixture?.status === "finished"
                        ? `${fixture.actualScoreA} - ${fixture.actualScoreB}`
                        : "-"}
                    </span>

                    <span className="admin-points-pill">
                      {prediction.points || 0}
                    </span>
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

export default MyPredictions;