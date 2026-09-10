import assert from "node:assert/strict";
process.env.DRY_RUN = "1";
const { selectClassificationBatch, CONFIG } = await import("./fetch-news.js");

// Reproduce the incident: 132 candidates, furniture at the very end.
const candidates = Array.from({ length: 132 }, (_, i) => ({
  source: i < 116 ? `core-${Math.floor(i / 8)}` : `furniture-${Math.floor((i - 116) / 8)}`,
  headline: `article-${i}`,
}));
const state = {};
const batch = selectClassificationBatch(candidates, state, 30);
assert.equal(batch.length, 30);
for (const source of new Set(candidates.map(x => x.source))) {
  assert.ok(batch.some(x => x.source === source), `${source} must get a turn`);
}
assert.equal(new Set(batch).size, 30);
assert.equal(candidates.length, 132);

// When feed count exceeds the budget, the next run resumes at the omitted feed.
const many = Array.from({ length: 35 }, (_, i) => ({ source: `feed-${i}` }));
const cursor = {};
const first = selectClassificationBatch(many, cursor, 30);
const second = selectClassificationBatch(many, JSON.parse(JSON.stringify(cursor)), 30);
assert.equal(first.length, 30);
assert.deepEqual(second.slice(0, 5), many.slice(30));
assert.equal(new Set([...first, ...second]).size, 35);
assert.deepEqual(selectClassificationBatch([], cursor), []);
assert.deepEqual(selectClassificationBatch(many, cursor, 0), []);
assert.equal(selectClassificationBatch(many.slice(0, 2), {}).length, 2);
assert.equal(selectClassificationBatch(many, { nextClassificationSource: "removed" }, 1)[0], many[0]);
assert.equal(CONFIG.limits.maxArticlesPerRun, 30);
for (const source of CONFIG.rssSources.filter(x => x.name.includes("가구·인테리어"))) {
  assert.equal(source.maxArticles, 100);
}
console.log("source fairness tests passed");
