# 厂商噪声速查

处理 watcher Issue 前先看这里。原则：**官网定价页 > 聚合目录 > 页面通用价格 token**。

## 通用判断

- 同一型号在聚合目录与官网价格不同：优先官网；聚合价可能是渠道价、区域价或汇率折算。
- 套餐价、订阅价、充值档位、credits 包、用量计算器：不是 API 刊例价，不能写进 `data/providers.json`。
- 页面出现 `$26/$31/$44` 或 `$62/$69/$87` 这类连续数字：先确认是不是套餐/计算器，而不是模型单价。
- 模型 ID 的 `-`、`.`、`_` 差异（如 `viduq4preview` 与 `viduq4-preview`）先按 canonical 比对；不要因为标点不同就新增型号。
- 官方页面地区/币种变体：本站优先使用该厂商对中国开发者公开的官方页与原始币种。

## DeepSeek

- 官方定价：`https://api-docs.deepseek.com/quick_start/pricing`
- 价格有工作日高峰/空闲双档；Pro 空闲/高峰输入 `$0.66–1.32`，输出 `$1.98–3.96`，缓存命中 `$0.022–0.044`。
- OpenRouter 上的 DeepSeek 价格是渠道价，可能落在官网区间内但持续浮动。**不要根据 OpenRouter 改站。**
- 官网未变而聚合价变化：判定为渠道价，只刷新基线。

## ElevenLabs

- API 定价入口：`https://elevenlabs.io/pricing/api`
- 真正的 API 单价：v4 TTS `$0.08 / 1K 字符`，v4 Turbo `$0.04`，Scribe v2 `$0.22 / 小时`，Realtime `$0.39 / 小时`。
- 页面同时包含 Starter/Creator/Pro/Scale/Business 套餐价（`$6/$22/$99/$299/$990`）与用量计算器数字；这些 token 会随 A/B、月付/年付切换变化。
- 只有 API 单价/模型列表变化才改站；套餐数字变化视为噪声。
- 若该页持续抖动，可在 `sources.json` 给 ElevenLabs 定价页设置 `priceSignal: false`，改为手动核对。

## Kling

- 视频定价：`https://kling.ai/document-api/pricing/base/video`
- 价格单位是 `Unit/s`，站点沿用既有换算：`1 Unit ≈ $0.14`。写价格时保留 Unit 口径，并在 detail/note 中说明换算。
- Kling 4.0 是预览/早期访问，价格仅为 preview；Kling 4.0 Flash 为 Coming Soon、TBA。不要把预览价写成正式价。
- 页面模型名是 `Kling 4.0`、`Kling 3.0 Turbo` 这种带空格形式；watcher 会归一化为 `kling-4.0`、`kling-3.0-turbo`。
- 4.0 预览价：720p 无视频输入 1.0 Unit/s，1080p 1.5 Units/s；带视频输入 0.6/0.9 Units/s；未列 4K。

## Vidu

- 官方定价：`https://platform.vidu.cn/pricing`
- 以积分计价：`1 积分 = ¥0.03125`；Q4 Preview 每秒 9/19/24/38/78 积分（540p/720p/1080p/2K/4K）。
- 不要把“积分/秒”直接当人民币；换算后才写入 `price.detail`。
- Q4 Preview 仍是预览版；API 模型 ID 常见 `viduq4preview`，站点用 `viduq4-preview`，靠 canonical 对齐。
- 定价页与模型页都适合 Playwright 渲染，配置里已开启。

## 火山方舟

- 官方定价页：`https://www.volcengine.com/docs/82379/1544106`
- 页面懒加载，型号集合会抖动；`sources.json` 已设置 `modelSignal: false`，只监控价格。
- 新型号优先看 models.dev 的 `volcengine` 与 OpenRouter 的 `bytedance-seed`。
- 方舟页面也会列出托管的 DeepSeek/GLM/Kimi 模型；不要把第三方托管模型归到火山自有型号。
- 价格 token 是人民币，保留原单位。

## 阿里云百炼

- 官方定价：`https://help.aliyun.com/zh/model-studio/model-pricing`
- 人民币/百万 tokens，按上下文长度分档；页面型号很多，先定位具体 Qwen/Wan/QVQ 行。
- 新增型号优先核对官方模型 ID；不要用展示名代替 `id`。

## 月之暗面 Kimi

- 官方定价：`https://platform.kimi.com/docs/pricing/chat`
- 人民币/百万 tokens，含缓存命中价；K3/K3.1 等新版本以官方型号页为准。
- 页面价格 token 较稳定；型号新增通常可信，但仍需打开官方页确认。

## 智谱 GLM

- 官方定价：`https://docs.bigmodel.cn/cn/guide/start/pricing`
- 人民币/百万 tokens，部分型号按上下文长度分档；GLM 系列命名含 `flash`、`flashx` 等后缀。
- 不要把套餐/编码套餐价格当成 API 单价。

## MiniMax

- 官方定价：`https://platform.minimax.cn/docs/pricing/overview`
- M3.1 Flash：输入 ¥1 / 输出 ¥4 / 缓存 ¥0.1（每百万 tokens）。
- M3 为永久五折后价格，超过 512K 上下文后跳档；语音按万字符（1 汉字 = 2 字符）。
- 语音、视频、图像各自单位不同，不要统一换算。

## Black Forest Labs

- 官方定价：`https://bfl.ai/pricing`
- 页面会混有套餐/credits 数字（如 `$26–$45` 一带），模型单价以具体 FLUX 型号行 / 每图或每百万像素价格为准。
- 只出现一组连续金额变化时，先确认是套餐还是模型行；不确定就不改站。

## Luma / Runway

- Luma：`https://docs.agents.lumalabs.ai/guides/pricing/`；按秒/张计价，页面也有套餐与计算器数字。
- Runway：`https://docs.dev.runwayml.com/guides/pricing/`；常见 credits/秒，先确认是 credits 还是美元，再写单位。
- 两者的模型组合（分辨率、时长、是否有音频）会改变单价，不要用最低价代表全型号。

## Cartesia / Deepgram / AssemblyAI

- Cartesia：API 按分钟/字符，页面同时有订阅套餐；TTS 文档页价格 token 会抖动，已对该页关闭价格信号。
- Deepgram：按分钟计价，页面有套餐与月费；模型总览页只用于型号信号，价格信号已关闭。
- AssemblyAI：按音频小时计价，页面有套餐与月费；模型总览页只用于型号信号。
- 这三家优先看 API 单价表，不要被套餐月费或计算器数字带走。

## Anthropic / OpenAI

- Anthropic：`https://claude.com/pricing` 可访问；模型总览有地区限制，当前不监控。新模型可从 OpenRouter 发现，但价格要人工核对官方页。
- OpenAI：官方定价页对脚本返回 403，Playwright 也可能被拦截；只把聚合目录当线索，不要直接写入官方价格。
- 这两家出现 `unavailable` 是已知限制，不是数据变化；不要因此改站或关闭 Issue。

## 何时改 sources.json

- 同一页面反复产生同类噪声：加 `priceSignal: false` 或 `modelSignal: false`。
- 页面需要 JS 渲染：`render: true`，必要时调 `waitMs`、`scroll`、`attempts`。
- 型号正则误抓导航/资源名：收窄 `modelPatterns`。
- 修改后运行 `npm run watch:update`，把 watcher 配置和基线分开提交。
