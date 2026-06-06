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

  async function loadData() {
    try {
      setLoading(true);

      const [fixturesData, predictionsData, savedCurrentRound] =
        await Promise.all([
          apiRequest("/fixtures"),
          apiRequest("/predictions/all"),
          getCurrentRound(),
        ]);

      setFixtures(fixturesData);
      setPredictions(predictionsData);

      if (fixturesData.some((fixture) => fixture.gameweek === savedCurrentRound)) {
        setSelectedRound(savedCurrentRound);
        setSelectedFixture("");
        setSelectedUser("");
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

  const userOptions = useMemo(() => {
    const names = predictions
      .filter((prediction) => {
        const fixture = getFixture(prediction.fixtureId);

        if (selectedRound && fixture?.gameweek !== selectedRound) {
          return false;
        }

        if (selectedFixture && prediction.fixtureId !== selectedFixture) {
          return false;
        }

        return true;
      })
      .map((prediction) => prediction.userName)
      .filter(Boolean);

    return [...new Set(names)].sort();
  }, [predictions, fixtures, selectedRound, selectedFixture]);

  const filteredPredictions = useMemo(() => {
    return predictions.filter((prediction) => {
      const fixture = getFixture(prediction.fixtureId);

      if (selectedRound && fixture?.gameweek !== selectedRound) {
        return false;
      }

      if (selectedFixture && prediction.fixtureId !== selectedFixture) {
        return false;
      }

      if (selectedUser && prediction.userName !== selectedUser) {
        return false;
      }

      return true;
    });
  }, [predictions, selectedRound, selectedFixture, selectedUser, fixtures]);

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
      setSelectedUser("");
    } catch {
      setSelectedRound("");
      setSelectedFixture("");
      setSelectedUser("");
    }
  }

  return (
    <div
      className="admin-page"
      style={{
        backgroundImage: `linear-gradient(rgba(3, 6, 18, 0.82), rgba(3, 6, 18, 0.88)), url(${bg})`,
      }}
    >
      <div className="admin-shell">
        <div className="admin-topbar">
          <div>
            <p className="eyebrow">Admin Mode</p>
            <h1>View Predictions</h1>
            <p className="page-subtitle">
              Check all users’ predictions, jokers, and points.
            </p>
          </div>

          <button className="secondary-btn" onClick={() => navigate("/admin")}>
            Back
          </button>
        </div>

        <div className="admin-card admin-prediction-filter-card">
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
                <option key={fixture.id} value={fixture.id}>
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

              {userOptions.map((userName) => (
                <option key={userName} value={userName}>
                  {userName}
                </option>
              ))}
            </select>
          </div>

          <button
            className="secondary-btn admin-filter-reset-btn"
            onClick={handleResetFilters}
          >
            Reset
          </button>
        </div>

        {loading ? (
          <div className="admin-card empty-card">
            <h3>Loading predictions...</h3>
          </div>
        ) : filteredPredictions.length === 0 ? (
          <div className="admin-card empty-card">
            <h3>No predictions yet</h3>
            <p>Predictions will appear here after users save them.</p>
          </div>
        ) : (
          <div className="admin-card table-card">
            <div className="table-scroll">
              <table className="admin-table predictions-table">
                <thead>
                  <tr>
                    <th>Round</th>
                    <th>Match</th>
                    <th>User</th>
                    <th>Prediction</th>
                    <th>Joker</th>
                    <th>Points</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPredictions.map((prediction) => {
                    const fixture = getFixture(prediction.fixtureId);

                    return (
                      <tr key={prediction.id}>
                        <td>{fixture?.gameweek || prediction.gameweek}</td>

                        <td>
                          {fixture
                            ? `${fixture.teamA} vs ${fixture.teamB}`
                            : `${prediction.teamA} vs ${prediction.teamB}`}
                        </td>

                        <td>{prediction.userName}</td>

                        <td>
                          {prediction.predictedScoreA} -{" "}
                          {prediction.predictedScoreB}
                        </td>

                        <td>
                          {prediction.isJoker ? (
                            <span className="joker-badge">Joker</span>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td>{prediction.points || 0}</td>

                        <td>
                          {fixture?.isLocked
                            ? "locked"
                            : fixture?.status || "upcoming"}
                        </td>

                        <td>
                          <button
                            className="danger-small-btn"
                            onClick={() =>
                              handleDeletePrediction(prediction.id)
                            }
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPredictions;