import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import bg from "../assets/bg.jpg";
import { apiRequest } from "../api/api";

function Login({ setCurrentUser }) {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const loggedInUser = {
        ...data.user,
        token: data.token,
      };

      localStorage.setItem("currentUser", JSON.stringify(loggedInUser));
      setCurrentUser(loggedInUser);

      if (loggedInUser.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/user");
      }
    } catch (err) {
      setError(err.message || "Wrong email or password");
    }
  }

  return (
    <div className="auth-bg" style={{ backgroundImage: `url(${bg})` }}>
      <div className="auth-overlay"></div>

      <div className="auth-panel">
        <h1>Log in</h1>

        <form onSubmit={handleLogin}>
          <label>Email</label>
          <input
            className="auth-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            required
          />

          <label>Password</label>
          <input
            className="auth-input"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            required
          />

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-submit" type="submit">
            Log in
          </button>
        </form>

        <p className="auth-switch">
          New to WC26? <Link to="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;