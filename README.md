# 渴鹅图论 (Haokee Graph) v1.1.0 开发文档

本文档详细记录了 v1.1.0 版本的项目结构、配置详情、核心特性及其实现原理。

## 1. 项目概览

**渴鹅图论 (Haokee Graph)** 是一个基于 Web 技术的图论可视化工具，支持通过简单的文本指令生成动态的图结构。该项目采用 React + TypeScript 开发前端，Express 提供后台服务，并通过 Electron 构建跨平台桌面应用。

- **版本**: v1.1.0
- **核心技术栈**:
    - 前端: React 18, TypeScript, Vite, Material UI
    - 编辑器: Monaco Editor
    - 渲染引擎: HTML5 Canvas API
    - 后端: Node.js, Express
    - 桌面端: Electron, Electron Builder

## 2. 代码结构

项目采用典型的 Monorepo 风格结构，将前端、后端和 Electron 代码整合在一起。

```
D:\graph\
├── electron/               # Electron 主进程代码
│   └── main.js             # Electron 入口，负责启动服务器和创建窗口
├── server/                 # 后端服务器代码
│   └── index.js            # Express 服务器入口，处理静态资源和下载请求
├── src/                    # 前端源代码
│   ├── engine/             # 核心图形与物理引擎
│   │   ├── PhysicsEngine.ts # 自研物理引擎（粒子系统、力学模拟）
│   │   ├── Renderer.ts      # Canvas 渲染器（绘制节点、边、交互反馈）
│   │   └── types.ts         # 类型定义
│   ├── App.tsx             # 主应用组件（UI 布局、状态管理、交互逻辑）
│   ├── GraphParser.ts      # 输入解析器（解析文本指令为图结构）
│   ├── main.tsx            # React 入口
│   └── index.css           # 全局样式
├── resources/              # 静态资源
│   └── icon256x256.ico     # 桌面端应用图标
├── scripts/                # 工具脚本
│   └── start-server.js     # 后台启动服务器脚本
├── doc/                    # 项目文档
├── dist/                   # 前端构建产物 (Vite build)
├── release/                # 桌面端构建产物 (Electron builder)
├── package.json            # 项目配置与依赖管理
├── vite.config.ts          # Vite 构建配置
└── tsconfig.json           # TypeScript 配置
```

## 3. 配置文件 (package.json)

v1.1.0 版本的关键配置如下：

```json
{
  "name": "haokee-graph",
  "version": "1.1.0",
  "description": "Haokee Graph Visualization Web App",
  "main": "electron/main.js",  // Electron 入口
  "scripts": {
    "dev": "vite",             // 前端开发服务器
    "build": "tsc && vite build", // 前端构建
    "start": "node server/index.js", // 启动生产环境服务器
    "server:bg": "node scripts/start-server.js", // 后台启动服务器
    "electron:dev": "npm run build && electron .", // Electron 开发模式
    "electron:build": "npm run build && electron-builder" // 构建桌面应用
  },
  "build": {
    "appId": "com.haokee.graph",
    "productName": "渴鹅图论",
    "directories": {
      "output": "release"   // 构建输出目录
    },
    "files": [                 // 打包包含的文件
      "dist/**/*",
      "server/**/*",
      "electron/**/*",
      "package.json",
      "resources/**/*"
    ],
    "win": {
      "target": "nsis",
      "icon": "resources/icon256x256.ico" // Windows 图标配置
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

## 4. 核心特性与功能

### 4.1 动态物理布局
- **力导向布局**: 采用自研物理引擎，模拟节点间的库伦斥力和连接边的胡克弹力。
- **自动收敛**: 实现了基于差值比例的动态长度调整算法（`LENGTH_ADJUST_RATE = 0.15`），使大量节点能快速收缩至理想状态，同时保持微小的动态浮动感。
- **防止重叠**: 内置硬碰撞检测机制，防止节点相互穿插。

### 4.2 交互式可视化
- **实时渲染**: 修改左侧文本，右侧画布即时更新。
- **全能交互**:
    - **拖拽**: 鼠标拖拽节点可固定位置。
    - **平移**: 拖拽空白区域可移动画布。
    - **缩放**: 支持滚轮缩放和右下角按钮缩放，具备平滑的非线性动画效果。
    - **高亮**: 悬停节点时，节点编号变蓝加粗，且所有连接边高亮显示。

### 4.3 现代 UI 设计
- **左侧控制面板**: 采用 Material UI 组件，包含渐变标题、卡片式分组、美观 SVG 图标。
- **编辑器**: 集成 Monaco Editor，支持语法高亮和错误/警告提示（超过3字符显示橙色警告）。
- **信息展示**: 底部中央悬浮卡片显示操作说明，右上角提供 GitHub 仓库链接。

### 4.4 桌面端与Web端互通
- **双端运行**: 既可以作为 Web 服务运行在浏览器中，也可以作为独立的 Electron 桌面应用运行。
- **智能下载**: Web 端会自动检测运行环境，非 Electron 环境下会显示“下载桌面版”卡片。
- **服务器集成**: Electron 应用内置了 Express 服务器，启动时自动分配空闲端口，无需手动配置。

## 5. 实现原理

### 5.1 物理引擎 (`PhysicsEngine.ts`)
引擎采用 **Euler 积分法** 进行位置更新。核心循环 `update()` 采用了子步更新（Sub-stepping，每帧计算 5 次），以保证在高斥力下的稳定性。

*   **斥力计算**: 遍历所有节点对，计算反比于距离平方的斥力。
*   **弹力计算**: 遍历所有边，计算正比于 `(当前长度 - 目标长度)` 的拉力。
*   **长度动态化**: 边的 `restLength` 不是固定的，而是每帧向 `idealLength`（基于节点半径计算）逼近，实现了“从松散到紧凑”的动画效果。

### 5.2 渲染系统 (`Renderer.ts`)
基于 Canvas 2D Context。
*   **坐标变换**: 实现了完整的世界坐标到屏幕坐标的转换矩阵（缩放 -> 平移），确保了鼠标事件（点击、悬停）在任何缩放比例下都能精准映射到逻辑节点。
*   **视觉增强**: 绘制节点时使用 `arc`，绘制连线使用 `lineTo`。选中效果通过改变 `strokeStyle` 和 `lineWidth` 实现。

### 5.3 桌面端架构 (`electron/main.js` + `server/index.js`)
*   **双模式服务器**: `server/index.js` 既可以独立运行（监听 3000 端口），也可以被 Electron 主进程 `require` 导入。
*   **动态端口**: 在 Electron 模式下，主进程调用 `startServer(0)`，让操作系统自动分配一个可用端口，避免了端口冲突问题。
*   **资源加载**: 窗口加载 `http://localhost:<port>`，从而复用 Web 端的所有逻辑和 UI。
*   **下载路由**: 服务器端实现了 `/download` 路由，能智能查找 `release` 目录下的最新 `.exe` 文件供用户下载。

---
*文档生成时间: 2026-01-13*
