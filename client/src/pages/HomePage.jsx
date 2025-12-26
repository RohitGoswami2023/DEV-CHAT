import React, { useContext } from "react";
import Sidebar from "../components/Sidebar";
import ChatContainer from "../components/ChatContainer";
import RightSidebar from "../components/RightSidebar";
import { ChatContext } from "../../context/ChatContext";

const HomePage = () => {
  const { activeChat, showRightSidebar } = useContext(ChatContext);

  return (
    <div className="w-full h-screen overflow-hidden relative">
      <div
        className={`h-full transition-all duration-300
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