import { promises as fs } from 'node:fs'
import path from 'node:path'

const workspaceRoot = process.cwd()
const guideRoot = path.join(workspaceRoot, 'docs', 'guide')
const homeReadmePath = path.join(workspaceRoot, 'docs', 'readme.md')
const listHeading = '## 文章列表'
const cardsStart = '<!-- CARDS_START -->'
const cardsEnd = '<!-- CARDS_END -->'

// 分栏目录的固定显示顺序，不在此列表的新分栏会追加到末尾
const categoryOrder = ['basic', 'project', 'reading', 'talk']

const readText = async (filePath) => fs.readFile(filePath, 'utf8')

const parseTitle = (markdown, fileName) => {
  const headingMatch = markdown.match(/^#\s+(.+)$/m)
  if (headingMatch?.[1]) {
    return headingMatch[1].trim()
  }
  return path.basename(fileName, '.md')
}

const updateReadmeList = (content, listLines) => {
  const normalized = content.replace(/\r\n/g, '\n')
  if (!normalized.includes(listHeading)) {
    const tail = `\n\n${listHeading}\n\n${listLines.join('\n')}\n`
    return normalized.trimEnd() + tail
  }

  const [before] = normalized.split(listHeading)
  return `${before.trimEnd()}\n\n${listHeading}\n\n${listLines.join('\n')}\n`
}

// 从 readme 正文中提取第一段描述（H1 之后、## 之前的第一行非空文字）
const parseDescription = (markdown) => {
  const lines = markdown.split('\n')
  let pastHeading = false
  for (const line of lines) {
    if (!pastHeading) {
      if (line.startsWith('#')) pastHeading = true
      continue
    }
    if (line.startsWith('##')) break
    if (line.trim()) return line.trim()
  }
  return ''
}

// 扫描所有分栏目录，生成首页卡片并写入 docs/readme.md 的标记区域
const syncHomeCards = async () => {
  const entries = await fs.readdir(guideRoot, { withFileTypes: true })
  const allDirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)

  // 按固定顺序排列，新分栏追加在后
  const sorted = [
    ...categoryOrder.filter((n) => allDirs.includes(n)),
    ...allDirs.filter((n) => !categoryOrder.includes(n)).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN')),
  ]

  const cardLines = ['<div class="custom-features">']
  for (const categoryName of sorted) {
    const categoryReadme = path.join(guideRoot, categoryName, 'readme.md')
    try {
      const content = await readText(categoryReadme)
      const title = parseTitle(content, categoryName)
      const description = parseDescription(content)
      cardLines.push(`  <RouterLink to="/guide/${categoryName}/" class="custom-feature">`)
      cardLines.push(`    <h2>${title}</h2>`)
      if (description) cardLines.push(`    <p>${description}</p>`)
      cardLines.push('  </RouterLink>')
    } catch {
      // 没有 readme.md 的目录跳过
    }
  }
  cardLines.push('</div>')

  const homeContent = await readText(homeReadmePath)
  const normalized = homeContent.replace(/\r\n/g, '\n')

  if (!normalized.includes(cardsStart) || !normalized.includes(cardsEnd)) {
    console.log('首页 readme.md 缺少 CARDS_START/END 标记，跳过卡片同步')
    return
  }

  const before = normalized.substring(0, normalized.indexOf(cardsStart))
  const after = normalized.substring(normalized.indexOf(cardsEnd) + cardsEnd.length)
  const next = `${before.trimEnd()}\n${cardsStart}\n${cardLines.join('\n')}\n${cardsEnd}${after}`

  if (next !== normalized) {
    await fs.writeFile(homeReadmePath, next, 'utf8')
    console.log('已更新: docs/readme.md 首页卡片')
  }
}

const syncCategory = async (categoryDir) => {
  const readmePath = path.join(categoryDir, 'readme.md')

  let readmeContent
  try {
    readmeContent = await readText(readmePath)
  } catch {
    return
  }

  const entries = await fs.readdir(categoryDir, { withFileTypes: true })
  const articleFiles = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.toLowerCase().endsWith('.md'))
    .filter((name) => name.toLowerCase() !== 'readme.md')
    .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))

  const listLines = []
  for (const fileName of articleFiles) {
    const articlePath = path.join(categoryDir, fileName)
    const articleContent = await readText(articlePath)
    const title = parseTitle(articleContent, fileName)
    listLines.push(`- [${title}](./${fileName})`)
  }

  if (listLines.length === 0) {
    listLines.push('- 暂无文章')
  }

  const nextReadme = updateReadmeList(readmeContent, listLines)
  if (nextReadme !== readmeContent.replace(/\r\n/g, '\n')) {
    await fs.writeFile(readmePath, nextReadme, 'utf8')
    console.log(`已更新: ${path.relative(workspaceRoot, readmePath)}`)
  }
}

const main = async () => {
  const entries = await fs.readdir(guideRoot, { withFileTypes: true })
  const categoryDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(guideRoot, entry.name))

  // 同步各分栏 readme 文章列表
  for (const categoryDir of categoryDirs) {
    await syncCategory(categoryDir)
  }

  // 同步首页卡片
  await syncHomeCards()
}

main().catch((error) => {
  console.error('同步分栏 README 失败:', error)
  process.exitCode = 1
})