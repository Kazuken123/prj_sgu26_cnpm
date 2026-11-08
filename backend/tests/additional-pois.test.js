const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  ADDITIONAL_POI_NAMES,
  SQL_FILE_PATH,
  parseArgs,
  loadSqlStatements,
  runSeed
} = require("../scripts/seed-additional-pois");

describe("Additional POIs Seed and Script Test Suite", () => {
  it("Tệp SQL 001_additional_pois.sql tồn tại và chứa đủ 8 điểm tham quan", async () => {
    assert.equal(fs.existsSync(SQL_FILE_PATH), true, "Tệp 001_additional_pois.sql phải tồn tại");
    const content = fs.readFileSync(SQL_FILE_PATH, "utf8");
    assert.ok(content.length > 500, "Nội dung tệp SQL không được rỗng");

    for (const name of ADDITIONAL_POI_NAMES) {
      assert.ok(
        content.includes(`'${name}'`),
        `Tệp SQL phải chứa điểm tham quan: ${name}`
      );
    }
  });

  it("Tệp SQL phân chia câu lệnh hợp lệ và có đầy đủ bản dịch vi và en", async () => {
    const statements = await loadSqlStatements();
    assert.equal(statements.length, 24, "Phải có đúng 24 câu lệnh SQL gồm 8 POI và 16 bản dịch vi en");

    const content = fs.readFileSync(SQL_FILE_PATH, "utf8");
    const viStatements = statements.filter(s => s.includes("POI_TRANSLATIONS") && s.includes("'vi'"));
    const enStatements = statements.filter(s => s.includes("POI_TRANSLATIONS") && s.includes("'en'"));

    assert.equal(viStatements.length, 8, "Phải có đủ 8 bản ghi dịch tiếng Việt");
    assert.equal(enStatements.length, 8, "Phải có đủ 8 bản ghi dịch tiếng Anh");

    for (const cat of ["ANIMAL", "PLANT", "HERITAGE"]) {
      assert.ok(content.includes(`'${cat}'`), `Phải chứa thể loại ${cat}`);
    }
  });

  it("Hàm parseArgs phân tích chính xác các cờ dòng lệnh", () => {
    assert.deepEqual(parseArgs(["--dry-run"]), { apply: false, dryRun: true, list: false });
    assert.deepEqual(parseArgs([]), { apply: false, dryRun: true, list: false });
    assert.deepEqual(parseArgs(["--apply"]), { apply: true, dryRun: false, list: false });
    assert.deepEqual(parseArgs(["--apply", "--dry-run"]), { apply: false, dryRun: true, list: false });
    assert.deepEqual(parseArgs(["--list"]), { apply: false, dryRun: false, list: true });
  });

  it("Hàm runSeed trả về kết quả PLAN khi chạy ở chế độ dry-run", async () => {
    const mockConnection = {
      query: async (sql, params) => {
        if (sql.includes("SELECT name FROM POIS")) {
          return [[{ name: "Hổ Bengal" }]];
        }
        return [[]];
      },
      release: () => {}
    };

    const mockPool = {
      getConnection: async () => mockConnection
    };

    const result = await runSeed(mockPool, { apply: false });
    assert.equal(result.outcome, "PLAN");
    assert.equal(result.totalCandidate, 8);
    assert.equal(result.alreadyExistCount, 1);
    assert.equal(result.toInsertCount, 7);
    assert.equal(result.pendingPois.includes("Hổ Bengal"), false);
    assert.equal(result.pendingPois.includes("Gấu ngựa"), true);
  });

  it("Hàm runSeed trả về UNCHANGED khi toàn bộ POI đã tồn tại", async () => {
    const mockConnection = {
      query: async (sql, params) => {
        if (sql.includes("SELECT name FROM POIS")) {
          return [ADDITIONAL_POI_NAMES.map(name => ({ name }))];
        }
        return [[]];
      },
      release: () => {}
    };

    const mockPool = {
      getConnection: async () => mockConnection
    };

    const result = await runSeed(mockPool, { apply: true });
    assert.equal(result.outcome, "UNCHANGED");
    assert.equal(result.insertedCount, 0);
    assert.equal(result.existingCount, 8);
  });

  it("Hàm runSeed thực thi nạp dữ liệu và commit khi có POI mới", async () => {
    let began = false;
    let committed = false;
    let executedSqlCount = 0;

    const mockConnection = {
      beginTransaction: async () => { began = true; },
      commit: async () => { committed = true; },
      rollback: async () => {},
      query: async (sql, params) => {
        if (sql.includes("SELECT name FROM POIS WHERE name IN")) {
          return [[]]; // Chua co diem nao
        }
        if (sql.includes("SELECT poi_id, name, category, status FROM POIS")) {
          return [ADDITIONAL_POI_NAMES.map((name, i) => ({
            poi_id: i + 11,
            name,
            category: "ANIMAL",
            status: "ACTIVE"
          }))];
        }
        executedSqlCount++;
        return [{ affectedRows: 1 }];
      },
      release: () => {}
    };

    const mockPool = {
      getConnection: async () => mockConnection
    };

    const result = await runSeed(mockPool, { apply: true });
    assert.equal(began, true, "Phải mở giao dịch SQL");
    assert.equal(committed, true, "Phải commit giao dịch SQL");
    assert.ok(executedSqlCount >= 24, "Phải thực thi toàn bộ các câu lệnh SQL trong tệp seed");
    assert.equal(result.outcome, "CREATED");
    assert.equal(result.insertedCount, 8);
    assert.equal(result.totalAdditionalPois, 8);
  });
});
