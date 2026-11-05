# pi-low-compact

Pi 扩展包:注册一个虚拟模型,让**压缩总结走低 thinking effort,主对话保持用户选择的 level**。

## 解决的问题

pi 的内置压缩(auto-compaction 和 `/compact`)继承会话的 thinking level 生成总结。
在本地模型 `sk-llama/qwen3.8-27b` 上,会话选 `high` 会被 `thinkingLevelMap` 映射成 `xhigh`,
reasoning token 与总结正文**共享同一个输出预算** `min(0.8 × reserveTokens, model.maxTokens)`
(默认 13107 token)。总结写到一半触顶时 pi 拒绝保存不完整的 checkpoint:

```
Auto-compaction failed: Summarization failed: generation hit the token cap
and the summary is incomplete
```

## 原理

利用 Pi 的[虚拟模型](https://pi.dev)路由:每个请求发出前都经过 `route()`,
请求带有原因 `reason`:

| reason | 含义 |
|---|---|
| `user` | 用户消息后的首次请求 |
| `continuation` | agent 循环内(工具结果后等) |
| `retry` | 失败后自动重试(含上下文溢出压缩后的重试) |
| `direct` | **agent 循环外的请求:压缩总结、分支总结等** |

本插件注册的虚拟模型 `sk-llama/qwen3.8-27b-lowcompact` 把 `direct` 请求路由到
物理模型 `sk-llama/qwen3.8-27b` + `thinkingLevel: "low"`,其余请求原样透传用户
选择的 level。压缩流程本身仍走 pi 内置 `compact()`(结构化格式、文件清单继承、
split-turn 处理全部保留),只是最终那次总结调用的 effort 降下来了。

## 安装

本地路径包(与 `pi-train` 同目录约定):

```bash
pi install /Users/lixiang/fromGit/pi-low-compact
```

或写入 `~/.pi/agent/settings.json`:

```json
{
  "packages": ["../../fromGit/pi-low-compact"]
}
```

重启 pi 后:

1. `/model` 选择 `sk-llama/qwen3.8-27b-lowcompact`(或设为 `defaultModel`);
2. 会话里照常选 thinking level(如 `high`);
3. 触发压缩时,底部状态栏会显示路由结果,例如
   `qwen3.8-27b-lowcompact • high → qwen3.8-27b • low`。

## 配置

`extensions/low-compact/index.ts` 顶部的常量:

- `PHYSICAL_PROVIDER` / `PHYSICAL_MODEL_ID`:要包装的物理模型;
- `VIRTUAL_ID` / `VIRTUAL_NAME`:虚拟模型在 `/model` 中的名字;
- `DIRECT_THINKING_LEVEL`:`direct` 请求使用的 level(默认 `low`);
- `CONTEXT_WINDOW` / `MAX_TOKENS`:需与 models.json 中物理模型一致
  (虚拟模型首条响应前用它计算上下文用量)。

## 测试

```bash
npm test
```
