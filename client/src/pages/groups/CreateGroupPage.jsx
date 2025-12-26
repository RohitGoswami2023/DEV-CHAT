import React, { useState, useContext } from "react";
import { AuthContext } from "../../../context/AuthContext.jsx";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const CreateGroupPage = () => {
  const { axios } = useContext(AuthContext);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!name || !password) {
      return toast.error("All fields required");
    }

    try {
      const { data } = await axios.post("/api/groups/create", {
        name,
        password, // ✅ backend generates groupId
      });

      if (data.success) {
        toast.success(`Group created!\nGroup ID: ${data.group.groupId}`);
        navigate("/");
      } else {
        toast.error(data.message);
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
        <h2 className="text-xl font-bold mb-4">Create Group</h2>

        <input
          placeholder="Group Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full mb-3 px-4 py-2 rounded"
        />

        <input
          placeholder="Group Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-4 py-2 rounded"
        />

        <button className="w-full bg-green-500 text-white py-2 rounded font-bold">
          Create Group
        </button>

        <p className="text-xs text-gray-600 mt-3 text-center">
          Group ID will be generated automatically
        </p>
      </form>
    </div>
  );
};

export default CreateGroupPage;
