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
  const [cupJokerByGw, setCupJokerByGw] = useState({});
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

      const [fixturesData, myPredictions, savedCurrentRound] =
        await Promise.all([
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
      const cupJokerMap = {};
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

        if (prediction.isCupJoker) {
          cupJokerMap[prediction.gameweek] = fixtureId;
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
      setCupJokerByGw(cupJokerMap);
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

  function handleSelectCupJoker(gameweek, fixtureId) {
    setCupJokerByGw((prev) => ({
      ...prev,
      [gameweek]: prev[gameweek] === fixtureId ? "" : fixtureId,
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

  const selectedRoundHasCupJoker = useMemo(() => {
    if (visibleOpenFixtures.length === 0 || !selectedRound) return false;

    const cupJokerValue = cupJokerByGw[selectedRound];

    if (!cupJokerValue) return false;

    return visibleOpenFixtures.some((fixture) => fixture.id === cupJokerValue);
  }, [visibleOpenFixtures, cupJokerByGw, selectedRound]);

  const canSaveAll =
    allOpenMatchesCompleted && selectedRoundHasJoker && selectedRoundHasCupJoker;

  async function handleSaveAllPredictions() {
    if (!selectedRound) {
      alert("Please choose one round before saving predictions.");
      return;
    }

    if (!canSaveAll) {
      alert(
        "Complete all unlocked match predictions, choose the required joker/chip, and choose your Main Cup Joker."
      );
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
          isCupJoker: cupJokerByGw[fixture.gameweek] === fixture.id,
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
    <div
      className="page matches-page"
      style={{ backgroundImage: `url(${bg})` }}
    >
      {saveMessage && (
        <div className="success-popup">
          <span>✅ {saveMessage}</span>
        </div>
      )}

      <div className="page-shell">
        <div className="page-header">
          <div>
            <p className="eyebrow">Prediction Mode</p>
            <h1>Matches</h1>
            <p>
              Predict unlocked games, choose your leaderboard joker/chip, and
              choose your Main Cup Joker.
            </p>
          </div>

          <button type="button" onClick={() => navigate("/user")}>
            Back
          </button>
        </div>

        {loading ? (
          <div className="empty-card">
            <h3>Loading matches...</h3>
          </div>
        ) : fixtures.length === 0 ? (
          <div className="empty-card">
            <h3>No fixtures yet</h3>
            <p>The admin has not added fixtures yet.</p>
          </div>
        ) : (
          <>
            <div className="round-card">
              <h3>Current Round</h3>
              <p>Choose the round you want to predict.</p>

              <select
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

            <div className="round-card">
              <h3>Prediction Chip</h3>
              <p>
                Choose blank or use your one tournament chip.
                {usedSpecialChip && (
                  <span className="chip-used-note">
                    {" "}
                    You already used a chip in another round.
                  </span>
                )}
              </p>

              <select
                value={chipByGw[selectedRound] || "none"}
                onChange={(e) => handleChipChange(selectedRound, e.target.value)}
                disabled={!selectedRound || Boolean(usedSpecialChip)}
              >
                <option value="none">No Chip</option>
                <option value="triple_joker">Triple Joker</option>
                <option value="double_jokers">Double Joker</option>
                <option value="maximum_joker">Maximum Joker</option>
              </select>

              <p className="helper-text">
                Chips count only in the general leaderboard. They do not count
                in the Cup H2H.
              </p>
            </div>

            <div className="round-card">
              <h3>Main Cup Joker</h3>
              <p>
                Choose one match as your Cup Joker. This joker counts only for
                Cup H2H scoring.
              </p>
            </div>

            <div className="matches-list">
              <h3>{selectedRound || "Round"}</h3>

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

                const isCupJokerSelected =
                  cupJokerByGw[fixture.gameweek] === fixture.id;

                return (
                  <div key={fixture.id} className="match-card">
                    <div className="team team-left">
                      <span>{fixture.teamA}</span>
                      {logoA && (
                        <img
                          src={logoA}
                          alt={fixture.teamA}
                          className="team-logo"
                        />
                      )}
                    </div>

                    <div className="match-center">
                      <div className="match-time">
                        {fixture.kickoffTime || "Kickoff TBA"}
                      </div>

                      <div
                        className={`match-status ${
                          isLocked ? "locked" : "open"
                        }`}
                      >
                        {isLocked ? "LOCKED" : "OPEN"}
                      </div>

                      <div className="score-row">
                        <input
                          type="text"
                          inputMode="numeric"
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

                        <span>-</span>

                        <input
                          type="text"
                          inputMode="numeric"
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

                      {!isLocked &&
                        selectedRound &&
                        selectedChip !== "maximum_joker" && (
                          <button
                            type="button"
                            className={`joker-btn ${
                              isJokerSelected ? "active" : ""
                            }`}
                            onClick={() =>
                              handleSelectJoker(fixture.gameweek, fixture.id)
                            }
                          >
                            {isJokerSelected ? "Joker ✓" : "Joker"}
                          </button>
                        )}

                      {!isLocked && selectedChip === "maximum_joker" && (
                        <div className="auto-joker-label">Auto Max Joker</div>
                      )}

                      {!isLocked && selectedRound && (
                        <button
                          type="button"
                          className={`joker-btn cup-joker-btn ${
                            isCupJokerSelected ? "active" : ""
                          }`}
                          onClick={() =>
                            handleSelectCupJoker(
                              fixture.gameweek,
                              fixture.id
                            )
                          }
                        >
                          {isCupJokerSelected
                            ? "Cup Joker ✓"
                            : "Cup Joker"}
                        </button>
                      )}

                      {isLocked && (
                        <div className="final-score">
                          {fixture.status === "finished"
                            ? `Final: ${fixture.actualScoreA} - ${fixture.actualScoreB}`
                            : "Closed"}
                        </div>
                      )}
                    </div>

                    <div className="team team-right">
                      {logoB && (
                        <img
                          src={logoB}
                          alt={fixture.teamB}
                          className="team-logo"
                        />
                      )}
                      <span>{fixture.teamB}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className="save-all-btn"
              disabled={!canSaveAll || saving}
              onClick={handleSaveAllPredictions}
            >
              {saving
                ? "Saving..."
                : savedRounds[selectedRound]
                ? "Edit Predictions"
                : "Save Predictions"}
            </button>

            {!selectedRound ? (
              <p className="helper-text">Choose a round first before saving predictions.</p>
            ) : !canSaveAll ? (
              <p className="helper-text">
                Complete all unlocked games in {selectedRound}, choose the
                required joker/chip, and choose your Main Cup Joker.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export default UserMatches;