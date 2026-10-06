const express = require("express");
const router = express.Router();
const AuthService = require("../services/auth.service");
const { verifyToken, requireRole } = require("../middlewares/auth.middleware");

router.post("/register", async (req, res) => {
  try {
    const result = await AuthService.register(req.body);
    res.status(201).json({ message: "Đăng ký thành công!", data: result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/register-owner", async (req, res) => {
  try {
    const result = await AuthService.registerOwner(req.body);
    res.status(201).json({
      message: "Đăng ký chủ quán thành công! Vui lòng chờ admin duyệt.",
      data: result,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get(
  "/owner-request/status",
  verifyToken,
  requireRole("OWNER"),
  async (req, res) => {
    try {
      const status = await AuthService.getOwnerRequestStatus(req.user.userId);
      res
        .status(200)
        .json({ message: "Lấy trạng thái thành công!", data: status });
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  },
);

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
