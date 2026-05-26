import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import bg from "../assets/bg.jpg";

function Home() {
  return (
    <div className="landing-page" style={{ backgroundImage: `url(${bg})` }}>
      <div className="landing-content">
        <div className="logo-wrap">
          <img src={logo} alt="World Cup Predictions 26 Logo" />
        </div>

        <h1>
          World Cup 26
          <br />
          Predictions
        </h1>

        <p>The path to victory starts here</p>

        <div className="landing-buttons">
          <Link to="/login" className="secondary-button">
            Log In
          </Link>

          <Link to="/signup" className="secondary-button">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Home;