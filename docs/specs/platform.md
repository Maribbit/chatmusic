# 平台侧集成 (Platform Specs)

本规格负责定义整个应用如何打包成可以在各个独立平台顺利落地的产品形态。核心难点在于同时支持“浏览器插件系统 (Browser Extension Manifest V3)”与“静态网站 (Static Single Page App)”。

## 1. 构建管道 (Dual-Build Pipeline)

* **概念拆解**:
  * 浏览器插件管线 (Extension Build)：产出 Background Worker, Content Scripts (注入到任意宿主的检测代码), Popup 界面结构 和 Metadata 文件。需要严格的 Vite Rollup 配置切分开不同入口。
  * 独立工作台管线 (Web Studio Build)：抛弃以上组件，直接产出一个 `index.html` 以及内聚的 `assets/` 静态文件夹。

## 2. Chrome Extension 架构约束

### 2.1 Manifest V3 通讯隔离
系统主要分为三大块，严禁破坏相互通讯的安全墙逻辑。
* **Content Script (前线哨兵)**:
  * 角色：隐身潜伏在用户浏览的页面 (如 ChatGPT 页面)。
  * 通讯方式：仅可识别页面特征，并在发生 DOM 变异或者检测到可转换文本块时激活独立组件逻辑。它需要调用 `chrome.runtime.sendMessage` 请求特定的离线或者安全状态 (比如向后台请求 Soundfont 资源加载情况)。
* **Background Worker (中枢总管)**:
  * 角色：随叫随到、用完即释放的状态管理网关。处理扩展级的持久属性，监听扩展图标状态、统计日志发送与路由代理网络请求。
* **Popup / Options (操控飞船界面)**
  * 角色：当点击浏览器工具栏图标时展开。提供总开关、全局音域预设配置入口等基础选项设定。修改设定后必须向下游 (Content / Worker) 发送配置更新广播包 (Broadcast Update Events)。

## 3. 安全防线 (Security Boundary)

平台侧逻辑必须严守以下安全承诺：
* **按需权限申请**: 永远不声明泛型宽泛的宿主读写权限 `<all_urls>` 除非极其必要。所有的代码执行和脚本注入必须被严格约束在预定义的 `matches` 列表内 (Host permissions)。
* **静态安全网络**: 插件版本不可夹带或执行非静态捆绑的网络代码 (Remote Code Execution)。大模型时代的任何第三方调用请求应该受制于扩展策略限制。
* **隐私声明 (Privacy First)**
  不在 Background 里跟踪并收集所有被检测的文字内容上传中心服，保证应用对用户的浏览隐私造成零威胁。

## 代码与测试映射 (Code & Verification Map)

* **源码锚点**
  * `manifest.json`: Chrome Extension Manifest V3 权限、入口和元数据边界。
  * `vite.config.ts`: 扩展构建入口、Rollup 切分和静态资源处理。
  * `vite.web.config.ts`: Studio 静态站点构建入口。
  * `scripts/check-version.mjs`: 版本同步检查脚本。
  * `src/background/service-worker.ts`: Background Worker 生命周期与扩展级消息入口。
  * `src/content/index.ts`: Content Script 注入、扫描和播放器装配入口。
  * `src/popup/popup.ts`: Popup 设置界面与扩展配置更新入口。
  * `src/shared/messages.ts`: 扩展消息结构与类型守卫。
  * `src/shared/assets.ts`: 扩展运行时和 Web 运行时的资源 URL 解析。
  * `src/shared/extension-runtime.ts`: 对 `chrome.runtime` 可用性的隔离封装。
  * `src/shared/settings.ts`: 扩展与播放器共享设置结构。
* **测试锚点**
  * `src/shared/messages.test.ts`: 验证 Open Studio 消息创建、类型守卫和畸形消息拒绝。
  * `src/shared/assets.test.ts`: 验证资源路径规范化、扩展 runtime URL 和 Web base URL 回退。
  * `src/studio/settings-store.test.ts`: 验证扩展 storage 可用时的设置加载与保存路径。
