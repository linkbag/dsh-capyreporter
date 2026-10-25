# CapyReporter 🦫

[English](README.md) | 简体中文

DeepSeek Harness Web 的本地任务播报宠物：页面内悬浮水豚，以及可选的 Electron 桌面置顶窗口。

## 主要功能

- 使用真实 DSH 事件显示工作区、会话和简短的**回复里程碑**预览：气泡默认跟随助手的最新表述，不会被工具调用刷屏。推理内容默认隐藏，可在设置中开启「Report thinking」后显示；提示词、工具参数和工具输出始终不会展示。
- 区分成功、取消、失败、阻塞、输出上限和中断。仅进入 idle 不会误报成功。
- 并行会话各自保留结果，启动另一个任务不会抹掉之前的结果。最多保留 20 条未读结果，六小时后过期。
- 明确的「Details / Collapse」「Dismiss / Dismiss result」「Mute 30 min（可配置）」按钮；Dismiss 始终存在——运行中仅隐藏当前气泡（新活动会再次出现），结束后确认结果。界面提供英文与中文双语，跟随浏览器/系统语言。键盘可操作，支持减少动态效果偏好。
- 离开页面时的通知默认关闭，需在插件设置中开启并获得浏览器授权。页面处于前台焦点时不通知；多个标签页仍可能分别发通知。
- 桌面窗口只有在图片解码、读取活动并上报心跳后才会替代页面宠物。启动失败或失去心跳会恢复页面兜底。

## 安装

```sh
dsh plugin --profile web add dsh-capyreporter
```

0.1.8 已重新验证 **DeepSeek Harness 0.2.1-alpha.1**（路由、slots、客户端 bundle 分发与 agent/session 事件）。peerDependencies 只有 `@deepseek-ai/cordis` 与 `react`（由 DSH 提供给插件），不再锁定任何 DSH 包版本范围。客户端更新后刷新页面；**宿主代码更新需重新激活插件或重启 DSH，仅刷新不会替换已加载的宿主模块**。

桌面模式需自行安装 Electron。可用 `DSH_PET_ELECTRON_PATH` 或 `ELECTRON_PATH` 指定可执行文件，也会检查 `$DSH_HOME/electron/`、用户 npm 安装和常见 Windows 旧安装目录。不自动下载 Electron。macOS 建议显式指定可执行文件。

宿主端口会自动识别。`DSH_CAPYREP_BASE_URL` 只接受精确的回环 HTTP(S) origin，不能带账号、路径或认证 token。远程域名和反向代理不是当前支持范围。独占全屏应用可能遮住置顶窗口；空白背景点击穿透，图片元素和气泡区域可交互，并非按透明像素逐点穿透。

## 操作

| 操作 | 效果 |
| --- | --- |
| 拖动宠物 | 移动，不会误确认结果或打开浏览器 |
| Ctrl / Cmd + 滚轮 | 缩放，50–250%；普通滚轮不拦截 |
| 单击、右击或 Enter/Space | 打开控制菜单 |
| Details / Collapse | 展开或收起日志 |
| 忽略 / Dismiss result | 始终显示：运行中隐藏当前气泡（新活动会再次出现）；结束后确认该结果 |
| 拖动气泡任一边缘/角落、在角落手柄上用方向键，或 Ctrl + 滚轮 | 调整气泡尺寸（宽 260–560、高 160–720 像素），按浏览器记忆；按钮固定在气泡底部，内容过多时中间详情区滚动 |
| 双击任一缩放手柄，或在宠物菜单选「重置气泡大小」 | 恢复默认 360 像素宽度与随内容自适应的高度 |
| 静音 30 分钟 | 按配置时长静音气泡（默认 30 分钟） |
| Restore bubble | 恢复显示，并提前结束静音 |
| 双击桌面宠物 / Open DeepSeek Harness | 打开配置的 DSH origin |
| Escape | 关闭菜单和详情 |

## 设置与隐私

设置 → **🐾 CapyReporter** 可控制显示、桌面模式、大小、图片、通知、**Status bubble** 静音时长（10/30/60/240 分钟，默认 30）和 **Report thinking**（默认关闭；开启后以 💭 显示当前推理作为实时里程碑）。界面跟随浏览器/系统语言显示英文或中文；如需固定，可设置 `localStorage['dsh-capyreporter:lang'] = 'en' | 'zh'` 后刷新。图片仅支持 PNG，最多 **4 MiB**，每边 **1–4096 像素**。替换自定义图片时也会更新缓存版本。

开关、图片和大小原子保存到 `$DSH_HOME/capyreporter.json`（默认 `~/.dsh`）。只有该文件不存在时才读取旧 `homura-pet.json`；保存失败会保留之前的内存设置。页面位置单独存在浏览器 localStorage，桌面位置仅在本次运行内保留。

无遥测、云账号或外部服务。桌面气泡和通知会暴露会话名与回复预览；共享屏幕时请关闭。接口拒绝跨域浏览器请求、非回环来源和 GET 修改操作；桌面通过私有 capability 与沙箱 IPC 访问。**同源检查不是对恶意本机进程的认证，也不能替代 DSH 登录**。详见 [架构与安全边界](docs/architecture.md)。

「Hide pet」只是隐藏，不等于卸载。卸载请使用 DSH 插件管理器，或：

```sh
dsh plugin --profile web remove dsh-capyreporter
```

## 开发与诊断

```sh
npm ci
npm test
npm run verify
npm run test:browser
npm pack --dry-run
```

源码就是手写 JavaScript，无需构建。浏览器测试默认使用本机 Chrome，Electron 测试没有可执行文件时会明确跳过。全部使用临时设置和独立回环测试服务，不修改用户配置或重启当前 DSH。

[排障](docs/troubleshooting.md) · [审计及其他宠物插件经验](docs/audit.md) · [MIT](LICENSE)
