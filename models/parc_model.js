const mongoose = require("mongoose");

const ParcSchema = mongoose.Schema({
  adress: String,
  state: String,
  production: {
    amount: Number,
    unit: String,
  },
});

module.exports = mongoose.model("Parc", ParcSchema);
