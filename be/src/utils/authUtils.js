const mongoose = require("mongoose");
const User = require("../models/User");

exports.findUserAndCheckStatus = async (identifier) => {
  // Nếu identifier là id (từ token)
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    user = await User.findById(identifier).select("+password");
  } else {
    // Nếu identifier là email hoặc username (từ login)
    const query = {
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier.toLowerCase() },
      ],
    };
    user = await User.findOne(query).select("+password");
  }

  if (!user) {
    throw new Error("User not found");
  }

  if (user.status !== 1) {
    throw new Error("Your account is inactive. Please contact administrator");
  }

  return user;
};
