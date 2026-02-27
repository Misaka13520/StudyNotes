import fs from 'node:fs'
const dir = 'd:/StudyNotes/docs/.vuepress/public'
const files = fs.readdirSync(dir)
files.forEach(f => {
  const s = fs.statSync(dir + '/' + f)
  console.log(f, (s.size / 1024 / 1024).toFixed(2) + ' MB')
})
