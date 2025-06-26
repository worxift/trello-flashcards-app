# Trello 风格单词闪卡学习应用

![应用截图](https://trello-flashcards-app.vercel.app/logo192.png)

## 项目简介

这是一个基于Trello看板风格的单词闪卡学习应用，帮助用户通过记忆曲线原理高效学习和记忆单词。应用采用现代化的界面设计，支持多看板管理、卡片拖拽、键盘快捷操作等功能，让学习过程更加高效和愉悦。

**在线体验**: [https://trello-flashcards-app.vercel.app](https://trello-flashcards-app.vercel.app)

## 主要功能

### 多看板管理
- 创建多个独立的学习看板，适用于不同的学习主题或语言
- 为每个看板命名，方便分类管理
- 支持看板的重命名和删除操作

### 记忆曲线列表
- 每个看板包含12个列表（Inbox、10-1、Archive），基于记忆曲线原理设计
- 新添加的单词默认进入Inbox列表
- 根据记忆熟悉度将卡片在不同级别列表间移动
- 最终掌握的单词可存档到Archive列表

### 单词卡片管理
- 批量导入单词和释义（支持复制粘贴Excel/表格数据）
- 卡片支持拖拽操作在不同列表间移动
- 键盘左右方向键快速移动卡片
- 点击卡片查看单词释义

### 学习进度追踪
- 每日学习目标设置和进度条显示
- 列表清空进度实时监控
- 学习数据自动保存，不会丢失

### 数据存储选项
- 本地存储：数据保存在浏览器中，保护隐私
- 云端存储：使用Firebase实现多设备同步（可选）
- 一键切换存储模式，满足不同场景需求

## 技术栈

- **前端框架**: React.js
- **UI设计**: Tailwind CSS
- **数据存储**: Firebase Firestore + 本地存储
- **身份验证**: Firebase 匿名认证
- **部署平台**: Vercel

## 本地开发

### 环境要求
- Node.js 14.0+
- npm 或 yarn

### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/worxift/trello-flashcards-app.git
cd trello-flashcards-app
```

2. 安装依赖
```bash
npm install
# 或
yarn install
```

3. 启动开发服务器
```bash
npm start
# 或
yarn start
```

4. 打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 使用指南

### 创建新看板
1. 点击左侧边栏底部的"创建新看板"按钮
2. 输入看板名称
3. 粘贴单词列表（格式：单词 释义，每行一个）
4. 点击"创建"按钮

### 学习方法
1. 选择一个看板开始学习
2. 从Inbox列表开始，查看新单词
3. 根据记忆熟悉度，将卡片拖动到相应数字列表（10-1）
4. 使用键盘左右方向键快速移动当前选中的卡片
5. 完全掌握的单词可移至Archive列表存档

### 存储模式切换
- 点击左侧边栏顶部的"本地/云端"按钮切换存储模式
- 本地模式：数据仅保存在当前浏览器中
- 云端模式：数据同步到Firebase，可在多设备间共享

## 贡献指南

欢迎提交问题和功能请求！如果您想贡献代码：

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开一个 Pull Request

## 许可证

MIT License - 详见 LICENSE 文件

## 联系方式

项目维护者: [您的名字/组织名称]
- GitHub: [https://github.com/worxift](https://github.com/worxift)
- 网站: [您的网站链接]

---

*注：此应用是一个开源项目，欢迎用于教育和个人学习目的。*
