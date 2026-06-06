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
  const [selectedUser, setSelectedUser] = useState("");

  function normalizeId(value) {
    if (!value) return "";

    if (typeof value === "string") return value;

    if (value._id) return String(value._id);
    if (value.id) return String(value.id);

    return String(value);
  }

  function getFixtureId(fixture) {
    return normalizeId(fixture?._id || fixture?.id);
  }

  function getPredictionId(prediction) {
    return normalizeId(prediction?._id || prediction?.id);
  }

  function getPredictionFixtureId(prediction) {
    return normalizeId(
      prediction?.fixtureId ||
        prediction?.fixture?._id ||
        prediction?.fixture?.id ||
        prediction?.fixture
    );
  }

  function getPredictionUserId(prediction) {
    return normalizeId(
      prediction?.userId ||
        prediction?.user?._id ||
        prediction?.user?.id ||
        prediction?.user
    );
  }

  function getPredictionUserName(prediction) {
    return (
      prediction?.userName ||
      prediction?.user?.fullName ||
      prediction?.user?.name ||
      prediction?.user?.email ||
      "Unknown User"
    );
  }

  function getUserFilterKey(prediction) {
    const id = getPredictionUserId(prediction);
    const name = getPredictionUserName(prediction);

    return (id || name).toString().trim().toLowerCase();
  }

  function getFixture(fixtureId) {
    const cleanId = normalizeId(fixtureId);

    return fixtures.find((fixture) => getFixtureId(fixture) === cleanId);
  }

  async function loadData() {
    try {
      setLoading(true);

      const [fixturesData, predictionsData, savedCurrentRound] =
        await Promise.all([
          apiRequest("/fixtures"),
          apiRequest("/predictions/all"),
          getCurrentRound(),
        ]);

      setFixtures(fixturesData || []);
      setPredictions(predictionsData || []);

      if (
        (fixturesData || []).some(
          (fixture) => fixture.gameweek === savedCurrentRound
        )
      ) {
        setSelectedRound(savedCurrentRound);
      } else {
        setSelectedRound("");
      }

      setSelectedFixture("");
      setSelectedUser("");
    } catch (err) {
      alert(err.message || "Failed to load predictions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

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

  const filteredPredictionsWithoutUser = useMemo(() => {
    return predictions.filter((prediction) => {
      const predictionFixtureId = getPredictionFixtureId(prediction);
      const fixture = getFixture(predictionFixtureId);

      if (selectedRound && fixture?.gameweek !== selectedRound) {
        return false;
      }

      if (selectedFixture && predictionFixtureId !== selectedFixture) {
        return false;
      }

      return true;
    });
  }, [predictions, fixtures, selectedRound, selectedFixture]);

  const userOptions = useMemo(() => {
    const usersMap = new Map();

    filteredPredictionsWithoutUser.forEach((prediction) => {
      const key = getUserFilterKey(prediction);
      const name = getPredictionUserName(prediction);

      if (key) {
        usersMap.set(key, {
          id: key,
          name,
        });
      }
    });

    return [...usersMap.values()].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [filteredPredictionsWithoutUser]);

  const filteredPredictions = useMemo(() => {
    return filteredPredictionsWithoutUser.filter((prediction) => {
      if (selectedUser && getUserFilterKey(prediction) !== selectedUser) {
        return false;
      }

      return true;
    });
  }, [filteredPredictionsWithoutUser, selectedUser]);

  async function handleDeletePrediction(predictionId) {
    const confirmed = window.confirm("Delete this prediction?");
    if (!confirmed) return;

    try {
      await apiRequest(`/predictions/${predictionId}`, {
        method: "DELETE",
      });

      setPredictions((prevPredictions) =>
        prevPredictions.filter(
          (prediction) => getPredictionId(prediction) !== predictionId
        )
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
      setSelectedUser("");
    } catch {
      setSelectedRound("");
      setSelectedFixture("");
      setSelectedUser("");
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
                setSelectedUser("");
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
              onChange={(e) => {
                setSelectedFixture(e.target.value);
                setSelectedUser("");
              }}
            >
              <option value="">All Matches</option>

              {matchOptions.map((fixture) => (
                <option key={getFixtureId(fixture)} value={getFixtureId(fixture)}>
                  {fixture.teamA} vs {fixture.teamB}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>User</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              <option value="">All Users</option>

              {userOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
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
              <h3>No predictions</h3>
              <p>No predictions match the selected filters.</p>
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
                const predictionId = getPredictionId(prediction);
                const fixture = getFixture(getPredictionFixtureId(prediction));

                return (
                  <div className="admin-predictions-row" key={predictionId}>
                    <span>{fixture?.gameweek || prediction.gameweek}</span>

                    <span>
                      {fixture
                        ? `${fixture.teamA} vs ${fixture.teamB}`
                        : `${prediction.teamA} vs ${prediction.teamB}`}
                    </span>

                    <span>{getPredictionUserName(prediction)}</span>

                    <span className="prediction-score-pill">
                      {prediction.predictedScoreA} - {prediction.predictedScoreB}
                    </span>

                    <span>
                      {prediction.isJoker ? (
                        <strong className="joker-admin-pill"> Joker</strong>
                      ) : (
                        "-"
                      )}
                    </span>

                    <span className="admin-points-pill">
                      {prediction.points || 0}
                    </span>

                    <span
                      className={`fixture-status ${
                        fixture?.isLocked
                          ? "locked"
                          : fixture?.status || "upcoming"
                      }`}
                    >
                      {fixture?.isLocked
                        ? "locked"
                        : fixture?.status || "upcoming"}
                    </span>

                    <button
                      className="delete-small-btn"
                      onClick={() => handleDeletePrediction(predictionId)}
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