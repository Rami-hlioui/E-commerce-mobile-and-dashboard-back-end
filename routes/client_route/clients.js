const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Client = require("../../models/client_model");
const RefreshToken = require("../../models/refreshtokens_model");
const verify = require("../auth_route/verifyToken");
const jwt = require("jsonwebtoken");

/////sendgrid for emails
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.API_KEY);
const verification = require("./email_template");
const reset = require("../auth_route/admin_pass_reset");
//////VALIDATION/////
const Joi = require("@hapi/joi");

const loginschema = Joi.object({
  email: Joi.string().min(6).required().email(),
  password: Joi.string().min(6).required(),
});

const validschema = Joi.object({
  firstname: Joi.string().min(3).required(),
  lastname: Joi.string().min(3).required(),
  email: Joi.string().min(6).required().email(),
  password: Joi.string().min(6).required(),
  age: Joi.number().integer().min(18).max(100).required(),
  sex: Joi.string().min(4).required(),
  adress: Joi.string().min(4).required(),
  phone: Joi.string().max(8).required(),
  state: Joi.string().min(3).required(),
});

/////register a client//////
router.post("/", async (req, res) => {
  /////VALIDATE INCOMING ADMIN DATA
  const { error } = validschema.validate(req.body); ///validate all the incoming data in the body
  if (error) return res.send(error.details[0].message);

  /////check if admin email exists/////
  const emailcheck = await Client.findOne({ email: req.body.email });
  if (emailcheck) return res.status(400).send("Email already exists");

  ///// Hash passwords/////
  const salt = await bcrypt.genSalt(10);
  const hashedpassword = await bcrypt.hash(req.body.password, salt);

  const client = new Client({
    firstname: req.body.firstname,
    lastname: req.body.lastname,
    age: req.body.age,
    sex: req.body.sex,
    adress: req.body.adress,
    email: req.body.email,
    password: hashedpassword,
    phone: req.body.phone,
    state: req.body.state,
  });
  try {
    const savedClient = await client.save();
    //const hashedId = await bcrypt.hash(savedClient._id, salt); ////hash client id
    console.log(savedClient);
    const message = {
      to: savedClient.email,
      from: process.env.GOOGLE_USER,
      subject: "Email confirmation",
      text: `Dear ${savedClient.firstname} please confirm your account using this link: ${process.env.DOMAIN}/auth/confirm/${savedClient._id}`,
      html: verification(savedClient.firstname, savedClient._id),
    };

    sgMail.send(message);
    res.json(savedClient);
  } catch (err) {
    res.json({ message: err });
  }
});

////LOGIN//////
router.post("/login", async (req, res) => {
  /////VALIDATE INCOMING ADMIN DATA
  const { error } = loginschema.validate(req.body); ///validate all the incoming data in the body
  if (error) return res.send(error.details[0].message);
  try {
    ////check if email exist///
    const emailcheck = await Client.findOne({ email: req.body.email });
    if (!emailcheck) return res.send("Account doesn't exists");
    //console.log(emailcheck);

    ////check if account is verified///
    if (emailcheck.verified == false) return res.send("account not verified");
    ////check if password is correct///
    const validpassword = await bcrypt.compare(
      req.body.password,
      emailcheck.password
    );
    //console.log(validpassword);
    if (!validpassword) return res.send("password is incorrect");
    ///CREATE AND ASSIGN A TOKEN////
    const token = generateRefreshToken(emailcheck._id);
    const refresh_token = jwt.sign(
      { Client: emailcheck._id },
      process.env.REFRESH_TOKEN
    );
    const refreshtoken = new RefreshToken({
      token: refresh_token,
    });
    const savedToken = await refreshtoken.save();
    console.log(savedToken);
    console.log(token);
    console.log("logged in");
    res.header("Authorization", token).send(token);
  } catch (err) {
    res.json({ message: err });
    console.log(err);
  }
});
function generateRefreshToken(id) {
  return jwt.sign({ Client: id }, process.env.ACCESS_TOKEN, {
    expiresIn: "20m",
  });
}

//////refreshing tokens
router.post("/refreshToken", async (req, res) => {
  const refreshToken = req.body.token;
  if (refreshToken == null) return res.sendStatus(401);
  const savedToken = await RefreshToken.findOne({ token: refreshToken });
  if (!savedToken) res.sendStatus(403);
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN, (err, client) => {
    if (err) return res.sendStatus(403);
    const token = generateRefreshToken({ id: client._id });
    res.json(token);
  });
});

router.post("/forgot-password", async (req, res) => {
  try {
    const client = await Client.findOne({ email: req.body.email }); ////search database using client's email
    if (!client) return res.send("client doesn't exist");
    //console.log(admin);
    const token = jwt.sign({ Client: client._id }, process.env.ACCESS_TOKEN);
    const link = `${process.env.DOMAIN}/reset-password/${client._id}/${token}`;
    console.log(token);

    const message = {
      to: client.email,
      from: process.env.GOOGLE_USER,
      subject: "Password Reset",
      text: `Dear ${client.name} please reset your password using this link: ${link}`,
      html: reset(client.name, link),
    };
    sgMail.send(message);
    res.send("Password reset link has been sent");
  } catch (err) {
    res.json({ message: err });
  }
});

router.put("/reset-password/:clientId/:token", async (req, res) => {
  try {
    const verified = jwt.verify(req.params.token, process.env.ACCESS_TOKEN);
    if (!verified) return res.send("Acces denied");
    console.log(verified);
    if (!(req.body.password == req.body.confirmPassword))
      return res.send("please confirm with the right password");
    ///// Hash passwords/////
    const salt = await bcrypt.genSalt(10);

    const hash = await bcrypt.hash(req.body.password, salt);

    console.log(hash);
    const client = await Client.findOneAndUpdate(
      { _id: req.params.clientId },
      {
        $set: {
          password: hash,
        },
      }
    );
    if (!client) return res.send("Invalid Id...");
    console.log(client);

    res.json(client);
  } catch (err) {
    res.json({ message: err });
  }
});

router.delete("/logout", async (req, res) => {
  try {
    const ToBeRemovedToken = await RefreshToken.findOneAndDelete(
      req.body.token
    );
    console.log(ToBeRemovedToken);
    res.send("logged out!");
  } catch (err) {
    res.json({ message: err });
  }
});

/////activation//////////
router.put("/confirm/:clientId", async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.clientId, {
      $set: { verified: true },
    });
    res.json(client);
  } catch (err) {
    res.json({ message: err });
  }
});

////////get all the clients////////
router.get("/", async (req, res) => {
  try {
    const clients = await Client.find()
      .populate("order_list", "-customer_id")
      .exec();
    res.json(clients);
    console.log(clients);
  } catch (err) {
    res.json({ message: err });
    console.log(err);
  }
});

/////get a specific client//////
router.get("/:clientId", async (req, res) => {
  try {
    const client = await Client.findById(req.params.clientId)
      .populate("order_list", "-customer_id")
      .exec();
    res.json(client);
  } catch (err) {
    res.json({ message: err });
  }
});

module.exports = router;
