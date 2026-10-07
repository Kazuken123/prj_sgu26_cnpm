require("dotenv").config({ quiet: true });
const auth = require("../services/auth.service");
const pool = require("../config/database");
(async () => {
  try {
    const result = await auth.bootstrapAdmin({
      email: process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@foodtour.com",
      password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
      fullName: "Admin Hệ Thống",
    });
    console.log(result.created ? "Đã tạo tài khoản admin." : result.repaired
      ? "Đã thay hash giả của seed cũ bằng mật khẩu được cung cấp."
      : "Tài khoản admin đã tồn tại; không đổi mật khẩu.");
  } catch (error) {
    console.error(error.code === "VALIDATION_ERROR" ? error.message : "Không tạo được admin; kiểm tra cấu hình và database.");
    process.exitCode = 1;
  } finally { await pool.end(); }
})();
