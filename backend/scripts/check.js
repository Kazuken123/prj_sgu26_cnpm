const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Module = require("node:module");
const root = path.resolve(__dirname, "..");
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === "node_modules") return [];
    const filename = path.join(dir, entry.name);
    return entry.isDirectory() ? files(filename) : entry.name.endsWith(".js") ? [filename] : [];
  });
}
const failures = [];
const sources = files(root);
for (const filename of sources) {
  const source = fs.readFileSync(filename, "utf8").replace(/^\uFEFF/, "");
  const relative = path.relative(root, filename).replaceAll("\\", "/");
  try { new vm.Script(Module.wrap(source), { filename }); } catch (error) { failures.push(relative + ": " + error.message); }
  for (const match of source.matchAll(/require\(["']([^"']+)["']\)/g)) {
    const dependency = match[1];
    if (/^(routers|middlewares|services)\//.test(relative) &&
        (/^mysql2(?:\/|$)/.test(dependency) || /config\/database/.test(dependency))) {
      failures.push(relative + ": database driver/pool must stay in Store");
    }
    if (/^(routers|middlewares)\//.test(relative) && /stores\//.test(dependency)) {
      failures.push(relative + ": call a Service, not a Store");
    }
    if (/^stores\//.test(relative) && /(?:routers|services|middlewares)\//.test(dependency)) {
      failures.push(relative + ": Store must not depend on higher layers");
    }
    if (dependency.startsWith(".") &&
        ![dependency, dependency + ".js", dependency + "/index.js"].some(candidate => fs.existsSync(path.resolve(path.dirname(filename), candidate)))) {
      failures.push(relative + ": missing dependency " + dependency);
    }
  }
}
if (failures.length) { console.error(failures.join("\n")); process.exitCode = 1; }
else console.log(`Checked syntax and layer imports in ${sources.length} JavaScript files.`);
