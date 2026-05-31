# 播放引擎 (Playback Specs)

本规格定义了 ABC 乐谱底层如何被转换为声音信号，以及整个音频生命周期的状态转移、时序对齐规则。

## 1. 核心概念

* **Soundfont 调度**：网络字体（如 `.mp3` 音频切片，当前依赖 FluidR3_GM）的异步按需加载，避免造成宿主页面的重度阻塞。
* **合成器状态机 (Synth Control)**：一个基于 Promise 的受控音频流状态对象。管理就绪(`ready`)、正在播放(`playing`)、暂停(`paused`)和销毁(`disposed`)阶段。
* **时序与节拍 (Timing & Tempo)**：乐谱播放的内在时钟（BPM），并支持动态变速劫持。

## 2. 数据流动与状态同步

### 2.1 播放器游标机制
* **核心难题**：浏览器音频时钟和 UI 渲染线程之间的时差。
* **规则**：不应由定时器 `setInterval` 被动轮询，而是需要依赖解码引擎（即 ABCjs 生成的 MIDI event stream）返回的时间戳和事件回调 (Event callback)。
* **状态映射**：每当一个音符触响，回调将下发 `startChar` 和 `endChar` 索引。通过此索引，在渲染完成的代码镜像 (Mirror) 与 SVG 元素中更新选中态（Highlight）。

### 2.2 变调与变速
* **Tempo 覆盖**：用户手动通过 UI 设置的 BPM 值需优先生效。如果取消勾选/重置，系统需要退回 ABC 代码 `Q:` 标签标定的源头 BPM。

## 3. 约束与边界

* **不依赖视觉层操作声音**：合成引擎不得直接查询 DOM (如 `document.getElementById('play-btn')`) 来判断状态。声音与状态是数据层驱动的业务纯逻辑。
* **并发阻断策略 (Singleton Synth Guarantee)**：在多代码块并存的页面中，不允许两个以上的乐谱同时播放。
  * **契约**：当合成器触发 `play` 事件时，必须向全局发布信号；若收到其他合成器的全局 `play` 信号，当前合成器必须立即自行 `pause`。
* **资源的优雅释放**：当代码块被网页单页刷新 (SPA Navigation)或 Vue/React 框架销毁时，正在播放的声音**必须**能被监听到并正确触发 `Stop/Dispose`，防止后台产生幽灵音。 

## 代码与测试映射 (Code & Verification Map)

* **源码锚点**
  * `src/player/playback/`: 播放时序、BPM、音色库、合成器、进度、高亮同步的核心实现目录。
  * `src/player/components/tempo-control.ts`: 播放速度控制 UI 与 abcjs tempo 输入的桥接点。
  * `src/player/renderer.ts`: 播放生命周期、进度拖拽、源码高亮回调与组件实例释放的集成点。
* **测试锚点**
  * `src/player/playback/duration.test.ts`: 验证总时长读取、事件回退、速度倍率和展示格式。
  * `src/player/playback/tempo.test.ts`: 验证基础 BPM 读取、速度倍率换算、按小节时序推导和无效值展示。
  * `src/player/playback/soundfont.test.ts`: 验证内置钢琴 Soundfont 路径和播放音符重写策略。
  * `src/player/components/tempo-control.test.ts`: 验证速度控制组件对 abcjs tempo 输入与不可用时长状态的同步。
  * `src/player/renderer.test.ts`: 验证播放实例清理、进度拖拽起播、播放事件到源码高亮回调的集成行为。
