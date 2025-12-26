import Group from "../models/Group.js";

export const generateGroupId = async () => {
  let unique = false;
  let groupId;

  while (!unique) {
    // 6 digit numeric ID
    groupId = Math.floor(100000 + Math.random() * 900000).toString();

    const exists = await Group.findOne({ groupId });
    if (!exists) unique = true;
  }

  return groupId;
};
