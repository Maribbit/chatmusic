# 探测与捕获 (Detection Specs)

本规格定义了 ChatMusic 如何在各种不可预测、持续动态变化的宿主网页中，精准定位并提取 ABC 乐谱代码块。

## 1. 核心概念

* **检测器 (Detector)**：这是一个解耦的环境嗅探层。它的唯一使命是：输入一个 DOM 元素（通常是整个 document），输出一个包含所有合法 ABC 代码块配置的数组。
* **DOM 静态化**：AI 对话网页中的代码块可能是流式输出的 (Streaming)。探测器需要通过防抖机制 (Debounce) 来避免在代码未输出完毕时进行无意义的不完整乐谱渲染。

## 2. 边界与限制

* **无权渲染**：探测层**不**负责渲染。它只需标记 `pre` 元素或提取文本字符串，然后通过消息传递或回调，将目标元素移交给 Rendering 层。
* **状态幂等**：检测过程必须是幂等的。对同一个页面重复运行检测器，不应该导致重复注入、内存泄漏或逻辑崩溃。通过 WeakMap、DOM `dataset` 标记等方式确保 `Element` 只被处理一次。

## 3. 平台策略 (Provider Strategies)

当前需要处理的核心适配源包括不同的 AI 平台代码块容器特征：

1. **Generic (通用嗅探)**
   * **特征**：查找带有 `language-abc` 类的 `<code>` 标签，或者查找不带任何语言类的 `<pre>` 标签。
   * **规则**：通过正则 (`/^X:\s*\d+/m`) 检查其内部纯文本，如果包含 ABC 记谱法标志符（如头部的 `X:`），即标记为有效乐谱源。
2. **特殊网站适配层 (e.g. Gemini / DeepSeek)**
   * **必要性**：某些商业站点使用高度自定义的代码块渲染（如非标准的复制按钮、隐藏 DOM 节点）。针对特定 `location.hostname` 实施定向提取策略，绕过 Generic 的误判。

## 4. 数据流动契约

* **输入**: 网页发生突变事件 (`MutationRecord`)。
* **聚合**: 防抖器 (Debounce) 将多个繁杂事件降噪。
* **嗅探**: 根据当前页面 `hostname` 获取最佳 `Detector`。
* **输出**: 
  ```typescript
  interface DetectedBlock {
     container: Element; // 将被插入播放器的目标容器
     abcText: string;    // 清洗后的纯正 ABC 文本
  }
  ```
* **生命周期**: 移交给 Player 接口，检测器生命周期终止。

## 代码与测试映射 (Code & Verification Map)

* **源码锚点**
   * `src/content/index.ts`: 负责页面突变监听、扫描调度、播放器挂载生命周期。
   * `src/content/detector.ts`: 负责对外暴露检测入口和检测结果结构。
   * `src/content/detectors/`: 负责通用检测器、站点特化检测器和检测器选择策略。
* **测试锚点**
   * `src/content/detectors/index.test.ts`: 验证扫描入口能返回 DOM 子树中的 ABC 匹配结果。
   * `src/content/detectors/generic.test.ts`: 验证通用 ABC 代码块识别、强/弱置信头部规则和非 ABC 拒绝逻辑。
   * `src/content/detectors/providers/gemini.test.ts`: 验证 Gemini 特化代码块识别和去重策略。
   * `src/content/detectors/providers/deepseek.test.ts`: 验证 DeepSeek 特化代码块识别和去重策略。
