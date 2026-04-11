import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { loadPersonaKnowledge, resetKnowledgeCache } from "../src/kernel/resources.js";

test("knowledge loader rejects incomplete knowledge", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bazi-knowledge-"));
  fs.writeFileSync(
    path.join(dir, "knowledge.md"),
    ["# Prompt Knowledge", "", "## Persona Knowledge", "", "```json persona-knowledge", JSON.stringify({ stem_to_element: {} }), "```", ""].join("\n"),
    "utf8",
  );
  assert.throws(() => loadPersonaKnowledge(dir), /incomplete/);
});

test.after(() => {
  resetKnowledgeCache();
});
