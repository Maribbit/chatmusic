# 独立工作台 (Studio Specs)

本规格定义了 ChatMusic Studio Web APP 的全貌。这是一块独立于浏览器扩展外的、带有完备交互能力的富文本编辑生态。

## 1. 核心概念与定位

* **零依赖独立空间的本质**：Studio 的定位是“草稿本”和“乐谱游乐场”。它不能耦合诸如 `chrome.storage` 等只有浏览器插件环境才存在的专属 API。它是一个纯客户端运行、无需后端数据库，可以在 `localhost` 或 Github Pages 单独全量存活的应用程序。
* **Player 的超级容器**：通过直接引入独立的 Player Widget 模块作为它的“播放内核”(Preview Pane)，向外部证实了项目架构的单向解耦边界足够清爽。

## 2. 状态映射与持久化

因为是无后端的客户端应用，状态的“生命周期”是所有架构考量的重中之重。

### 2.1 URL Hash 持久化路由
这是工作台实现跨设备分享和草稿恢复的核心链路：
* **数据编码**：当前所有 Monaco 或 TextArea 中存在的内容 (代码状态)、用户调整好后的配置（BPM 重写），通过 LZW 类似无损压制算法混合为 Base64，实时映射到浏览器的 `window.location.hash`。
* **数据反编**：当新用户点击分享的 Hash 链接进入时，系统在初始化阶段剥离并解密出 `Source Text` 并灌入渲染槽（Renderer）。

### 2.2 本地私有状态
* **规则**：编辑器自动换行配置、主题深浅色配置 (Theme)、工作台的左右或上下分屏配置 (Layout Splitting)，被存入浏览器的 `localStorage` 中。这些内容属于用户私有 UX 偏好，不能随 Hash 进行共享。

## 3. 业务生态链路

* **左屏：源码动作 (Source Actions)**
  * Monaco 或原生输入区。
  * 文件级的载入(Import `.abc` / `.txt`)
  * 文件级的下载保存(Export)
  * 剪贴板的复制粘帖捕获(Clipboard API)。
* **右屏：Player 代理**
  * 将用户的左侧内容每隔 `350ms` (输入防抖期) 传送给右测 Player 子应用重新呈现结果、生成音频进度并在报错面板下发诊断说明。
* **响应式降维**
  * 在移动端环境，强制把分屏 (Split) 的左右结构，降级为上下结构堆叠栈，由媒体查询主导 (`CSS Media Query`)。

## 代码与测试映射 (Code & Verification Map)

* **源码锚点**
  * `src/studio/`: Studio 应用主逻辑、分栏、源码操作、展示状态、质量报告和渲染控制目录。
  * `src/shared/studio-url.ts`: Studio hash 分享与扩展内 Studio URL 生成逻辑。
  * `src/shared/abc-file.ts`: ABC / 文本文件导入导出辅助逻辑。
  * `src/shared/filename.ts`: 从 ABC 标题生成安全文件名的共享逻辑。
* **测试锚点**
  * `src/studio/settings-store.test.ts`: 验证 Studio 设置在 localStorage 与扩展 storage 中的加载、回退和保存。
  * `src/studio/rendering.test.ts`: 验证空输入清理、ABC 修剪渲染和播放高亮偏移。
  * `src/studio/quality-report.test.ts`: 验证诊断面板呈现、清理隐藏和质量状态文本映射。
  * `src/studio/presentation.test.ts`: 验证编辑器换行、高亮镜像、主题解析和布局 class 应用。
  * `src/studio/source-actions.test.ts`: 验证源码统计、空源码动作禁用和导入错误规范化。
  * `src/studio/source-highlight.test.ts`: 验证源码高亮范围合并、标记片段生成和播放器高亮偏移。
  * `src/studio/split-layout.test.ts`: 验证桌面/移动分栏尺寸恢复、方向切换和键盘调整边界。
  * `src/shared/studio-url.test.ts`: 验证 Studio hash 往返、非 Studio hash 拒绝和扩展 Studio URL 生成。
  * `src/shared/abc-file.test.ts`: 验证 ABC / 文本文件接收、源码导入、扩展名拒绝和导出文件名。
  * `src/shared/filename.test.ts`: 验证 ABC 标题读取、危险文件名字符清洗和缺省文件名。
