const defaultPaymentService = require("../services/payment.service");
const AppError = require("../utils/app-error");

function createVisitorMiddleware(paymentService = defaultPaymentService) {
  return async (req, res, next) => {
    const header = req.headers.authorization;
    if (typeof header !== "string" || !/^Bearer [^\s]+$/i.test(header)) {
      return next(new AppError(401, "MISSING_VISITOR_TOKEN", "Thiếu token khách hợp lệ trong Authorization Bearer."));
    }
    try { req.visit = await paymentService.authenticateVisitor(header.slice(7)); next(); }
    catch (error) { next(error); }
  };
}
module.exports = { createVisitorMiddleware };
