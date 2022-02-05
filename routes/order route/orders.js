const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Order = require("../../models/order_model");
const Client = require("../../models/client_model");
const verify = require("../auth_route/verifyToken");

////sendgrid for emails
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.API_KEY);
const receipt = require("./receipt_template");
/////register an order/////
router.post("/", async (req, res) => {
  const order = new Order({
    customer_id: req.body.customer_id,
    order: {
      amount: req.body.order.amount,
      unit: req.body.order.unit,
      amount_paid: req.body.order.amount_paid,
    },
  });
  /////after regestring an order , link it to the customer and append it to the client's orders array
  mongoose.set("useFindAndModify", false);

  try {
    const savedOrder = await order.save(); ///save the order
    ///Updating the customer's order list
    const client = await Client.findByIdAndUpdate(req.body.customer_id, {
      $push: { order_list: order._id },
    });

    const message = {
      to: client.email,
      from: process.env.GOOGLE_USER,
      subject: "Receipt",
      text: `Dear ${client.firstname} you've purchased ${savedOrder.order.amount} for ${savedOrder.order.amount_paid} on ${savedOrder.date}`,
      html: receipt(
        savedOrder.date.toLocaleString(),
        savedOrder.order.amount,
        savedOrder.order.unit,
        savedOrder.order.amount_paid
      ),
    };
    sgMail.send(message);
    res.json(savedOrder);
  } catch (err) {
    res.json({ message: err });
  }
});

//////get all the orders//////
router.get("/", verify, async (req, res) => {
  try {
    const orders = await Order.find().populate(
      "customer_id",
      "firstname lastname email phone"
    );
    console.log(orders);
    res.json(orders);
  } catch (err) {
    res.json({ message: err });
  }
});

/////get orders related to a certain client////
router.get("/:clientId", async (req, res) => {
  try {
    const orders = await Order.find({
      customer_id: req.params.clientId,
    }).populate("customer_id", "firstname lastname email phone");

    //console.log(orders);

    res.json(orders);
  } catch (err) {
    res.json({ message: err });
    console.log(err);
  }
});

module.exports = router;
