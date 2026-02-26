# StudyNotes 自动化流程总结

本文档描述当前项目中**所有已实现的自动化机制**，方便日后维护与扩展。

---

## ✅ 已实现的自动化流程

| # | 功能 | 触发时机 | 实现位置 |
|---|------|----------|----------|
| 1 | **分栏 README 文章列表自动同步** | `npm run docs:dev` / `docs:build` 前 | `scripts/sync-guide-readmes.mjs` → `syncCategory()` |
| 2 | **首页卡片自动生成** | `npm run docs:dev` / `docs:build` 前 | `scripts/sync-guide-readmes.mjs` → `syncHomeCards()` |
| 3 | **侧边栏自动生成** | VuePress 构建时（运行时扫描） | `docs/.vuepress/config.js` → `getGuideSidebar()` |

---

## 1. 分栏 README 文章列表自动同步

**效果**：在 `docs/guide/<分栏>/readme.md` 中维护一个 `## 文章列表` 区块，自动扫描同目录下的所有 `.md` 文章，生成带超链接的列表。

**规则**：
- 链接文字取文章的 `# 一级标题`（无标题则用文件名）
- 文章按**文件名字典序**排序（推荐以 `01-`、`02-` 前缀控制顺序）
- `readme.md` 本身不计入文章列表
- 每次运行时**完整替换** `## 文章列表` 区块内容

**如何触发**：
```bash
npm run docs:sync   # 单独运行同步
npm run docs:dev    # 自动先同步再启动开发服务器
npm run docs:build  # 自动先同步再构建
```

**相关代码**：`scripts/sync-guide-readmes.mjs` → `syncCategory()` 函数

---

## 2. 首页卡片自动生成

**效果**：首页 `docs/readme.md` 中 `<!-- CARDS_START -->` 与 `<!-- CARDS_END -->` 之间的卡片区块，由脚本自动扫描 `docs/guide/` 下所有分栏目录并生成。

**规则**：
- 卡片标题取分栏 `readme.md` 的 `# 一级标题`
- 卡片描述取分栏 `readme.md` 中 H1 之后、第一个 `##` 之前的**第一行非空文字**
- 无 `readme.md` 的目录会被跳过
- 排列顺序：先按 `categoryOrder`（`basic → project → reading → talk`），剩余新分栏按字母升序追加
- **只需新建目录 + readme.md**，下次构建时首页卡片自动出现

**关键标记**（不可删除）：
```markdown
<!-- CARDS_START -->
...（脚本自动维护，请勿手动修改此区域内容）...
<!-- CARDS_END -->
```

**相关代码**：`scripts/sync-guide-readmes.mjs` → `syncHomeCards()` 函数

---

## 3. 侧边栏自动生成

**效果**：左侧侧边栏中每个分栏的条目完全由 `docs/guide/` 目录结构自动推导，无需手动编辑 `config.js`。

**规则**：
- 分栏在侧边栏中的**标题**取自该分栏 `readme.md` 的 `# 一级标题`
- 分栏内**文章条目**扫描同目录 `.md` 文件（`readme.md` 除外）
- 文章**排列顺序**：文件名字典序（即 `01-` < `02-` < `03-`）
- 文章**显示名称**：读取每篇文章的 `# 一级标题`（无则用文件名去掉扩展名）
- 分栏**排列顺序**：同 `categoryOrder`，新分栏追加在后

**相关代码**：`docs/.vuepress/config.js` → `getGuideSidebar()` 函数

---

## 新增内容时的操作指南

### 新增一篇文章

1. 在对应分栏目录下创建文件，文件名加数字前缀，例如 `docs/guide/basic/03-newpost.md`
2. 文件首行写 `# 文章标题`
3. 运行 `npm run docs:dev` — 侧边栏与分栏 README 均自动更新

### 新增一个分栏

1. 在 `docs/guide/` 下创建新目录，例如 `docs/guide/tools/`
2. 在该目录下创建 `readme.md`，首行写 `# 分栏标题`，第二行写一句简短描述
3. 运行 `npm run docs:dev` — 侧边栏、分栏 README、**首页卡片**均自动更新

> 如需控制新分栏在首页和侧边栏的排列位置，在 `scripts/sync-guide-readmes.mjs` 和 `docs/.vuepress/config.js` 的 `categoryOrder` 数组中插入新分栏名称。

---

## 文件速查

| 文件 | 作用 |
|------|------|
| `scripts/sync-guide-readmes.mjs` | 构建前同步脚本（文章列表 + 首页卡片） |
| `docs/.vuepress/config.js` | VuePress 配置（侧边栏自动生成） |
| `docs/.vuepress/styles/index.scss` | 全站样式（含首页卡片三列布局） |
| `docs/readme.md` | 首页内容，含 `CARDS_START/END` 自动区域 |
| `package.json` | npm 脚本：`docs:sync` / `docs:dev` / `docs:build` |
