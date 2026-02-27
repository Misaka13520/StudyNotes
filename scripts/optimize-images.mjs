/**
 * 图片优化脚本：自动将 public/ 下的大 PNG 转为 WebP
 *
 * 功能：
 * - 只转换 > 200KB 的 PNG（小图片无需转换）
 * - 转换后 WebP 与原文件同名（background.png → background.webp）
 * - 已存在且比原图更新的 WebP 不会重复转换
 * - 转换成功后 **自动更新** index.scss 的 CSS 变量和 config.js 的 preload 标签
 *
 * 依赖：npm install -D sharp
 * 集成：在 docs:sync 中自动调用
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const publicDir = path.join(projectRoot, 'docs/.vuepress/public')
const scssPath = path.join(projectRoot, 'docs/.vuepress/styles/index.scss')
const configPath = path.join(projectRoot, 'docs/.vuepress/config.js')
const SIZE_THRESHOLD = 200 * 1024 // 200KB

// ---- 辅助：替换文件中的文本 ----
async function replaceInFile(filePath, search, replacement) {
  const content = await fs.readFile(filePath, 'utf8')
  if (!content.includes(search)) return false
  await fs.writeFile(filePath, content.replaceAll(search, replacement), 'utf8')
  return true
}

// ---- 主逻辑 ----
async function optimizeImages() {
  let sharp
  try {
    sharp = (await import('sharp')).default
  } catch {
    console.log('ℹ️  sharp 未安装，跳过图片优化（运行 npm install -D sharp 后重试）')
    return
  }

  let entries
  try {
    entries = await fs.readdir(publicDir, { withFileTypes: true })
  } catch {
    return
  }

  const pngFiles = entries
    .filter(e => e.isFile() && e.name.toLowerCase().endsWith('.png'))
    .map(e => e.name)

  const converted = [] // 记录成功转换的文件名

  for (const pngName of pngFiles) {
    const pngPath = path.join(publicDir, pngName)
    const webpName = pngName.replace(/\.png$/i, '.webp')
    const webpPath = path.join(publicDir, webpName)

    const pngStat = await fs.stat(pngPath)
    if (pngStat.size < SIZE_THRESHOLD) continue

    // WebP 已存在且比 PNG 新 → 跳过转换，但仍然需要更新引用
    try {
      const webpStat = await fs.stat(webpPath)
      if (webpStat.mtimeMs > pngStat.mtimeMs) {
        converted.push({ pngName, webpName })
        continue
      }
    } catch { /* WebP 不存在，需要生成 */ }

    try {
      await sharp(pngPath)
        .webp({ quality: 82 })
        .toFile(webpPath)

      const webpStat = await fs.stat(webpPath)
      const ratio = ((1 - webpStat.size / pngStat.size) * 100).toFixed(0)
      console.log(
        `✅ 已优化: ${pngName} (${(pngStat.size / 1024 / 1024).toFixed(1)}MB)` +
        ` → ${webpName} (${(webpStat.size / 1024 / 1024).toFixed(1)}MB)` +
        ` [减少 ${ratio}%]`
      )
      converted.push({ pngName, webpName })
    } catch (err) {
      console.warn(`❌ 转换失败 ${pngName}:`, err.message)
    }
  }

  // ---- 自动更新 CSS 和 config.js 中的引用 ----
  for (const { pngName, webpName } of converted) {
    const pngRef = `/${pngName}`    // e.g. /background.png
    const webpRef = `/${webpName}`  // e.g. /background.webp

    // 更新 index.scss 中的 CSS 变量 url('...') 引用
    const scssDone = await replaceInFile(
      scssPath,
      `url('${pngRef}')`,
      `url('${webpRef}')`,
    )
    if (scssDone) console.log(`  📝 已更新 index.scss: ${pngRef} → ${webpRef}`)

    // 更新 config.js 中的 preload href
    const configContent = await fs.readFile(configPath, 'utf8')
    // 匹配 href 中包含该 png 的 preload 行，替换为 webp
    if (configContent.includes(pngName)) {
      const updated = configContent
        .replace(new RegExp(pngName.replace('.', '\\.'), 'g'), webpName)
        .replace("type: 'image/png'", "type: 'image/webp'")
      await fs.writeFile(configPath, updated, 'utf8')
      console.log(`  📝 已更新 config.js: preload → ${webpName}`)
    }
  }

  if (converted.length === 0) {
    console.log('ℹ️  没有需要优化的大图片')
  }
}

optimizeImages().catch(err => console.error('图片优化脚本出错:', err))
