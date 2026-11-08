const fs = require("node:fs/promises");
const path = require("node:path");

const SQL_FILE_PATH = path.resolve(__dirname, "../../database/seeds/001_additional_pois.sql");

const ADDITIONAL_POI_NAMES = [
  "Hổ Bengal",
  "Gấu ngựa",
  "Báo hoa mai",
  "Chim hồng hạc",
  "Cá sấu hoa cà",
  "Vượn má vàng",
  "Đền thờ Vua Hùng",
  "Cây đa cổ thụ di sản"
];

function parseArgs(argv) {
  const isApply = argv.includes("--apply");
  const isList = argv.includes("--list") || argv.includes("-l");
  const isDryRun = argv.includes("--dry-run") || (!isApply && !isList);
  return { apply: isApply && !isDryRun && !isList, dryRun: isDryRun, list: isList };
}

async function loadSqlStatements() {
  const content = await fs.readFile(SQL_FILE_PATH, "utf8");
  const withoutComments = content.replace(/^--.*$/gm, "");
  return withoutComments
    .split(";")
    .map(statement => statement.trim())
    .filter(statement => statement.length > 0);
}

async function runSeed(pool, { apply }) {
  const connection = await pool.getConnection();
  try {
    const [existingRows] = await connection.query(
      "SELECT name FROM POIS WHERE name IN (?)",
      [ADDITIONAL_POI_NAMES]
    );
    const existingNames = new Set(existingRows.map(row => row.name));
    const pendingNames = ADDITIONAL_POI_NAMES.filter(name => !existingNames.has(name));

    if (!apply) {
      return {
        outcome: "PLAN",
        totalCandidate: ADDITIONAL_POI_NAMES.length,
        alreadyExistCount: existingNames.size,
        toInsertCount: pendingNames.length,
        candidatePois: ADDITIONAL_POI_NAMES,
        pendingPois: pendingNames
      };
    }

    if (pendingNames.length === 0) {
      return {
        outcome: "UNCHANGED",
        insertedCount: 0,
        existingCount: existingNames.size,
        message: "Tất cả các điểm tham quan bổ sung đều đã tồn tại trong cơ sở dữ liệu."
      };
    }

    await connection.beginTransaction();

    const statements = await loadSqlStatements();
    for (const sql of statements) {
      await connection.query(sql);
    }

    await connection.commit();

    const [afterRows] = await connection.query(
      "SELECT poi_id, name, category, status FROM POIS WHERE name IN (?) ORDER BY display_order ASC",
      [ADDITIONAL_POI_NAMES]
    );

    return {
      outcome: "CREATED",
      insertedCount: pendingNames.length,
      totalAdditionalPois: afterRows.length,
      pois: afterRows
    };
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // rollback safe
    }
    throw error;
  } finally {
    connection.release();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.list) {
    console.log(JSON.stringify({
      outcome: "POI_LIST",
      total: ADDITIONAL_POI_NAMES.length,
      pois: ADDITIONAL_POI_NAMES,
      sqlFile: SQL_FILE_PATH
    }, null, 2));
    return;
  }

  require("dotenv").config({ quiet: true });
  const pool = require("../config/database");

  try {
    const result = await runSeed(pool, options);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ outcome: "FAILED", error: error.message || error.code }));
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  ADDITIONAL_POI_NAMES,
  SQL_FILE_PATH,
  parseArgs,
  loadSqlStatements,
  runSeed
};
