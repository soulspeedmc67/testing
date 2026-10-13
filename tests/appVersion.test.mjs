import test from "node:test";
import assert from "node:assert/strict";

import { versionCode, minIosVersionPatch } from "../src/lib/appVersion.js";
import { riderPositionFrom, isRiderLive, riderSeenLabel } from "../src/lib/riderPosition.js";

test("a version becomes one number that sorts the same way", () => {
  assert.equal(versionCode("1.0.3"), 10003);
  assert.equal(versionCode("1.2"), 10200);
  assert.equal(versionCode("2"), 20000);
  assert.equal(versionCode(" 1.10.0 "), 11000);
  assert.ok(versionCode("1.0.10") > versionCode("1.0.9"));
  assert.ok(versionCode("1.1.0") > versionCode("1.0.99"));
});

test("anything that isn't a version is refused", () => {
  for (const bad of ["", "abc", "1.0.3.4", "1..3", "1.0.x", "v1.0.3", "1.0.100", "-1.0", null, undefined]) {
    assert.equal(versionCode(bad), null, String(bad));
  }
});

test("the fields saved for the oldest iPhone app allowed", () => {
  assert.deepEqual(minIosVersionPatch("1.0.3"), { minIosVersion: "1.0.3", minIosVersionCode: 10003 });
  assert.deepEqual(minIosVersionPatch("  "), { minIosVersion: "", minIosVersionCode: 0 });
  assert.equal(minIosVersionPatch("soon"), null);
});

test("a rider's position is read from the telemetry document", () => {
  const at = Date.UTC(2026, 9, 13, 10, 0, 0);
  assert.deepEqual(riderPositionFrom({ latitude: 33.74, longitude: 75.15, heading: 90, updatedAt: { toMillis: () => at } }), {
    lat: 33.74, lng: 75.15, heading: 90, at,
  });
  assert.equal(riderPositionFrom({ latitude: 0, longitude: 0 }), null);
  assert.equal(riderPositionFrom({ heading: 4 }), null);
  assert.equal(riderPositionFrom(undefined), null);
  assert.equal(riderPositionFrom({ lat: 33.7, lng: 75.1, updatedAt: "2026-10-13T10:00:00.000Z" }).at, at);
});

test("how long ago a rider was heard from", () => {
  const now = Date.UTC(2026, 9, 13, 10, 0, 0);
  const seen = (msAgo) => ({ lat: 1, lng: 1, at: now - msAgo });
  assert.equal(riderSeenLabel(seen(20_000), now), "Here now");
  assert.equal(riderSeenLabel(seen(4 * 60_000), now), "Seen 4 min ago");
  assert.match(riderSeenLabel(seen(2 * 3600_000), now), /^Last seen at /);
  assert.match(riderSeenLabel(seen(30 * 3600_000), now), /^Last seen 12 Oct/);
  assert.equal(riderSeenLabel({ lat: 1, lng: 1, at: null }, now), "Last place known");
  assert.equal(isRiderLive(seen(60_000), now), true);
  assert.equal(isRiderLive(seen(5 * 60_000), now), false);
  assert.equal(isRiderLive(null, now), false);
});
