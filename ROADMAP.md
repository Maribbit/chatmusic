# ChatMusic 路线图 (Roadmap)

ChatMusic 是 ABC-first 的 Chrome Extension + Studio：在网页代码块中检测 ABC，使用可复用 Player 渲染、播放、导出，并提供独立 Studio 做 ABC 编辑、诊断和排版。

## 当前状态

- **检测**：支持通用 `<pre>/<code>` ABC 检测，以及 Gemini、DeepSeek 等站点特化检测器。
- **Player**：渲染、播放、进度、高亮、键盘、主题、全屏、源码折叠、SVG/MIDI 导出已集中到 `src/player/`。
- **Studio**：支持 ABC 打开/保存、实时预览、质量诊断、分栏布局、URL hash 传递和扩展/Web 双构建。
- **转换边界**：不维护内建 MusicXML/MXL 转换器，只保留外部转换链接。ChatMusic 负责外部转换后 ABC 的检查、渲染、播放和导出。
- **质量保障**：Vitest 覆盖 detector、player、Studio 和 shared adapter；领域索引维护在 `docs/specs/`。

## 优先级

1. **P0: UI 与图标打磨**
   优化 Studio 和内联 Player 的控件视觉、响应式断点、焦点态和浅/深色对比度。
2. **P1: Studio PWA**
   让 Web Studio 可安装、可离线打开，并缓存应用壳与本地 soundfont 资源。
3. **P1: 外部转换工作流**
   继续打磨 Studio 中的 MusicXML/ABC 外部链接入口和使用说明，不重新引入内建转换器。
4. **P2: i18n**
   将界面文案、扩展描述和 AI 修复提示抽到轻量多语言映射，优先支持 zh-CN / en-US。
5. **P2: 专业输出与播放控制**
   评估 PDF 导出、音量、节拍器、声部选择和更多音色；保持免费商用音源与包体积约束。
6. **P3: ABC Normalize / Repair**
   在现有 abcjs warning 反馈上增加保守的格式化、诊断和高置信修复，避免猜测音乐意图。
7. **P3: 乐谱输入实验**
   探索 Web MIDI step-time 输入、屏幕键盘输入和简单音高识别，先做小型可逆原型。

## 维护规则

- 不引入内建 MusicXML/MXL 转换器，除非先完成设计和许可评审。
- 新功能先确认所属领域：`docs/specs/` -> 源码目录 -> 测试锚点。
- 发布前保持 `npm run check`、`CHANGELOG.md`、商店说明和隐私文档同步。
