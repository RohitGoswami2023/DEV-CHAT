import React, { useContext, useState } from "react";
import { Navigate, Route, Routes, useNavigate, useLocation } from "react-router-dom";
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
  const navigate = useNavigate();
  const location = useLocation();

  // --- GLOBAL SWIPE BACK GESTURE FOR MOBILE ---
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 60;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchMove = (e) => setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    
    // Ensure gesture is mostly horizontal (not a scroll)
    if (Math.abs(distanceX) > Math.abs(distanceY) && Math.abs(distanceX) > minSwipeDistance) {
      const isRightSwipe = distanceX < -minSwipeDistance;
      
      // Phone back gesture logic
      if (isRightSwipe && window.innerWidth < 1024) {
         if (location.pathname !== "/" && location.pathname !== "/login") {
            navigate(-1);
         }
      }
    }
  };

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
      style={{ backgroundImage: "url('/bgImage.svg')" }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEndHandler}
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