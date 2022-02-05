const express = require("express");
const client = require("../../models/client_model");
const router = express.Router();
const Client = require("../../models/client_model");
const Order = require("../../models/order_model");
const Parc = require("../../models/parc_model");

router.get("/", async (req, res) => {
  var STAT = []; //////array to store data and send it to the front end
  try {
    /////get all the clients' data from the database
    const clients = await Client.find()
      .populate("order_list", "-customer_id")
      .exec();

    /////get all the parcs' data from the database
    const parcs = await Parc.find();

    /////get all orders' data from the database
    const orders = await Order.find().populate(
      "customer_id",
      "firstname lastname email phone"
    );

    /////average cosumption over all cusstomers
    var i, j;
    consumption = 0;
    for (i = 0; i < orders.length - 1; i++) {
      consumption += orders[i].order.amount;
    }
    average_consumption = consumption / orders.length;
    console.log(average_consumption);

    /////average consumption per customer
    var client_consumption = [];
    for (i = 0; i < clients.length - 1; i++) {
      for (j = 0; j < clients[i].order_list.length; j++) {
        consumption += clients[i].order_list[j].amount;
      }
      consumption_average = consupmtion / clients[i].order_list.length;
      client_consumption.push(client[i].select("firstname"));
      client_consumption.push(consumption_average);
    }
    console.log(client_consumption);
  } catch (err) {
    res.json({ message: err });
  }
});

module.exports = router;
