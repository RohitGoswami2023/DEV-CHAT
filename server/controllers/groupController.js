import bcrypt from "bcryptjs";
import Group from "../models/Group.js";
import cloudinary from "../lib/cloudinary.js";
import { generateGroupId } from "../lib/generateGroupId.js";
import { io, userSocketMap } from "../server.js";

/* ================= HELPER: NOTIFY MEMBERS ================= */
const notifyGroupUpdate = (group) => {
  group.members.forEach((memberId) => {
    const socketId = userSocketMap[memberId.toString()];
    if (socketId) {
      io.to(socketId).emit("groupUpdated", group);
    }
  });
};

/* ================= CREATE GROUP ================= */
export const createGroup = async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const groupId = await generateGroupId();

    const group = await Group.create({
      name,
      groupId,
      password: hashedPassword,
      createdBy: req.user._id,
      admins: [req.user._id],
      members: [req.user._id],
    });

    // Notify creator (optional, mainly for multi-device sync)
    notifyGroupUpdate(group);

    res.json({ success: true, group });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= JOIN GROUP ================= */
export const joinGroup = async (req, res) => {
  try {
    const { groupId, password } = req.body;
    const userId = req.user._id.toString();

    const group = await Group.findOne({ groupId });
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.members.map(m => m.toString()).includes(userId)) {
      return res.json({ success: true, group });
    }

    // ✅ DIRECT JOIN
    if (password) {
      const valid = await bcrypt.compare(password, group.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid password", requestSent: true });
      }

      group.members.push(userId);
      await group.save();

      // Populate for frontend
      const populatedGroup = await Group.findById(group._id)
        .populate("members", "fullName profilePic")
        .populate("admins", "fullName profilePic");

      notifyGroupUpdate(populatedGroup); // Update everyone's list

      return res.json({ success: true, group: populatedGroup });
    }

    // 🔔 JOIN REQUEST
    const alreadyRequested = group.joinRequests.some(r => r.user.toString() === userId);
    if (alreadyRequested) return res.status(400).json({ message: "Request already sent" });

    group.joinRequests.push({ user: userId });
    await group.save();

    // Notify Admins
    group.admins.forEach(adminId => {
      const sId = userSocketMap[adminId.toString()];
      if (sId) io.to(sId).emit("newJoinRequest", { groupId: group._id, user: req.user });
    });

    res.json({ success: true, requestSent: true, message: "Request sent" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= PROMOTE TO ADMIN ================= */
export const promoteToAdmin = async (req, res) => {
  try {
    const { groupId, userId } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.admins.includes(req.user._id)) return res.status(403).json({ message: "Admin only" });

    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $addToSet: { admins: userId } },
      { new: true }
    )
    .populate("members", "fullName profilePic")
    .populate("admins", "fullName profilePic");

    notifyGroupUpdate(updatedGroup);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= LEAVE GROUP ================= */
export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.body;
    const userId = req.user._id.toString();

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    let admins = group.admins.map((a) => a.toString());
    let members = group.members.map((m) => m.toString());

    if (!members.includes(userId)) return res.status(403).json({ message: "Not a member" });

    admins = admins.filter((id) => id !== userId);
    members = members.filter((id) => id !== userId);

    if (admins.length === 0 && members.length > 0) {
      admins.push(members[0]);
    }

    const updatedGroup = await Group.findByIdAndUpdate(groupId, { admins, members }, { new: true })
      .populate("members", "fullName profilePic")
      .populate("admins", "fullName profilePic");

    // Notify remaining members
    if (updatedGroup) notifyGroupUpdate(updatedGroup);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= DELETE GROUP ================= */
export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.body;
    const myId = req.user._id.toString();

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const adminIds = group.admins.map((id) => id.toString());
    if (!adminIds.includes(myId)) return res.status(403).json({ message: "Admin only" });

    // Notify all members BEFORE deleting
    group.members.forEach((memberId) => {
      const sId = userSocketMap[memberId.toString()];
      if (sId) io.to(sId).emit("groupDeleted", groupId);
    });

    await group.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= GET MY GROUPS ================= */
export const getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate("members", "fullName profilePic")
      .populate("admins", "fullName profilePic")
      .populate({ path: "joinRequests.user", select: "fullName profilePic" });

    res.json({ success: true, groups });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= UPDATE GROUP INFO ================= */
export const updateGroup = async (req, res) => {
  try {
    const { groupId, name, description, groupIcon } = req.body;
    const userId = req.user._id.toString();

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const adminIds = group.admins.map((id) => id.toString());
    if (!adminIds.includes(userId)) return res.status(403).json({ message: "Admin only" });

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    if (groupIcon) {
      const upload = await cloudinary.uploader.upload(groupIcon, { folder: "group-icons" });
      updateData.groupIcon = upload.secure_url;
    }

    const updatedGroup = await Group.findByIdAndUpdate(groupId, updateData, { new: true, runValidators: false })
      .populate("members", "fullName profilePic")
      .populate("admins", "fullName profilePic");

    notifyGroupUpdate(updatedGroup);

    res.json({ success: true, group: updatedGroup });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= KICK MEMBER ================= */
export const kickMember = async (req, res) => {
  try {
    const { groupId, userId: targetUserId } = req.body;
    const adminId = req.user._id.toString();

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const creatorId = group.createdBy.toString();
    const adminIds = group.admins.map(id => id.toString());
    
    if (!adminIds.includes(adminId)) return res.status(403).json({ message: "Admin only" });
    if (targetUserId === creatorId) return res.status(400).json({ message: "Cannot kick creator" });
    if (targetUserId === adminId) return res.status(400).json({ message: "Cannot kick yourself" });

    group.members = group.members.filter(id => id.toString() !== targetUserId);
    group.admins = group.admins.filter(id => id.toString() !== targetUserId);

    if (group.admins.length === 0) group.admins.push(creatorId);

    await group.save();

    const updatedGroup = await Group.findById(groupId)
        .populate("members", "fullName profilePic")
        .populate("admins", "fullName profilePic");

    // Notify kicked user
    const kickedSocketId = userSocketMap[targetUserId];
    if (kickedSocketId) {
      io.to(kickedSocketId).emit("memberKicked", { groupId, userId: targetUserId });
    }

    // Notify remaining members
    notifyGroupUpdate(updatedGroup);

    res.json({ success: true, message: "Member removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= DEMOTE ADMIN ================= */
export const demoteAdmin = async (req, res) => {
  try {
    const { groupId, userId } = req.body;
    const adminId = req.user._id.toString();

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const adminIds = group.admins.map(id => id.toString());
    if (!adminIds.includes(adminId)) return res.status(403).json({ message: "Admin only" });

    const creatorId = group.createdBy ? group.createdBy.toString() : group.admins[0].toString();
    if (userId === creatorId) return res.status(400).json({ message: "Cannot demote creator" });

    group.admins = group.admins.filter(id => id.toString() !== userId);
    await group.save();

    const updatedGroup = await Group.findById(groupId)
        .populate("members", "fullName profilePic")
        .populate("admins", "fullName profilePic");

    notifyGroupUpdate(updatedGroup);

    res.json({ success: true, message: "Admin demoted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ================= APPROVE JOIN REQUEST ================= */
export const approveJoinRequest = async (req, res) => {
  try {
    const { groupId, userId } = req.body;
    const adminId = req.user._id.toString();

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.admins.map(a => a.toString()).includes(adminId)) return res.status(403).json({ message: "Admin only" });

    const requestExists = group.joinRequests.some(r => r.user.toString() === userId);
    if (!requestExists) return res.status(400).json({ message: "Request not found" });

    group.joinRequests = group.joinRequests.filter(r => r.user.toString() !== userId);
    group.members.push(userId);
    await group.save();

    const updatedGroup = await Group.findById(groupId)
        .populate("members", "fullName profilePic")
        .populate("admins", "fullName profilePic")
        .populate({ path: "joinRequests.user", select: "fullName profilePic" });

    notifyGroupUpdate(updatedGroup);

    // Specifically notify the user who was approved so the group appears in their list
    const userSocket = userSocketMap[userId];
    if (userSocket) {
        io.to(userSocket).emit("groupJoined", updatedGroup);
    }

    res.json({ success: true, message: "User added" });
  } catch(err) {
    res.status(500).json({message: err.message});
  }
};

/* ================= REJECT JOIN REQUEST ================= */
export const rejectJoinRequest = async (req, res) => {
  try {
    const { groupId, userId } = req.body;
    const adminId = req.user._id.toString();

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.admins.map(a => a.toString()).includes(adminId)) return res.status(403).json({ message: "Admin only" });

    group.joinRequests = group.joinRequests.filter(r => r.user.toString() !== userId);
    await group.save();

    // Notify user
    const userSocket = userSocketMap[userId];
    if (userSocket) {
        io.to(userSocket).emit("joinRequestRejected", { groupId, groupName: group.name });
    }

    // Update admins' UI (remove the request from list)
    const updatedGroup = await Group.findById(groupId)
        .populate("members", "fullName profilePic")
        .populate("admins", "fullName profilePic")
        .populate({ path: "joinRequests.user", select: "fullName profilePic" });

    notifyGroupUpdate(updatedGroup);

    res.json({ success: true, message: "Request rejected" });
  } catch(err) {
    res.status(500).json({message: err.message});
  }
};