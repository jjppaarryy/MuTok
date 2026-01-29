import assert from "node:assert/strict";
import test from "node:test";
import { buildOnscreenAndCaption, countHashtags } from "./plannerCoreUtils";
import { applyRecoveryRules } from "./plannerRecovery";
import { defaultRules } from "./rulesConfig";

test("countHashtags counts distinct tags", () => {
  assert.equal(countHashtags("#one #two #three"), 3);
  assert.equal(countHashtags("no tags here"), 0);
});

test("buildOnscreenAndCaption enforces hashtag limits", () => {
  const rules = JSON.parse(JSON.stringify(defaultRules));
  rules.spam_guardrails.hashtag_count_min = 2;
  rules.spam_guardrails.hashtag_count_max = 5;

  const ok = buildOnscreenAndCaption({
    beat1: "Beat 1",
    beat2: "Beat 2",
    captionTemplate: "Hello #one #two",
    rules
  });
  assert.ok(ok.onscreenText);

  const tooFew = buildOnscreenAndCaption({
    beat1: "Beat 1",
    beat2: "Beat 2",
    captionTemplate: "Hello #one",
    rules
  });
  assert.ok(tooFew.warning);
});

test("applyRecoveryRules disables montage and comment CTA", () => {
  const recovery = { active: true, viewsDrop: 0.8, view2sDrop: 0.3, spamErrors: 1 };
  const rules = JSON.parse(JSON.stringify(defaultRules));
  rules.allowed_containers = ["static_daw", "montage"];
  rules.viral_engine.allowed_cta_types = ["KEEP_SKIP", "COMMENT_VIBE"];

  const result = applyRecoveryRules(rules, recovery);
  assert.ok(!result.allowed_containers.includes("montage"));
  assert.ok(!result.viral_engine.allowed_cta_types.includes("COMMENT_VIBE"));
});
