import test from "node:test";
import assert from "node:assert/strict";
import { filterPunches, makePunch, nextPunchNumber, openCount, progress } from "../core.mjs";

const items = [
  { number: "P-001", title: "Header", location: "Kitchen", trade: "Framing", notes: "", status: "Open" },
  { number: "P-002", title: "Strap", location: "Garage", trade: "Framing", notes: "detail", status: "Verified" }
];

test("numbers new punch items sequentially", () => assert.equal(nextPunchNumber(items), "P-003"));
test("calculates verified progress", () => assert.equal(progress(items), 50));
test("counts actionable open items", () => assert.equal(openCount(items), 1));
test("filters by text and status", () => assert.equal(filterPunches(items, "garage", "Verified").length, 1));
test("creates a safe PM-controlled item", () => {
  const item = makePunch({ title: "  Blocking missing  " }, items);
  assert.equal(item.number, "P-003");
  assert.equal(item.title, "Blocking missing");
  assert.equal(item.source, "PM created");
});
