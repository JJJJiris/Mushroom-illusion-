# Mushroom illusion 弥散画布工具

Mushroom illusion Diffuse Canvas Tool

一个基于手势交互的弥散视觉生成工具，用于视觉传达设计中的快速概念探索与素材导出。  
A gesture-driven diffuse visual generator for fast concept exploration and production-ready export in visual communication design.

---

## 项目简介 | Overview

本项目通过“手势轨迹 + 弥散渐变”生成动态视觉背景，支持参数化调节与高清导出。  
This project transforms hand movement into flowing diffuse gradients, with parametric controls and high-quality export.

适用场景：

- 海报背景探索
- 社媒视觉模板
- 活动主视觉氛围图
- 动态背景素材录制

Use cases:

- Poster background ideation
- Social media visual templates
- Event key visual atmospheres
- Motion background recording

---

## 核心功能 | Key Features

- 手势驱动弥散渐变（摄像头识别食指轨迹）
- 单页侧栏导航（画布 / 手势 / 颜色 / 导出）
- 风格预设（霓虹蘑菇 / 森林雾影 / 海报高对比）
- 轨迹编辑（清除、撤销、重做）
- 画布参数控制（尺寸、横竖版、背景色）
- PNG 导出（1x / 2x / 3x 分辨率）
- 透明背景 PNG 导出（带边缘羽化优化）
- 画布录制导出视频（WebM，帧率/格式/最大时长可调）
- 进入等待页支持中英文选择

---

## 技术栈 | Tech Stack

- React + TypeScript
- Vite
- Zustand
- MediaPipe Tasks Vision
- Canvas 2D API

---

## 本地运行 | Local Setup

```bash
cd /Users/jj/cursor/design-canvas-tool
npm install
npm run dev
```

默认访问地址：`http://localhost:5173`

---

## 构建与预览 | Build & Preview

```bash
npm run build
npm run preview
```

---

## 设计目标 | Design Goals

- 降低抽象背景创作门槛
- 缩短“想法 -> 可视化 -> 导出”路径
- 支持“快速发散 + 稳定交付”

---

## 仓库地址 | Repository

- https://github.com/JJJJiris/Mushroom-illusion-

---

## 在线地址 | Live Links

- App: https://jjjjiris.github.io/Mushroom-illusion-/
- Presentation: https://jjjjiris.github.io/Mushroom-illusion-/presentation.html
