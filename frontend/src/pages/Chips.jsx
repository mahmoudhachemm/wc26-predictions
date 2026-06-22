import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg.jpg";
import { apiRequest } from "../api/api";

const ROUNDS = [
  "Round 1",
  "Round 2",
  "Round 3",
  "Round of 32",
  "Round of 16",
  "Quarter Final",
  "Semi Final",
  "Final",
];

const chipLabels = {
  triple_joker: "Triple Joker",
  double_jokers: "Double Jokers",
  maximum_joker: "Maximum Joker",
};

function getChipGamesText(chipKey, chip) {
  if (!chip?.used) return "Not used yet";

  if (chipKey === "maximum_joker" && (!chip.games || chip.games.length === 0)) {
    return "Auto best game after results";
  }

  if (!chip.games || chip.games.length === 0) {
    return "No game selected";
  }

  return chip.games.map((game) => game.match).join(" / ");
}

function getChipClass(chip) {
  return chip?.used ? "chips-used" : "chips-available";
}

function chipUsedInRound(chip, selectedRound) {
  if (!chip?.used) return false;
  if (selectedRound === "all") return true;
  return chip.gameweek === selectedRound;
}

function Chips({ currentUser }) {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedUserId, setSelectedUserId] = useState("all");
  const [selectedChip, setSelectedChip] = useState("all");
  const [selectedRound, setSelectedRound] = useState("all");

  const [error, setError] = useState("");

  async function loadChips() {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest("/predictions/chips-summary");

      if (!Array.isArray(data)) {
        setUsers([]);
        setError("Backend returned wrong chips data.");
        return;
      }

      setUsers(data);
    } catch (err) {
      setUsers([]);
      setError(err.message || "Failed to load chips.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChips();
  }, []);

  const usersUsedThisRound = useMemo(() => {
    if (selectedRound === "all") {
      return users.filter((user) => user.usedCount > 0).length;
    }

    return users.filter((user) =>
      Object.keys(chipLabels).some((chipKey) =>
        chipUsedInRound(user.chips?.[chipKey], selectedRound)
      )
    ).length;
  }, [users, selectedRound]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (selectedUserId !== "all" && user.userId !== selectedUserId) {
        return false;
      }

      const usedChipKeysInSelectedRound = Object.keys(chipLabels).filter(
        (chipKey) => chipUsedInRound(user.chips?.[chipKey], selectedRound)
      );

      if (selectedRound !== "all" && usedChipKeysInSelectedRound.length === 0) {
        return false;
      }

      if (selectedChip === "all") {
        return true;
      }

      if (selectedChip === "used") {
        if (selectedRound === "all") return user.usedCount > 0;
        return usedChipKeysInSelectedRound.length > 0;
      }

      if (selectedChip === "remaining") {
        return user.remainingCount > 0;
      }

      const chip = user.chips?.[selectedChip];

      if (selectedRound === "all") {
        return chip?.used;
      }

      return chipUsedInRound(chip, selectedRound);
    });
  }, [users, selectedUserId, selectedChip, selectedRound]);

  const totalUsers = users.length;
  const usersUsedAnyChip = users.filter((user) => user.usedCount > 0).length;
  const usersUsedNoChips = users.filter((user) => user.usedCount === 0).length;

  function goBack() {
    if (currentUser?.role === "admin") {
      navigate("/admin");
    } else {
      navigate("/user");
    }
  }

  function getVisibleChipKeys(user) {
    if (selectedRound === "all") {
      return Object.keys(chipLabels);
    }

    return Object.keys(chipLabels).filter((chipKey) =>
      chipUsedInRound(user.chips?.[chipKey], selectedRound)
    );
  }

  return (
    <div className="admin-bg-page" style={{ backgroundImage: `url(${bg})` }}>
      <div className="admin-bg-overlay"></div>

      <div className="admin-content">
        <div className="admin-header">
          <div>
            <p className="admin-kicker">
              {currentUser?.role === "admin" ? "Admin Mode" : "User Mode"}
            </p>
            <h1>Chips</h1>
            <p>
              Full chip usage for all users: used chips, selected games, rounds,
              and remaining chips.
            </p>
          </div>

          <button className="admin-logout-btn" onClick={goBack}>
            Back
          </button>
        </div>

        <div className="chips-stats-grid">
          <div className="chips-stat-card">
            <span>Total Users</span>
            <strong>{totalUsers}</strong>
          </div>

          <div className="chips-stat-card">
            <span>Used Any Chip</span>
            <strong>{usersUsedAnyChip}</strong>
          </div>

          <div className="chips-stat-card">
            <span>Used This Round</span>
            <strong>{usersUsedThisRound}</strong>
          </div>

          <div className="chips-stat-card">
            <span>Used No Chips</span>
            <strong>{usersUsedNoChips}</strong>
          </div>
        </div>

        <div className="admin-section-card">
          <div className="chips-filters">
            <label>
              Choose Round
              <select
                value={selectedRound}
                onChange={(e) => setSelectedRound(e.target.value)}
              >
                <option value="all">All Rounds</option>
                {ROUNDS.map((round) => (
                  <option key={round} value={round}>
                    {round}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Choose User
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="all">All Users</option>
                {users.map((user) => (
                  <option key={user.userId} value={user.userId}>
                    {user.fullName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Filter Chips
              <select
                value={selectedChip}
                onChange={(e) => setSelectedChip(e.target.value)}
              >
                <option value="all">All Chips</option>
                <option value="used">Used Any Chip</option>
                <option value="remaining">Still Has Remaining Chips</option>
                <option value="triple_joker">Triple Joker Used</option>
                <option value="double_jokers">Double Jokers Used</option>
                <option value="maximum_joker">Maximum Joker Used</option>
              </select>
            </label>

            <button className="admin-black-btn" onClick={loadChips}>
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="admin-section-card">
            <h3>Loading chips...</h3>
            <p>Please wait.</p>
          </div>
        ) : error ? (
          <div className="admin-section-card">
            <h3>Could not load users</h3>
            <p>{error}</p>
            <p>
              Make sure you replaced{" "}
              <strong>backend/src/routes/predictionRoutes.js</strong>,
              committed, pushed, and redeployed Render.
            </p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="admin-section-card">
            <h3>No users found</h3>
            <p>
              Users loaded: {users.length}. No user matches the selected
              filters.
            </p>
          </div>
        ) : (
          <div className="chips-users-grid">
            {filteredUsers.map((user) => {
              const visibleChipKeys = getVisibleChipKeys(user);

              return (
                <div className="chips-user-card" key={user.userId}>
                  <div className="chips-user-head">
                    <h2>{user.fullName}</h2>
                    <span>
                      {selectedRound === "all"
                        ? `${user.usedCount}/3 used`
                        : `${visibleChipKeys.length} used this round`}
                    </span>
                  </div>

                  <div className="chips-list">
                    {visibleChipKeys.map((chipKey) => {
                      const chip = user.chips?.[chipKey];

                      return (
                        <div
                          className={`chips-item ${getChipClass(chip)}`}
                          key={chipKey}
                        >
                          <div className="chips-item-top">
                            <strong>{chipLabels[chipKey]}</strong>
                            <span>{chip?.used ? "Used" : "Available"}</span>
                          </div>

                          <p>
                            Round:{" "}
                            <strong>{chip?.used ? chip.gameweek : "-"}</strong>
                          </p>

                          <p>
                            Game:{" "}
                            <strong>{getChipGamesText(chipKey, chip)}</strong>
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="chips-remaining">
                    <strong>Remaining: </strong>
                    {user.remainingChips.length === 0
                      ? "No chips remaining"
                      : user.remainingChips
                          .map((chipKey) => chipLabels[chipKey])
                          .join(", ")}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Chips;