const User = require("../models/User");

exports.findUserAndCheckStatus = async (identifier) => {
  const query = {
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier.toLowerCase() },
    ],
  };

  const user = await User.findOne(query).select("+password");

  if (!user) {
    throw new Error("Invalid credentials");
  }

  if (user.status !== 1) {
    throw new Error("Your account is inactive. Please contact administrator");
  }

  return user;
};
