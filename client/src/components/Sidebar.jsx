// components/Sidebar.jsx

import React, { useContext, useState, useEffect } from "react";
import assets from "../assets/assets";
import { ChatContext } from "../context/ChatContext";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { CallContext } from "../context/CallContext.jsx";
import toast from "react-hot-toast";
import SecurityCheck from "./SecurityCheck.jsx";
import CallHistory from "./CallHistory.jsx";
import { ShieldCheck, Settings } from "lucide-react";

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
    toggleRightSidebar,
    toggleArchiveChat,
    toggleBlockUser,
    outgoingRequests = [],
    cancelChatRequest,
    fetchPrivateChats,
    reminders = [],
    deleteReminder,
    setActiveChat
  } = useContext(ChatContext);
  const { fetchCallLogs } = useContext(CallContext);

  const [tab, setTab] = useState("groups");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showBell, setShowBell] = useState(false);

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

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this entire chat history for you?")) return;
    try {
      const { data } = await axios.delete(`/api/messages/chat/${chatId}`);
      if (data.success) {
        toast.success("Conversation deleted");
        if (activeChat?.data?._id === chatId) {
          setActiveChat(null);
        }
        await fetchPrivateChats();
      }
    } catch (error) { toast.error("Failed to delete conversation"); }
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
  const unarchivedGroups = groups.filter(g => !authUser?.archivedChats?.includes(g._id));
  const unarchivedChats = privateChats.filter(c => !authUser?.archivedChats?.includes(c._id));

  const archivedGroups = groups.filter(g => authUser?.archivedChats?.includes(g._id));
  const archivedChats = privateChats.filter(c => authUser?.archivedChats?.includes(c._id));

  const totalGroupUnseen = unarchivedGroups.reduce((sum, g) => sum + (unseenMessages[g._id] || 0), 0);
  const totalChatUnseen = unarchivedChats.reduce((sum, c) => sum + (unseenMessages[c._id] || 0), 0);
  const totalArchivedUnseen = archivedGroups.reduce((sum, g) => sum + (unseenMessages[g._id] || 0), 0) +
    archivedChats.reduce((sum, c) => sum + (unseenMessages[c._id] || 0), 0);
  const totalArchivedItems = archivedGroups.length + archivedChats.length;

  const totalRequests = chatRequests.length + groupRequests.length + outgoingRequests.length;

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) logout();
  };

  const isFriend = (id) => privateChats.some((u) => u._id === id);
  const popAnimationClass = "transform transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-lg active:scale-95";

  return (
    <div className="h-full w-full lg:w-[340px] bg-white/20 backdrop-blur-xl flex flex-col border-r overflow-hidden" onClick={() => { setOpenMenuId(null); setShowBell(false); }}>

      {/* HEADER */}
      <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img src={assets.logo} className="w-10 drop-shadow-md" alt="logo" />
          <button 
            onClick={(e) => { e.stopPropagation(); setTab("security"); }}
            title="Settings & Security"
            className={`p-2.5 rounded-xl transition-all shadow-lg ${tab === "security" ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white" : "bg-white/30 hover:bg-white text-indigo-600"}`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-3 items-center">

          {/* 🔥 ADMIN BUTTON (Only visible to Admins) 🔥 */}
          {authUser?.isAdmin && (
            <button
              onClick={(e) => { e.stopPropagation(); navigate("/admin"); }}
              className="bg-black text-white text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-gray-800 transition shadow-md"
            >
              ADMIN
            </button>
          )}

          <button onClick={() => navigate("/profile")} className="text-sm font-bold hover:underline">Edit Profile</button>

          {/* 🔔 GLOBAL REMINDER BELL */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowBell(v => !v); }}
            className="relative text-xl leading-none hover:scale-110 transition-transform"
            title="Upcoming reminders"
          >
            🔔
            {reminders.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow">
                {reminders.length > 9 ? "9+" : reminders.length}
              </span>
            )}
          </button>

          <button onClick={handleLogout} className="text-sm font-bold text-red-600 hover:underline">Logout</button>
        </div>
      </div>

      {/* BELL POPOVER — rendered fixed so overflow-hidden never clips it */}
      {showBell && (
        <>
          <div className="fixed inset-0 z-[400]" onClick={() => setShowBell(false)} />
          <div
            className="fixed top-[64px] right-3 w-96 bg-white text-gray-900 rounded-3xl shadow-2xl border border-gray-200 z-[401] overflow-hidden"
            style={{ animation: "popIn 0.12s ease-out" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-lg">⏰</span>
                <p className="text-xs font-black uppercase tracking-widest text-gray-500">Upcoming Reminders</p>
              </div>
              <button onClick={() => setShowBell(false)} className="text-gray-300 hover:text-gray-600 transition-colors text-xl font-bold leading-none">✕</button>
            </div>

            {reminders.length === 0 ? (
              <div className="px-5 py-10 text-center space-y-2">
                <p className="text-4xl">🔕</p>
                <p className="text-sm font-bold text-gray-400">No upcoming reminders</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                {reminders.map(rem => (
                  <div key={rem._id} className="flex items-start gap-3 px-5 py-4 hover:bg-indigo-50/60 transition-colors group">
                    {/* accent bar */}
                    <div className="flex-shrink-0 w-1 h-full min-h-[36px] bg-indigo-400 rounded-full mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 leading-snug">{rem.text}</p>
                      <p className="text-[11px] text-gray-400 mt-1">🗓 {new Date(rem.scheduledAt).toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => deleteReminder(rem._id)}
                      title="Cancel reminder"
                      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 text-sm font-black transition-all opacity-0 group-hover:opacity-100"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Footer badge */}
            {reminders.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{reminders.length} reminder{reminders.length !== 1 ? "s" : ""} pending</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* TABS */}
      <div className="flex p-1.5 gap-1.5 bg-black/5 mx-3 mt-3 rounded-xl overflow-x-auto hide-scrollbar border border-white/10">
        <button
          onClick={() => { setTab("groups"); setSearch(""); }}
          className={`flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${tab === "groups" ? "bg-indigo-600 text-white shadow-lg scale-100" : "text-gray-600 hover:bg-white/20 active:scale-95"
            }`}
        >
          Groups
          {totalGroupUnseen > 0 && <span className="bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-sm">{totalGroupUnseen}</span>}
        </button>

        <button
          onClick={() => { setTab("chats"); setSearch(""); }}
          className={`flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${tab === "chats" ? "bg-indigo-600 text-white shadow-lg scale-100" : "text-gray-600 hover:bg-white/20 active:scale-95"
            }`}
        >
          Chats
          {totalChatUnseen > 0 && <span className="bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-sm">{totalChatUnseen}</span>}
        </button>

        <button
          onClick={() => { setTab("requests"); setSearch(""); }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${tab === "requests" ? "bg-purple-600 text-white shadow-md scale-105" : "hover:bg-white/10 hover:scale-105 active:scale-95"
            }`}
        >
          Reqs
          {totalRequests > 0 && <span className="bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">{totalRequests}</span>}
        </button>
        <button
          onClick={() => { setTab("archived"); setSearch(""); }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${tab === "archived" ? "bg-purple-600 text-white shadow-md scale-105" : "hover:bg-white/10 hover:scale-105 active:scale-95"
            }`}
        >
          Archive {totalArchivedItems > 0 && `(${totalArchivedItems})`}
          {totalArchivedUnseen > 0 && <span className="bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">{totalArchivedUnseen}</span>}
        </button>

        <button
          onClick={() => { setTab("calls"); setSearch(""); fetchCallLogs(axios); }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${tab === "calls" ? "bg-purple-600 text-white shadow-md scale-105" : "hover:bg-white/10 hover:scale-105 active:scale-95"
            }`}
        >
          Calls
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

        {/* === CALLS TAB === */}
        {tab === "calls" && <CallHistory />}

        {/* === SECURITY TAB === */}
        {tab === "security" && <SecurityCheck />}


        {/* === REQUESTS TAB === */}
        {tab === "requests" && (
          <div className="space-y-4">

            {/* 1. Received Personal Chat Requests */}
            {chatRequests.length > 0 && <p className="text-[10px] font-bold opacity-40 uppercase ml-2 mt-2">Received Friend Requests</p>}
            {chatRequests.map((req) => (
              <div key={req._id} className={`bg-white/10 p-3 rounded-xl flex items-center gap-3 ${popAnimationClass}`}>
                <img src={req.sender?.profilePic || assets.avatar_icon} className="w-10 h-10 rounded-full border border-white/20" alt="" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{req.sender?.fullName || "User"}</p>
                  <p className="text-[10px] opacity-60">@{req.sender?.publicUserId}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAcceptRequest(req._id)} className="bg-green-500 hover:bg-green-600 hover:scale-110 active:scale-90 text-white p-1.5 rounded-full transition"><span className="text-xs font-bold">✓</span></button>
                  <button onClick={() => rejectChatRequest(req._id)} className="bg-red-500 hover:bg-red-600 hover:scale-110 active:scale-90 text-white p-1.5 rounded-full transition"><span className="text-xs font-bold">✕</span></button>
                </div>
              </div>
            ))}

            {/* 2. Sent Personal Chat Requests */}
            {outgoingRequests.length > 0 && <p className="text-[10px] font-bold opacity-40 uppercase ml-2 pt-2 border-t border-white/5">Sent Friend Requests</p>}
            {outgoingRequests.map((req) => (
              <div key={req._id} className={`bg-white/5 p-3 rounded-xl flex items-center gap-3 border border-white/10 ${popAnimationClass}`}>
                <img src={req.receiver?.profilePic || assets.avatar_icon} className="w-10 h-10 rounded-full border border-white/20 opacity-80" alt="" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate opacity-80">{req.receiver?.fullName || "User"}</p>
                  <p className="text-[10px] opacity-40">Pending...</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => cancelChatRequest(req._id)} className="bg-gray-600 hover:bg-red-600 hover:scale-110 active:scale-90 text-white p-1.5 rounded-full transition"><span className="text-[10px] font-bold px-2">Cancel</span></button>
                </div>
              </div>
            ))}

            {/* 3. Group Join Requests */}
            {groupRequests.length > 0 && <p className="text-[10px] font-bold opacity-40 uppercase ml-2 mt-4 border-t border-white/5 pt-2">Group Join Requests</p>}
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

            {chatRequests.length === 0 && outgoingRequests.length === 0 && groupRequests.length === 0 && (
              <div className="text-center mt-10 opacity-40 text-xs font-bold">No pending requests</div>
            )}
          </div>
        )}

        {/* === GROUPS TAB === */}
        {tab === "groups" && (
          <>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => navigate("/create-group")}
                className="flex-1 flex flex-col items-center justify-center p-4 bg-purple-600/10 border border-purple-600/20 rounded-2xl hover:bg-purple-600/20 transition-all group active:scale-95"
              >
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white mb-2 shadow-lg group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-700">Create New</span>
              </button>
              <button
                onClick={() => navigate("/join-group")}
                className="flex-1 flex flex-col items-center justify-center p-4 bg-gray-100/50 border border-gray-200 rounded-2xl hover:bg-gray-100 transition-all group active:scale-95"
              >
                <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-white mb-2 shadow-lg group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-700">Join Group</span>
              </button>
            </div>
            {(search ? searchResults.filter(i => false) : groups)
              .filter(g => !authUser?.archivedChats?.includes(g._id) && g.name.toLowerCase().includes(search.toLowerCase()))
              .map((group) => {
                const isActive = activeChat?.data?._id === group._id;
                return (
                  <div key={group._id} onClick={() => handleSelectChat("group", group)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer group/item relative ${openMenuId === group._id ? "z-50" : "z-0"} ${isActive ? "bg-white/40 shadow-sm" : "hover:bg-white/20"} ${popAnimationClass}`}>
                    <img src={group.groupIcon || assets.avatar_icon} className="w-10 h-10 rounded-full border" alt="" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{group.name}</p>
                      <p className="text-[10px] opacity-60 truncate">{group.members?.length} members</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {unseenMessages[group._id] > 0 && <span className="bg-green-600 text-white text-[10px] px-1.5 rounded-full">{unseenMessages[group._id]}</span>}

                      {/* 3 DOTS MENU */}
                      <div className="relative ml-auto" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenMenuId(openMenuId === group._id ? null : group._id); }} className="text-xl font-bold p-1 hover:bg-black/10 rounded-full opacity-60 hover:opacity-100 transition-opacity flex items-center justify-center w-8 h-8">⋮</button>
                        {openMenuId === group._id && (
                          <div className="absolute top-10 right-0 w-32 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden text-sm font-bold flex flex-col py-1 animate-in fade-in zoom-in-95">
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleArchiveChat(group._id); setOpenMenuId(null); }} className="text-left px-4 py-3 hover:bg-gray-100 text-black transition-colors">
                              Archive
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </>
        )}

        {/* === CHATS TAB === */}
        {tab === "chats" && (
          <>
            {(search.trim().length > 0 ? searchResults : privateChats)
              .filter(item => !authUser?.archivedChats?.includes(item._id))
              .map((item) => {
                const isMyFriend = isFriend(item._id);
                const isActive = activeChat?.data?._id === item._id;

                const handleClick = () => {
                  if (isMyFriend) handleSelectChat("private", item);
                };

                return (
                  <div key={item._id} onClick={handleClick}
                    className={`flex items-center gap-3 p-3 rounded-xl group/item relative ${openMenuId === item._id ? "z-50" : "z-0"} ${isMyFriend ? "cursor-pointer" : "cursor-default"} ${isActive ? "bg-white/40 shadow-sm" : "hover:bg-white/10"} ${isMyFriend ? popAnimationClass : ""}`}>

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
                      <div className="flex items-center gap-2">
                        {unseenMessages[item._id] > 0 && (
                          <span className="bg-green-600 text-white text-[10px] px-1.5 rounded-full">{unseenMessages[item._id]}</span>
                        )}

                        {/* 3 DOTS MENU */}
                        <div className="relative ml-auto" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenMenuId(openMenuId === item._id ? null : item._id); }} className="text-xl font-bold p-1 hover:bg-black/10 rounded-full opacity-60 hover:opacity-100 transition-opacity flex items-center justify-center w-8 h-8">⋮</button>
                          {openMenuId === item._id && (
                            <div className="absolute top-10 right-0 w-32 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden text-sm font-bold flex flex-col py-1 animate-in fade-in zoom-in-95">
                              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleArchiveChat(item._id); setOpenMenuId(null); }} className="text-left px-4 py-3 hover:bg-gray-100 text-black transition-colors">
                                Archive
                              </button>
                              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleBlockUser(item._id); setOpenMenuId(null); }} className="text-left px-4 py-3 hover:bg-gray-100 transition-colors border-t border-gray-100 text-red-600">
                                {authUser?.blockedUsers?.includes(item._id) ? "Unblock" : "Block"}
                              </button>
                              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenMenuId(null); handleDeleteChat(e, item._id); }} className="text-left px-4 py-3 hover:bg-red-50 text-red-600 transition-colors border-t border-gray-100">
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
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

        {/* === ARCHIVED TAB === */}
        {tab === "archived" && (
          <>
            {[...privateChats, ...groups]
              .filter(item => authUser?.archivedChats?.includes(item._id) && (item.fullName || item.name).toLowerCase().includes(search.toLowerCase()))
              .map((item) => {
                const isGroupObj = !!item.name;
                const isActive = activeChat?.data?._id === item._id;

                return (
                  <div key={item._id} onClick={() => handleSelectChat(isGroupObj ? "group" : "private", item)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer group/item relative ${openMenuId === item._id ? "z-50" : "z-0"} ${isActive ? "bg-white/40 shadow-sm" : "hover:bg-white/10"} ${popAnimationClass}`}>

                    <div className="relative">
                      <img src={item.profilePic || item.groupIcon || assets.avatar_icon} className="w-10 h-10 rounded-full border border-white/20" alt="" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.fullName || item.name}</p>
                      <p className="text-[10px] opacity-60 truncate">
                        {isGroupObj ? `${item.members?.length || 0} members` : (item.bio || "Available")}
                      </p>
                    </div>

                    {/* 3 DOTS MENU */}
                    <div className="relative ml-auto flex items-center gap-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenMenuId(openMenuId === item._id ? null : item._id); }} className="text-xl font-bold p-1 hover:bg-black/10 rounded-full opacity-60 hover:opacity-100 transition-opacity flex items-center justify-center w-8 h-8">⋮</button>
                      {openMenuId === item._id && (
                        <div className="absolute top-10 right-0 w-32 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden text-sm font-bold flex flex-col py-1 animate-in fade-in zoom-in-95">
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleArchiveChat(item._id); setOpenMenuId(null); }} className="text-left px-4 py-3 hover:bg-gray-100 text-black transition-colors">
                            Unarchive
                          </button>
                          {!isGroupObj && (
                            <>
                              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleBlockUser(item._id); setOpenMenuId(null); }} className="text-left px-4 py-3 hover:bg-gray-100 transition-colors border-t border-gray-100 text-red-600">
                                {authUser?.blockedUsers?.includes(item._id) ? "Unblock" : "Block"}
                              </button>
                              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenMenuId(null); handleDeleteChat(e, item._id); }} className="text-left px-4 py-3 hover:bg-red-50 text-red-600 transition-colors border-t border-gray-100">
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

            {(!authUser?.archivedChats || authUser.archivedChats.length === 0) && (
              <div className="text-center mt-5 opacity-50 text-xs">No archived chats</div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
