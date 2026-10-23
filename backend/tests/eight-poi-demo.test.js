// Operator integration tests use isolated UUID databases only; never the demo DB.
if (process.env.RUN_DB_TESTS === "1") {
  require("../../data/demo/eight-pois/operator/operator.test.cjs");
  require("../../data/demo/eight-pois/operator/languages.test.cjs");
}
