import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import assets from "../assets/assets";
import { AuthContext } from "../../context/AuthContext";
import { ChatContext } from "../../context/ChatContext";
import DeleteAccountSection from "./DeleteAccountSection";
import toast from "react-hot-toast";

const ProfilePage = () => {
  const { authUser, updateProfile, axios } = useContext(AuthContext);
  const { blockedUsers, toggleBlockUser } = useContext(ChatContext); 
  const navigate = useNavigate();

  const [selectedImg, setSelectedImg] = useState(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [isSearchable, setIsSearchable] = useState(true);

  // Sync state with authUser
  useEffect(() => {
    if (authUser) {
      setName(authUser.fullName || "");
      setBio(authUser.bio || "");
      setIsSearchable(authUser.isSearchable ?? true);
    }
  }, [authUser]);

  // Handle Privacy Toggle
  const handlePrivacyUpdate = async (val) => {
    try {
      const { data } = await axios.put("/api/auth/update-privacy", { isSearchable: val });
      if (data.success) {
        setIsSearchable(data.user.isSearchable);
        toast.success(val ? "You are now discoverable" : "Global search disabled");
      }
    } catch (error) {
      toast.error("Failed to update privacy settings");
    }
  };

  const copyUserId = () => {
    if (authUser?.publicUserId) {
      navigator.clipboard.writeText(authUser.publicUserId);
      toast.success("User ID copied to clipboard!");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!selectedImg) {
        await updateProfile({ fullName: name, bio });
        navigate("/");
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(selectedImg);
      reader.onloadend = async () => {
        await updateProfile({
          profilePic: reader.result,
          fullName: name,
          bio,
        });
        navigate("/");
      };
    } catch (error) {
      console.error("Profile update failed:", error);
    }
  };

  if (!authUser) return null;

  return (
    <div className="min-h-screen bg-[url('./src/assets/bgImage.svg')] bg-cover bg-center flex flex-col items-center gap-6 md:gap-10 py-6 md:py-10 px-4 text-slate-900 relative">

      {/* === MOBILE HOME BUTTON === */}
      <button 
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 z-50 md:hidden flex items-center gap-2 bg-white/30 backdrop-blur-md border border-white/40 px-4 py-2 rounded-full shadow-lg active:scale-95 transition-all"
      >
        <span className="font-black text-lg">←</span>
        <span className="text-xs font-bold uppercase tracking-wider">Home</span>
      </button>

      {/* ================= PROFILE CARD ================= */}
      <div className="w-full max-w-4xl bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden mt-10 md:mt-0">
        
        {/* LEFT: EDIT FORM */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6 md:p-10 flex-1 font-semibold border-b md:border-b-0 md:border-r border-white/10">
          <h2 className="text-2xl font-black mb-2 uppercase tracking-tight">Profile Details</h2>

          {/* PRIVACY TOGGLE */}
          <div className="bg-white/30 p-4 rounded-2xl border border-white/20 flex justify-between items-center mb-2">
            <div>
              <p className="text-sm font-bold">Global Search</p>
              <p className="text-[10px] opacity-60 uppercase font-bold tracking-tight">Allow others to find you</p>
            </div>
            <button 
              type="button"
              onClick={() => handlePrivacyUpdate(!isSearchable)}
              className={`w-12 h-6 rounded-full transition-all relative ${isSearchable ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gray-400'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${isSearchable ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* USER ID */}
          <div className="bg-black/10 p-4 rounded-2xl border border-white/20 flex justify-between items-center group">
            <div className="overflow-hidden mr-2">
              <p className="text-[10px] font-bold uppercase opacity-50 mb-1">Your Unique User ID</p>
              <p className="font-mono text-sm font-bold tracking-widest truncate">{authUser.publicUserId}</p>
            </div>
            <button 
              type="button"
              onClick={copyUserId}
              className="bg-slate-900 text-white text-[10px] font-bold uppercase px-4 py-2 rounded-xl hover:bg-slate-800 active:scale-95 transition-all shadow-lg whitespace-nowrap"
            >
              Copy
            </button>
          </div>

          <label htmlFor="avatar" className="flex items-center gap-4 cursor-pointer bg-white/30 p-4 rounded-2xl border border-white/20 hover:bg-white/40 transition-all">
            <input
              type="file"
              id="avatar"
              accept=".png,.jpg,.jpeg"
              hidden
              onChange={(e) => setSelectedImg(e.target.files[0])}
            />
            <img
              src={
                selectedImg
                  ? URL.createObjectURL(selectedImg)
                  : authUser.profilePic || assets.avatar_icon
              }
              className="w-14 h-14 rounded-full border-2 border-white object-cover shadow-md"
            />
            <span className="text-sm font-bold">Update Profile Picture</span>
          </label>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase opacity-60 ml-1">Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border border-white/40 rounded-xl bg-white/20 focus:bg-white/40 outline-none transition-all placeholder-slate-700"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase opacity-60 ml-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full p-3 border border-white/40 rounded-xl bg-white/20 focus:bg-white/40 outline-none resize-none transition-all"
              required
            />
          </div>

          <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-2xl shadow-xl active:scale-95 transition-all mt-2">
            Save Changes
          </button>
        </form>

        {/* RIGHT: BLOCKED USERS */}
        <div className="w-full md:w-80 flex flex-col bg-black/5">
          <div className="p-8 flex flex-col items-center border-b border-white/10">
             <img
              src={
                selectedImg
                  ? URL.createObjectURL(selectedImg)
                  : authUser.profilePic || assets.logo_icon
              }
              className="w-32 h-32 rounded-full border-4 border-white/50 object-cover shadow-xl"
            />
            <h3 className="mt-4 font-black text-lg truncate w-full text-center tracking-tight">{name}</h3>
          </div>

          <div className="p-8 flex-1 flex flex-col overflow-hidden min-h-[300px] md:min-h-0">
            <h3 className="text-xs font-black mb-4 uppercase tracking-widest flex items-center gap-2 opacity-70">
              Blocked Users
              <span className="bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded-full">
                {blockedUsers?.length || 0}
              </span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {blockedUsers && blockedUsers.length > 0 ? (
                blockedUsers.map((user) => (
                  <div key={user._id} className="flex items-center justify-between bg-white/30 p-2 rounded-xl border border-white/20 backdrop-blur-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <img src={user.profilePic || assets.avatar_icon} className="w-10 h-10 rounded-full object-cover border border-white flex-shrink-0" />
                      <div className="overflow-hidden min-w-0">
                        <p className="text-xs font-black truncate leading-tight">{user.fullName}</p>
                        <p className="text-[10px] font-mono opacity-50 truncate">@{user.publicUserId}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => toggleBlockUser(user._id)} 
                      className="text-[9px] font-bold text-red-600 hover:bg-red-600 hover:text-white border border-red-200 bg-white/50 px-2 py-1.5 rounded-lg transition-all flex-shrink-0 ml-2"
                    >
                      Unblock
                    </button>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-30 mt-10">
                  <p className="text-xs font-bold uppercase tracking-widest">Clear List</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= DELETE SECTION ================= */}
      <div className="w-full md:w-5/6 max-w-4xl">
        <DeleteAccountSection />
      </div>
    </div>
  );
};

export default ProfilePage;