import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg.jpg";
import { gameweekOptions } from "../data/teams";
import { apiRequest } from "../api/api";
import { getCurrentRound } from "../utils/currentRound";

const logoModules = import.meta.glob("../assets/teams/*.png", {
  eager: true,
  import: "default",
});

const countryCodes = {
  Algeria: "ALG",
  Argentina: "ARG",
  Australia: "AUS",
  Austria: "AUT",
  Belgium: "BEL",
  Bosnia: "BIH",
  "Bosnia and Herzegovina": "BIH",
  Brazil: "BRA",
  Canada: "CAN",
  "Cote d'Ivoire": "CIV",
  "Ivory Coast": "CIV",
  Colombia: "COL",
  Croatia: "CRO",
  "Cape Verde": "CPV",
  Curacao: "CUW",
  Czechia: "CZE",
  "Czech Republic": "CZE",
  "DR Congo": "COD",
  Ecuador: "ECU",
  Egypt: "EGY",
  England: "ENG",
  Spain: "ESP",
  France: "FRA",
  Germany: "GER",
  Ghana: "GHA",
  Haiti: "HAI",
  Iran: "IRN",
  Iraq: "IRQ",
  Jordan: "JOR",
  Japan: "JPN",
  Korea: "KOR",
  "South Korea": "KOR",
  "Saudi Arabia": "KSA",
  Morocco: "MAR",
  Mexico: "MEX",
  Netherlands: "NED",
  Norway: "NOR",
  "New Zealand": "NZL",
  Panama: "PAN",
  Paraguay: "PAR",
  Portugal: "POR",
  Qatar: "QAT",
  "South Africa": "RSA",
  Scotland: "SCO",
  Senegal: "SEN",
  Switzerland: "SUI",
  Sweden: "SWE",
  Tunisia: "TUN",
  Turkey: "TUR",
  Uruguay: "URU",
  USA: "USA",
  "United States": "USA",
  Uzbekistan: "UZB",
};

function UserMatches({ currentUser }) {
  const navigate = useNavigate();

  const [fixtures, setFixtures] = useState([]);
  const [scores, setScores] = useState({});
  const [jokerByGw, setJokerByGw] = useState({});
  const [selectedRound, setSelectedRound] = useState("");
  const [loading, setLoading] = useState(true);

  function getDefaultRound(fixturesData) {
    const roundsInFixtures = [
      ...new Set(fixturesData.map((fixture) => fixture.gameweek).filter(Boolean)),
    ];

    if (roundsInFixtures.length === 0) return "";

    const orderedRound = gameweekOptions.find((round) =>
      roundsInFixtures.includes(round)
    );

    return orderedRound || roundsInFixtures[0];
  }

  async function loadData() {
    try {
      setLoading(true);

      const [fixturesData, myPredictions, savedCurrentRound] = await Promise.all([
        apiRequest("/fixtures"),
        apiRequest("/predictions/mine"),
        getCurrentRound(),
      ]);

      setFixtures(fixturesData);

      const defaultRound = fixturesData.some(
        (fixture) => fixture.gameweek === savedCurrentRound
      )
        ? savedCurrentRound
        : getDefaultRound(fixturesData);

      setSelectedRound(defaultRound);

      const scoresMap = {};
      const jokerMap = {};

      myPredictions.forEach((prediction) => {
        scoresMap[prediction.fixtureId] = {
          scoreA:
            prediction.predictedScoreA === null ||
            prediction.predictedScoreA === undefined
              ? ""
              : String(prediction.predictedScoreA),
          scoreB:
            prediction.predictedScoreB === null ||
            prediction.predictedScoreB === undefined
              ? ""
              : String(prediction.predictedScoreB),
        };

        if (prediction.isJoker) {
          jokerMap[prediction.gameweek] = prediction.fixtureId;
        }
      });

      setScores(scoresMap);
      setJokerByGw(jokerMap);
    } catch (err) {
      alert(err.message || "Failed to load matches");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function getLogo(teamName) {
    const cleanedName = teamName.trim();
    const code = countryCodes[cleanedName];

    if (!code) return null;

    const logoPath = `../assets/teams/${code}.png`;
    return logoModules[logoPath] || null;
  }

  function handleScoreChange(fixtureId, field, value) {
    const onlyDigits = value.replace(/\D/g, "");

    if (onlyDigits === "") {
      setScores((prev) => ({
        ...prev,
        [fixtureId]: {
          ...prev[fixtureId],
          [field]: "",
        },
      }));
      return;
    }

    let numericValue = Number(onlyDigits);

    if (numericValue < 0) numericValue = 0;
    if (numericValue > 20) numericValue = 20;

    setScores((prev) => ({
      ...prev,
      [fixtureId]: {
        ...prev[fixtureId],
        [field]: String(numericValue),
      },
    }));
  }

  function handleSelectJoker(gameweek, fixtureId) {
    setJokerByGw((prev) => ({
      ...prev,
      [gameweek]: fixtureId,
    }));
  }

  const fixturesByGameweek = useMemo(() => {
    return fixtures.reduce((groups, fixture) => {
      const key = fixture.gameweek || "No Round";

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(fixture);
      return groups;
    }, {});
  }, [fixtures]);

  const roundOptions = useMemo(() => {
    const rounds = Object.keys(fixturesByGameweek);

    return gameweekOptions.filter((round) => rounds.includes(round));
  }, [fixturesByGameweek]);

  const visibleFixtures = selectedRound
    ? fixturesByGameweek[selectedRound] || []
    : [];

  const visibleOpenFixtures = useMemo(() => {
    return visibleFixtures.filter(
      (fixture) => fixture.status !== "finished" && !fixture.isLocked
    );
  }, [visibleFixtures]);

  const allOpenMatchesCompleted = useMemo(() => {
    if (visibleOpenFixtures.length === 0) return false;

    return visibleOpenFixtures.every((fixture) => {
      const score = scores[fixture.id];

      return (
        score &&
        score.scoreA !== "" &&
        score.scoreB !== "" &&
        score.scoreA !== undefined &&
        score.scoreB !== undefined
      );
    });
  }, [visibleOpenFixtures, scores]);

  const selectedRoundHasJoker = useMemo(() => {
    if (visibleOpenFixtures.length === 0 || !selectedRound) return false;

    const jokerFixtureId = jokerByGw[selectedRound];

    if (!jokerFixtureId) return false;

    return visibleOpenFixtures.some((fixture) => fixture.id === jokerFixtureId);
  }, [visibleOpenFixtures, jokerByGw, selectedRound]);

  const canSaveAll = allOpenMatchesCompleted && selectedRoundHasJoker;

  async function handleSaveAllPredictions() {
    if (!selectedRound) {
      alert("Please choose one round before saving predictions.");
      return;
    }

    if (!canSaveAll) {
      alert("Complete all unlocked match predictions and choose one joker.");
      return;
    }

    try {
      const predictionsToSave = visibleOpenFixtures.map((fixture) => {
        const score = scores[fixture.id];

        return {
          fixtureId: fixture.id,
          predictedScoreA: Number(score.scoreA),
          predictedScoreB: Number(score.scoreB),
          isJoker: jokerByGw[fixture.gameweek] === fixture.id,
        };
      });

      await apiRequest("/predictions/save-round", {
        method: "POST",
        body: JSON.stringify({
          gameweek: selectedRound,
          predictions: predictionsToSave,
        }),
      });

      alert("Predictions saved successfully.");
      loadData();
    } catch (err) {
      alert(err.message || "Failed to save predictions");
    }
  }

  return (
    <div className="predict-page" style={{ backgroundImage: `url(${bg})` }}>
      <div className="predict-overlay"></div>

      <div className="predict-content">
        <div className="predict-header">
          <div>
            <p className="admin-kicker">Prediction Mode</p>
            <h1>Matches</h1>
            <p>Predict unlocked games and choose one 🃏 joker.</p>
          </div>

          <button className="admin-black-btn" onClick={() => navigate("/user")}>
            Back
          </button>
        </div>

        {loading ? (
          <div className="admin-glass-card">
            <div className="empty-state">
              <h3>Loading matches...</h3>
            </div>
          </div>
        ) : fixtures.length === 0 ? (
          <div className="admin-glass-card">
            <div className="empty-state">
              <h3>No fixtures yet</h3>
              <p>The admin has not added fixtures yet.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="round-filter-card">
              <div>
                <h3>Current Round</h3>
                <p>Choose the round you want to predict.</p>
              </div>

              <select
                className="round-filter-select"
                value={selectedRound}
                onChange={(e) => setSelectedRound(e.target.value)}
              >
                {roundOptions.length === 0 ? (
                  <option value="">No rounds yet</option>
                ) : (
                  roundOptions.map((round) => (
                    <option key={round} value={round}>
                      {round}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="predict-board">
              <div className="predict-date">{selectedRound || "Round"}</div>

              {visibleFixtures.map((fixture) => {
                const logoA = getLogo(fixture.teamA);
                const logoB = getLogo(fixture.teamB);

                const currentScore = scores[fixture.id] || {
                  scoreA: "",
                  scoreB: "",
                };

                const isLocked =
                  fixture.status === "finished" || fixture.isLocked;

                const isJokerSelected =
                  jokerByGw[fixture.gameweek] === fixture.id;

                return (
                  <div className="predict-match-row" key={fixture.id}>
                    <div className="predict-team left-team">
                      <span>{fixture.teamA}</span>
                      {logoA && <img src={logoA} alt={fixture.teamA} />}
                    </div>

                    <div className="predict-center">
                      <div className="predict-time">
                        {fixture.kickoffTime || "Kickoff TBA"}
                      </div>

                      <div className={isLocked ? "locked-pill" : "open-pill"}>
                        {isLocked ? "LOCKED" : "OPEN"}
                      </div>

                      <div className="predict-score-wrap">
                        <input
                          className="clean-score-input"
                          type="text"
                          inputMode="numeric"
                          maxLength={2}
                          value={currentScore.scoreA}
                          disabled={isLocked}
                          onChange={(e) =>
                            handleScoreChange(
                              fixture.id,
                              "scoreA",
                              e.target.value
                            )
                          }
                        />

                        <span className="score-dash">-</span>

                        <input
                          className="clean-score-input"
                          type="text"
                          inputMode="numeric"
                          maxLength={2}
                          value={currentScore.scoreB}
                          disabled={isLocked}
                          onChange={(e) =>
                            handleScoreChange(
                              fixture.id,
                              "scoreB",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      {!isLocked && selectedRound && (
                        <button
                          className={`joker-btn ${
                            isJokerSelected ? "joker-selected" : ""
                          }`}
                          onClick={() =>
                            handleSelectJoker(fixture.gameweek, fixture.id)
                          }
                        >
                          🃏 {isJokerSelected ? "Joker" : "Joker"}
                        </button>
                      )}

                      {isLocked && (
                        <div className="final-result-pill">
                          {fixture.status === "finished"
                            ? `Final: ${fixture.actualScoreA} - ${fixture.actualScoreB}`
                            : "Closed"}
                        </div>
                      )}
                    </div>

                    <div className="predict-team right-team">
                      {logoB && <img src={logoB} alt={fixture.teamB} />}
                      <span>{fixture.teamB}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="save-all-wrap">
              <button
                className="save-all-btn"
                disabled={!selectedRound || !canSaveAll}
                onClick={handleSaveAllPredictions}
              >
                Save Predictions
              </button>

              {!selectedRound ? (
                <p className="save-helper-text">
                  Choose a round first before saving predictions.
                </p>
              ) : !canSaveAll ? (
                <p className="save-helper-text">
                  Complete all unlocked games in {selectedRound} and choose one
                  🃏 joker.
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default UserMatches;