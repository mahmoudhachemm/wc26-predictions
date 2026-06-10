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

  // NEW
  const [savedRounds, setSavedRounds] = useState({});
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function getFixtureId(fixture) {
    return fixture.id || fixture._id;
  }

  function getPredictionFixtureId(prediction) {
    return (
      prediction.fixtureId ||
      prediction.fixture?._id ||
      prediction.fixture?.id ||
      prediction.fixture
    );
  }

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

      // NEW
      const savedRoundsMap = {};

      myPredictions.forEach((prediction) => {
        const fixtureId = getPredictionFixtureId(prediction);

        if (!fixtureId) return;

        // NEW: if this user has any prediction in this round, button becomes Edit
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
              jokerMap[prediction.gameweek].push(String(fixtureId));
            }
          } else {
            jokerMap[prediction.gameweek] = String(fixtureId);
          }
        }
      });

      setScores(scoresMap);
      setJokerByGw(jokerMap);
      setChipByGw(chipMap);

      // NEW
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
    if (!teamName) return null;

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

        if (currentArray.includes(String(fixtureId))) {
          return {
            ...prev,
            [gameweek]: currentArray.filter((id) => id !== String(fixtureId)),
          };
        }

        if (currentArray.length >= 2) {
          return {
            ...prev,
            [gameweek]: [currentArray[1], String(fixtureId)],
          };
        }

        return {
          ...prev,
          [gameweek]: [...currentArray, String(fixtureId)],
        };
      }

      return {
        ...prev,
        [gameweek]: String(fixtureId),
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
      const fixtureId = getFixtureId(fixture);
      const score = scores[fixtureId];

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
          visibleOpenFixtures.some(
            (fixture) => String(getFixtureId(fixture)) === String(id)
          )
        )
      );
    }

    if (!jokerValue) return false;

    return visibleOpenFixtures.some(
      (fixture) => String(getFixtureId(fixture)) === String(jokerValue)
    );
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
      setSaveMessage("");

      const selectedChip = chipByGw[selectedRound] || "none";

      const predictionsToSave = visibleOpenFixtures.map((fixture) => {
        const fixtureId = getFixtureId(fixture);
        const score = scores[fixtureId];
        const jokerValue = jokerByGw[fixture.gameweek];

        let isJoker = false;

        if (selectedChip === "double_jokers") {
          const jokerArray = Array.isArray(jokerValue)
            ? jokerValue
            : jokerValue
            ? [jokerValue]
            : [];

          isJoker = jokerArray.some((id) => String(id) === String(fixtureId));
        } else if (selectedChip !== "maximum_joker") {
          isJoker = String(jokerValue) === String(fixtureId);
        }

        return {
          fixtureId,
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

      // NEW: button changes from Save to Edit immediately
      setSavedRounds((prev) => ({
        ...prev,
        [selectedRound]: true,
      }));

      // NEW: green message one time
      setSaveMessage("✅ Predictions saved successfully.");

      setTimeout(() => {
        setSaveMessage("");
      }, 3000);

      loadData();
    } catch (err) {
      alert(err.message || "Failed to save predictions");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: `linear-gradient(rgba(0,0,0,.7), rgba(0,0,0,.8)), url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: "white",
        padding: "18px",
      }}
    >
      <div
        style={{
          maxWidth: "950px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            marginBottom: "18px",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                padding: "6px 10px",
                borderRadius: "999px",
                background: "rgba(255,255,255,.12)",
                border: "1px solid rgba(255,255,255,.16)",
                fontSize: "12px",
                fontWeight: "800",
                marginBottom: "8px",
              }}
            >
              Prediction Mode
            </div>

            <h1 style={{ margin: 0, fontSize: "30px" }}>Matches</h1>

            <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,.72)" }}>
              Predict unlocked games and choose your joker/chip.
            </p>
          </div>

          <button
            onClick={() => navigate("/user")}
            style={{
              border: "none",
              borderRadius: "14px",
              padding: "11px 14px",
              background: "rgba(255,255,255,.14)",
              color: "white",
              fontWeight: "800",
              cursor: "pointer",
            }}
          >
            Back
          </button>
        </div>

        {loading ? (
          <div
            style={{
              background: "rgba(255,255,255,.1)",
              border: "1px solid rgba(255,255,255,.16)",
              borderRadius: "20px",
              padding: "16px",
            }}
          >
            <h3 style={{ margin: 0 }}>Loading matches...</h3>
          </div>
        ) : fixtures.length === 0 ? (
          <div
            style={{
              background: "rgba(255,255,255,.1)",
              border: "1px solid rgba(255,255,255,.16)",
              borderRadius: "20px",
              padding: "16px",
            }}
          >
            <h3 style={{ marginTop: 0 }}>No fixtures yet</h3>
            <p style={{ marginBottom: 0, color: "rgba(255,255,255,.72)" }}>
              The admin has not added fixtures yet.
            </p>
          </div>
        ) : (
          <>
            <div
              className="prediction-settings-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                background: "rgba(255,255,255,.1)",
                border: "1px solid rgba(255,255,255,.16)",
                borderRadius: "20px",
                padding: "16px",
                marginBottom: "14px",
              }}
            >
              <div>
                <h3 style={{ margin: "0 0 6px", fontSize: "15px" }}>
                  Current Round
                </h3>

                <p
                  style={{
                    margin: "0 0 8px",
                    color: "rgba(255,255,255,.66)",
                    fontSize: "13px",
                  }}
                >
                  Choose the round you want to predict.
                </p>

                <select
                  value={selectedRound}
                  onChange={(e) => setSelectedRound(e.target.value)}
                  style={{
                    width: "100%",
                    borderRadius: "14px",
                    padding: "12px",
                    border: "1px solid rgba(255,255,255,.2)",
                    background: "rgba(0,0,0,.35)",
                    color: "white",
                    fontWeight: "800",
                    outline: "none",
                  }}
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

              <div>
                <h3 style={{ margin: "0 0 6px", fontSize: "15px" }}>
                  Prediction Chip
                </h3>

                <p
                  style={{
                    margin: "0 0 8px",
                    color: "rgba(255,255,255,.66)",
                    fontSize: "13px",
                  }}
                >
                  Choose blank or use your one tournament chip.
                </p>

                {usedSpecialChip && (
                  <p
                    style={{
                      margin: "0 0 8px",
                      color: "#facc15",
                      fontSize: "13px",
                      fontWeight: "800",
                    }}
                  >
                    You already used a chip in another round.
                  </p>
                )}

                <select
                  value={chipByGw[selectedRound] || "none"}
                  onChange={(e) => handleChipChange(selectedRound, e.target.value)}
                  disabled={!selectedRound || !!usedSpecialChip}
                  style={{
                    width: "100%",
                    borderRadius: "14px",
                    padding: "12px",
                    border: "1px solid rgba(255,255,255,.2)",
                    background: "rgba(0,0,0,.35)",
                    color: "white",
                    fontWeight: "800",
                    outline: "none",
                    opacity: usedSpecialChip ? 0.6 : 1,
                  }}
                >
                  <option value="none">No Chip</option>
                  <option value="triple_joker">Triple Joker</option>
                  <option value="double_jokers">Double Joker</option>
                  <option value="maximum_joker">Maximum Joker</option>
                </select>
              </div>
            </div>

            <h2 style={{ margin: "16px 0 12px" }}>
              {selectedRound || "Round"}
            </h2>

            <div style={{ display: "grid", gap: "12px" }}>
              {visibleFixtures.map((fixture) => {
                const fixtureId = getFixtureId(fixture);
                const logoA = getLogo(fixture.teamA);
                const logoB = getLogo(fixture.teamB);
                const currentScore = scores[fixtureId] || {
                  scoreA: "",
                  scoreB: "",
                };

                const isLocked = fixture.status === "finished" || fixture.isLocked;
                const selectedChip = chipByGw[fixture.gameweek] || "none";
                const jokerValue = jokerByGw[fixture.gameweek];

                const isJokerSelected =
                  selectedChip === "double_jokers"
                    ? Array.isArray(jokerValue) &&
                      jokerValue.some((id) => String(id) === String(fixtureId))
                    : String(jokerValue) === String(fixtureId);

                return (
                  <div
                    key={fixtureId}
                    className="match-card-grid"
                    style={{
                      background: "rgba(255,255,255,.1)",
                      border: "1px solid rgba(255,255,255,.16)",
                      borderRadius: "20px",
                      padding: "14px",
                      display: "grid",
                      gridTemplateColumns: "1fr auto 1fr",
                      gap: "10px",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        minWidth: 0,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: "900",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {fixture.teamA}
                        </div>

                        <div
                          style={{
                            color: "rgba(255,255,255,.55)",
                            fontSize: "12px",
                            marginTop: "2px",
                          }}
                        >
                          {fixture.kickoffTime || "Kickoff TBA"}
                        </div>
                      </div>

                      {logoA && (
                        <img
                          src={logoA}
                          alt={fixture.teamA}
                          style={{
                            width: "28px",
                            height: "28px",
                            objectFit: "contain",
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          marginBottom: "7px",
                          fontSize: "11px",
                          fontWeight: "900",
                          color: isLocked ? "#fca5a5" : "#86efac",
                        }}
                      >
                        {isLocked ? "LOCKED" : "OPEN"}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "7px",
                          justifyContent: "center",
                        }}
                      >
                        <input
                          value={currentScore.scoreA}
                          disabled={isLocked}
                          inputMode="numeric"
                          onChange={(e) =>
                            handleScoreChange(fixtureId, "scoreA", e.target.value)
                          }
                          style={{
                            width: "44px",
                            height: "42px",
                            borderRadius: "12px",
                            border: "1px solid rgba(255,255,255,.22)",
                            background: "rgba(0,0,0,.32)",
                            color: "white",
                            textAlign: "center",
                            fontSize: "18px",
                            fontWeight: "800",
                            outline: "none",
                            opacity: isLocked ? 0.55 : 1,
                          }}
                        />

                        <span style={{ fontWeight: "900", opacity: 0.7 }}>-</span>

                        <input
                          value={currentScore.scoreB}
                          disabled={isLocked}
                          inputMode="numeric"
                          onChange={(e) =>
                            handleScoreChange(fixtureId, "scoreB", e.target.value)
                          }
                          style={{
                            width: "44px",
                            height: "42px",
                            borderRadius: "12px",
                            border: "1px solid rgba(255,255,255,.22)",
                            background: "rgba(0,0,0,.32)",
                            color: "white",
                            textAlign: "center",
                            fontSize: "18px",
                            fontWeight: "800",
                            outline: "none",
                            opacity: isLocked ? 0.55 : 1,
                          }}
                        />
                      </div>

                      {!isLocked &&
                        selectedRound &&
                        selectedChip !== "maximum_joker" && (
                          <button
                            onClick={() =>
                              handleSelectJoker(fixture.gameweek, fixtureId)
                            }
                            style={{
                              marginTop: "8px",
                              border: "none",
                              borderRadius: "999px",
                              padding: "7px 10px",
                              background: isJokerSelected
                                ? "linear-gradient(135deg, #ffd166, #ff9f1c)"
                                : "rgba(255,255,255,.13)",
                              color: isJokerSelected ? "#1d1300" : "white",
                              fontWeight: "900",
                              cursor: "pointer",
                            }}
                          >
                            {isJokerSelected ? "🃏 Joker" : "Joker"}
                          </button>
                        )}

                      {!isLocked && selectedChip === "maximum_joker" && (
                        <div
                          style={{
                            marginTop: "8px",
                            color: "#ffd166",
                            fontSize: "12px",
                            fontWeight: "900",
                          }}
                        >
                          Auto Max Joker
                        </div>
                      )}

                      {isLocked && (
                        <div
                          style={{
                            marginTop: "8px",
                            color: "rgba(255,255,255,.68)",
                            fontSize: "12px",
                            fontWeight: "800",
                          }}
                        >
                          {fixture.status === "finished"
                            ? `Final: ${fixture.actualScoreA} - ${fixture.actualScoreB}`
                            : "Closed"}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: "8px",
                        minWidth: 0,
                        textAlign: "right",
                      }}
                    >
                      {logoB && (
                        <img
                          src={logoB}
                          alt={fixture.teamB}
                          style={{
                            width: "28px",
                            height: "28px",
                            objectFit: "contain",
                            flexShrink: 0,
                          }}
                        />
                      )}

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: "900",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {fixture.teamB}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                position: "sticky",
                bottom: "12px",
                marginTop: "16px",
                zIndex: 10,
              }}
            >
              {saveMessage && (
                <div
                  style={{
                    marginBottom: "12px",
                    padding: "12px 14px",
                    borderRadius: "14px",
                    background: "rgba(34, 197, 94, 0.18)",
                    border: "1px solid rgba(34, 197, 94, 0.45)",
                    color: "#86efac",
                    fontWeight: "800",
                    textAlign: "center",
                  }}
                >
                  {saveMessage}
                </div>
              )}

              <button
                onClick={handleSaveAllPredictions}
                disabled={!canSaveAll || saving}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: "18px",
                  padding: "15px 16px",
                  fontSize: "16px",
                  fontWeight: "900",
                  cursor: canSaveAll && !saving ? "pointer" : "not-allowed",
                  background:
                    canSaveAll && !saving
                      ? "linear-gradient(135deg, #21d07a, #00a3ff)"
                      : "rgba(255,255,255,.18)",
                  color: "white",
                  boxShadow:
                    canSaveAll && !saving
                      ? "0 12px 30px rgba(0,163,255,.32)"
                      : "none",
                }}
              >
                {saving
                  ? "Saving..."
                  : savedRounds[selectedRound]
                  ? "Edit Predictions"
                  : "Save Predictions"}
              </button>

              {!selectedRound ? (
                <p style={{ textAlign: "center", color: "#ffd166" }}>
                  Choose a round first before saving predictions.
                </p>
              ) : visibleOpenFixtures.length === 0 ? (
                <p style={{ textAlign: "center", color: "#ffd166" }}>
                  All games in this round are locked or finished.
                </p>
              ) : !canSaveAll ? (
                <p style={{ textAlign: "center", color: "#ffd166" }}>
                  Complete all unlocked games in {selectedRound} and choose the
                  required joker/chip.
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>

      <style>
        {`
          input::-webkit-outer-spin-button,
          input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }

          input[type=number] {
            -moz-appearance: textfield;
          }

          @media (max-width: 650px) {
            .prediction-settings-grid {
              grid-template-columns: 1fr !important;
              padding: 13px !important;
              border-radius: 18px !important;
            }

            .match-card-grid {
              grid-template-columns: 1fr !important;
              text-align: center !important;
              gap: 12px !important;
            }

            .match-card-grid > div:first-child,
            .match-card-grid > div:last-child {
              justify-content: center !important;
              text-align: center !important;
            }

            .match-card-grid > div:last-child {
              flex-direction: row-reverse !important;
            }
          }
        `}
      </style>
    </div>
  );
}

export default UserMatches;