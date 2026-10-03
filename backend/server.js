const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Kich hoat ket noi co so du lieu
require("./config/database");

const app = express();
app.use(cors());
app.use(express.json());

// KẾT NỐI ROUTER ĐĂNG KÝ/ĐĂNG NHẬP VÀO ĐÂY (US-01)
app.use("/api/auth", require("./routers/auth.router"));

// Duong dan kiem tra trang thai may chu
app.get("/", (req, res) => {
  res.send("API He Thong Du Lich Am Thuc dang hoat dong...");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "food-tour-api",
    timestamp: new Date().toISOString(),
  });
});

// Chi mo cong khi chay truc tiep, ho tro decoupling phuc vu testing
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server Backend dang chay tai http://localhost:${PORT}`);
  });
}

module.exports = app;
