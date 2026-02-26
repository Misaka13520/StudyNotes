import { defaultTheme } from '@vuepress/theme-default'
import { defineUserConfig } from 'vuepress'
import { viteBundler } from '@vuepress/bundler-vite'
import { getDirname, path } from 'vuepress/utils'

const __dirname = getDirname(import.meta.url)

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

    // 左侧侧边栏 (不同子路径可以配不同的侧边栏)
    sidebar: {
      '/guide/': [
        {
          text: '简介',
          collapsible: true, // 是否可折叠
          children: [
            '/guide/intro.md', // 这里对应文件 docs/guide/intro.md
            // 以后在这里加新文件，比如 '/guide/docker.md'
          ],
        },
        // 添加新的侧边栏
        {
          text: 'Vuepress静态blog配置搭建',
          collapsible: true,
          children: [
            '/guide/note1.md',
          ],
        },

      ],
    },
  }),

  bundler: viteBundler(),
})