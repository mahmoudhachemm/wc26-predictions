import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg.jpg";
import { apiRequest } from "../api/api";
import { getCurrentRound } from "../utils/currentRound";

function AdminPredictions() {
  const navigate = useNavigate();

  const [predictions, setPredictions] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [allPredictionsForUsers, setAllPredictionsForUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedRound, setSelectedRound] = useState("");
  const [selectedFixture, setSelectedFixture] = useState("");
  const [selectedUser, setSelectedUser] = useState("");

  function getId(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
    return String(value);
  }

  function getFixtureId(fixture) {
    return getId(fixture?._id || fixture?.id);
  }

  function getPredictionId(prediction) {
    return getId(prediction?._id || prediction?.id);
  }

  function getPredictionFixtureId(prediction) {
    return getId(prediction?.fixtureId || prediction?.fixture);
  }

  function getPredictionUserId(prediction) {
    return getId(prediction?.userId || prediction?.user);
  }

  function getPredictionUserName(prediction) {
    return (
      prediction?.userName ||
      prediction?.user?.fullName ||
      prediction?.user?.email ||
      "Unknown User"
    );
  }

  function getFixture(fixtureId) {
    const id = getId(fixtureId);
    return fixtures.find((fixture) => getFixtureId(fixture) === id);
  }

  function buildQuery({ round, fixtureId, userId }) {
    const params = new URLSearchParams();

    if (round) params.set("round", round);
    if (fixtureId) params.set("fixtureId", fixtureId);
    if (userId) params.set("userId", userId);

    const query = params.toString();
    return query ? `?${query}` : "";
  }

  async function loadData(roundValue, fixtureValue, userValue) {
    try {
      setLoading(true);

      const [fixturesData, filteredPredictionsData, userListPredictionsData] =
        await Promise.all([
          apiRequest("/fixtures"),
          apiRequest(
            `/predictions/all${buildQuery({
              round: roundValue,
              fixtureId: fixtureValue,
              userId: userValue,
            })}`
          ),
          apiRequest(
            `/predictions/all${buildQuery({
              round: roundValue,
              fixtureId: fixtureValue,
              userId: "",
            })}`
          ),
        ]);

      setFixtures(fixturesData || []);
      setPredictions(filteredPredictionsData || []);
      setAllPredictionsForUsers(userListPredictionsData || []);
    } catch (err) {
      alert(err.message || "Failed to load predictions");
    } finally {
      setLoading(false);
    }
  }

  async function loadInitialData() {
    try {
      setLoading(true);

      const [fixturesData, savedCurrentRound] = await Promise.all([
        apiRequest("/fixtures"),
        getCurrentRound(),
      ]);

      const hasCurrentRound = (fixturesData || []).some(
        (fixture) => fixture.gameweek === savedCurrentRound
      );

      const startRound = hasCurrentRound ? savedCurrentRound : "";

      setFixtures(fixturesData || []);
      setSelectedRound(startRound);
      setSelectedFixture("");
      setSelectedUser("");

      const [filteredPredictionsData, userListPredictionsData] =
        await Promise.all([
          apiRequest(
            `/predictions/all${buildQuery({
              round: startRound,
              fixtureId: "",
              userId: "",
            })}`
          ),
          apiRequest(
            `/predictions/all${buildQuery({
              round: startRound,
              fixtureId: "",
              userId: "",
            })}`
          ),
        ]);

      setPredictions(filteredPredictionsData || []);
      setAllPredictionsForUsers(userListPredictionsData || []);
    } catch (err) {
      alert(err.message || "Failed to load predictions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadData(selectedRound, selectedFixture, selectedUser);
  }, [selectedRound, selectedFixture, selectedUser]);

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

  const userOptions = useMemo(() => {
    const usersMap = new Map();

    allPredictionsForUsers.forEach((prediction) => {
      const userId = getPredictionUserId(prediction);
      const userName = getPredictionUserName(prediction);

      if (userId) {
        usersMap.set(userId, {
          id: userId,
          name: userName,
        });
      }
    });

    return [...usersMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [allPredictionsForUsers]);

  async function handleDeletePrediction(predictionId) {
    const confirmed = window.confirm("Delete this prediction?");
    if (!confirmed) return;

    try {
      await apiRequest(`/predictions/${predictionId}`, {
        method: "DELETE",
      });

      await loadData(selectedRound, selectedFixture, selectedUser);
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
          ) : predictions.length === 0 ? (
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

              {predictions.map((prediction) => {
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
                        fixture?.isLocked ? "locked" : fixture?.status || "upcoming"
                      }`}
                    >
                      {fixture?.isLocked ? "locked" : fixture?.status || "upcoming"}
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