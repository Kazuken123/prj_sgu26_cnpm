const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path"), os = require("node:os"), fs = require("node:fs");

for (const command of ["run", "publish"]) {
  test(`demo15 ${command} resolves backend dependencies without NODE_PATH before refusing a wrong database`, () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tcv-demo15-command-"));
    const entry = path.resolve(__dirname, `../../data/demo/fifteen/operator/${command}.cjs`);
    const args = ["--database", "tcv_demo_review_20261020"];
    if (command === "publish") args.push("--media-root", directory);
    const program = `process.argv = ['node', 'operator', ...${JSON.stringify(args)}];
      require(${JSON.stringify(entry)}).main().then(() => process.exitCode = 2).catch(error => {
        process.stdout.write(error.message); process.exitCode = 1;
      });`;
    try {
      const result = spawnSync(process.execPath, ["-e", program], {
        cwd: directory, encoding: "utf8", timeout: 10000,
        env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, NODE_PATH: "", DB_NAME: "wrong_database" },
      });
      assert.equal(result.error, undefined);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, "DATABASE_CONFIGURATION_MISMATCH");
      assert.equal(result.stderr, "");
    } finally { fs.rmdirSync(directory); }
  });
}
