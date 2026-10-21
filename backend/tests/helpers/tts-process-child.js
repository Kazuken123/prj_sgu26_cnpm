// Process boundary fixture only; this is not a speech engine.
const mode = process.argv[2];
if (mode === "failure") { process.stderr.write("private provider detail"); process.exit(2); }
else if (mode === "stubborn") { process.on("SIGTERM", () => {}); process.stdout.write("ready"); setInterval(() => {}, 1000); }
else if (mode === "oversized") { process.stdout.write(Buffer.alloc(4096)); setInterval(() => {}, 1000); }
else { const chunks = []; process.stdin.on("data", chunk => chunks.push(chunk)); process.stdin.on("end", () => process.stdout.write(Buffer.concat(chunks))); }
