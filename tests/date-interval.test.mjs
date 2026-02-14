import test from "node:test";
import assert from "node:assert/strict";
import interval from "../src/lib/date-interval.js";

const { intervalsOverlapYmd, notionDatePropertyToYmdInterval, selectionToYmdInterval } = interval;

test("selectionToYmdInterval normalizes single", () => {
  assert.deepEqual(selectionToYmdInterval({ mode: "single", date: "2026-02-13" }), {
    start: "2026-02-13",
    end: "2026-02-13",
  });
});

test("selectionToYmdInterval normalizes reversed range", () => {
  assert.deepEqual(selectionToYmdInterval({ mode: "range", start: "2026-02-20", end: "2026-02-10" }), {
    start: "2026-02-10",
    end: "2026-02-20",
  });
});

test("notionDatePropertyToYmdInterval treats single-day as start=end", () => {
  assert.deepEqual(
    notionDatePropertyToYmdInterval({ type: "date", date: { start: "2026-02-13", end: null } }),
    { start: "2026-02-13", end: "2026-02-13" },
  );
});

test("notionDatePropertyToYmdInterval supports date-time strings", () => {
  assert.deepEqual(
    notionDatePropertyToYmdInterval({
      type: "date",
      date: { start: "2026-02-13T12:34:56.000Z", end: "2026-02-14T00:00:00.000Z" },
    }),
    { start: "2026-02-13", end: "2026-02-14" },
  );
});

test("intervalsOverlapYmd implements inclusive overlap", () => {
  assert.equal(
    intervalsOverlapYmd({ start: "2026-02-01", end: "2026-02-10" }, { start: "2026-02-10", end: "2026-02-12" }),
    true,
  );
  assert.equal(
    intervalsOverlapYmd({ start: "2026-02-01", end: "2026-02-09" }, { start: "2026-02-10", end: "2026-02-12" }),
    false,
  );
});

test("intervalsOverlapYmd includes long-range items overlapping selection", () => {
  assert.equal(
    intervalsOverlapYmd({ start: "2026-01-01", end: "2026-12-31" }, { start: "2026-02-10", end: "2026-02-10" }),
    true,
  );
});

