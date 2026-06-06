import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg.jpg";
import { apiRequest } from "../api/api";
import { getCurrentRound } from "../utils/currentRound";

function PublicPredictions({ currentUser }) {
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
        apiRequest("/predictions/public"),
        getCurrentRound(),
      ]);

      setFixtures(fixturesData);
      setPredictions(predictionsData);

      const currentRoundHasVisibleFixtures = fixturesData.some(
        (fixture) =>
          fixture.gameweek === savedCurrentRound &&
          (fixture.isLocked || fixture.status === "finished")
      );

      if (currentRoundHasVisibleFixtures) {
        setSelectedRound(savedCurrentRound);
        setSelectedFixture("");
      }
    } catch (err) {
      alert(err.message || "Failed to load public predictions");
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

  const visibleFixtures = useMemo(() => {
    return fixtures.filter(
      (fixture) => fixture.isLocked || fixture.status === "finished"
    );
  }, [fixtures]);

  const roundOptions = useMemo(() => {
    const rounds = visibleFixtures
      .map((fixture) => fixture.gameweek)
      .filter(Boolean);

    return [...new Set(rounds)];
  }, [visibleFixtures]);

  const matchOptions = useMemo(() => {
    return visibleFixtures.filter((fixture) => {
      if (!selectedRound) return true;
      return fixture.gameweek === selectedRound;
    });
  }, [visibleFixtures, selectedRound]);

  const visiblePredictions = useMemo(() => {
    return predictions.filter((prediction) => {
      const fixture = getFixture(prediction.fixtureId);

      if (!fixture) return false;

      const canShow = fixture.isLocked || fixture.status === "finished";

      if (!canShow) return false;

      if (selectedRound && fixture.gameweek !== selectedRound) {
        return false;
      }

      if (selectedFixture && fixture.id !== selectedFixture) {
        return false;
      }

      return true;
    });
  }, [predictions, fixtures, selectedRound, selectedFixture]);

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
    <div className="leaderboard-page" style={{ backgroundImage: `url(${bg})` }}>
      <div className="leaderboard-overlay"></div>

      <div className="leaderboard-content">
        <div className="leaderboard-top">
          <div>
            <p className="admin-kicker">User Mode</p>
            <h1>All Predictions</h1>
            <p>Predictions appear only after a game is locked.</p>
          </div>

          <button className="leaderboard-back-btn" onClick={() => navigate("/user")}>
            Back
          </button>
        </div>

        <div className="leaderboard-filter-card">
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

          <button className="leaderboard-reset-btn" onClick={handleResetFilters}>
            Reset
          </button>
        </div>

        <div className="public-predictions-card">
          {loading ? (
            <div className="empty-state">
              <h3>Loading predictions...</h3>
            </div>
          ) : visibleFixtures.length === 0 ? (
            <div className="empty-state">
              <h3>No locked games yet</h3>
              <p>Predictions will appear after admin locks a game.</p>
            </div>
          ) : visiblePredictions.length === 0 ? (
            <div className="empty-state">
              <h3>No predictions visible</h3>
              <p>No users predicted the selected locked match yet.</p>
            </div>
          ) : (
            <div className="public-predictions-table">
              <div className="public-predictions-head">
                <span>Round</span>
                <span>Match</span>
                <span>User</span>
                <span>Prediction</span>
                <span>Joker</span>
                <span>Points</span>
              </div>

              {visiblePredictions.map((prediction) => {
                const fixture = getFixture(prediction.fixtureId);

                return (
                  <div
                    className={`public-predictions-row ${
                      prediction.userId === currentUser.id ? "my-public-row" : ""
                    }`}
                    key={prediction.id}
                  >
                    <span>{fixture?.gameweek || prediction.gameweek}</span>

                    <span>
                      {fixture
                        ? `${fixture.teamA} vs ${fixture.teamB}`
                        : `${prediction.teamA} vs ${prediction.teamB}`}
                    </span>

                    <span>
                      {prediction.userName}
                      {prediction.userId === currentUser.id && <small> You</small>}
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

export default PublicPredictions;