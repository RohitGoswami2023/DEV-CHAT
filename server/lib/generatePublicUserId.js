import User from "../models/User.js";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export const generatePublicUserId = async () => {
  let publicUserId;
  let exists = true;

  while (exists) {
    publicUserId = "";
    for (let i = 0; i < 6; i++) {
      publicUserId += CHARSET.charAt(
        Math.floor(Math.random() * CHARSET.length)
      );
    }

    exists = await User.exists({ publicUserId });
  }

  return publicUserId;
};
