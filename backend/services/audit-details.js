// Read projection only: never expose arbitrary legacy/free-form details.
// Existing writers and persisted audit records are not changed by UC-17.
const integer = value => Number.isSafeInteger(value) && value > 0;
const boolean = value => typeof value === "boolean";
const text = pattern => value => typeof value === "string" && pattern.test(value);
const uuid = text(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
const hash = text(/^[a-f0-9]{64}$/);
const enumOf = values => value => values.includes(value);
const job = { poiId: integer, languageCode: text(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/), sourceVersion: integer, currentVersion: integer };
const schemas = {
  CREATE_KNOWLEDGE_DOCUMENT: { contentVersion: integer },
  UPDATE_KNOWLEDGE_DOCUMENT: { previousVersion: integer, contentVersion: integer },
  DEACTIVATE_KNOWLEDGE_DOCUMENT: { previousVersion: integer, contentVersion: integer },
  PUBLISH_KNOWLEDGE_DOCUMENT: { contentVersion: integer, chunkCount: integer, embeddingModel: text(/^[A-Za-z0-9._:/@-]{1,100}$/) },
  FAIL_KNOWLEDGE_PROCESSING: { contentVersion: integer, code: text(/^[A-Z][A-Z0-9_]{0,99}$/) },
  CREATE_STAFF: { email: text(/^[^\s@<>]{1,200}@[^\s@<>]{1,200}\.[^\s@<>]{1,63}$/) },
  CREATE_POI: { sourceChanged: boolean, contentVersion: integer },
  UPDATE_POI: { sourceChanged: boolean, contentVersion: integer },
  DEACTIVATE_POI: {},
  IMPORT_REVIEWED_TRANSLATION: { ...job },
  CREATE_TOUR: {}, UPDATE_TOUR: { previousRevision: hash, revision: hash },
  CREATE_PENDING_PAYMENT: { sessionId: uuid, paymentMethod: enumOf(["CASH", "ONLINE"]) },
  CONFIRM_CASH_PAYMENT: { sessionId: uuid, amount: text(/^\d{1,12}(?:\.\d{1,2})?$/), currency: enumOf(["VND"]) },
  ISSUE_CASH_CODE: { sessionId: uuid, paymentRef: uuid, codeExpiresAt: text(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/) },
  PREPARE_ONLINE_CHECKOUT: { sessionId: uuid, issueId: uuid, expiresAtMs: integer },
  ONLINE_CHECKOUT_READY: { sessionId: uuid, paymentRef: uuid },
  ISSUE_VISITOR_TOKEN: { paymentRef: uuid, issueId: uuid },
  SEED_APPROVED_DEMO: { digest: hash, tourId: integer },
  PUBLISH_DEMO_AUDIO: { operationId: uuid, digest: hash, provider: enumOf(["PIPER"]), audioCount: integer, rollback: boolean },
  ROLLBACK_DEMO_AUDIO: { operationId: uuid, digest: hash, provider: enumOf(["PIPER"]), audioCount: integer, rollback: boolean },
};
for (const action of ["CONFIRM_ONLINE_PAYMENT", "FAIL_ONLINE_PAYMENT"]) schemas[action] = {
  ...schemas.CONFIRM_CASH_PAYMENT, previousStatus: enumOf(["PENDING", "PAID", "FAILED"]), status: enumOf(["PAID", "FAILED"]),
};
for (const action of ["RETRY_CONTENT_JOB", "CLAIM_CONTENT_JOB", "FAIL_CONTENT_JOB", "RECOVER_CONTENT_JOB", "PREPARE_TRANSLATION", "COMPLETE_CONTENT_JOB"]) {
  schemas[action] = { ...job, code: text(/^[A-Z][A-Z0-9_]{0,99}$/), provider: enumOf(["MOCK", "ADAPTER", "REUSED"]), reused: boolean };
}
function project(action, raw) {
  if (raw == null) return { details: null, detailsOmitted: false };
  let parsed;
  try { parsed = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return { details: null, detailsOmitted: true }; }
  const schema = Object.hasOwn(schemas, action) ? schemas[action] : undefined;
  if (!schema || !parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { details: null, detailsOmitted: true };
  const details = {};
  for (const [key, validate] of Object.entries(schema)) if (Object.hasOwn(parsed, key) && validate(parsed[key])) details[key] = parsed[key];
  if (["CREATE_TOUR", "UPDATE_TOUR"].includes(action) && Array.isArray(parsed.items) &&
      parsed.items.every(item => item && integer(item.poiId) && integer(item.sequenceNo))) {
    details.items = parsed.items.map(({ poiId, sequenceNo }) => ({ poiId, sequenceNo }));
  }
  if (action === "SEED_APPROVED_DEMO") {
    for (const key of ["poiIds", "translationIds", "jobIds"]) {
      if (Array.isArray(parsed[key]) && parsed[key].every(integer)) details[key] = [...parsed[key]];
    }
  }
  const detailsOmitted = Object.keys(parsed).length !== Object.keys(details).length ||
    Object.keys(details).some(key => JSON.stringify(parsed[key]) !== JSON.stringify(details[key]));
  return { details, detailsOmitted };
}
module.exports = { project };
