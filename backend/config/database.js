const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "food_tour_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Chạy test thử kết nối khi khởi động nếu không trong môi trường test
if (process.env.NODE_ENV !== "test") {
  pool
    .getConnection()
    .then((conn) => {
      console.log("✅ Kết nối Database MySQL thành công!");
      conn.release();
    })
    .catch((err) => console.error("❌ Lỗi kết nối DB:", err.message));
}

module.exports = pool;
