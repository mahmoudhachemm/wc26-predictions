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
  const [selectedUser, setSelectedUser] = useState("");

  function normalizeId(value) {
    if (!value) return "";

    if (typeof value === "string") return value;

    if (value._id) return String(value._id);
    if (value.id) return String(value.id);

    return String(value);
  }

  function getCurrentUserId() {
    return normalizeId(currentUser?._id || currentUser?.id);
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
          apiRequest("/predictions/public"),
          getCurrentRound(),
        ]);

      setFixtures(fixturesData || []);
      setPredictions(predictionsData || []);

      const currentRoundHasVisibleFixtures = (fixturesData || []).some(
        (fixture) =>
          fixture.gameweek === savedCurrentRound &&
          (fixture.isLocked || fixture.status === "finished")
      );

      if (currentRoundHasVisibleFixtures) {
        setSelectedRound(savedCurrentRound);
      } else {
        setSelectedRound("");
      }

      setSelectedFixture("");
      setSelectedUser("");
    } catch (err) {
      alert(err.message || "Failed to load public predictions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

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

  const visiblePredictionsWithoutUser = useMemo(() => {
    return predictions.filter((prediction) => {
      const predictionFixtureId = getPredictionFixtureId(prediction);
      const fixture = getFixture(predictionFixtureId);

      if (!fixture) return false;

      const canShow = fixture.isLocked || fixture.status === "finished";
      if (!canShow) return false;

      if (selectedRound && fixture.gameweek !== selectedRound) {
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

    visiblePredictionsWithoutUser.forEach((prediction) => {
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
  }, [visiblePredictionsWithoutUser]);

  const visiblePredictions = useMemo(() => {
    return visiblePredictionsWithoutUser.filter((prediction) => {
      if (selectedUser && getUserFilterKey(prediction) !== selectedUser) {
        return false;
      }

      return true;
    });
  }, [visiblePredictionsWithoutUser, selectedUser]);

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
    <div className="leaderboard-page" style={{ backgroundImage: `url(${bg})` }}>
      <div className="leaderboard-overlay"></div>

      <div className="leaderboard-content">
        <div className="leaderboard-top">
          <div>
            <p className="admin-kicker">User Mode</p>
            <h1>All Predictions</h1>
            <p>Predictions appear only after a game is locked.</p>
          </div>

          <button
            className="leaderboard-back-btn"
            onClick={() => navigate("/user")}
          >
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
                  {user.id === getCurrentUserId() ? " You" : ""}
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
              <p>No predictions match the selected filters.</p>
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
                const predictionId = getPredictionId(prediction);
                const predictionUserId = getPredictionUserId(prediction);
                const fixture = getFixture(getPredictionFixtureId(prediction));

                return (
                  <div
                    className={`public-predictions-row ${
                      predictionUserId === getCurrentUserId() ? "my-public-row" : ""
                    }`}
                    key={predictionId}
                  >
                    <span>{fixture?.gameweek || prediction.gameweek}</span>

                    <span>
                      {fixture
                        ? `${fixture.teamA} vs ${fixture.teamB}`
                        : `${prediction.teamA} vs ${prediction.teamB}`}
                    </span>

                    <span>
                      {getPredictionUserName(prediction)}
                      {predictionUserId === getCurrentUserId() && <small> You</small>}
                    </span>

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