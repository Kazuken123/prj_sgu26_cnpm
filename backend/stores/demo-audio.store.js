const DemoSeedStore = require("./demo-seed.store");
const ContentStore = require("./content.store");
// Reuse the existing dataset lock, physical-database guard and transaction.
// Seed import behavior is unchanged; only this subclass exposes audio publication.
class DemoAudioStore extends DemoSeedStore {
  async owned(connection, marker) {
    const state = await super.owned(connection, marker);
    if (!state.pois) return state;
    const content = new ContentStore(this.db), audios = [], jobStates = [];
    for (const jobId of state.jobIds) {
      const [[job]] = await connection.query("SELECT job_id AS jobId,status,source_version AS sourceVersion,claim_id AS claimId,lease_expires_at AS leaseExpiresAt FROM CONTENT_JOBS WHERE job_id=? FOR UPDATE", [jobId]);
      jobStates.push(job);
    }
    for (const translationId of state.translationIds) audios.push({ translationId, ...await content.getAudioForUpdate(translationId, connection) });
    return { ...state, audios, jobStates, replace: async assets => {
      for (const asset of assets) await content.saveAudio(asset.translationId, asset.sourceVersion, asset, connection);
    } };
  }
}
module.exports = DemoAudioStore;
