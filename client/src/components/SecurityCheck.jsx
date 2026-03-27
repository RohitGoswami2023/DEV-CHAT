import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { 
  Globe, 
  MessageSquare, 
  UserMinus, 
  Lock,
  UserX,
  Loader2,
  Clock,
  Navigation
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

const SecurityCheck = () => {
  const { authUser, axios, setAuthUser } = useContext(AuthContext);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    setLoadingBlocked(true);
    try {
      const { data } = await axios.get("/api/auth/blocked-users");
      if (data.success) {
        setBlockedUsers(data.blockedUsers);
      }
    } catch (error) {
      console.error("Failed to fetch blocked users");
    } finally {
      setLoadingBlocked(false);
    }
  };

  const handleTogglePrivacy = async (field, value) => {
    setUpdating(true);
    try {
      const updatedPrivacy = {
        isSearchable: field === "isSearchable" ? value : authUser.isSearchable,
        allowChatRequests: field === "allowChatRequests" ? value : authUser.allowChatRequests
      };

      const { data } = await axios.put("/api/auth/update-privacy", updatedPrivacy);
      if (data.success) {
        setAuthUser(data.user);
        toast.success("Privacy settings updated");
      }
    } catch (error) {
      toast.error("Failed to update privacy");
    } finally {
      setUpdating(false);
    }
  };

  const handleUnblock = async (targetId) => {
    try {
      const { data } = await axios.post("/api/auth/block-toggle", { targetUserId: targetId });
      if (data.success) {
        toast.success("User unblocked");
        setBlockedUsers(prev => prev.filter(u => u._id !== targetId));
        setAuthUser(prev => ({
          ...prev,
          blockedUsers: prev.blockedUsers.filter(id => id !== targetId)
        }));
      }
    } catch (error) {
      toast.error("Failed to unblock user");
    }
  };

  if (!authUser) return null;

  const authStatus = authUser.authProvider === "google" ? "Google Protected" : "Email Verified";
  const mapLink = authUser.lastLoginCoords 
    ? `https://www.google.com/maps?q=${authUser.lastLoginCoords.lat},${authUser.lastLoginCoords.lng}`
    : null;

  return (
    <div className="flex-1 flex flex-col p-4 animate-in fade-in duration-500 overflow-y-auto max-h-full custom-scrollbar">
      
      <div className="mb-6">
        <h2 className="text-xl font-black text-gray-900 mb-1">Settings & Privacy</h2>
        <p className="text-xs text-gray-500 font-medium">Account status and session activity.</p>
      </div>

      {/* SESSION & AUTH INFO */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2rem] p-6 pb-16 text-white mb-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Lock className="w-20 h-20" />
        </div>
        
        <div className="space-y-4 relative z-10">
            {/* AUTH STATUS */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                    <Lock className="w-4 h-4" />
                </div>
                <div>
                    <p className="text-[10px] uppercase font-bold opacity-60">Account Security</p>
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-bold">{authStatus}</p>
                        {authUser.authProvider === "google" && <span className="text-[8px] bg-white/20 px-1.5 py-0.5 rounded-full">G-Auth</span>}
                    </div>
                </div>
            </div>

          {/* TIME */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase font-bold opacity-60">Last Login Time</p>
              <p className="text-sm font-bold truncate leading-tight">{authUser.lastLoginTime ? format(new Date(authUser.lastLoginTime), "MMM d, yyyy • h:mm a") : "Active Session"}</p>
            </div>
          </div>
          {/* Spacer to prevent clipping by large rounded corners */}
          <div className="h-2"></div>
        </div>
      </div>

      {/* PRIVACY TOGGLES */}
      <div className="space-y-3 mb-8">
        <div className="bg-white/40 backdrop-blur-md border border-white/20 p-4 rounded-3xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Global Search</h3>
              <p className="text-[10px] text-gray-500">Enable profile search via public ID</p>
            </div>
          </div>
          <button 
            disabled={updating}
            onClick={() => handleTogglePrivacy("isSearchable", !authUser.isSearchable)}
            className={`w-12 h-6 rounded-full transition-all relative ${authUser.isSearchable ? 'bg-purple-600' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${authUser.isSearchable ? 'right-1' : 'left-1'}`} />
          </button>
        </div>

        <div className="bg-white/40 backdrop-blur-md border border-white/20 p-4 rounded-3xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Chat Requests</h3>
              <p className="text-[10px] text-gray-500">Allow messages from unknown users</p>
            </div>
          </div>
          <button 
            disabled={updating}
            onClick={() => handleTogglePrivacy("allowChatRequests", !authUser.allowChatRequests)}
            className={`w-12 h-6 rounded-full transition-all relative ${authUser.allowChatRequests ? 'bg-purple-600' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${authUser.allowChatRequests ? 'right-1' : 'left-1'}`} />
          </button>
        </div>
      </div>

      {/* BLOCKED USERS SECTION */}
      <div className="flex-1 min-h-0 flex flex-col mb-4">
        <div className="flex justify-between items-center mb-4 px-2">
          <h3 className="font-black text-xs uppercase tracking-[0.2em] text-gray-400">Blocked Users</h3>
          <span className="text-[10px] font-bold bg-gray-100 px-2 py-0.5 rounded-full">{blockedUsers.length}</span>
        </div>

        <div className="space-y-2">
          {loadingBlocked ? (
            <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-purple-600" /></div>
          ) : blockedUsers.length > 0 ? (
            blockedUsers.map((user) => (
              <div key={user._id} className="bg-white/60 backdrop-blur-sm border border-white/40 p-3 rounded-2xl flex items-center justify-between group">
                <div className="flex items-center gap-3 text-left">
                  <img src={user.profilePic || "/avatar.png"} className="w-8 h-8 rounded-full border border-gray-200" alt="" />
                  <div>
                    <p className="text-sm font-bold text-gray-900">{user.fullName}</p>
                    <p className="text-[10px] text-gray-500">@{user.publicUserId}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleUnblock(user._id)}
                  className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center opacity-30">
              <UserX className="w-8 h-8 mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest">No users blocked</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecurityCheck;
