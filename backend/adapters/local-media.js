const fs = require("node:fs/promises");
const { constants } = require("node:fs");
const path = require("node:path");
const { MAX_AUDIO_BYTES } = require("../utils/pcm-wav");
const assetKey = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.wav$/;
class LocalMediaStorage {
  constructor({ root = process.env.MEDIA_ROOT } = {}) { this.root = root; }
  async location(key, create = false) {
    if (typeof key !== "string" || !assetKey.test(key)) throw new Error("INVALID_MEDIA_KEY");
    if (typeof this.root !== "string" || !path.isAbsolute(this.root)) throw new Error("MEDIA_ROOT_REQUIRED");
    if (create) await fs.mkdir(this.root, { recursive: true, mode: 0o700 });
    const root = await fs.realpath(this.root), publicPath = path.resolve(__dirname, "../../frontend");
    const publicRoot = await fs.realpath(publicPath).catch(() => publicPath);
    const compare = value => process.platform === "win32" ? value.toLowerCase() : value;
    if (root === path.parse(root).root || compare(root) === compare(publicRoot) || compare(root).startsWith(compare(publicRoot) + path.sep)) throw new Error("PRIVATE_MEDIA_ROOT_REQUIRED");
    return path.join(root, key);
  }
  async put(key, bytes, { signal } = {}) {
    if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > MAX_AUDIO_BYTES) throw new Error("INVALID_MEDIA_BYTES");
    const filename = await this.location(key, true);
    let handle, created = false;
    try {
      signal?.throwIfAborted();
      handle = await fs.open(filename, "wx", 0o600); created = true;
      await handle.writeFile(bytes, { signal }); await handle.sync(); signal?.throwIfAborted();
    } catch (error) {
      if (handle) { await handle.close(); handle = null; }
      if (created) await fs.unlink(filename).catch(() => {});
      throw error;
    } finally { if (handle) await handle.close(); }
  }
  async get(key) {
    const filename = await this.location(key);
    const entry = await fs.lstat(filename);
    if (!entry.isFile() || entry.isSymbolicLink() || entry.size > MAX_AUDIO_BYTES) throw new Error("INVALID_MEDIA_FILE");
    const handle = await fs.open(filename, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > MAX_AUDIO_BYTES) throw new Error("INVALID_MEDIA_FILE");
      const bytes = await handle.readFile();
      if (bytes.length > MAX_AUDIO_BYTES) throw new Error("INVALID_MEDIA_FILE");
      return bytes;
    } finally { await handle.close(); }
  }
  async remove(key) {
    try { await fs.unlink(await this.location(key)); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
}
module.exports = LocalMediaStorage;
module.exports.assetKey = assetKey;
