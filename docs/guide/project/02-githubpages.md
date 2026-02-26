# 使用 Git 和 GitHub Pages 将 VuePress 博客部署上线

- **系统**：Windows 11
- **前提**：已安装 [Git](https://git-scm.com/downloads)、[Node.js](https://nodejs.org/)，且 VuePress 项目已能在本地正常运行

> Git 是一个开源的分布式版本控制系统，用于管理代码版本。GitHub 是托管 Git 仓库的平台，GitHub Pages 可以免费托管静态网站。
- []创建仓库
- []编写Github Actions自动部署工作流
- []修改Vuepress配置文件
- []初始化Giit并推送至Github
- []编写自动部署脚本
- **本文目标**：将本地 VuePress 博客部署到 GitHub Pages，实现在线访问。

---

## 目录

[[toc]]

---

## 1. 在 GitHub 创建仓库

1. 登录 [GitHub](https://github.com)，点击右上角 **+** → **New repository**
2. 仓库名填写 `StudyNotes`（与项目文件夹同名）
3. 可以勾选 **Add a license**，其他默认即可
4. 点击 **Create repository**

---

## 2. 创建 `.gitignore` 文件

在**项目根目录** `StudyNotes/` 下创建 `.gitignore`，告诉 Git 哪些文件不需要上传：

```ignore
# Node 依赖（体积巨大，不上传）
node_modules/

# VuePress 临时文件和缓存
docs/.vuepress/.temp/
docs/.vuepress/.cache/

# 构建产物（由 GitHub Actions 自动构建）
docs/.vuepress/dist/

# IDE 配置文件
.idea/
.vscode/
*.swp
*.swo

# 系统文件
.DS_Store
Thumbs.db

# 日志
*.log
```

::: tip 提示
`.gitignore` 必须放在项目根目录（与 `package.json` 同级），不是放在 `docs/` 里面。
:::

---

## 3. 编写 GitHub Actions 自动部署工作流

在项目根目录下创建文件夹和文件：

```
StudyNotes/
  └── .github/
       └── workflows/
            └── deploy.yml
```

::: warning 注意
`.github` 文件夹必须在项目根目录下，不是在 `docs/` 里面！
:::

`deploy.yml` 内容如下：

```yaml
name: 部署 VuePress 到 GitHub Pages

on:
  # 当 push 到 main 分支时触发自动部署
  push:
    branches:
      - main

  # 允许在 Actions 页面手动触发
  workflow_dispatch:

# 设置 GITHUB_TOKEN 的权限
permissions:
  contents: read
  pages: write
  id-token: write

# 同一时间只允许一个部署任务运行
concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  # === 构建任务 ===
  build:
    runs-on: ubuntu-latest
    steps:
      - name: 拉取代码
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: 安装 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: 安装依赖
        run: npm ci

      - name: 构建 VuePress 站点
        run: npm run docs:build

      - name: 配置 Pages
        uses: actions/configure-pages@v4

      - name: 上传构建产物
        uses: actions/upload-pages-artifact@v3
        with:
          path: docs/.vuepress/dist

  # === 部署任务 ===
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: 部署到 GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

::: details 工作流执行流程说明
1. **触发**：当你 `git push` 到 `main` 分支时自动触发
2. **构建 (build)**：在 GitHub 的服务器上拉取代码 → 安装 Node.js → 安装依赖 → 执行 `npm run docs:build` 构建静态文件
3. **部署 (deploy)**：将构建产物上传到 GitHub Pages
:::

---

## 4. 修改 VuePress 配置文件

打开 `docs/.vuepress/config.js`，添加 `base` 配置项：

```javascript
export default defineUserConfig({
  // ...其他配置...

  // GitHub Pages 部署路径：必须与仓库名一致，格式为 '/仓库名/'
  // 如果你用的是 username.github.io 仓库（不带子路径），改为 '/'
  base: '/StudyNotes/',

  // ...其他配置...
})
```

::: danger 重要
如果不加 `base`，部署后所有 CSS、JS、图片资源都会 404！因为 GitHub Pages 的子仓库会部署在 `https://username.github.io/仓库名/` 路径下。
:::

---

## 5. 初始化 Git 并推送到 GitHub

打开终端（CMD / PowerShell / VS Code 终端），依次执行：

```bash
# 进入项目目录
cd d:\StudyNotes

# 初始化 Git 仓库
git init

# 添加所有文件
git add .

# 第一次提交
git commit -m "first commit: VuePress blog"

# 重命名分支为 main
git branch -M main

# 关联远程仓库（替换为你的 GitHub 用户名）
git remote add origin https://github.com/你的GitHub用户名/StudyNotes.git

# 推送到 GitHub
git push -u origin main
```

::: tip 常见问题
**如果推送时报错 `rejected`**：说明远程仓库已有文件（比如 LICENSE），先拉取再推送：
```bash
git pull origin main --allow-unrelated-histories
git push -u origin main
```

**如果报错 socks5 代理相关**：临时关闭 Git 代理：
```bash
git config --global --unset http.proxy
git config --global --unset https.proxy
git push -u origin main
```
:::

---

## 6. 启用 GitHub Pages

1. 打开 `https://github.com/你的GitHub用户名/StudyNotes/settings/pages`
2. **Source** 下拉框选择 **GitHub Actions**（不是 "Deploy from a branch"）
3. 保存

---

## 7. 检查部署状态

打开 `https://github.com/你的GitHub用户名/StudyNotes/actions`：

| 状态 | 含义 |
|:---:|:---|
| 🟡 黄色 | 正在构建/部署中，稍等即可 |
| 🟢 绿色 ✅ | 部署成功！可以访问了 |
| 🔴 红色 ❌ | 构建失败，点进去查看错误日志排查 |

部署成功后，访问：

```
https://你的GitHub用户名.github.io/StudyNotes/
```

---

## 8. 编写一键推送脚本

为了以后更新笔记方便，在项目根目录创建 `push.bat`：

```bat
@echo off
chcp 65001 >nul
echo ============================
echo   StudyNotes 一键推送脚本
echo ============================
echo.

cd /d "%~dp0"

echo [1/3] 添加所有更改...
git add .
echo.

echo [2/3] 提交更改...
set /p msg="请输入提交说明 (直接回车则默认为 '更新笔记'): "
if "%msg%"=="" set msg=更新笔记
git commit -m "%msg%"
echo.

echo [3/3] 推送到 GitHub...
git push
echo.

echo ============================
echo   推送完成！
echo ============================
pause
```

以后每次写完笔记，**双击 `push.bat`** 即可一键推送，GitHub Actions 会自动构建部署。

---

## 9. 日常更新流程总结

```
编写/修改 Markdown 笔记
        ↓
   双击 push.bat
        ↓
  输入提交说明（或直接回车）
        ↓
   自动 git add → commit → push
        ↓
  GitHub Actions 自动构建部署
        ↓
   网站自动更新 🎉
```

---

## 10. 项目文件结构参考

```
StudyNotes/                    ← 项目根目录
├── .github/
│   └── workflows/
│       └── deploy.yml         ← GitHub Actions 自动部署配置
├── .gitignore                 ← Git 忽略文件配置
├── push.bat                   ← 一键推送脚本
├── package.json               ← Node.js 项目配置
├── package-lock.json
└── docs/                      ← VuePress 文档目录
    ├── readme.md              ← 首页
    ├── .vuepress/
    │   ├── config.js          ← VuePress 配置（含 base 路径）
    │   ├── client.js          ← 客户端脚本（滚动虚化等）
    │   ├── styles/
    │   │   └── index.scss     ← 自定义样式
    │   └── public/            ← 静态资源（logo、背景图等）
    └── guide/
        ├── intro.md           ← Markdown 语法速查
        └── ...                ← 其他笔记
```