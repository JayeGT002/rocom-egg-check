# Changelog

All notable changes to this project are documented in this file.

## [1.2.0] - 2026-11-14

### Added

- **release:** publish packages from version tags
- **assets:** add BWIKI avatars for S5 records
- **data:** include S5 initial forms and non-hatchable records

## [1.1.4] - 2026-10-13

### Fixed

- **ui:** center macOS traffic lights in titlebar

### Changed

- define agent documentation workflow

## [1.1.3] - 2026-10-10

### Fixed

- Replace the full-body artwork for 不咕钟 and 森豆丁 with their correct 128 × 128 avatar assets from the upstream catalog.

### Changed

- Rebuild pet records from `rocom-wiki-data`'s `Catalog.lua` and add a reproducible importer for future catalog updates.

### Distribution

- Add manually triggered cloud builds for macOS arm64/x64 and Windows x64/arm64; pushes and tags do not start builds automatically.

## [1.1.2] - 2026-10-10

### Fixed

- Keep the application window within the primary display work area and discard stale window bounds that could place it off-screen.
- Fix scaled content width and saved-result count clipping.
- Keep trackpad and wheel scrolling within the active sidebar or content panel so reaching a scroll boundary does not shift the whole window; preserve full-page scrolling on narrow layouts.
- Preserve the deeper highlight color when hovering the active settings navigation item.

### Distribution

- Provide separate macOS builds for Apple Silicon (`arm64`) and Intel (`x86_64`), and separate Windows builds for `x64` and `ARM64`.
- macOS builds are not signed with an Apple Developer ID and are not notarized; macOS may warn or block the first launch.

## [1.1.0] - 2026-10-10

### Added

- 新增子代计算器，支持按父母本体重、目标奖牌和固定亲本逐代计算；可选记录声音值，并按父母平均值向下取整。
- 支持保存、命名、重命名、删除和按迭代状态管理培育记录；逐代填写实测体重，并在设置中导入或导出计算数据。
- 精灵名称搜索支持匹配进化家族中的任意形态，并返回家族初始形态；图鉴编号搜索仍按编号精确匹配。
- 补入不咕钟和森豆丁头像，并在资源许可说明中记录 BWIKI 来源。

### Changed

- 项目英文名统一为 **Rocom Egg Check**，中文名继续使用“蛋查查”。macOS 与 Windows 使用沉浸式标题栏，顶部保留拖动区域并居中显示功能切换。
- 子代计算器采用 Roco Kingdom UI 风格，将计算参数放在左栏、逐代结果放在右栏；记录名称、状态和摘要显示在结果区域。
- 调整全局字体比例：UI 缩放为 100% 时最小字号为 12px；相关图标与字体尺寸同步调整。
- 更新顶栏功能图标和“精灵蛋尺寸”名称；属性按钮左对齐，并调整普通、机械等按钮的留白。
- 精灵头像素材改用 WebP，并禁止应用内图片通过拖动保存；更新应用图标和关于页面。

### Fixed

- 修复结果列表较长时左侧面板底部出现非预期空白的问题。
- 修正声音值开关的底纹、奖牌下拉框字号、重命名控件图文对齐和记录操作按钮样式。
- 将保存成功等提示改为全局气泡通知，移除设置及计算页面中多余的说明和返回控件。

### Distribution

- 发布 macOS Universal `.app`/`.dmg` 与 Windows x64 可执行文件。
- macOS 版本没有 Apple Developer ID 证书签名，也未公证；首次打开时系统可能提示无法验证或阻止打开。

## [1.0.0] - 2026-10-10

### Added

- 基于 MyGo、Go 和 WebView 的独立桌面应用，Go 负责查询逻辑，精灵数据独立保存在 JSON 文件中并随应用构建。
- 精灵编号与名称搜索，以及 1–10 档、蛋组和属性筛选；属性筛选以进化链初始形态为准。
- 精灵详情卡片，展示头像、属性、档位、蛋组，以及精灵蛋重量区间和可视化范围。
- 按家族整理结果，并以初始形态作为代表，减少进化链信息对查蛋结果的干扰。
- 通用设置页面，支持保存后应用全局 UI 缩放、切换系统默认字体，并提供关于页面。
- 无结果时的占位图、应用图标和本地精灵头像素材。
- Windows 安装程序和便携版应用打包流程。

### Changed

- 主界面与设置页面采用一致的侧栏布局和视觉语言；设置中的缩放值保存后才应用。
- 蛋组和属性筛选使用对应的颜色标识，精灵详情中的属性图标与名称按统一方式排列。

### Licensing

- 原创应用代码采用 MIT；Wiki 衍生数据采用 CC BY-SA 4.0。游戏图片、动画、音频及原文仅用于展示游戏资料，版权归魔方工作室群、洛克王国世界项目组及其关联公司、组织。
