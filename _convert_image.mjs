// 将 misaka.png 转为 WebP 格式（大幅压缩体积）
// 同时生成一张模糊缩略图用于瞬间占位
import fs from 'node:fs'
import path from 'node:path'

const publicDir = 'd:/StudyNotes/docs/.vuepress/public'
const src = path.join(publicDir, 'misaka.png')

// 输出文件大小对比
const origSize = fs.statSync(src).size
console.log(`原始 misaka.png: ${(origSize / 1024 / 1024).toFixed(2)} MB`)

try {
  const sharp = (await import('sharp')).default
  
  // 转 WebP（quality 80 足够高清，体积大幅缩小）
  const webpBuf = await sharp(src).webp({ quality: 80 }).toBuffer()
  fs.writeFileSync(path.join(publicDir, 'misaka.webp'), webpBuf)
  console.log(`转换 misaka.webp: ${(webpBuf.length / 1024 / 1024).toFixed(2)} MB`)
  
  // 生成极小的模糊占位图（20px 宽 + 高斯模糊，< 2KB）
  const tinyBuf = await sharp(src).resize(20).blur(3).webp({ quality: 20 }).toBuffer()
  const base64 = `data:image/webp;base64,${tinyBuf.toString('base64')}`
  console.log(`占位图 base64 长度: ${base64.length} 字节`)
  
  // 写入占位图的 base64 到一个文件，方便 SCSS 引用
  fs.writeFileSync(path.join(publicDir, 'misaka-placeholder.txt'), base64)
  console.log('✅ 转换完成！')
} catch (e) {
  if (e.code === 'ERR_MODULE_NOT_FOUND' || e.message?.includes('Cannot find')) {
    console.log('⚠️ 未安装 sharp，请先运行: npm install sharp')
    console.log('或者手动用 https://squoosh.app 在线转换 misaka.png → misaka.webp')
  } else {
    console.error(e)
  }
}
