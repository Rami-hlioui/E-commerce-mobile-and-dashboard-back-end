const mongoose = require("mongoose");
const opts = { toJSON: { virtuals: true } };
const ClientSchema = mongoose.Schema({
  firstname: {
    type: String,
    required: true,
  },
  lastname: {
    type: String,
    required: true,
  },

  age: {
    type: Number,
    required: true,
  },
  sex: {
    type: String,
    required: true,
  },

  adress: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  verified: { type: Boolean, default: false },
  phone: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  order_list: [{ type: mongoose.Types.ObjectId, ref: "Order" }],
}, opts);

const client = mongoose.model("Client", ClientSchema);

module.exports = client;
