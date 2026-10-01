const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Kích hoạt kết nối cơ sở dữ liệu
require("./config/database");

const app = express();
app.use(cors());
app.use(express.json());

// Đường dẫn kiểm tra trạng thái máy chủ
app.get("/", (req, res) => {
  res.send("API Hệ Thống Du Lịch Ẩm Thực đang hoạt động...");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "food-tour-api",
    timestamp: new Date().toISOString()
  });
});

// Chỉ mở cổng khi chạy trực tiếp, hỗ trợ decoupling phục vụ testing
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server Backend đang chạy tại http://localhost:${PORT}`);
  });
}

module.exports = app;
