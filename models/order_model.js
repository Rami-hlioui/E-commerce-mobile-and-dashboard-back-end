const mongoose = require("mongoose");

const OrderSchema = mongoose.Schema({
  date: {
    type: Date,
    default: Date.now,
  },
  order: {
    amount: Number,
    unit: String,
    amount_paid: Number,
  },
  customer_id: { type: mongoose.Types.ObjectId, ref: "Client" },
});

const order = mongoose.model("Order", OrderSchema);

module.exports = order;
