const express = require("express");
const router = express.Router();
const Parc = require("../../models/parc_model");
const verify = require("../auth_route/verifyToken");

/////register a parc//////
router.post("/", verify, async (req, res) => {
  const parc = new Parc({
    adress: req.body.adress,
    state: req.body.state,
    production: {
      amount: req.body.production.amount,
      unit: req.body.production.unit,
    },
  });

  try {
    const savedParc = await parc.save();
    res.json(savedParc);
  } catch (err) {
    res.json({ message: err });
  }
});

/////get all the parcs/////
router.get("/", verify, async (req, res) => {
  try {
    const parcs = await Parc.find();
    res.json(parcs);
  } catch (err) {
    res.json({ message: err });
  }
});

/////get a specific parc//////
router.get("/:parcId", verify, async (req, res) => {
  try {
    const parc = await Parc.findById(req.params.parcId);
    res.json(parc);
  } catch (err) {
    res.json({ message: err });
  }
});
/////delete a parc/////
router.delete("/:parcId", verify, async (req, res) => {
  try {
    const deletedparc = await parc.remove({ _id: req.params.parcId });
    res.json(deletedparc);
  } catch (err) {
    res.json({ message: err });
  }
});

module.exports = router;
