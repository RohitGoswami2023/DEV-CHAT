import React, { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import toast from "react-hot-toast";

const DeleteAccountSection = () => {
  const { axios, logout } = useContext(AuthContext);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (confirmation.toLowerCase() !== "yes i am sure") {
      return toast.error('Please type "yes i am sure" to confirm');
    }

    setLoading(true);
    try {
      const { data } = await axios.delete("/api/auth/delete-account", {
        data: { confirmation },
      });

      if (data.success) {
        toast.success(data.message);
        logout(false);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-3xl p-10 shadow-xl">
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-red-700 uppercase tracking-tighter">Danger Zone</h2>
          <p className="text-sm font-bold text-slate-900 opacity-80">
            Deleting your account is permanent and cannot be undone. All your messages and data will be wiped.
          </p>
        </div>

        <div className="bg-white/20 p-6 rounded-2xl border border-red-500/10 space-y-4">
          <label className="text-xs font-black uppercase text-slate-900 opacity-70 ml-1">
            Type <span className="text-red-700">"yes i am sure"</span> to proceed
          </label>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="Confirmation text..."
              className="flex-1 p-4 rounded-xl border border-red-500/20 bg-white/30 focus:bg-white/50 outline-none text-slate-900 font-bold placeholder-slate-500 transition-all"
            />
            <button
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white font-black px-8 py-4 rounded-xl shadow-lg active:scale-95 disabled:opacity-50 transition-all uppercase text-sm tracking-widest"
            >
              {loading ? "Deleting..." : "Delete Account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountSection;