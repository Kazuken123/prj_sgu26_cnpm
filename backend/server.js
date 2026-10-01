const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Kích hoạt file kết nối database
require("./config/database");

const app = express();
app.use(cors());
app.use(express.json()); // Cho phép đọc dữ liệu JSON gửi lên

// Tạo 1 đường dẫn (route) cơ bản để test
app.get("/", (req, res) => {
  res.send("API Hệ Thống Du Lịch Ẩm Thực đang hoạt động...");
});

// Lấy cổng từ file .env, nếu không có thì chạy cổng 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server Backend đang chạy tại http://localhost:${PORT}`);
});
