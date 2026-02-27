<template>
  <!-- 音乐播放器浮动球 + 展开面板 -->
  <div
    ref="playerRef"
    class="music-player"
    :class="{ expanded: isExpanded, playing: isPlaying, dragging: isDragging }"
    :style="playerPositionStyle"
  >
    <!-- 🔵 浮动圆球按钮（支持拖拽移动位置） -->
    <button
      class="music-ball"
      :title="isExpanded ? '收起播放器' : '展开播放器'"
      @mousedown="onDragStart"
      @touchstart.passive="onDragStart"
    >
      <!-- 旋转的外圈光环 -->
      <span class="ball-ring"></span>
      <!-- 音符图标 -->
      <span class="ball-icon">♪</span>
      <!-- 播放时的脉冲波纹 -->
      <span v-if="isPlaying" class="ball-pulse"></span>
      <span v-if="isPlaying" class="ball-pulse delay"></span>
    </button>

    <!-- 📻 展开面板 -->
    <transition name="panel-slide">
      <div v-show="isExpanded" class="music-panel">
        <!-- 左侧：唱片 + 尖刺 -->
        <div class="disc-wrapper" :class="{ active: isPlaying }">
          <span v-for="i in 20" :key="i" class="spike" :style="{
            transform: 'rotate(' + (i * 18) + 'deg)',
            animationDelay: (i * 0.06) + 's'
          }"></span>
          <div class="panel-disc" :class="{ spinning: isPlaying }">
            <div class="disc-groove"></div>
            <div class="disc-groove g2"></div>
            <div class="disc-label">
              <span class="disc-note">♫</span>
            </div>
          </div>
        </div>

        <!-- 右侧：信息 + 控制 -->
        <div class="panel-body">
          <!-- 曲名 -->
          <div class="panel-title">
            <span class="title-text">{{ currentTrackName }}</span>
          </div>

          <!-- 进度条 -->
          <div class="panel-progress" @click="seek($event)">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
              <div class="progress-dot" :style="{ left: progressPercent + '%' }"></div>
            </div>
            <div class="progress-time">
              <span>{{ formatTime(currentTime) }}</span>
              <span>{{ formatTime(duration) }}</span>
            </div>
          </div>

          <!-- 控制 + 音量（同一行） -->
          <div class="panel-row">
            <div class="panel-controls">
              <button class="ctrl-btn" title="上一曲" @click="prevTrack">⏮</button>
              <button class="ctrl-btn play-btn" :title="isPlaying ? '暂停' : '播放'" @click="togglePlay">
                <span class="play-icon">{{ isPlaying ? '⏸' : '▶' }}</span>
              </button>
              <button class="ctrl-btn" title="下一曲" @click="nextTrack">⏭</button>
            </div>
            <div class="panel-volume">
              <span class="vol-icon" @click="toggleMute">{{ isMuted ? '🔇' : '🔊' }}</span>
              <input type="range" class="vol-slider" min="0" max="1" step="0.01" :value="volume" @input="setVolume($event)" />
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- 隐藏的 audio 元素 -->
    <audio
      ref="audioRef"
      :src="currentTrackSrc"
      preload="metadata"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoaded"
      @ended="onEnded"
    ></audio>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { withBase } from 'vuepress/client'

// ========================
// 🎵 音乐播放列表（自动生成）
// config.js 在构建/启动时自动扫描 docs/.vuepress/public/ 下的音频文件
// 支持 .mp3 .flac .wav .ogg .aac .m4a .wma
// 添加新音乐：把文件放入 public/ 目录 → 重启开发服务器即可
// ========================
const tracks = (typeof __MUSIC_LIST__ !== 'undefined' && __MUSIC_LIST__.length)
  ? __MUSIC_LIST__
  : [{ name: '暂无音乐', file: '' }]

const audioRef = ref(null)
const playerRef = ref(null)
const isExpanded = ref(false)
const isPlaying = ref(false)
const isMuted = ref(false)
const volume = ref(0.6)
const currentTime = ref(0)
const duration = ref(0)
const currentIndex = ref(0)

const currentTrackName = computed(() => tracks[currentIndex.value]?.name || '未知曲目')
const currentTrackSrc = computed(() => {
  const file = tracks[currentIndex.value]?.file
  if (!file) return ''
  // 对路径中每段分别编码（支持子文件夹如 music/xxx.mp3）
  return withBase('/' + file.split('/').map(encodeURIComponent).join('/'))
})
const progressPercent = computed(() => {
  if (!duration.value) return 0
  return (currentTime.value / duration.value) * 100
})

function togglePanel() {
  isExpanded.value = !isExpanded.value
}

function togglePlay() {
  const audio = audioRef.value
  if (!audio) return
  if (isPlaying.value) {
    audio.pause()
  } else {
    audio.play().catch(() => {})
  }
  isPlaying.value = !isPlaying.value
}

function prevTrack() {
  currentIndex.value = (currentIndex.value - 1 + tracks.length) % tracks.length
  playAfterSwitch()
}

function nextTrack() {
  currentIndex.value = (currentIndex.value + 1) % tracks.length
  playAfterSwitch()
}

function playAfterSwitch() {
  const audio = audioRef.value
  if (!audio) return
  // 等 src 变化后自动播放
  setTimeout(() => {
    audio.play().catch(() => {})
    isPlaying.value = true
  }, 100)
}

function seek(e) {
  const audio = audioRef.value
  const bar = e.currentTarget
  if (!audio || !duration.value) return
  const rect = bar.getBoundingClientRect()
  const x = e.clientX - rect.left
  const pct = Math.max(0, Math.min(1, x / rect.width))
  audio.currentTime = pct * duration.value
}

function setVolume(e) {
  const v = parseFloat(e.target.value)
  volume.value = v
  if (audioRef.value) {
    audioRef.value.volume = v
    isMuted.value = v === 0
  }
}

function toggleMute() {
  isMuted.value = !isMuted.value
  if (audioRef.value) {
    audioRef.value.muted = isMuted.value
  }
}

function onTimeUpdate() {
  if (audioRef.value) {
    currentTime.value = audioRef.value.currentTime
  }
}

function onLoaded() {
  if (audioRef.value) {
    duration.value = audioRef.value.duration
  }
}

function onEnded() {
  // 自动播放下一曲
  nextTrack()
}

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ========================
// 🖱️ 拖拽逻辑
// 长按/拖拽圆球可自由移动位置，松手后位置自动记忆
// 短按（移动 < 5px）视为点击，展开/收起面板
// ========================
const isDragging = ref(false)
const playerPos = ref({ right: null, bottom: null }) // null = 用 CSS 变量默认值
let dragState = null // { startX, startY, startRight, startBottom, moved }

const playerPositionStyle = computed(() => {
  if (playerPos.value.right === null) return {}
  return {
    right: playerPos.value.right + 'px',
    bottom: playerPos.value.bottom + 'px',
  }
})

function onDragStart(e) {
  // 获取初始坐标（兼容鼠标和触摸）
  const ev = e.touches ? e.touches[0] : e
  const el = playerRef.value
  if (!el) return

  // 计算当前 right/bottom（从元素实际位置推算）
  const rect = el.getBoundingClientRect()
  const currentRight = window.innerWidth - rect.right
  const currentBottom = window.innerHeight - rect.bottom

  dragState = {
    startX: ev.clientX,
    startY: ev.clientY,
    startRight: currentRight,
    startBottom: currentBottom,
    moved: false,
  }

  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
  document.addEventListener('touchmove', onDragMove, { passive: false })
  document.addEventListener('touchend', onDragEnd)
}

function onDragMove(e) {
  if (!dragState) return
  const ev = e.touches ? e.touches[0] : e

  const dx = ev.clientX - dragState.startX
  const dy = ev.clientY - dragState.startY

  // 移动超过 5px 才算拖拽（区分点击）
  if (!dragState.moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return
  dragState.moved = true
  isDragging.value = true

  if (e.cancelable) e.preventDefault()

  // right 方向与 clientX 相反，bottom 方向与 clientY 相反
  let newRight = dragState.startRight - dx
  let newBottom = dragState.startBottom - dy

  // 边界限制（留 10px 让球不会完全跑出屏幕）
  const ballSize = playerRef.value?.offsetWidth || 48
  newRight = Math.max(-ballSize + 10, Math.min(window.innerWidth - 10, newRight))
  newBottom = Math.max(-ballSize + 10, Math.min(window.innerHeight - 10, newBottom))

  playerPos.value = { right: newRight, bottom: newBottom }
}

function onDragEnd() {
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  document.removeEventListener('touchmove', onDragMove)
  document.removeEventListener('touchend', onDragEnd)

  if (dragState && !dragState.moved) {
    // 没拖动 → 视为点击
    togglePanel()
  } else if (playerPos.value.right !== null) {
    // 保存位置到 localStorage
    try {
      localStorage.setItem('mp-pos', JSON.stringify(playerPos.value))
    } catch {}
  }

  // 延迟重置 isDragging，避免影响点击判断
  setTimeout(() => { isDragging.value = false }, 50)
  dragState = null
}

// 初始化：音量 + 恢复保存的位置
onMounted(() => {
  if (audioRef.value) {
    audioRef.value.volume = volume.value
  }
  // 从 localStorage 恢复上次的拖拽位置
  try {
    const saved = localStorage.getItem('mp-pos')
    if (saved) {
      const pos = JSON.parse(saved)
      if (typeof pos.right === 'number' && typeof pos.bottom === 'number') {
        playerPos.value = pos
      }
    }
  } catch {}
})

onUnmounted(() => {
  // 清理可能残留的全局事件
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  document.removeEventListener('touchmove', onDragMove)
  document.removeEventListener('touchend', onDragEnd)
})
</script>

<style scoped>
/* ============================================================
   音乐播放器样式
   所有颜色都通过 CSS 变量控制，可在 index.scss 顶部统一配置
   ============================================================ */

/* --- 容器定位 ---
   ✏️ 调位置 → index.scss :root 中 --mp-position-right / --mp-position-bottom
   ✏️ 调大小 → index.scss :root 中 --mp-ball-size                          */
.music-player {
  position: fixed;
  right: var(--mp-position-right, 20px);
  bottom: var(--mp-position-bottom, 80px);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

/* --- 浮动圆球 --- */
.music-ball {
  position: relative;
  width: var(--mp-ball-size, 48px);
  height: var(--mp-ball-size, 48px);
  border-radius: 50%;
  border: none;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none; /* 防止触摸设备上的浏览器默认滚动 */
  background: var(--mp-ball-bg, var(--vp-c-accent, #eb86c9));
  color: var(--mp-ball-icon-color, #fff);
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25), 0 0 0 0 var(--mp-ball-bg, var(--vp-c-accent, #eb86c9));
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  outline: none;
  overflow: visible;
}

.music-ball:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 28px rgba(0, 0, 0, 0.3);
}

/* 拖拽中的视觉反馈 */
.dragging .music-ball {
  cursor: grabbing !important;
  transform: scale(1.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  transition: none; /* 拖拽时关闭过渡动画，跟手更流畅 */
}

.dragging .music-ball .ball-icon {
  transition: none;
}

/* 拖拽时禁用面板动画防闪烁 */
.dragging .music-panel {
  transition: none;
}

/* 播放时圆球旋转 */
.playing .music-ball {
  animation: ball-spin 3s linear infinite;
}

.playing .music-ball:hover {
  animation-play-state: paused;
}

@keyframes ball-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 圆球外圈光环 */
.ball-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: var(--mp-ball-ring, rgba(255, 255, 255, 0.6));
  border-right-color: var(--mp-ball-ring, rgba(255, 255, 255, 0.3));
  opacity: 0;
  transition: opacity 0.3s;
}

.playing .ball-ring {
  opacity: 1;
  animation: ring-rotate 2s linear infinite;
}

@keyframes ring-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 音符图标 */
.ball-icon {
  position: relative;
  z-index: 2;
  font-style: normal;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  line-height: 1;
}

/* 播放时的脉冲波纹 */
.ball-pulse {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--mp-ball-bg, var(--vp-c-accent, #eb86c9));
  opacity: 0;
  z-index: -1;
  animation: pulse-wave 2s ease-out infinite;
}

.ball-pulse.delay {
  animation-delay: 0.8s;
}

@keyframes pulse-wave {
  0% {
    transform: scale(1);
    opacity: 0.5;
  }
  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}

/* --- 展开面板（横向紧凑布局） --- */
.music-panel {
  position: absolute;
  bottom: 56px;
  right: 0;
  width: var(--mp-panel-width, 280px);
  background: var(--mp-panel-bg, rgba(255, 255, 255, 0.92));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 14px;
  padding: 10px 12px;
  box-shadow:
    0 8px 30px rgba(0, 0, 0, 0.15),
    0 0 0 1px var(--mp-panel-border, rgba(0, 0, 0, 0.06));
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
}

/* 右侧信息区 */
.panel-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 控制 + 音量同一行 */
.panel-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 面板展开/收起动画 */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.9);
}

/* --- 唱片 + 尖刺环（圆形） --- */
.disc-wrapper {
  position: relative;
  width: var(--mp-disc-size, 64px);
  height: var(--mp-disc-size, 64px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 尖刺（3 组不同节奏，播放时随音乐脉动） */
.spike {
  position: absolute;
  width: 2px;
  height: 5px;
  border-radius: 1px;
  background: var(--mp-ball-bg, var(--vp-c-accent, #eb86c9));
  top: 0;
  left: 50%;
  margin-left: -1px;
  transform-origin: center 32px;
  opacity: 0.2;
  transition: opacity 0.3s;
}

.disc-wrapper.active .spike { opacity: 1; }
.disc-wrapper.active .spike:nth-child(3n+1) {
  animation: sp-a 0.55s ease-in-out infinite alternate;
}
.disc-wrapper.active .spike:nth-child(3n+2) {
  animation: sp-b 0.75s ease-in-out infinite alternate;
}
.disc-wrapper.active .spike:nth-child(3n) {
  animation: sp-c 0.45s ease-in-out infinite alternate;
}

@keyframes sp-a {
  0%   { height: 3px; opacity: 0.35; }
  100% { height: 10px; opacity: 1; }
}
@keyframes sp-b {
  0%   { height: 4px; opacity: 0.3; }
  100% { height: 7px; opacity: 0.85; }
}
@keyframes sp-c {
  0%   { height: 2px; opacity: 0.4; }
  100% { height: 12px; opacity: 1; }
}

/* 黑胶唱片（圆形） */
.panel-disc {
  width: var(--mp-disc-inner, 42px);
  height: var(--mp-disc-inner, 42px);
  border-radius: 50%;
  background: var(--mp-disc-bg, linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%));
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.2),
    inset 0 0 10px rgba(0, 0, 0, 0.3);
}

.panel-disc.spinning {
  animation: disc-spin 3s linear infinite;
}

@keyframes disc-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.disc-groove {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.disc-groove { inset: 5px; }
.disc-groove.g2 { inset: 11px; }

.disc-label {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--mp-ball-bg, var(--vp-c-accent, #eb86c9));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 2;
}

.disc-note {
  color: #fff;
  font-size: 8px;
  font-weight: bold;
}

/* --- 曲名 --- */
.panel-title {
  width: 100%;
  overflow: hidden;
}

.title-text {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  color: var(--mp-text-color, #2c3e50);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* --- 进度条 --- */
.panel-progress {
  width: 100%;
  cursor: pointer;
}

.progress-bar {
  position: relative;
  height: 3px;
  background: var(--mp-progress-bg, rgba(0, 0, 0, 0.1));
  border-radius: 1.5px;
  overflow: visible;
}

.progress-fill {
  height: 100%;
  background: var(--mp-ball-bg, var(--vp-c-accent, #eb86c9));
  border-radius: 2px;
  transition: width 0.1s linear;
}

.progress-dot {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%) scale(0);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--mp-ball-bg, var(--vp-c-accent, #eb86c9));
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.2);
  transition: transform 0.15s ease;
}

.panel-progress:hover .progress-dot {
  transform: translate(-50%, -50%) scale(1);
}

.progress-time {
  display: flex;
  justify-content: space-between;
  margin-top: 3px;
  font-size: 9px;
  color: var(--mp-text-mute, #999);
}

/* --- 控制按钮 --- */
.panel-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ctrl-btn {
  width: var(--mp-btn-size, 28px);
  height: var(--mp-btn-size, 28px);
  border-radius: 50%;
  border: none;
  background: var(--mp-ctrl-bg, rgba(0, 0, 0, 0.05));
  color: var(--mp-text-color, #2c3e50);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.ctrl-btn:hover {
  background: var(--mp-ctrl-hover, rgba(0, 0, 0, 0.1));
  transform: scale(1.1);
}

.ctrl-btn.play-btn {
  width: var(--mp-btn-play-size, 34px);
  height: var(--mp-btn-play-size, 34px);
  font-size: 15px;
  background: var(--mp-ball-bg, var(--vp-c-accent, #eb86c9));
  color: #fff;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
}

.ctrl-btn.play-btn:hover {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
}

.play-icon {
  line-height: 1;
}

/* --- 音量 --- */
.panel-volume {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.vol-icon {
  font-size: 11px;
  cursor: pointer;
  user-select: none;
  width: 18px;
  text-align: center;
}

.vol-slider {
  flex: 1;
  max-width: var(--mp-vol-width, 50px);
  height: 3px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--mp-progress-bg, rgba(0, 0, 0, 0.1));
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.vol-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--mp-ball-bg, var(--vp-c-accent, #eb86c9));
  cursor: pointer;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
}

.vol-slider::-moz-range-thumb {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--mp-ball-bg, var(--vp-c-accent, #eb86c9));
  border: none;
  cursor: pointer;
}

/* --- 深色模式 --- */
[data-theme='dark'] .music-panel {
  background: var(--mp-panel-bg, rgba(30, 30, 40, 0.92));
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.4),
    0 0 0 1px var(--mp-panel-border, rgba(255, 255, 255, 0.08));
}

[data-theme='dark'] .title-text {
  color: var(--mp-text-color, #d0dce8);
}

[data-theme='dark'] .progress-time {
  color: var(--mp-text-mute, #6b7b8e);
}

[data-theme='dark'] .ctrl-btn {
  background: var(--mp-ctrl-bg, rgba(255, 255, 255, 0.08));
  color: var(--mp-text-color, #d0dce8);
}

[data-theme='dark'] .ctrl-btn:hover {
  background: var(--mp-ctrl-hover, rgba(255, 255, 255, 0.15));
}

[data-theme='dark'] .progress-bar {
  background: var(--mp-progress-bg, rgba(255, 255, 255, 0.1));
}

[data-theme='dark'] .vol-slider {
  background: var(--mp-progress-bg, rgba(255, 255, 255, 0.1));
}

/* --- 响应式：小屏幕 --- */
@media (max-width: 719px) {
  .music-player {
    right: var(--mp-position-right, 12px);
    bottom: var(--mp-position-bottom, 60px);
  }

  .music-ball {
    width: var(--mp-ball-size, 42px);
    height: var(--mp-ball-size, 42px);
    font-size: 18px;
  }

  .music-panel {
    width: 260px;
    right: 0;
  }
}
</style>
