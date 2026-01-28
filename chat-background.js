// chat-background.js - 聊天背景设置系统

class ChatBackground {
  constructor() {
    this.currentBg = localStorage.getItem('chatBackground') || 'default';
    this.backgrounds = this.getBackgrounds();
  }

  // 背景库
  getBackgrounds() {
    return {
      default: {
        name: '默认',
        type: 'color',
        value: '#ededed'
      },
      green: {
        name: '清新绿',
        type: 'gradient',
        value: 'linear-gradient(135deg, #e7f9f0 0%, #f0fff4 100%)'
      },
      blue: {
        name: '天空蓝',
        type: 'gradient',
        value: 'linear-gradient(135deg, #e3f2fd 0%, #f1f8ff 100%)'
      },
      purple: {
        name: '梦幻紫',
        type: 'gradient',
        value: 'linear-gradient(135deg, #f3e5f5 0%, #faf5ff 100%)'
      },
      warm: {
        name: '温暖橙',
        type: 'gradient',
        value: 'linear-gradient(135deg, #fff3e0 0%, #fffaf5 100%)'
      },
      stars: {
        name: '星空',
        type: 'image',
        value: 'url(https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800)',
        overlay: 'rgba(255, 255, 255, 0.85)'
      },
      nature: {
        name: '自然',
        type: 'image',
        value: 'url(https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800)',
        overlay: 'rgba(255, 255, 255, 0.85)'
      },
      minimal: {
        name: '简约',
        type: 'pattern',
        value: 'repeating-linear-gradient(45deg, #f5f5f5 0px, #f5f5f5 10px, #ffffff 10px, #ffffff 20px)'
      },
      dots: {
        name: '圆点',
        type: 'pattern',
        value: 'radial-gradient(circle, #e5e5e5 1px, transparent 1px)',
        size: '20px 20px'
      }
    };
  }

  // 显示背景选择器
  showPicker() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width: 500px;">
        <div class="modal-header">选择聊天背景</div>
        <div class="modal-body">
          <div class="bg-grid">
            ${Object.entries(this.backgrounds).map(([key, bg]) => `
              <div class="bg-item ${this.currentBg === key ? 'active' : ''}" 
                   onclick="chatBackground.selectBackground('${key}')"
                   data-bg="${key}">
                <div class="bg-preview" style="${this.getPreviewStyle(bg)}"></div>
                <div class="bg-name">${bg.name}</div>
                ${this.currentBg === key ? '<i class="fas fa-check bg-check"></i>' : ''}
              </div>
            `).join('')}
          </div>
          <div style="margin-top: 16px; padding: 12px; background: #f7f7f7; border-radius: 8px; font-size: 13px; color: #666;">
            <i class="fas fa-info-circle"></i> 提示：选择的背景仅在当前设备生效
          </div>
        </div>
        <div class="modal-actions">
          <button class="modal-btn cancel" onclick="this.closest('.modal-overlay').remove()">取消</button>
          <button class="modal-btn confirm" onclick="chatBackground.applyAndClose()">应用</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    // 注入样式
    this.injectStyles();
  }

  // 获取预览样式
  getPreviewStyle(bg) {
    let style = '';
    
    if (bg.type === 'color') {
      style = `background: ${bg.value};`;
    } else if (bg.type === 'gradient') {
      style = `background: ${bg.value};`;
    } else if (bg.type === 'image') {
      style = `background: ${bg.value}; background-size: cover; background-position: center;`;
      if (bg.overlay) {
        style += ` position: relative;`;
      }
    } else if (bg.type === 'pattern') {
      style = `background: ${bg.value};`;
      if (bg.size) {
        style += ` background-size: ${bg.size};`;
      }
    }
    
    return style;
  }

  // 选择背景
  selectBackground(key) {
    this.currentBg = key;
    
    // 更新UI
    document.querySelectorAll('.bg-item').forEach(item => {
      item.classList.remove('active');
      const check = item.querySelector('.bg-check');
      if (check) check.remove();
    });
    
    const selected = document.querySelector(`[data-bg="${key}"]`);
    if (selected) {
      selected.classList.add('active');
      selected.innerHTML += '<i class="fas fa-check bg-check"></i>';
    }
  }

  // 应用并关闭
  applyAndClose() {
    this.apply(this.currentBg);
    localStorage.setItem('chatBackground', this.currentBg);
    
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) overlay.remove();
    
    // 提示成功
    this.showToast('背景已更新');
  }

  // 应用背景
  apply(key) {
    const bg = this.backgrounds[key];
    if (!bg) return;

    const container = document.querySelector('.messages-container');
    if (!container) return;

    // 清除之前的样式
    container.style.background = '';
    container.style.backgroundSize = '';
    container.style.backgroundPosition = '';
    
    // 移除overlay
    let overlay = container.querySelector('.bg-overlay');
    if (overlay) overlay.remove();

    // 应用新背景
    if (bg.type === 'color') {
      container.style.background = bg.value;
    } else if (bg.type === 'gradient') {
      container.style.background = bg.value;
    } else if (bg.type === 'image') {
      container.style.background = bg.value;
      container.style.backgroundSize = 'cover';
      container.style.backgroundPosition = 'center';
      container.style.backgroundAttachment = 'fixed';
      
      if (bg.overlay) {
        overlay = document.createElement('div');
        overlay.className = 'bg-overlay';
        overlay.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: ${bg.overlay};
          pointer-events: none;
          z-index: 0;
        `;
        container.appendChild(overlay);
        container.style.position = 'relative';
      }
    } else if (bg.type === 'pattern') {
      container.style.background = bg.value;
      if (bg.size) {
        container.style.backgroundSize = bg.size;
      }
    }

    // 确保消息在overlay之上
    const messages = container.querySelectorAll('.message-wrapper');
    messages.forEach(msg => {
      msg.style.position = 'relative';
      msg.style.zIndex = '1';
    });
  }

  // 初始化（从localStorage加载）
  init() {
    const saved = localStorage.getItem('chatBackground');
    if (saved && this.backgrounds[saved]) {
      this.currentBg = saved;
      // 延迟应用，确保DOM已加载
      setTimeout(() => this.apply(saved), 100);
    }
  }

  // 显示提示
  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // 注入样式
  injectStyles() {
    if (document.getElementById('chatBgStyles')) return;
    
    const style = document.createElement('style');
    style.id = 'chatBgStyles';
    style.textContent = `
      .bg-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }

      .bg-item {
        cursor: pointer;
        border-radius: 8px;
        overflow: hidden;
        border: 2px solid #e5e5e5;
        transition: all 0.2s;
        position: relative;
      }

      .bg-item:hover {
        border-color: #07c160;
        transform: scale(1.05);
      }

      .bg-item.active {
        border-color: #07c160;
      }

      .bg-preview {
        width: 100%;
        height: 80px;
        border-radius: 6px 6px 0 0;
      }

      .bg-name {
        padding: 8px;
        text-align: center;
        font-size: 13px;
        background: white;
      }

      .bg-check {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 24px;
        height: 24px;
        background: #07c160;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
      }

      .toast-message {
        position: fixed;
        top: 60px;
        left: 50%;
        transform: translateX(-50%) translateY(-20px);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 3000;
        opacity: 0;
        transition: all 0.3s;
      }

      .toast-message.show {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }

      @media (max-width: 480px) {
        .bg-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// 创建全局实例
const chatBackground = new ChatBackground();

// 页面加载时初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => chatBackground.init());
} else {
  chatBackground.init();
}
