import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg.jpg";
import { apiRequest } from "../api/api";

const chipLabels = {
  triple_joker: "Triple Joker",
  double_jokers: "Double Jokers",
  maximum_joker: "Maximum Joker",
};

function getChipGamesText(chipKey, chip) {
  if (!chip?.used) return "Not used yet";

  if (chipKey === "maximum_joker" && chip.games.length === 0) {
    return "Auto best game after results";
  }

  if (chip.games.length === 0) {
    return "No game selected";
  }

  return chip.games.map((game) => game.match).join(" / ");
}

function getChipClass(chip) {
  return chip?.used ? "chips-used" : "chips-available";
}

function Chips({ currentUser }) {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [selectedChip, setSelectedChip] = useState("all");
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

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (selectedUserId !== "all" && user.userId !== selectedUserId) {
        return false;
      }

      if (selectedChip === "all") return true;
      if (selectedChip === "used") return user.usedCount > 0;
      if (selectedChip === "remaining") return user.remainingCount > 0;

      return user.chips?.[selectedChip]?.used;
    });
  }, [users, selectedUserId, selectedChip]);

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

  return (
    <div className="admin-bg-page" style={{ backgroundImage: `url(${bg})` }}>
      <div className="admin-bg-overlay"></div>

      <div className="admin-content chips-page">
        <div className="chips-hero">
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

          <button className="chips-back-btn" onClick={goBack}>
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
            <span>Used No Chips</span>
            <strong>{usersUsedNoChips}</strong>
          </div>
        </div>

        <div className="chips-filter-card">
          <div className="chips-filter-group">
            <label>Choose User</label>
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
          </div>

          <div className="chips-filter-group">
            <label>Filter Chips</label>
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
          </div>

          <button className="chips-refresh-btn" onClick={loadChips}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="chips-empty-card">
            <h3>Loading chips...</h3>
            <p>Please wait.</p>
          </div>
        ) : error ? (
          <div className="chips-empty-card chips-error-card">
            <h3>Could not load users</h3>
            <p>{error}</p>
            <p>
              Make sure you replaced{" "}
              <strong>backend/src/routes/predictionRoutes.js</strong>, committed,
              pushed, and redeployed Render.
            </p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="chips-empty-card">
            <h3>No users found</h3>
            <p>
              Users loaded: <strong>{users.length}</strong>. No user matches the
              selected filters.
            </p>
          </div>
        ) : (
          <div className="chips-users-grid">
            {filteredUsers.map((user) => (
              <div className="chips-user-card" key={user.userId}>
                <div className="chips-user-top">
                  <div>
                    <h2>{user.fullName}</h2>
                  </div>

                  <div className="chips-count-pill">
                    {user.usedCount}/3 used
                  </div>
                </div>

                <div className="chips-list">
                  {Object.keys(chipLabels).map((chipKey) => {
                    const chip = user.chips?.[chipKey];

                    return (
                      <div className="chips-chip-row" key={chipKey}>
                        <div className="chips-chip-title">
                          <strong>{chipLabels[chipKey]}</strong>

                          <span className={getChipClass(chip)}>
                            {chip?.used ? "Used" : "Available"}
                          </span>
                        </div>

                        <div className="chips-chip-details">
                          <p>
                            <span>Round:</span>{" "}
                            {chip?.used ? chip.gameweek : "-"}
                          </p>

                          <p>
                            <span>Game:</span> {getChipGamesText(chipKey, chip)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="chips-remaining">
                  <span>Remaining:</span>{" "}
                  {user.remainingChips.length === 0
                    ? "No chips remaining"
                    : user.remainingChips
                        .map((chipKey) => chipLabels[chipKey])
                        .join(", ")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Chips;