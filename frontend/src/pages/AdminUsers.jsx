import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg.jpg";
import { apiRequest } from "../api/api";

function AdminUsers({ currentUser }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  async function loadUsers() {
    try {
      setLoading(true);
      const data = await apiRequest("/users");
      setUsers(data);
    } catch (err) {
      alert(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function getUserId(user) {
    return user._id || user.id;
  }

  async function handleDeleteUser(user) {
    const userId = getUserId(user);

    if (!userId) {
      alert("User ID not found.");
      return;
    }

    if (user.email === "admin@gmail.com") {
      alert("You cannot delete the main admin.");
      return;
    }

    if (currentUser?.id === userId || currentUser?._id === userId) {
      alert("You cannot delete the account you are currently using.");
      return;
    }

    const confirmed = window.confirm(
      `Delete ${user.fullName || user.email}? This will also delete their predictions.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(userId);

      await apiRequest(`/users/${userId}`, {
        method: "DELETE",
      });

      setUsers((prevUsers) =>
        prevUsers.filter((item) => getUserId(item) !== userId)
      );
    } catch (err) {
      alert(err.message || "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleAdmin(user) {
    const userId = getUserId(user);

    if (!userId) {
      alert("User ID not found.");
      return;
    }

    if (user.email === "admin@gmail.com") {
      alert("You cannot change the main admin role.");
      return;
    }

    const newRole = user.role === "admin" ? "user" : "admin";

    try {
      const updatedUser = await apiRequest(`/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({
          role: newRole,
        }),
      });

      setUsers((prevUsers) =>
        prevUsers.map((item) =>
          getUserId(item) === userId ? updatedUser : item
        )
      );
    } catch (err) {
      alert(err.message || "Failed to update user role");
    }
  }

  return (
    <div className="admin-bg-page" style={{ backgroundImage: `url(${bg})` }}>
      <div className="admin-bg-overlay"></div>

      <div className="admin-content">
        <div className="admin-header">
          <div>
            <p className="admin-kicker">Admin Mode</p>
            <h1>Manage Users</h1>
            <p>Delete users or give admin access.</p>
          </div>

          <button className="admin-black-btn" onClick={() => navigate("/admin")}>
            Back
          </button>
        </div>

        <div className="admin-glass-card users-card full-users-card">
          <div className="section-title-row">
            <div>
              <h2>Users</h2>
              <p>{users.length} user(s)</p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">
              <h3>Loading users...</h3>
            </div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <h3>No users yet</h3>
              <p>Users will appear here after signup.</p>
            </div>
          ) : (
            <div className="users-list">
              {users.map((user) => {
                const userId = getUserId(user);
                const isMainAdmin = user.email === "admin@gmail.com";
                const isCurrentUser =
                  currentUser?.id === userId || currentUser?._id === userId;
                const isDisabled = isMainAdmin || isCurrentUser;

                return (
                  <div className="user-row" key={userId}>
                    <div>
                      <h3>{user.fullName || "No name"}</h3>
                      <p>{user.email}</p>

                      <span className={`role-pill ${user.role}`}>
                        {user.role}
                      </span>

                      {isCurrentUser && (
                        <span className="role-pill admin">Current account</span>
                      )}
                    </div>

                    <div className="user-actions">
                      <button
                        className="admin-submit-btn"
                        disabled={isDisabled}
                        onClick={() => handleToggleAdmin(user)}
                      >
                        {user.role === "admin" ? "Remove Admin" : "Give Admin"}
                      </button>

                      <button
                        className="delete-small-btn"
                        disabled={isDisabled || deletingId === userId}
                        onClick={() => handleDeleteUser(user)}
                      >
                        {deletingId === userId ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="main-admin-note">
            <strong>Main admin:</strong> admin@gmail.com is the main admin account.
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminUsers;