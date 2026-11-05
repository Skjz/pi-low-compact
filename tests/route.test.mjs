import assert from "node:assert/strict";
import test from "node:test";

import { decideThinkingLevel } from "../extensions/low-compact/index.ts";

test("direct 请求(压缩总结/分支总结)降为 low", () => {
	assert.equal(decideThinkingLevel("direct", "high"), "low");
	assert.equal(decideThinkingLevel("direct", "xhigh"), "low");
	assert.equal(decideThinkingLevel("direct", "medium"), "low");
	assert.equal(decideThinkingLevel("direct", "low"), "low");
});

test("direct 请求低于目标 level 时保持原样", () => {
	assert.equal(decideThinkingLevel("direct", "off"), "off");
	assert.equal(decideThinkingLevel("direct", "minimal"), "minimal");
});

test("主对话请求(user/continuation/retry)原样透传", () => {
	for (const reason of ["user", "continuation", "retry"]) {
		for (const level of ["off", "low", "medium", "high", "xhigh"]) {
			assert.equal(decideThinkingLevel(reason, level), level);
		}
	}
});
