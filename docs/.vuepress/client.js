import { defineClientConfig } from '@vuepress/client'
import MusicPlayer from './components/MusicPlayer.vue'

export default defineClientConfig({
  // 全局注册音乐播放器组件，使其在每个页面都自动挂载
  rootComponents: [MusicPlayer],

  enhance({ app, router, siteData }) {
    if (typeof window !== 'undefined') {
      // 监听路由变化，给 body 添加/移除 is-home 类名
      router.afterEach((to) => {
        if (to.path === '/') {
          document.body.classList.add('is-home');
        } else {
          document.body.classList.remove('is-home');
        }
      });

      // 监听滚动事件，实现动态模糊效果
      window.addEventListener('scroll', () => {
        // 只有在首页才计算和应用模糊效果
        if (!document.body.classList.contains('is-home')) return;

        const scrollY = window.scrollY || document.documentElement.scrollTop;
        
        // 计算模糊度：向下滚动时增加，最大 5px (轻微虚化)
        // scrollY / 100 意味着滚动 500px 时达到最大模糊度 5px
        const blurVal = Math.min(scrollY / 100, 5); 
        
        // 计算亮度：向下滚动时稍微变暗，最低 0.8 (保持较亮)
        // 这样可以让滚动上来的文字更清晰，但背景不会太暗
        const brightnessVal = Math.max(1 - (scrollY / 1500), 0.8);
        
        // 将计算结果注入到 CSS 变量中
        document.documentElement.style.setProperty('--bg-blur', `${blurVal}px`);
        document.documentElement.style.setProperty('--bg-brightness', `${brightnessVal}`);
      });
    }
  },
})
