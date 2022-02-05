const jwt = require("jsonwebtoken");

module.exports = function verify(req, res, next) {
  const token = req.header("Authorization");
  if (!token) return res.status(401).send("Acces denied");
  try {
    const verified = jwt.verify(token, process.env.ACCESS_TOKEN);
    req.Admin = verified;
    next();
  } catch (err) {
    res.status(400).send("invalid token");
  }
};
