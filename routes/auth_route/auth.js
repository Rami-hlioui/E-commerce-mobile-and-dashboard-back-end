const express = require("express");
const router = express.Router();
const Admin = require("../../models/admin_model");
const RefreshToken = require("../../models/refreshtokens_model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);

/////sendgrid for emails
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.API_KEY);
const verification = require("./admin_verification");
const reset = require("./admin_pass_reset");
//////VALIDATION/////
const Joi = require("@hapi/joi");

const signinschema = Joi.object({
  name: Joi.string().min(3).required(),
  email: Joi.string().min(6).required().email(),
  password: Joi.string().min(6).required(),
});
const loginschema = Joi.object({
  email: Joi.string().min(6).required().email(),
  password: Joi.string().min(6).required(),
});

//////Sign in a new admin///////////////
router.post("/signin", async (req, res) => {
  /////VALIDATE INCOMING ADMIN DATA
  const { error } = signinschema.validate(req.body); ///validate all the incoming data in the body
  if (error) return res.send(error.details[0].message);
  /////check if admin email exists/////
  const emailcheck = await Admin.findOne({ email: req.body.email });
  if (emailcheck) return res.status(400).send("Email already exists");

  ///// Hash passwords/////
  const salt = await bcrypt.genSalt(10);
  const hashedpassword = await bcrypt.hash(req.body.password, salt);

  /////create a new admin/////
  const admin = new Admin({
    name: req.body.name,
    email: req.body.email,
    password: hashedpassword,
  });

  try {
    const savedAdmin = await admin.save();
    const message = {
      to: savedAdmin.email,
      from: process.env.GOOGLE_USER,
      subject: "Email confirmation",
      text: `Dear ${savedAdmin.name} please confirm your account using this link: ${process.env.DOMAIN}/auth/confirm/${savedAdmin.id}`,
      html: verification(savedAdmin.name, savedAdmin._id),
    };

    sgMail.send(message);
    res.send(savedAdmin);
  } catch (err) {
    res.json({ message: err });
  }
});

/////activation
router.put("/confirm/:adminId", async (req, res) => {
  try {
    await Admin.findByIdAndUpdate(
      req.params.adminId,
      // { new: true }, ////findOneAndUpdate doessn't return the new updated Admin so adding this argument enables it to return the updated version
      {
        $set: { verified: true },
      }
    );
    res.redirect("/login");
  } catch (err) {
    res.json({ message: err });
  }
});

/////LOGIN//////
router.post("/login", async (req, res) => {
  /////VALIDATE INCOMING ADMIN DATA
  const { error } = loginschema.validate(req.body); ///validate all the incoming data in the body
  if (error) return res.status(403).send(error.details[0].message);
  try {
    ////check if email exist///
    const emailcheck = await Admin.findOne({ email: req.body.email });
    if (!emailcheck) return res.status(403).send("Account doesn't exists");
    //console.log(emailcheck);

    ////check if account is verified///
    if (emailcheck.verified == false) return res.send("account not verified");
    ////check if password is correct///
    const validpassword = await bcrypt.compare(
      req.body.password,
      emailcheck.password
    );
    //console.log(validpassword);
    if (!validpassword) return res.status(400).send("password is incorrect");
    ///CREATE AND ASSIGN A TOKEN////
    const access_token = generateRefreshToken(emailcheck._id);
    const refresh_token = jwt.sign(
      { Admin: emailcheck._id },
      process.env.REFRESH_TOKEN
    );
    const refreshtoken = new RefreshToken({
      token: refresh_token,
    });
    const savedToken = await refreshtoken.save();
    console.log(savedToken);

    res
      .header("Authorization", access_token)
      .send({ access_token, refresh_token });
  } catch (err) {
    res.json({ message: err });
    console.log(err);
  }
});

function generateRefreshToken(id) {
  return jwt.sign({ Admin: id }, process.env.ACCESS_TOKEN, {
    expiresIn: "10s",
  });
}

router.post("    ", async (req, res) => {
  const refreshToken = req.body.token;
  if (refreshToken == null) return res.sendStatus(401);
  const savedToken = await RefreshToken.findOne({ token: refreshToken });
  if (!savedToken) res.sendStatus(403);
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN, (err, admin) => {
    if (err) return res.sendStatus(403);
    const token = generateRefreshToken({ id: admin._id });
    res.json(token);
  });
});

router.post("/forgot-password", async (req, res) => {
  try {
    const admin = await Admin.findOne({ email: req.body.email }); ////search database using admin's email
    if (!admin) return res.send("Admin doesn't exist");
    //console.log(admin);
    const token = jwt.sign({ Admin: admin._id }, process.env.ACCESS_TOKEN);
    const link = `${process.env.DOMAIN}/reset-password/${admin._id}/${token}`;
    console.log(token);

    const message = {
      to: admin.email,
      from: process.env.GOOGLE_USER,
      subject: "Password Reset",
      text: `Dear ${admin.name} please reset your password using this link: ${link}`,
      html: reset(admin.name, link),
    };
    sgMail.send(message);
    res.send("Password reset link has been sent");
  } catch (err) {
    res.json({ message: err });
  }
});

router.put("/reset-password/:adminId/:token", async (req, res) => {
  try {
    const verified = jwt.verify(req.params.token, process.env.ACCESS_TOKEN);
    if (!verified) return res.send("Acces denied");
    console.log(verified);

    ///// Hash passwords/////
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(req.body.password, salt);
    console.log(hash);
    const admin = await Admin.findOneAndUpdate(
      { _id: req.params.adminId },
      {
        $set: {
          password: hash,
        },
      }
    );
    if (!admin) return res.send("Invalid Id...");
    console.log(admin);

    res.json(admin);
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

module.exports = router;
