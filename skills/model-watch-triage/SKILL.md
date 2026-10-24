---
name: model-watch-triage
description: Triage and resolve automated model-watch GitHub issues in this repository. Use when an issue titled "[model-watch] 检测到厂商模型或价格更新" appears, when handling reports/watch-latest.md or .json, or when asked to verify and update model pricing after a watch scan. Covers official-source verification, filtering reseller/plan/dynamic-price noise, updating data/providers.json, rebuilding, committing data separately, and refreshing data/watch/snapshot.json.
---

# Model Watch Issue 处理

## 适用场景

- 收到标题为 `[model-watch] 检测到厂商模型或价格更新` 的 Issue。
- 需要处理 `reports/watch-latest.md` 或 `reports/watch-latest.json`。
- 需要把扫描到的型号或价格变化同步进 `data/providers.json`。
- 需要判断某个变化是真实更新还是渠道价、套餐价、动态页面等噪声。

## 核心原则

1. **官网是唯一准绳**：聚合目录（OpenRouter、models.dev）只提供线索，不能直接作为刊例价来源。
2. **保留原币种与原计价单位**：不要为了比较而把 token、字符、秒、credits 强行换算成同一口径。
3. **先分类再改数据**：无效变化只刷新 watcher 基线，不改站点价格。
4. **数据、基线、自动化分开提交**：一次 commit 只做一类事情，便于回滚和 review。
5. **Issue 最后关闭**：确认数据已更新、基线已刷新后再关闭，否则下一次扫描会继续提示。

## 快速处理流程

### 1. 读取报告

```bash
npm run watch        # 生成最新报告，不改快照
```

查看 `reports/watch-latest.md`；机器可读版本在 `reports/watch-latest.json`。报告分为：

- **方案 A · 聚合目录**：新增型号、价格变化、目录中消失。
- **方案 B · 官方页面**：页面型号 ID 与价格 token 的集合变化。

### 2. 判断变化来源

| 报告位置 | 先做什么 | 能不能直接改站 |
| --- | --- | --- |
| 聚合目录新增型号 | 到该厂商官方模型页确认型号 ID、上下文、价格 | 确认后才能 |
| 聚合目录价格变化 | 打开官方定价页，找同一型号同一计价单位 | 只有官网同价才能 |
| 官方页面新增型号 | 打开链接，确认型号 ID、状态、规格、价格 | 确认后才能 |
| 官方页面价格 token 变化 | 打开链接，定位到具体型号行 | 先排除套餐、积分、汇率、A/B 噪声 |

**不要**仅凭 OpenRouter 或 models.dev 的数字改 `data/providers.json`。这两个目录可能混入渠道价、区域价、促销价或历史型号。

### 3. 区分有效更新与无效更新

有效更新通常满足：

- 官方页面能直接看到对应型号或价格。
- 型号 ID、上下文、输出上限、计价单位能对上。
- 价格变化能定位到具体模型行，而不是套餐、充值档位或用量计算器。
- 变化在重复抓取后仍然存在。

无效更新通常包括：

- 聚合目录的渠道价/汇率浮动，而官网未变。
- 套餐价、订阅价、credits 套餐、充值折扣。
- 价格计算器、用量滑杆、A/B 测试、地区/币种切换产生的数字。
- 页面脚注、示例代码、文档中的示例金额。
- 模型 ID 的标点差异或别名（先用 canonical 比对，不要直接新增型号）。

重复抓取仍不稳定时，不要改 `data/providers.json`；改为调整 `scripts/watch/sources.json` 的信号配置（见第 6 节）。

### 4. 更新模型数据

编辑 `data/providers.json` 时至少检查：

- 型号：`name`、`id`、`category`、`badge`、`description`、`tags`、`specs`、`docsUrl`。
- 多模态型号：按需加入 `alsoIn`（例如 `["multimodal"]`）。
- 价格：`price.primary`、`price.unit`、`price.detail`、`price.note`。
- 厂商文案：`summary`、`positioning`、`highlights`、`watchOuts`、`pricingNote`。
- 型号数量变化时同步 `data/site.json` 的 `hero.lede` 与 `updatedAt`。
- 不要删除仍可用的历史型号，除非官方已明确下线；下线时在文案中说明。

新增型号时优先使用官方模型 ID；站点内部 ID 与官方展示名不一致时，以官方 ID 为主，必要时在描述里保留展示名。

### 5. 验证与提交

```bash
npm run build
```

检查构建输出的厂商数、型号数是否合理；前端改动可用本地预览和截图复核。

推荐提交顺序：

```bash
# 1. 只提交站点数据
git add data/providers.json data/site.json
git commit -m "feat: update <vendor> models and pricing"

# 2. 确认数据后刷新基线
npm run watch:update
git add data/watch/snapshot.json
git commit -m "chore: update model watch baseline"

# 3. 再关闭 Issue，并写清楚更新了哪些型号/价格、哪些是噪声
```

如果只是无效变化：

```bash
npm run watch:update
git add data/watch/snapshot.json
git commit -m "chore: update model watch baseline"
# 关闭 Issue，说明为何判定为渠道价/套餐价/动态信号
```

不要把 `data/providers.json` 和 watcher 自动化代码混在同一个 commit，除非任务本身就是修改 watcher。

### 6. 处理反复出现的噪声

如果同一页面持续产生无效变化，修改 `scripts/watch/sources.json`：

- `priceSignal: false`：页面只监控型号，不监控价格 token（适合模型文档页、动态定价页）。
- `modelSignal: false`：只监控价格，不监控型号（适合懒加载页）。
- `render: true`：页面需要 Playwright 渲染（Kling、火山方舟、Vidu）。
- `waitMs`、`scroll`、`attempts`：控制渲染等待与重试。
- `modelPatterns`：收窄型号正则，减少导航/资源名噪声。
- `priceSignal`/`modelSignal` 可以放在厂商级 `official`，也可以放在单个 `extraPages` 条目。

修改后运行 `npm run watch:update` 建立新基线，并单独提交 watcher 配置。

## Issue 生命周期

- 扫描发现变化时，workflow 会查找标题相同的 **open** Issue；找到就更新正文，不会重复创建。
- Issue 只有在 **关闭** 后才可能在下次扫描新建；如果变化仍未处理，新 Issue 是预期行为。
- 变化消失时 Issue 不会自动关闭，需要人工关闭。
- 关闭前确认：数据已更新、`npm run build` 通过、`data/watch/snapshot.json` 已刷新并提交。

## 常用命令

```bash
npm ci
npx playwright install chromium   # 首次运行或浏览器升级后
npm run watch                     # 检测，不写快照
npm run watch:update              # 接受新基线
npm run build                     # 构建静态站点
```

## 厂商噪声速查

处理具体厂商前先读 `references/vendor-traps.md`。其中记录了 DeepSeek 渠道价、ElevenLabs 套餐价、Kling Unit 计价、Vidu 积分、火山方舟懒加载等已知坑。

## 完成标准

- [ ] 已打开官方链接核对，而不是只看聚合目录。
- [ ] 无效变化没有写入 `data/providers.json`。
- [ ] 有效变化已更新型号、价格与厂商文案。
- [ ] `data/site.json` 的日期和型号数已同步。
- [ ] `npm run build` 通过。
- [ ] 数据 commit 与基线 commit 分开。
- [ ] `data/watch/snapshot.json` 已刷新并提交。
- [ ] Issue 已关闭，并写明处理结论。
