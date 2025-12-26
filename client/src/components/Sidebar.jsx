// components/Sidebar.jsx

import React, { useContext, useState, useEffect } from "react";
import assets from "../assets/assets";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Sidebar = () => {
  const navigate = useNavigate();
  const { logout, onlineUsers = [], authUser, axios } = useContext(AuthContext);

  const {
    groups,
    privateChats,
    chatRequests,
    activeChat,
    fetchMessages,
    sendChatRequest,
    acceptChatRequest,
    rejectChatRequest,
    approveGroupJoinRequest, 
    rejectGroupJoinRequest,  
    unseenMessages = {},
    showRightSidebar,    
    toggleRightSidebar   
  } = useContext(ChatContext);

  const [tab, setTab] = useState("groups"); 
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // --- HELPER: Handle Request Acceptance ---
  const handleAcceptRequest = async (requestId) => {
    await acceptChatRequest(requestId);
    setTab("chats");
  };

  // --- HELPER: Handle Chat Selection ---
  const handleSelectChat = (type, item) => {
    fetchMessages({ type, data: item });
    if (showRightSidebar) {
      toggleRightSidebar();
    }
  };

  // --- SEARCH LOGIC ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (search.trim().length > 0) {
        try {
          const { data } = await axios.get(`/api/search/users?q=${search}`);
          if (data.success) {
            setSearchResults(data.users);
          }
        } catch (error) {
          console.error("Search failed", error);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search, axios]);

  // --- CALCULATE GROUP JOIN REQUESTS ---
  const groupRequests = groups.flatMap(group => {
    const isAdmin = group.admins.some(a => a._id === authUser?._id);
    if (!isAdmin || !group.joinRequests) return [];
    return group.joinRequests.map(req => ({
        ...req,
        groupId: group._id,
        groupName: group.name,
        type: 'group_join' 
    }));
  });

  // --- COUNTS ---
  const totalGroupUnseen = groups.reduce((sum, g) => sum + (unseenMessages[g._id] || 0), 0);
  const totalChatUnseen = privateChats.reduce((sum, c) => sum + (unseenMessages[c._id] || 0), 0);
  const totalRequests = chatRequests.length + groupRequests.length;

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) logout();
  };

  const isFriend = (id) => privateChats.some((u) => u._id === id);
  const popAnimationClass = "transform transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-lg active:scale-95";

  return (
    <div className="h-full w-full lg:w-[340px] bg-white/20 backdrop-blur-xl flex flex-col border-r overflow-hidden">
      
      {/* HEADER */}
      <div className="flex items-center justify-between p-4 border-b">
        <img src={assets.logo} className="w-10" alt="logo" />
        <div className="flex gap-3 items-center">
          
          {/* 🔥 ADMIN BUTTON (Only visible to Admins) 🔥 */}
          {authUser?.isAdmin && (
            <button 
                onClick={() => navigate("/admin")} 
                className="bg-black text-white text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-gray-800 transition shadow-md"
            >
                ADMIN
            </button>
          )}

          <button onClick={() => navigate("/profile")} className="text-sm font-bold hover:underline">Edit Profile</button>
          <button onClick={handleLogout} className="text-sm font-bold text-red-600 hover:underline">Logout</button>
        </div>
      </div>

      {/* GROUP ACTIONS */}
      <div className="flex gap-2 px-3 py-3 border-b">
        <button 
            onClick={() => navigate("/create-group")} 
            className="flex-1 bg-purple-600 text-white text-sm font-bold py-2 rounded-xl hover:bg-purple-700 transition hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
        >
            Create Group
        </button>
        <button 
            onClick={() => navigate("/join-group")} 
            className="flex-1 bg-gray-800 text-white text-sm font-bold py-2 rounded-xl hover:bg-gray-900 transition hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
        >
            Join Group
        </button>
      </div>

      {/* TABS */}
      <div className="flex p-2 gap-1 bg-white/5 mx-2 mt-2 rounded-xl">
        <button
          onClick={() => { setTab("groups"); setSearch(""); }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
            tab === "groups" ? "bg-purple-600 text-white shadow-md scale-105" : "hover:bg-white/10 hover:scale-105 active:scale-95"
          }`}
        >
          Groups
          {totalGroupUnseen > 0 &&  <span className="bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">{totalGroupUnseen}</span>}
        </button>

        <button
          onClick={() => { setTab("chats"); setSearch(""); }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
            tab === "chats" ? "bg-purple-600 text-white shadow-md scale-105" : "hover:bg-white/10 hover:scale-105 active:scale-95"
          }`}
        >
          Chats
          {totalChatUnseen > 0 && <span className="bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">{totalChatUnseen}</span>}
        </button>

        <button
          onClick={() => { setTab("requests"); setSearch(""); }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
            tab === "requests" ? "bg-purple-600 text-white shadow-md scale-105" : "hover:bg-white/10 hover:scale-105 active:scale-95"
          }`}
        >
          Reqs
          {totalRequests > 0 && <span className="bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">{totalRequests}</span>}
        </button>
      </div>

      {/* SEARCH INPUT */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={tab === "requests" ? "Search requests..." : "Search users or groups..."}
        className="mx-3 mt-3 px-4 py-2 rounded-full bg-white/40 outline-none text-sm placeholder:text-gray-600 border border-white/20 focus:border-purple-400 transition-all focus:scale-[1.02] focus:shadow-md"
      />

      {/* LIST CONTENT */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 custom-scrollbar mt-2 pb-20">
        
        {/* === REQUESTS TAB === */}
        {tab === "requests" && (
            <div className="space-y-2">
            
            {/* 1. Personal Chat Requests */}
            {chatRequests.length > 0 && <p className="text-[10px] font-bold opacity-40 uppercase ml-2 mt-2">Friend Requests</p>}
            {chatRequests.map((req) => (
                <div key={req._id} className={`bg-white/10 p-3 rounded-xl flex items-center gap-3 ${popAnimationClass}`}>
                    <img src={req.sender.profilePic || assets.avatar_icon} className="w-10 h-10 rounded-full border border-white/20" alt="" />
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{req.sender.fullName}</p>
                        <p className="text-[10px] opacity-60">@{req.sender.publicUserId}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => handleAcceptRequest(req._id)} className="bg-green-500 hover:bg-green-600 hover:scale-110 active:scale-90 text-white p-1.5 rounded-full transition"><span className="text-xs font-bold">✓</span></button>
                        <button onClick={() => rejectChatRequest(req._id)} className="bg-red-500 hover:bg-red-600 hover:scale-110 active:scale-90 text-white p-1.5 rounded-full transition"><span className="text-xs font-bold">✕</span></button>
                    </div>
                </div>
            ))}

            {/* 2. Group Join Requests */}
            {groupRequests.length > 0 && <p className="text-[10px] font-bold opacity-40 uppercase ml-2 mt-4">Group Join Requests</p>}
            {groupRequests.map((req) => (
                 <div key={`${req.groupId}-${req.user._id}`} className={`bg-white/10 p-3 rounded-xl flex items-center gap-3 border border-purple-500/20 ${popAnimationClass}`}>
                    <img src={req.user.profilePic || assets.avatar_icon} className="w-10 h-10 rounded-full border border-white/20" alt="" />
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{req.user.fullName}</p>
                        <p className="text-[10px] opacity-60">wants to join <span className="font-bold text-purple-300">{req.groupName}</span></p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => approveGroupJoinRequest(req.groupId, req.user._id)} className="bg-green-500 hover:bg-green-600 hover:scale-110 active:scale-90 text-white p-1.5 rounded-full transition"><span className="text-xs font-bold">✓</span></button>
                        <button onClick={() => rejectGroupJoinRequest(req.groupId, req.user._id)} className="bg-red-500 hover:bg-red-600 hover:scale-110 active:scale-90 text-white p-1.5 rounded-full transition"><span className="text-xs font-bold">✕</span></button>
                    </div>
                 </div>
            ))}

            {chatRequests.length === 0 && groupRequests.length === 0 && (
                 <div className="text-center mt-10 opacity-40 text-xs">No pending requests</div>
            )}
            </div>
        )}

        {/* === GROUPS TAB === */}
        {tab === "groups" && (
             (search ? searchResults.filter(i => false) : groups)
             .filter(g => g.name.toLowerCase().includes(search.toLowerCase()))
             .map((group) => {
                const isActive = activeChat?.data?._id === group._id;
                return (
                    <div key={group._id} onClick={() => handleSelectChat("group", group)} 
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${isActive ? "bg-white/40 shadow-sm" : "hover:bg-white/20"} ${popAnimationClass}`}>
                        <img src={group.groupIcon || assets.avatar_icon} className="w-10 h-10 rounded-full border" alt="" />
                        <div className="flex-1">
                            <p className="font-semibold text-sm">{group.name}</p>
                            <p className="text-[10px] opacity-60">{group.members?.length} members</p>
                        </div>
                        {unseenMessages[group._id] > 0 && <span className="bg-green-600 text-white text-[10px] px-1.5 rounded-full">{unseenMessages[group._id]}</span>}
                    </div>
                )
             })
        )}

        {/* === CHATS TAB === */}
        {tab === "chats" && (
            <>
            {(search.trim().length > 0 ? searchResults : privateChats).map((item) => {
                const isMyFriend = isFriend(item._id);
                const isActive = activeChat?.data?._id === item._id;
                
                const handleClick = () => {
                    if (isMyFriend) handleSelectChat("private", item);
                };

                return (
                    <div key={item._id} onClick={handleClick}
                         className={`flex items-center gap-3 p-3 rounded-xl ${isMyFriend ? "cursor-pointer" : "cursor-default"} ${isActive ? "bg-white/40 shadow-sm" : "hover:bg-white/10"} ${isMyFriend ? popAnimationClass : ""}`}>
                        
                        <div className="relative">
                            <img src={item.profilePic || assets.avatar_icon} className="w-10 h-10 rounded-full border border-white/20" alt="" />
                            {isMyFriend && onlineUsers.includes(item._id) && (
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{item.fullName}</p>
                            <p className="text-[10px] opacity-60 truncate">
                                {item.bio || (isMyFriend ? "Available" : "User")}
                            </p>
                        </div>

                        {isMyFriend ? (
                             unseenMessages[item._id] > 0 && (
                                <span className="bg-green-600 text-white text-[10px] px-1.5 rounded-full">{unseenMessages[item._id]}</span>
                             )
                        ) : (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    sendChatRequest(item._id);
                                }}
                                className="bg-blue-600 text-white text-[10px] px-3 py-1.5 rounded-lg hover:bg-blue-700 transition shadow-sm font-bold hover:scale-105 active:scale-95">
                                Add
                            </button>
                        )}
                    </div>
                );
            })}
            
            {search.trim().length > 0 && searchResults.length === 0 && (
                <div className="text-center mt-5 opacity-50 text-xs">No users found</div>
            )}
            </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;