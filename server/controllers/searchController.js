// server/controllers/searchController.js
import User from "../models/User.js"; //

export const globalUserSearch = async (req, res) => {
  try {
    const { q } = req.query; //
    const myId = req.user._id; //

    if (!q) return res.json({ success: true, users: [] }); //

    const users = await User.find({
      isSearchable: true,             //
      _id: { $ne: myId },            //
      blockedUsers: { $ne: myId },    //
      $or: [
        { publicUserId: q },          //
        { fullName: { $regex: q, $options: "i" } }, //
      ],
    })
    .select("fullName profilePic publicUserId bio allowChatRequests") //
    .limit(10); //

    res.json({ success: true, users }); //
  } catch (error) {
    // This catch block is likely where the 500 error is originating
    res.status(500).json({ success: false, message: error.message }); //
  }
};