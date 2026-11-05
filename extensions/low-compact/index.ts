/**
 * pi-low-compact
 *
 * 注册一个虚拟模型:主对话原样使用用户选择的 thinking level,
 * 而 "direct" 请求(pi 压缩总结、分支总结等 agent 循环外请求)
 * 自动降为低 effort。
 *
 * 背景:pi 内置压缩继承会话的 thinking level。本地模型
 * sk-llama/qwen3.8-27b 在高 level 下(会话 high 会映射成 xhigh),
 * reasoning token 与总结正文共享同一个输出预算
 * min(0.8 * reserveTokens, model.maxTokens)(默认 13107 token),
 * 导致总结被截断:
 *   "Auto-compaction failed: Summarization failed: generation hit
 *    the token cap and the summary is incomplete"
 * 压缩时降为 low 后 reasoning 占用大幅下降,把输出预算还给总结正文。
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/** 物理模型:对话与压缩都走它 */
const PHYSICAL_PROVIDER = "sk-llama";
const PHYSICAL_MODEL_ID = "qwen3.8-27b";

/** 虚拟模型 id(/model 中显示)。不得与同 provider 下物理模型 id 冲突 */
const VIRTUAL_ID = "qwen3.8-27b-lowcompact";
const VIRTUAL_NAME = "Qwen3.8-27B (low-effort compaction)";

/** "direct" 请求(压缩总结/分支总结)使用的 thinking level */
const DIRECT_THINKING_LEVEL = "low";

/** 已经低于目标 level 的级别保持原样(不能为了"降"反而开 reasoning) */
const BELOW_DIRECT_LEVELS = new Set(["off", "minimal"]);

/** 与 ~/.pi/agent/models.json 中 sk-llama/qwen3.8-27b 保持一致 */
const CONTEXT_WINDOW = 107776;
const MAX_TOKENS = 107776;

/**
 * 决定一次请求的 thinking level。
 *
 * @param reason pi 路由原因:user / continuation / retry / direct
 * @param requested 会话当前选择的 level
 */
export function decideThinkingLevel(reason: string, requested: string): string {
  if (reason !== "direct") return requested;
  return BELOW_DIRECT_LEVELS.has(requested) ? requested : DIRECT_THINKING_LEVEL;
}

export default function (pi: ExtensionAPI) {
  pi.registerVirtualModel({
    provider: PHYSICAL_PROVIDER,
    id: VIRTUAL_ID,
    name: VIRTUAL_NAME,
    thinkingLevels: ["off", "low", "medium", "high", "xhigh"],
    contextWindow: CONTEXT_WINDOW,
    maxTokens: MAX_TOKENS,
    route(request, ctx) {
      const physical = ctx.modelRegistry.find(PHYSICAL_PROVIDER, PHYSICAL_MODEL_ID);
      if (!physical) {
        throw new Error(
          `pi-low-compact: 物理模型 ${PHYSICAL_PROVIDER}/${PHYSICAL_MODEL_ID} 不在模型目录中`,
        );
      }
      return {
        model: physical,
        thinkingLevel: decideThinkingLevel(request.reason, request.thinkingLevel),
      };
    },
  });
}
