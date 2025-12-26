import React, { useContext } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import { Toaster } from "react-hot-toast";
import { AuthContext } from "../context/AuthContext";
import AdminDashboard from "./pages/AdminDashboard";
import CreateGroupPage from "./pages/groups/CreateGroupPage";
import JoinGroupPage from "./pages/groups/JoinGroupPage";

// Matches your file: src/assets/bgIImage.svg
import bgImage from "./assets/bgIImage.svg";

const App = () => {
  const { authUser, isCheckingAuth } = useContext(AuthContext);

  if (isCheckingAuth && !authUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div 
      className="bg-cover bg-center bg-no-repeat bg-fixed min-h-screen" 
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <Toaster />

      <Routes>
        <Route
          path="/create-group"
          element={authUser ? <CreateGroupPage /> : <Navigate to="/login" />}
        />

        <Route
          path="/join-group"
          element={authUser ? <JoinGroupPage /> : <Navigate to="/login" />}
        />

        <Route
          path="/"
          element={authUser ? <HomePage /> : <Navigate to="/login" />}
        />

        <Route
          path="/login"
          element={!authUser ? <LoginPage /> : <Navigate to="/" />}
        />

        <Route 
            path="/admin" 
            element={authUser?.isAdmin ? <AdminDashboard /> : <Navigate to="/" />} 
        />

        <Route
          path="/profile"
          element={authUser ? <ProfilePage /> : <Navigate to="/login" />}
        />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
};

export default App;