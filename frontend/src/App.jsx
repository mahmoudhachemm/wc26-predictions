import { Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import UserHome from "./pages/UserHome";
import AdminHome from "./pages/AdminHome";
import AdminFixtures from "./pages/AdminFixtures";
import AdminResults from "./pages/AdminResults";
import UserMatches from "./pages/UserMatches";
import AdminPredictions from "./pages/AdminPredictions";
import AdminUsers from "./pages/AdminUsers";
import Leaderboard from "./pages/Leaderboard";
import MyPredictions from "./pages/MyPredictions";
import PublicPredictions from "./pages/PublicPredictions";

function getSavedUser() {
  try {
    const savedUser = localStorage.getItem("currentUser");
    return savedUser ? JSON.parse(savedUser) : null;
  } catch {
    localStorage.removeItem("currentUser");
    return null;
  }
}

function RedirectLoggedUser({ currentUser }) {
  if (!currentUser) return <Home />;

  if (currentUser.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/user" replace />;
}

function App() {
  const [currentUser, setCurrentUser] = useState(getSavedUser);

  return (
    <Routes>
      <Route path="/" element={<RedirectLoggedUser currentUser={currentUser} />} />

      <Route
        path="/login"
        element={
          currentUser ? (
            currentUser.role === "admin" ? (
              <Navigate to="/admin" replace />
            ) : (
              <Navigate to="/user" replace />
            )
          ) : (
            <Login setCurrentUser={setCurrentUser} />
          )
        }
      />

      <Route
        path="/signup"
        element={
          currentUser ? (
            currentUser.role === "admin" ? (
              <Navigate to="/admin" replace />
            ) : (
              <Navigate to="/user" replace />
            )
          ) : (
            <Signup setCurrentUser={setCurrentUser} />
          )
        }
      />

      <Route
        path="/user"
        element={
          currentUser?.role === "user" ? (
            <UserHome currentUser={currentUser} setCurrentUser={setCurrentUser} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/admin"
        element={
          currentUser?.role === "admin" ? (
            <AdminHome currentUser={currentUser} setCurrentUser={setCurrentUser} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/admin/fixtures"
        element={
          currentUser?.role === "admin" ? (
            <AdminFixtures />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/admin/results"
        element={
          currentUser?.role === "admin" ? (
            <AdminResults />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/admin/predictions"
        element={
          currentUser?.role === "admin" ? (
            <AdminPredictions />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/admin/users"
        element={
          currentUser?.role === "admin" ? (
            <AdminUsers />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/user/matches"
        element={
          currentUser?.role === "user" ? (
            <UserMatches currentUser={currentUser} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/user/predictions"
        element={
          currentUser?.role === "user" ? (
            <MyPredictions currentUser={currentUser} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/user/all-predictions"
        element={
          currentUser?.role === "user" ? (
            <PublicPredictions currentUser={currentUser} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/leaderboard"
        element={
          currentUser ? (
            <Leaderboard currentUser={currentUser} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export default App;