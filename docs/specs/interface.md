# 独立组件视图 (Interface Specs)

本规格针对所有侵入第三方宿主页面的播放器 UI 组件进行约束。核心前提是：**假定我们的组件随时会被恶意的宿主全局 CSS 破坏，因此必须实施最高级别样式与属性的绝对防御。**

## 1. 核心概念

* **侵入式 Shadow DOM (Web Components Defense)**
  外部宿主 (如 ChatGPT 网站的 Tailwind 全局污染) 不可预测，我们需要构建一个自带防护罩的 DOM 闭环。
* **内联化样式装配 (Inline Style Assembly)**
  由于扩展程序注入方式的限制，我们无法在目标页面安全地通过 `<link>` 插入外部样式文件。
  * **策略**: 构建工具需将所有拆分好的子组件样式编译为一整串文本模板，以 `?inline` 的方式最终挂载到 `ShadowRoot` 下。

## 2. 设计规范与状态管理

在无框架环境 (Vanilla JS) 且仅靠 Web Component API 支持状态机的情况下：

### 2.1 主题系统 (Color Strategy)
* **状态来源**: 读取外部的 `data-chatmusic-theme`。
* **规则**: 不依赖宿主的字体，字体需强制指定为 `font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto...`，对背景和 SVG 各个部件颜色的调用必须全用 CSS Variables (`--chatmusic-bg`, `--chatmusic-text`) 来管理 Light/Dark Mode。禁止在 TS 中手写逻辑替换颜色。

### 2.2 控制栏状态流动
* **单一状态流向**: UI 是状态的倒影。如“播放按钮”，它的形态响应来自底层的 `Playback Engine`，按钮本身的 `onclick` 只负责派发 (Dispatch) “尝试播放”事件。这是一种单向数据流。
* **核心组件群**：
   1. 头部 (Header): 展示歌名与元数据。
   2. 音频栏 (Audio Track): 统御时间、音频渲染。
   3. 琴键显示 (Keyboard): 将听觉映射到视觉黑白键。
   4. 对话框 (Quality/Diagnostic Panels): 显示代码警告的浮层容器。

## 3. 约束限制与架构纪律

* **禁止全局污染**：绝对禁止直接向 `window` 或者不属于自身的 `document.body` 根节点中附加逻辑变量。
* **无状态事件解绑**：每当检测到对应 DOM 被移出聊天界面（组件卸载），所有的事件监听 (Event Listeners)、ResizeObservers 必须 100% 被注销。
* **尺寸安全**：按钮不能因为多国语言渲染或异常字符导致破版；为控制图标设定最小点按面积 (`min-width`/`min-height: 28px` + 视觉补白)，符合触区防错 (Touch Target) 准则。

## 代码与测试映射 (Code & Verification Map)

* **源码锚点**
  * `src/player/renderer.ts`: 负责 Shadow DOM 播放器实例创建、更新和销毁。
  * `src/player/view/`: 负责播放器视图、主题解析、乐谱视图封装和样式入口。
  * `src/player/view/styles/`: 负责 Shadow DOM 内联样式分片。
  * `src/player/components/`: 负责控制栏、键盘、质量面板、全屏、代码折叠等独立 UI 控件。
* **测试锚点**
  * `src/player/view/theme.test.ts`: 验证手动主题、自动深浅色检测、透明背景合成和系统偏好回退。
  * `src/player/renderer.test.ts`: 验证播放器实例生命周期、质量反馈展示、进度交互和源码高亮回调。
  * `src/player/components/code-toggle.test.ts`: 验证代码折叠按钮的可访问状态和事件派发。
  * `src/player/components/keyboard-toggle.test.ts`: 验证键盘显示按钮的可访问状态和事件派发。
  * `src/player/components/fullscreen-toggle.test.ts`: 验证全屏支持探测和目标元素全屏请求。
  * `src/player/components/quality-panel.test.ts`: 验证诊断面板展示、清空隐藏和复制反馈事件。
  * `src/player/components/tempo-control.test.ts`: 验证速度控制组件的状态同步和无效输入处理。
