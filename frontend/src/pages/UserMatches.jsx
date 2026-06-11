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
  const [chipByGw, setChipByGw] = useState({});
  const [selectedRound, setSelectedRound] = useState("");
  const [loading, setLoading] = useState(true);

  const [savedRounds, setSavedRounds] = useState({});
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);

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
      const chipMap = {};
      const savedRoundsMap = {};

      myPredictions.forEach((prediction) => {
        const fixtureId =
          prediction.fixtureId ||
          prediction.fixture?._id ||
          prediction.fixture?.id ||
          prediction.fixture;

        if (prediction.gameweek) {
          savedRoundsMap[prediction.gameweek] = true;
        }

        scoresMap[fixtureId] = {
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

        if (prediction.specialChip && prediction.specialChip !== "none") {
          chipMap[prediction.gameweek] = prediction.specialChip;
        }

        if (prediction.isJoker) {
          if (prediction.specialChip === "double_jokers") {
            if (!jokerMap[prediction.gameweek]) {
              jokerMap[prediction.gameweek] = [];
            }

            if (Array.isArray(jokerMap[prediction.gameweek])) {
              jokerMap[prediction.gameweek].push(fixtureId);
            }
          } else {
            jokerMap[prediction.gameweek] = fixtureId;
          }
        }
      });

      setScores(scoresMap);
      setJokerByGw(jokerMap);
      setChipByGw(chipMap);
      setSavedRounds(savedRoundsMap);
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

  function handleChipChange(gameweek, value) {
    setChipByGw((prev) => ({
      ...prev,
      [gameweek]: value,
    }));

    setJokerByGw((prev) => ({
      ...prev,
      [gameweek]:
        value === "maximum_joker" ? [] : value === "double_jokers" ? [] : "",
    }));
  }

  function handleSelectJoker(gameweek, fixtureId) {
    const selectedChip = chipByGw[gameweek] || "none";

    if (selectedChip === "maximum_joker") return;

    setJokerByGw((prev) => {
      const current = prev[gameweek];

      if (selectedChip === "double_jokers") {
        const currentArray = Array.isArray(current)
          ? current
          : current
          ? [current]
          : [];

        if (currentArray.includes(fixtureId)) {
          return {
            ...prev,
            [gameweek]: currentArray.filter((id) => id !== fixtureId),
          };
        }

        if (currentArray.length >= 2) {
          return {
            ...prev,
            [gameweek]: [currentArray[1], fixtureId],
          };
        }

        return {
          ...prev,
          [gameweek]: [...currentArray, fixtureId],
        };
      }

      return {
  ...prev,
  [gameweek]: current === fixtureId ? "" : fixtureId,
};
    });
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

  const usedSpecialChip = useMemo(() => {
    const used = Object.entries(chipByGw).find(
      ([round, chip]) => chip && chip !== "none" && round !== selectedRound
    );

    return used ? used[1] : "";
  }, [chipByGw, selectedRound]);

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

    const selectedChip = chipByGw[selectedRound] || "none";
    const jokerValue = jokerByGw[selectedRound];

    if (selectedChip === "maximum_joker") return true;

    if (selectedChip === "double_jokers") {
      const jokerArray = Array.isArray(jokerValue)
        ? jokerValue
        : jokerValue
        ? [jokerValue]
        : [];

      return (
        jokerArray.length === 2 &&
        jokerArray.every((id) =>
          visibleOpenFixtures.some((fixture) => fixture.id === id)
        )
      );
    }

    if (!jokerValue) return false;

    return visibleOpenFixtures.some((fixture) => fixture.id === jokerValue);
  }, [visibleOpenFixtures, jokerByGw, chipByGw, selectedRound]);

  const canSaveAll = allOpenMatchesCompleted && selectedRoundHasJoker;

  async function handleSaveAllPredictions() {
    if (!selectedRound) {
      alert("Please choose one round before saving predictions.");
      return;
    }

    if (!canSaveAll) {
      alert("Complete all unlocked match predictions and choose the required joker/chip.");
      return;
    }

    try {
      setSaving(true);

      const selectedChip = chipByGw[selectedRound] || "none";

      const predictionsToSave = visibleOpenFixtures.map((fixture) => {
        const score = scores[fixture.id];
        const jokerValue = jokerByGw[fixture.gameweek];

        let isJoker = false;

        if (selectedChip === "double_jokers") {
          const jokerArray = Array.isArray(jokerValue)
            ? jokerValue
            : jokerValue
            ? [jokerValue]
            : [];

          isJoker = jokerArray.includes(fixture.id);
        } else if (selectedChip !== "maximum_joker") {
          isJoker = jokerValue === fixture.id;
        }

        return {
          fixtureId: fixture.id,
          predictedScoreA: Number(score.scoreA),
          predictedScoreB: Number(score.scoreB),
          isJoker,
        };
      });

      await apiRequest("/predictions/save-round", {
        method: "POST",
        body: JSON.stringify({
          gameweek: selectedRound,
          specialChip: selectedChip,
          predictions: predictionsToSave,
        }),
      });

      setSavedRounds((prev) => ({
        ...prev,
        [selectedRound]: true,
      }));

      setSaveMessage("Predictions saved successfully");

      setTimeout(() => {
        setSaveMessage("");
      }, 1300);
    } catch (err) {
      alert(err.message || "Failed to save predictions");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="predict-page" style={{ backgroundImage: `url(${bg})` }}>
      <div className="predict-overlay"></div>

      {saveMessage && <div className="success-popup">✅ {saveMessage}</div>}

      <div className="predict-content">
        <div className="predict-header">
          <div>
            <p className="admin-kicker">Prediction Mode</p>
            <h1>Matches</h1>
            <p>Predict unlocked games and choose your joker/chip.</p>
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

            <div className="round-filter-card" style={{ marginTop: "16px" }}>
              <div>
                <h3>Prediction Chip</h3>
                <p>
                  Choose blank or use your one tournament chip.
                  {usedSpecialChip && (
                    <span> You already used a chip in another round.</span>
                  )}
                </p>
              </div>

              <select
                className="round-filter-select"
                value={chipByGw[selectedRound] || "none"}
                onChange={(e) => handleChipChange(selectedRound, e.target.value)}
                disabled={!selectedRound}
              >
                <option value="none">No Chip</option>
                <option value="triple_joker" disabled={Boolean(usedSpecialChip)}>
                  Triple Joker
                </option>
                <option value="double_jokers" disabled={Boolean(usedSpecialChip)}>
                  Double Joker
                </option>
                <option value="maximum_joker" disabled={Boolean(usedSpecialChip)}>
                  Maximum Joker
                </option>
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

                const selectedChip = chipByGw[fixture.gameweek] || "none";
                const jokerValue = jokerByGw[fixture.gameweek];

                const isJokerSelected =
                  selectedChip === "double_jokers"
                    ? Array.isArray(jokerValue) && jokerValue.includes(fixture.id)
                    : jokerValue === fixture.id;

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
                            handleScoreChange(fixture.id, "scoreA", e.target.value)
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
                            handleScoreChange(fixture.id, "scoreB", e.target.value)
                          }
                        />
                      </div>

                      {!isLocked &&
                        selectedRound &&
                        selectedChip !== "maximum_joker" && (
                          <button
                            className={`joker-btn ${
                              isJokerSelected ? "joker-selected" : ""
                            }`}
                            onClick={() =>
                              handleSelectJoker(fixture.gameweek, fixture.id)
                            }
                          >
                            {isJokerSelected ? " Joker" : "Joker"}
                          </button>
                        )}

                      {!isLocked && selectedChip === "maximum_joker" && (
                        <div className="final-result-pill">Auto Max Joker</div>
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
  className={`save-all-btn ${
    savedRounds[selectedRound] ? "edit-predictions-btn" : "save-predictions-btn"
  }`}
  disabled={!selectedRound || !canSaveAll || saving}
  onClick={handleSaveAllPredictions}
>
  {saving
    ? "Saving..."
    : savedRounds[selectedRound]
    ? "Edit Predictions"
    : "Save Predictions"}
</button>

              {!selectedRound ? (
                <p className="save-helper-text">
                  Choose a round first before saving predictions.
                </p>
              ) : !canSaveAll ? (
                <p className="save-helper-text">
                  Complete all unlocked games in {selectedRound} and choose the
                  required joker/chip.
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