const express = require("express");
const router = express.Router();
const AuthService = require("../services/auth.service");

router.post("/register", async (req, res) => {
  try {
    const result = await AuthService.register(req.body);
    res.status(201).json({ message: "Đăng ký thành công!", data: result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.status(200).json({ message: "Đăng nhập thành công!", data: result });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

module.exports = router;
