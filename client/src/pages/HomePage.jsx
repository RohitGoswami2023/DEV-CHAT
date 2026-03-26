import React, { useContext } from "react";
import Sidebar from "../components/Sidebar";
import ChatContainer from "../components/ChatContainer";
import RightSidebar from "../components/RightSidebar";
import { ChatContext } from "../context/ChatContext";
import { AuthContext } from "../context/AuthContext";
import { useSwipe } from "../hooks/useSwipe";
import { BellRing, X } from "lucide-react";

const HomePage = () => {
  const { activeChat, setActiveChat, showRightSidebar, toggleRightSidebar } = useContext(ChatContext);
  const { notificationPermission, requestPermission } = useContext(AuthContext);
  const [showBanner, setShowBanner] = React.useState(notificationPermission !== "granted");

  const swipeHandlers = useSwipe({
    onSwipeRight: () => {
      if (window.innerWidth >= 1024) return;
      if (showRightSidebar) {
        toggleRightSidebar();
      } else if (activeChat) {
        setActiveChat(null);
      }
    },
    onSwipeLeft: () => {
      if (window.innerWidth >= 1024) return;
      if (activeChat && !showRightSidebar) {
        toggleRightSidebar();
      }
    }
  });

  return (
    <div className="w-full h-screen overflow-hidden relative flex flex-col" {...swipeHandlers}>
       {/* Notification Permission Banner */}
       {showBanner && notificationPermission !== "granted" && (
        <div className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 flex items-center justify-between shadow-lg z-[100] animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <BellRing size={18} className="animate-bounce" />
            </div>
            <div>
              <p className="text-sm font-bold">Enable Notifications</p>
              <p className="text-[10px] opacity-90 font-medium">Get real-time alerts for calls and messages when the app is minimized.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { requestPermission(); setShowBanner(false); }}
              className="bg-white text-purple-700 px-4 py-1.5 rounded-full text-xs font-black hover:bg-gray-100 transition-all shadow-md active:scale-95"
            >
              PERMIT
            </button>
            <button onClick={() => setShowBanner(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div
        className={`flex-1 transition-all duration-300
        /* MOBILE: Default to block (stacking) */
        block
        /* DESKTOP: Switch to Grid */
        lg:grid
        ${
          activeChat
            ? showRightSidebar
              ? "lg:grid-cols-[340px_1fr_400px]"
              : "lg:grid-cols-[340px_1fr]"
            : "lg:grid-cols-[340px_1fr]"
        }`}
      >
        {/* LEFT SIDEBAR */}
        {/* Mobile: Hide if chat is active. Desktop: Always show. */}
        <div 
          className={`h-full overflow-hidden ${
            activeChat ? "hidden lg:block" : "w-full"
          }`}
        >
          <Sidebar />
        </div>

        {/* CHAT */}
        {/* Mobile: Hide if NO chat is active. Desktop: Always show. */}
        <div 
          className={`h-full overflow-hidden ${
            !activeChat ? "hidden lg:block" : "w-full"
          }`}
        >
          <ChatContainer />
        </div>

        {/* RIGHT SIDEBAR */}
        {activeChat && showRightSidebar && (
          <div 
            className={`h-full overflow-hidden 
            /* Mobile: Full screen overlay */
            fixed inset-0 z-50 bg-white
            /* Desktop: Static grid item, transparent background */
            lg:static lg:bg-transparent lg:z-auto`}
          >
            <RightSidebar />
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
