import { useNavigate } from "react-router-dom";
import bg from "../assets/bg.jpg";

function AdminHome({ currentUser, setCurrentUser }) {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("currentUser");
    setCurrentUser(null);
    navigate("/");
  }

  return (
    <div
      className="admin-bg-page"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="admin-bg-overlay"></div>

      <div className="admin-content">
        <div className="admin-header">
          <div>
            <p className="admin-kicker">Admin Mode</p>
            <h1>Admin Panel</h1>
            <p>Welcome, {currentUser.fullName}</p>
          </div>

          <button className="admin-black-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>

        <div className="admin-menu-grid">
          <button
            className="admin-menu-card"
            onClick={() => navigate("/admin/fixtures")}
          >
            <span>01</span>
            <h2>Set Fixtures</h2>
            <p>Add matches manually for each gameweek.</p>
          </button>

          <button
  className="admin-menu-card"
  onClick={() => navigate("/admin/results")}
>
  <span>02</span>
  <h2>Set Results</h2>
  <p>Enter final scores and auto-calculate points.</p>
</button>

          <button
  className="admin-menu-card"
  onClick={() => navigate("/admin/predictions")}
>
  <span>03</span>
  <h2>View Predictions</h2>
  <p>See all user predictions for every match.</p>
</button>

          <button
  className="admin-menu-card"
  onClick={() => navigate("/admin/users")}
>
  <span>04</span>
  <h2>Manage Users</h2>
  <p>Add, delete, or give admin access to users.</p>
</button>

<button
  className="admin-menu-card"
  onClick={() => navigate("/leaderboard")}
>
  <span>05</span>
  <h2>Leaderboard</h2>
  <p>View total points and rankings.</p>
</button>

          <button
  className="admin-menu-card"
  onClick={() => navigate("/admin/cup")}
>
  <span>06</span>
  <h2>Cup Manager</h2>
  <p>Generate random groups and group-stage games.</p>
</button>

<div className="admin-menu-card" onClick={() => navigate("/chips")}>
  <span>07</span>
  <h2>Chips</h2>
  <p>See who used chips and what remains.</p>
</div>
        </div>
      </div>
    </div>
  );
}

export default AdminHome;