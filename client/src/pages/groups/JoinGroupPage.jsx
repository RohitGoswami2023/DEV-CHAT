import React, { useState, useContext } from "react";
import { AuthContext } from "../../../context/AuthContext";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const JoinGroupPage = () => {
  const { axios } = useContext(AuthContext);
  const navigate = useNavigate();

  const [groupId, setGroupId] = useState("");
  const [password, setPassword] = useState("");

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!groupId) {
      return toast.error("Group ID is required");
    }

    try {
      const { data } = await axios.post("/api/groups/join", {
        groupId,
        password: password || undefined, // ✅ IMPORTANT
      });

      if (data.success && !data.requestSent) {
        toast.success("Joined group");
        navigate("/");
      }

      if (data.requestSent) {
        toast.success("Join request sent to admin");
        navigate("/");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white/10">
      <form
        onSubmit={submitHandler}
        className="bg-white/80 p-6 rounded-xl w-96 shadow-lg"
      >
        <h2 className="text-xl font-bold mb-4">Join Group</h2>

        <input
          placeholder="Group ID"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className="w-full mb-3 px-4 py-2 rounded"
        />

        <input
          placeholder="Group Password (optional)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-4 py-2 rounded"
        />

        <button className="w-full bg-blue-500 text-white py-2 rounded font-bold">
          Join Group
        </button>

        <p className="text-xs text-gray-600 mt-3 text-center">
          Leave password empty to request admin approval
        </p>
      </form>
    </div>
  );
};

export default JoinGroupPage;
