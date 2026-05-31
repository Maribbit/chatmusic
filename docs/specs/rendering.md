# 乐谱渲染 (Rendering Specs)

本规格定义了从底层纯文本的 ABC 记谱法到最终能在浏览器渲染的高质量矢量乐谱 (SVG) 的转换和排版过程。

## 1. 核心概念

* **ABC 解析与呈现 (Parser & Engraver)**：通过底层引用的转换库（目前为 `abcjs`）将符合规范的纯文本转化为 DOM 中包裹 SVG 元素的抽象层。
* **质量诊断器 (Quality Diagnostics)**：在渲染过程中收集底层产生的词法 / 语法解析异常 (Warnings)，并将这些错误对齐并提示给用户，作为修改建议输入给大语言模型 (AI)。

## 2. 状态流动与界面映射

### 2.1 响应式乐谱重绘
宿主网站页宽不固定且频繁受侧边栏开合影响。
* **规则**：依靠 `ResizeObserver` 监听父级宽度的变动。
* **计算契约**：如果宽度变动幅度超过给定阈值 (Threshold)，通知底层 Engraver 使用现有的 AST 数据在新的 `staffwidth` 边界下重分布音符。要求**绝对不能**进行耗时的重新网络请求或从头重解析正则。

### 2.2 SVG 颜色覆写
大多数第三方乐谱库生成的 SVG 是在内联通过硬编码 `fill` 和 `stroke` 设置非黑即白的颜色。
* **隔离策略**：使用 CSS 控制而非修改 DOM，通过 `currentColor` 关键字强行覆写原生生成的 path 和 text 颜色。保证响应 Dark/Light 切换。具体样式规范请参阅 `interface.md`。

## 3. 边界条件限制

* 跨站脚本安全 (XSS)：由于底层 ABCjs 在渲染过程中可能直接注入 DOM，任何包含在源 ABC 中的标题 `T:` 文本、歌词 `w:` 的用户手写或 AI 生成字段必须进行转义清洗 (Sanitize)。
* 乐谱过长降级：对于极为冗长的乐谱输出，容器必须具备 `max-height` 和防外溢视口 (Viewport containment)，不能无底线撑爆宿主聊天页面。

## 代码与测试映射 (Code & Verification Map)

* **源码锚点**
	* `src/player/view/score-render.ts`: 负责 abcjs 乐谱 SVG 呈现的视图侧封装。
	* `src/player/renderer.ts`: 负责将检测到的 ABC 文本渲染成播放器实例，并处理 abcjs warning 反馈。
	* `src/player/exports/`: 负责播放器侧 SVG 导出动作与序列化。
	* `src/shared/abc-quality/`: 负责 ABC 质量诊断、warning 清洗和 AI 修复提示格式化。
	* `src/shared/abc-midi-export.ts`: 负责 MIDI 数据导出辅助逻辑。
* **测试锚点**
	* `src/player/renderer.test.ts`: 验证 abcjs warning 展示、line wrapping 渲染和渲染生命周期集成。
	* `src/player/exports/svg-export.test.ts`: 验证 SVG 文件名、危险字符清洗、缺省标题和 SVG 序列化。
	* `src/shared/abc-quality/validate.test.ts`: 验证空输入、干净 ABC、abcjs warning 到诊断对象、HTML 清洗和 AI 修复提示。
	* `src/shared/abc-midi-export.test.ts`: 验证 MIDI 文件名、二进制 MIDI 数据和 Blob 包装。
