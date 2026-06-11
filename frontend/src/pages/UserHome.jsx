import { useNavigate } from "react-router-dom";
import bg from "../assets/bg.jpg";

function UserHome({ currentUser, setCurrentUser }) {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("currentUser");
    setCurrentUser(null);
    navigate("/");
  }

  return (
    <div className="admin-bg-page" style={{ backgroundImage: `url(${bg})` }}>
      <div className="admin-bg-overlay"></div>

      <div className="admin-content">
        <div className="admin-header">
          <div>
            <p className="admin-kicker">User Mode</p>
            <h1>Hi, {currentUser.fullName}</h1>
            <p>Ready to predict?</p>
          </div>

          <button className="admin-black-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>

        <div className="admin-menu-grid">
          <button
            className="admin-menu-card"
            onClick={() => navigate("/user/matches")}
          >
            <span>01</span>
            <h2>Matches</h2>
            <p>View fixtures and submit predictions.</p>
          </button>

          <button
            className="admin-menu-card"
            onClick={() => navigate("/leaderboard")}
          >
            <span>02</span>
            <h2>Leaderboard</h2>
            <p>See who is winning.</p>
          </button>

          <button
            className="admin-menu-card"
            onClick={() => navigate("/user/predictions")}
          >
            <span>03</span>
            <h2>My Predictions</h2>
            <p>Check your predictions and points.</p>
          </button>

          <button
            className="admin-menu-card"
            onClick={() => navigate("/user/all-predictions")}
          >
            <span>04</span>
            <h2>All Predictions</h2>
            <p>See everyone’s predictions after games are locked.</p>
          </button>

          <button
            className="admin-menu-card"
            onClick={() => navigate("/cup")}
          >
            <span>05</span>
            <h2>Cup</h2>
            <p>View groups, H2H games, and standings.</p>
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserHome;