import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg.jpg";
import { apiRequest } from "../api/api";

const CHIP_ORDER = ["triple_joker", "double_jokers", "maximum_joker"];

const CHIP_LABELS = {
  triple_joker: "Triple Joker",
  double_jokers: "Double Joker",
  maximum_joker: "Maximum Joker",
};

function Chips({ currentUser }) {
  const navigate = useNavigate();

  const [chipsData, setChipsData] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = currentUser?.role === "admin";

  async function loadChips() {
    try {
      setLoading(true);
      const data = await apiRequest("/predictions/chips");
      setChipsData(data || []);
    } catch (err) {
      alert(err.message || "Failed to load chips");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChips();
  }, []);

  const sortedUsers = useMemo(() => {
    return [...chipsData].sort((a, b) => {
      if (a.isCurrentUser) return -1;
      if (b.isCurrentUser) return 1;
      return a.fullName.localeCompare(b.fullName);
    });
  }, [chipsData]);

  function getUsedChip(user, chip) {
    return user.usedChips?.find((item) => item.chip === chip);
  }

  function renderChipStatus(user, chip) {
    const usedChip = getUsedChip(user, chip);

    if (usedChip) {
      return (
        <div className="chip-used">
          <strong>Used</strong>
          <span>{usedChip.gameweek}</span>
        </div>
      );
    }

    return <div className="chip-available">Available</div>;
  }

  return (
    <div className="admin-bg-page" style={{ backgroundImage: `url(${bg})` }}>
      <div className="admin-bg-overlay"></div>

      <div className="admin-content">
        <div className="admin-header">
          <div>
            <p className="admin-kicker">{isAdmin ? "Admin Mode" : "User Mode"}</p>
            <h1>Chips</h1>
            <p>See who used chips and what chips are still available.</p>
          </div>

          <button
            className="logout-btn"
            onClick={() => navigate(isAdmin ? "/admin" : "/user")}
          >
            Back
          </button>
        </div>

        {loading ? (
          <div className="admin-card">
            <h3>Loading chips...</h3>
          </div>
        ) : sortedUsers.length === 0 ? (
          <div className="admin-card">
            <h3>No users found</h3>
            <p>No chip data is available yet.</p>
          </div>
        ) : (
          <div className="predictions-card">
            <div className="predictions-table-wrap">
              <table className="predictions-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Used</th>
                    <th>Remaining</th>
                    <th>Triple</th>
                    <th>Double</th>
                    <th>Maximum</th>
                  </tr>
                </thead>

                <tbody>
                  {sortedUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.fullName}</strong>
                        {user.isCurrentUser && (
                          <span className="you-badge"> You</span>
                        )}
                      </td>

                      <td>{user.usedCount}/3</td>
                      <td>{user.remainingCount}/3</td>

                      {CHIP_ORDER.map((chip) => (
                        <td key={chip}>
                          <div className="chip-cell">
                            <span className="chip-name">
                              {CHIP_LABELS[chip]}
                            </span>
                            {renderChipStatus(user, chip)}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chips;