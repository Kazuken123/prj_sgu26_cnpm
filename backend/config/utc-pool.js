// Driver timezone controls Date conversion; SQL defaults use the session timezone.
// Reset on every checkout, including connections returned by other callers.
function utcPool(pool) {
  async function getConnection() {
    const connection = await pool.getConnection();
    try {
      await connection.query({ sql: "SET SESSION time_zone = '+00:00'", timeout: 2000 });
      return connection;
    } catch (error) {
      connection.destroy();
      throw error;
    }
  }
  async function run(method, args) {
    const connection = await getConnection();
    try { return await connection[method](...args); }
    finally { connection.release(); }
  }
  return {
    getConnection,
    query: (...args) => run("query", args),
    execute: (...args) => run("execute", args),
    end: () => pool.end(),
  };
}
module.exports = utcPool;
