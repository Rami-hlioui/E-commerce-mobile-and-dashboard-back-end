const mongoose = require("mongoose");

const TokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
  },
});

const RefreshToken = mongoose.model("RefreshToken", TokenSchema);

module.exports = RefreshToken;
