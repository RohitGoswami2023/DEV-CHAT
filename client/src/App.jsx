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

const App = () => {
  const { authUser, isCheckingAuth } = useContext(AuthContext);

  // 🔥 1. SHOW LOADING SCREEN
  // This prevents the app from redirecting an Admin to Login 
  // while it's still fetching their details on page refresh.
  if (isCheckingAuth && !authUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-[url('./src/assets/bgImage.svg')] bg-contain min-h-screen">
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

        {/* 🔥 2. SECURE ADMIN ROUTE */}
        {/* If user is NOT an admin, they get kicked to Home immediately */}
        <Route 
            path="/admin" 
            element={authUser?.isAdmin ? <AdminDashboard /> : <Navigate to="/" />} 
        />

        <Route
          path="/profile"
          element={authUser ? <ProfilePage /> : <Navigate to="/login" />}
        />
        
        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
};

export default App;