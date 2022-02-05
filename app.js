const express = require("express");
const app = express();
const mongoose = require("mongoose");

const cors = require("cors");
require("dotenv/config");

app.use(cors());
app.use(express.json());

//import routes
const ClientsRoute = require("./routes/client_route/clients");
const ParcsRoute = require("./routes/parcs_route/parcs");
const OrdersRoute = require("./routes/order route/orders");
const AuthRoute = require("./routes/auth_route/auth.js");
const AnalyticsRoute = require("./routes/analytics_route/analytics");
//middlewares
app.use("/Clients", ClientsRoute);
app.use("/Parcs", ParcsRoute);
app.use("/Orders", OrdersRoute);
app.use("/auth", AuthRoute);
app.use("/analytics", AnalyticsRoute);

/////connect to server
mongoose.connect(
  process.env.DB_CONNECTION,
  { useNewUrlParser: true, useUnifiedTopology: true },
  () => {
    console.log("connected to MongoDB");
  }
);

////how to listen to server
app.listen(5000);
