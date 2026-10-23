const { randomUUID } = require("node:crypto");
// Identifies this process start, not a credential or a user/session identifier.
const bootId = randomUUID();
function deploymentMetadata(env = process.env) {
  if (env.RENDER !== "true" || !/^[a-f0-9]{40}$/.test(env.RENDER_GIT_COMMIT || "")) return {};
  return { deployment: { commit: env.RENDER_GIT_COMMIT, bootId } };
}
module.exports = { deploymentMetadata };
