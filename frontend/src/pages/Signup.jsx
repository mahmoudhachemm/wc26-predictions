import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import bg from "../assets/bg.jpg";
import { apiRequest } from "../api/api";

function Signup({ setCurrentUser }) {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSignup(e) {
    e.preventDefault();

    try {
      const data = await apiRequest("/auth/signup", {
  method: "POST",
  body: JSON.stringify({
    fullName: `${firstName} ${lastName}`.trim(),
    email,
    password,
  }),
});

const newUser = {
  ...data.user,
  token: data.token,
};

localStorage.setItem("currentUser", JSON.stringify(newUser));
setCurrentUser(newUser);
navigate("/user");
    } catch (err) {
      alert(err.message || "Signup failed");
    }
  }

  return (
    <div className="auth-bg" style={{ backgroundImage: `url(${bg})` }}>
      <div className="auth-overlay"></div>

      <div className="auth-panel signup-panel">
        <h1>Sign up</h1>

        <form onSubmit={handleSignup}>
          <div className="name-row">
            <div>
              <label>First name</label>
              <input
                className="auth-input"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>

            <div>
              <label>Last name</label>
              <input
                className="auth-input"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <label>Email</label>
          <input
            className="auth-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            className="auth-input"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="auth-submit" type="submit">
            Create account
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;