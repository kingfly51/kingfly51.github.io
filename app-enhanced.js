// app-enhanced.js - 增强功能集成脚本
// 将此文件的内容添加到 app.js 末尾，或在 index.html 中引入

// ========================================
// 集成音频播放
// ========================================

// 修改 playAudio 函数
window.playAudio = function(name) {
  const type = getCurrentAudioType(name);
  audioPlayer.play(type, name);
};

function getCurrentAudioType(name) {
  const meditationNames = ['身体扫描冥想', '呼吸觉察冥想', '慈心冥想', '行走冥想', '正念进食', '睡前冥想'];
  const breathingNames = ['4-7-8呼吸法', '腹式呼吸', '盒式呼吸', '交替鼻孔呼吸'];
  
  if (meditationNames.includes(name)) return 'meditation';
  if (breathingNames.includes(name)) return 'breathing';
  return 'relaxation';
}

// ========================================
// 集成聊天背景
// ========================================

// 在 chat.html 中添加背景设置按钮的点击事件
document.addEventListener('DOMContentLoaded', () => {
  const setBgBtn = document.getElementById('setBgBtn');
  if (setBgBtn) {
    setBgBtn.addEventListener('click', () => {
      chatBackground.showPicker();
      document.getElementById('menuOverlay').classList.add('hidden');
    });
  }
});

// ========================================
// 集成数据可视化
// ========================================

// 在日历页面添加数据分析按钮
function addAnalyticsButton() {
  const calendarPage = document.getElementById('calendarPage');
  if (!calendarPage) return;
  
  // 检查按钮是否已存在
  if (document.getElementById('analyticsBtn')) return;
  
  const btn = document.createElement('button');
  btn.id = 'analyticsBtn';
  btn.className = 'measurement-btn';
  btn.style.cssText = 'background: #2196f3; margin-top: 16px; width: 100%;';
  btn.innerHTML = '<i class="fas fa-chart-line"></i> 数据分析';
  btn.onclick = () => dataVisualization.showAnalytics();
  
  const container = calendarPage.querySelector('.calendar-page');
  if (container) {
    container.appendChild(btn);
  }
}

// 在切换到日历页面时添加按钮
const originalSwitchPage = switchPage;
window.switchPage = function(page) {
  originalSwitchPage(page);
  if (page === 'calendar') {
    setTimeout(addAnalyticsButton, 100);
  }
};

// ========================================
// 集成头像上传
// ========================================

// 修改头像点击事件
document.addEventListener('DOMContentLoaded', () => {
  const avatarLarge = document.getElementById('profileAvatarLarge');
  if (avatarLarge) {
    avatarLarge.style.cursor = 'pointer';
    avatarLarge.addEventListener('click', () => {
      imageUpload.showAvatarUpload();
    });
  }
});

// ========================================
// 加载所有增强功能脚本
// ========================================

function loadEnhancedFeatures() {
  const scripts = [
    'audio-player.js',
    'chat-background.js',
    'data-visualization.js',
    'image-upload.js'
  ];
  
  scripts.forEach(src => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    document.head.appendChild(script);
  });
  
  console.log('✅ 增强功能已加载');
}

// 页面加载时执行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadEnhancedFeatures);
} else {
  loadEnhancedFeatures();
}

// ========================================
// 快捷入口
// ========================================

// 添加功能快捷入口到个人中心
function addFeatureShortcuts() {
  const profilePage = document.getElementById('profilePage');
  if (!profilePage) return;
  
  // 检查是否已添加
  if (document.getElementById('featureShortcuts')) return;
  
  const shortcuts = document.createElement('div');
  shortcuts.id = 'featureShortcuts';
  shortcuts.className = 'profile-section';
  shortcuts.innerHTML = `
    <div class="profile-item" onclick="dataVisualization.showAnalytics()">
      <span class="profile-item-label">
        <i class="fas fa-chart-line" style="margin-right: 8px; color: #2196f3;"></i>
        数据分析
      </span>
      <i class="fas fa-chevron-right" style="color: #999;"></i>
    </div>
    <div class="profile-item" onclick="imageUpload.showAvatarUpload()">
      <span class="profile-item-label">
        <i class="fas fa-image" style="margin-right: 8px; color: #4caf50;"></i>
        更换头像
      </span>
      <i class="fas fa-chevron-right" style="color: #999;"></i>
    </div>
  `;
  
  // 插入到退出登录按钮之前
  const logoutSection = profilePage.querySelector('.profile-section:last-child');
  if (logoutSection) {
    profilePage.insertBefore(shortcuts, logoutSection);
  }
}

// 在切换到个人中心时添加快捷入口
const originalSwitchPageEnhanced = window.switchPage;
window.switchPage = function(page) {
  if (originalSwitchPageEnhanced) {
    originalSwitchPageEnhanced(page);
  }
  if (page === 'profile') {
    setTimeout(addFeatureShortcuts, 100);
  }
};

console.log('🎉 所有增强功能已准备就绪！');
