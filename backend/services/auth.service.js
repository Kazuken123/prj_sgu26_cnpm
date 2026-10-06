const UserStore = require("../stores/user.store");
const OwnerRequestStore = require("../stores/owner_request.store");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

class AuthService {
  static async register({ email, password, fullName, phoneNumber }) {
    if (password.length < 8)
      throw new Error("Mật khẩu phải có ít nhất 8 ký tự.");

    const existingUser = await UserStore.getUserByEmail(email);
    if (existingUser) throw new Error("Email đã được sử dụng!");

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const userId = await UserStore.createUser(
      email,
      passwordHash,
      fullName,
      phoneNumber,
    );
    return { userId, email, role: "TOURIST" };
  }

  static async registerOwner({
    email,
    password,
    fullName,
    phoneNumber,
    restaurantName,
    restaurantAddress,
  }) {
    if (password.length < 8)
      throw new Error("Mật khẩu phải có ít nhất 8 ký tự.");

    if (!restaurantName) throw new Error("Chủ quán phải cung cấp tên quán.");

    const existingUser = await UserStore.getUserByEmail(email);
    if (existingUser) throw new Error("Email đã được sử dụng!");

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const userId = await UserStore.createUser(
      email,
      passwordHash,
      fullName,
      phoneNumber,
      "OWNER",
      "PENDING",
    );
    await OwnerRequestStore.createRequest(
      userId,
      restaurantName,
      restaurantAddress,
      phoneNumber,
    );

    return { userId, email, role: "OWNER", status: "PENDING" };
  }

  static async getOwnerRequestStatus(userId) {
    const request = await OwnerRequestStore.getLatestByUserId(userId);
    if (!request) throw new Error("Không tìm thấy yêu cầu đăng ký chủ quán.");

    return {
      status: request.status,
      rejectionReason: request.rejection_reason,
      restaurantName: request.restaurant_name,
    };
  }

  static async login(email, password) {
    const user = await UserStore.getUserByEmail(email);
    if (!user) throw new Error("Tài khoản không tồn tại!");

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new Error("Tài khoản đang bị khóa. Vui lòng thử lại sau 15 phút.");
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      const fails = await UserStore.incrementFailedLogin(
        user.user_id,
        user.failed_login_count,
      );
      if (fails >= 5)
        throw new Error("Nhập sai 5 lần. Tài khoản đã bị khóa 15 phút!");
      throw new Error(`Sai mật khẩu! Bạn còn ${5 - fails} lần thử.`);
    }

    await UserStore.resetFailedLogin(user.user_id);

    const accessToken = jwt.sign(
      { userId: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    return {
      user: { id: user.user_id, email: user.email, role: user.role },
      accessToken,
    };
  }
}
module.exports = AuthService;
