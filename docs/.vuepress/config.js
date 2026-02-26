import { defaultTheme } from '@vuepress/theme-default'
import fs from 'node:fs'
import { defineUserConfig } from 'vuepress'
import { viteBundler } from '@vuepress/bundler-vite'
import { getDirname, path } from 'vuepress/utils'

const __dirname = getDirname(import.meta.url)
const docsRoot = path.resolve(__dirname, '..')
const guideRoot = path.join(docsRoot, 'guide')

const parseHeading = (markdown, fallback) => {
  const headingMatch = markdown.match(/^#\s+(.+)$/m)
  return headingMatch?.[1]?.trim() || fallback
}

const parseArticleTitle = (articlePath, fallbackFileName) => {
  const articleContent = fs.readFileSync(articlePath, 'utf8')
  return parseHeading(articleContent, path.basename(fallbackFileName, '.md'))
}

const categoryOrder = ['basic', 'project', 'reading', 'talk']

const sortCategoryName = (left, right) => {
  const leftIndex = categoryOrder.indexOf(left)
  const rightIndex = categoryOrder.indexOf(right)

  if (leftIndex !== -1 && rightIndex !== -1) {
    return leftIndex - rightIndex
  }
  if (leftIndex !== -1) {
    return -1
  }
  if (rightIndex !== -1) {
    return 1
  }

  return left.localeCompare(right, 'zh-Hans-CN')
}

const getGuideSidebar = () => {
  const sections = [
    {
      text: '简介',
      collapsible: true,
      children: ['/guide/intro.md', '/guide/auto.md'],
    },
  ]

  if (!fs.existsSync(guideRoot)) {
    return sections
  }

  const categories = fs
    .readdirSync(guideRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort(sortCategoryName)

  for (const categoryName of categories) {
    const categoryDir = path.join(guideRoot, categoryName)
    const categoryReadme = path.join(categoryDir, 'readme.md')

    if (!fs.existsSync(categoryReadme)) {
      continue
    }

    const readmeContent = fs.readFileSync(categoryReadme, 'utf8')
    const sectionTitle = parseHeading(readmeContent, categoryName)

    const articleChildren = fs
      .readdirSync(categoryDir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => name.toLowerCase().endsWith('.md'))
      .filter((name) => name.toLowerCase() !== 'readme.md')
      .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
      .map((fileName) => ({
        text: parseArticleTitle(path.join(categoryDir, fileName), fileName),
        link: `/guide/${categoryName}/${fileName}`,
      }))

    sections.push({
      text: sectionTitle,
      collapsible: true,
      children: [`/guide/${categoryName}/`, ...articleChildren],
    })
  }

  return sections
}

export default defineUserConfig({
  lang: 'zh-CN',
  title: 'StudyNotes',  // 网站标题
  description: '我的学习笔记',

  // GitHub Pages 部署路径：必须与仓库名一致，格式为 '/仓库名/'
  // 如果你用的是 username.github.io 仓库（不带子路径），改为 '/'
  base: '/StudyNotes/',

  // 注册客户端配置文件，用于执行 JS 滚动监听
  clientConfigFile: path.resolve(__dirname, './client.js'),

  theme: defaultTheme({
    logo: '/logo.png',
    // 顶部导航栏
    navbar: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/intro' }, // 对应 docs/guide/intro.md
      { text: '关于我', link: 'https://github.com/Misaka13520' },
    ],

    // 左侧侧边栏（根据 docs/guide 目录自动生成）
    sidebar: {
      '/guide/': getGuideSidebar(),
    },
  }),

  bundler: viteBundler(),
})