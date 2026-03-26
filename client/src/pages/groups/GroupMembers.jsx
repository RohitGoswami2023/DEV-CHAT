import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import toast from "react-hot-toast";

const GroupMembers = ({ group }) => {
  const { authUser, axios } = useContext(AuthContext);

  const isAdmin = group.admins.includes(authUser._id);

  const promote = async (userId) => {
    await axios.post("/api/groups/promote", {
      groupId: group._id,
      userId,
    });
    toast.success("Promoted");
    window.location.reload();
  };

  const leave = async () => {
    await axios.post("/api/groups/leave", { groupId: group._id });
    toast.success("Left group");
    window.location.reload();
  };

  const removeGroup = async () => {
    if (!window.confirm("Delete group permanently?")) return;
    await axios.post("/api/groups/delete", { groupId: group._id });
    toast.success("Group deleted");
    window.location.reload();
  };

  return (
    <>
      <h3>Members</h3>
      {group.members.map((m) => (
        <div key={m._id}>
          {m.fullName}
          {group.admins.includes(m._id) && " (Admin)"}
          {isAdmin && !group.admins.includes(m._id) && (
            <button onClick={() => promote(m._id)}>Make Admin</button>
          )}
        </div>
      ))}

      <button onClick={leave}>Leave Group</button>
      {isAdmin && <button onClick={removeGroup}>Delete Group</button>}
    </>
  );
};

export default GroupMembers;
