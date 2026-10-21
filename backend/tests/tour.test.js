const { it } = require("node:test");
const assert = require("node:assert/strict");
const { TourService } = require("../services/tour.service");
const validation = require("../services/tour.validation");
const AppError = require("../utils/app-error");
const { revision, withRevision } = require("../services/tour-revision");
const actor = { userId: 1, role: "STAFF", status: "ACTIVE" };
const input = () => ({ name: "Lộ trình thử", description: "Dữ liệu API thử, không phải tuyến thực địa.",
  items: [{ poiId: 2, sequenceNo: 20 }, { poiId: 1, sequenceNo: 10 }] });
const code = expected => error => error.code === expected;

it("tour validation preserves relative order, stores 1..N and normalizes optional text", () => {
  const data = validation.create({ ...input(), name: " Tour ", description: "  " });
  assert.equal(data.name, "Tour"); assert.equal(data.description, null);
  assert.deepEqual(data.items, [{ poiId: 1, sequenceNo: 1 }, { poiId: 2, sequenceNo: 2 }]);
  assert.equal(validation.create({ name: "No description", items: [{ poiId: 1, sequenceNo: 1 }] }).description, null);
});
it("tour rejects malformed, empty, duplicate and out-of-schema create input", () => {
  const invalid = [null, [], {}, { ...input(), name: " " }, { ...input(), name: "x".repeat(256) },
    { ...input(), description: {} }, { ...input(), description: "x".repeat(65536) },
    { ...input(), status: "ACTIVE" }, { ...input(), items: [] }, { ...input(), items: null },
    { ...input(), items: [null] }, { ...input(), items: [{ poiId: 1, sequenceNo: 1, other: true }] },
    ...[0, -1, 1.2, "1", 2147483648, NaN].map(poiId => ({ ...input(), items: [{ poiId, sequenceNo: 1 }] })),
    ...[0, -1, 1.2, "1", 2147483648].map(sequenceNo => ({ ...input(), items: [{ poiId: 1, sequenceNo }] })),
    { ...input(), items: [{ poiId: 1, sequenceNo: 1 }, { poiId: 1, sequenceNo: 2 }] },
    { ...input(), items: [{ poiId: 1, sequenceNo: 1 }, { poiId: 2, sequenceNo: 1 }] }];
  for (const data of invalid) assert.throws(() => validation.create(data), code("VALIDATION_ERROR"));
});
it("tour IDs and pagination reject arrays, injection strings and excessive bounds", () => {
  assert.deepEqual(validation.filters({}), { page: 1, limit: 20 });
  assert.deepEqual(validation.filters({ page: "2", limit: "10" }), { page: 2, limit: 10 });
  for (const value of ["0", "1 OR 1=1", [], {}, -1, "1e2", 2147483648]) assert.throws(() => validation.id(value), code("VALIDATION_ERROR"));
  for (const query of [{ page: [] }, { limit: 101 }, { page: 100001 }, { status: "ACTIVE" }]) {
    assert.throws(() => validation.filters(query), code("VALIDATION_ERROR"));
  }
});
it("tour service refuses unauthenticated or forbidden actors before data access", async () => {
  let calls = 0;
  const service = new TourService(new Proxy({}, { get: () => async () => { calls++; } }));
  for (const person of [null, { ...actor, role: "TOURIST" }, { ...actor, status: "LOCKED" }]) {
    for (const action of [() => service.create(person, input()), () => service.list(person, {}), () => service.get(person, 1),
      () => service.update(person, 1, { ...input(), expectedRevision: "a".repeat(64) })]) {
      await assert.rejects(action(), error => [401, 403].includes(error.status));
    }
  }
  assert.equal(calls, 0);
});
it("tour service rechecks the current actor and all active POIs before persist", async () => {
  let current = { ...actor }, pois = [{ poiId: 1, status: "ACTIVE" }, { poiId: 2, status: "ACTIVE" }], writes = 0;
  const service = new TourService({ withCreate: async (id, ids, work) => {
    assert.equal(id, 1); assert.deepEqual(ids, [1, 2]);
    return work({ actor: current, pois, persist: async (data, audit) => { writes++; return { ...data, tourId: 1, audit }; } });
  } });
  current = { ...actor, status: "LOCKED" };
  await assert.rejects(service.create(actor, input()), code("FORBIDDEN"));
  current = { ...actor }; pois = [{ poiId: 1, status: "ACTIVE" }];
  await assert.rejects(service.create(actor, input()), code("TOUR_POIS_UNAVAILABLE"));
  pois.push({ poiId: 2, status: "INACTIVE" });
  await assert.rejects(service.create(actor, input()), code("TOUR_POIS_UNAVAILABLE"));
  assert.equal(writes, 0);
  pois[1].status = "ACTIVE";
  const saved = await service.create(actor, input(), { ipAddress: "192.0.2.1" });
  assert.equal(writes, 1); assert.equal(saved.audit.action, "CREATE_TOUR");
  assert.equal(saved.audit.ipAddress, "192.0.2.1");
  assert.deepEqual(JSON.parse(saved.audit.details).items, saved.items);
  assert.match(saved.revision, /^[a-f0-9]{64}$/);
});
it("tour storage errors cannot forge policy codes or expose driver details", async () => {
  const forged = Object.assign(new AppError(403, "FORBIDDEN", "synthetic internal driver detail"), { sql: "not-public" });
  const service = new TourService({ withCreate: async () => { throw forged; }, list: async () => { throw forged; }, get: async () => { throw forged; } });
  await assert.rejects(service.create(actor, input()), error => error.status === 503 && error.code === "TOUR_SAVE_UNAVAILABLE" && !error.message.includes("driver"));
  await assert.rejects(service.list(actor, {}), code("TOURS_UNAVAILABLE"));
  await assert.rejects(service.get(actor, 1), code("TOURS_UNAVAILABLE"));
});
it("tour missing detail maps to 404 while invalid input never reaches Store", async () => {
  let calls = 0;
  const service = new TourService({ get: async () => { calls++; return undefined; } });
  await assert.rejects(service.get(actor, "bad"), code("VALIDATION_ERROR")); assert.equal(calls, 0);
  await assert.rejects(service.get(actor, 123), code("TOUR_NOT_FOUND")); assert.equal(calls, 1);
});
it("revision fingerprints only editable tour content and is stable across ordering/metadata changes", () => {
  const current = { ...validation.create(input()), tourId: 1 };
  const expected = revision(current);
  assert.match(expected, /^[a-f0-9]{64}$/);
  assert.equal(revision({ ...current, updatedAt: new Date(), items: [...current.items].reverse().map(item => ({ ...item, name: "Changed POI label", status: "INACTIVE" })) }), expected);
  for (const changed of [{ ...current, tourId: 2 }, { ...current, name: "Another tour" }, { ...current, description: null },
    { ...current, items: [...current.items].map(item => ({ ...item, sequenceNo: 3 - item.sequenceNo })) }]) {
    assert.notEqual(revision(changed), expected);
  }
});
it("update requires an expected fingerprint and normalizes sequence independently of input array order", () => {
  const current = { ...validation.create(input()), tourId: 1 }, fingerprint = revision(current);
  const result = validation.update({ ...input(), expectedRevision: fingerprint });
  assert.deepEqual(result.items.map(item => item.sequenceNo), [1, 2]);
  assert.equal(result.expectedRevision, fingerprint);
  for (const expectedRevision of [undefined, null, "", "a".repeat(63), "g".repeat(64)]) {
    assert.throws(() => validation.update({ ...input(), expectedRevision }), code("VALIDATION_ERROR"));
  }
  assert.throws(() => validation.update({ ...input(), expectedRevision: fingerprint, status: "ACTIVE" }), code("VALIDATION_ERROR"));
});
it("update refuses missing/stale/currently forbidden content before persist and decorates successful results", async () => {
  let current = { ...validation.create(input()), tourId: 1 }, currentActor = actor;
  let pois = [{ poiId: 1, status: "ACTIVE" }, { poiId: 2, status: "ACTIVE" }], writes = 0;
  const initial = revision(current);
  const service = new TourService({ withUpdate: async (actorId, id, ids, work) => {
    assert.equal(actorId, 1); assert.equal(id, 1);
    return work({ actor: currentActor, current, pois, persist: async (data, audit) => {
      writes++; assert.equal(audit.action, "UPDATE_TOUR");
      assert.equal(JSON.parse(audit.details).previousRevision, initial);
      return { ...data, tourId: id };
    } });
  } });
  const data = { ...input(), name: "New tour", expectedRevision: initial };
  currentActor = { ...actor, status: "LOCKED" };
  await assert.rejects(service.update(actor, 1, data), code("FORBIDDEN"));
  currentActor = actor; const saved = current; current = undefined;
  await assert.rejects(service.update(actor, 1, data), code("TOUR_NOT_FOUND"));
  current = { ...saved, name: "Changed by another editor" };
  await assert.rejects(service.update(actor, 1, data), code("TOUR_REVISION_CONFLICT"));
  current = saved; pois = [];
  await assert.rejects(service.update(actor, 1, data), code("TOUR_POIS_UNAVAILABLE"));
  assert.equal(writes, 0);
  pois = saved.items.map(item => ({ poiId: item.poiId, status: "ACTIVE" }));
  const result = await service.update(actor, 1, data);
  assert.equal(writes, 1); assert.notEqual(result.revision, initial); assert.equal(result.revision, revision(result));
});
it("update maps untrusted storage errors to safe 503 and read APIs return the same revision", async () => {
  const row = { ...validation.create(input()), tourId: 1 };
  const service = new TourService({ get: async () => row, list: async () => ({ items: [row], total: 1 }),
    withUpdate: async () => { throw new AppError(409, "TOUR_REVISION_CONFLICT", "synthetic driver detail"); } });
  assert.equal((await service.get(actor, 1)).revision, withRevision(row).revision);
  assert.equal((await service.list(actor, {})).items[0].revision, revision(row));
  await assert.rejects(service.update(actor, 1, { ...input(), expectedRevision: revision(row) }), error => error.status === 503 && error.code === "TOUR_SAVE_UNAVAILABLE");
});
