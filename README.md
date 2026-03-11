# Lite Canvas Tree

一个轻量的 React + Vite 演示项目，用于可视化节点树（Canvas/画布式节点示例）。

## 功能

- 基于 Vite 的快速开发环境
- 简洁的节点与侧边栏组件结构
- 可配置的 Gemini（API）密钥用于外部服务集成

## 先决条件

- Node.js（建议 16+）

## 安装

1. 克隆或下载仓库到本地
2. 安装依赖：

   `npm install`

## 环境变量

- 在项目根目录创建 `.env.local`（或其他你喜欢的 env 文件），并设置：

  `GEMINI_API_KEY=your_api_key_here`

  如果不使用 Gemini 服务，可忽略该变量。

## 本地运行

开发模式：

`npm run dev`

构建（生产）：

`npm run build`

预览构建产物：

`npm run preview`

## 项目结构（主要文件）

- `App.tsx` - 应用根组件
- `index.tsx` / `index.html` - 入口
- `components/` - UI 组件集合（`NodeItem.tsx`, `Sidebar.tsx`, `ConnectionLine.tsx`, `DetailPanel.tsx` 等）
- `services/` - 服务层（`geminiService.ts`, `storageService.ts`）
- `vite.config.ts`, `tsconfig.json`, `package.json` - 构建与配置

## 说明与注意

- 若项目需要调用 Gemini 等外部 API，请确保已正确设置 `GEMINI_API_KEY`。
