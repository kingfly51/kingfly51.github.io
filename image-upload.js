// image-upload.js - 图片上传系统（头像上传）

class ImageUpload {
  constructor() {
    this.maxSize = 5 * 1024 * 1024; // 5MB
    this.acceptTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  }

  // 显示头像上传器
  showAvatarUpload() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width: 400px;">
        <div class="modal-header">更换头像</div>
        <div class="modal-body">
          <div class="upload-preview">
            <img id="previewImage" src="" alt="预览" style="display: none;">
            <div id="uploadPlaceholder" class="upload-placeholder">
              <i class="fas fa-cloud-upload-alt"></i>
              <p>点击或拖拽图片到此处</p>
              <p style="font-size: 12px; color: #999;">支持 JPG、PNG、GIF，最大5MB</p>
            </div>
          </div>
          <input type="file" id="avatarInput" accept="image/*" style="display: none;">
          
          <div class="upload-options">
            <button class="option-btn" onclick="imageUpload.selectFromGallery()">
              <i class="fas fa-images"></i>
              <span>从相册选择</span>
            </button>
            <button class="option-btn" onclick="imageUpload.selectAvatar()">
              <i class="fas fa-user-circle"></i>
              <span>选择默认头像</span>
            </button>
          </div>
        </div>
        <div class="modal-actions">
          <button class="modal-btn cancel" onclick="this.closest('.modal-overlay').remove()">取消</button>
          <button class="modal-btn confirm" id="uploadBtn" disabled onclick="imageUpload.uploadAvatar()">上传</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    // 注入样式
    this.injectStyles();

    // 设置事件
    this.setupEvents(overlay);
  }

  // 设置事件
  setupEvents(overlay) {
    const preview = overlay.querySelector('.upload-preview');
    const input = overlay.querySelector('#avatarInput');
    const placeholder = overlay.querySelector('#uploadPlaceholder');
    const previewImg = overlay.querySelector('#previewImage');

    // 点击上传
    preview.addEventListener('click', () => {
      input.click();
    });

    // 文件选择
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.handleFile(file, previewImg, placeholder);
      }
    });

    // 拖拽上传
    preview.addEventListener('dragover', (e) => {
      e.preventDefault();
      preview.style.borderColor = '#07c160';
    });

    preview.addEventListener('dragleave', () => {
      preview.style.borderColor = '#e5e5e5';
    });

    preview.addEventListener('drop', (e) => {
      e.preventDefault();
      preview.style.borderColor = '#e5e5e5';
      
      const file = e.dataTransfer.files[0];
      if (file) {
        this.handleFile(file, previewImg, placeholder);
      }
    });
  }

  // 处理文件
  handleFile(file, previewImg, placeholder) {
    // 验证文件类型
    if (!this.acceptTypes.includes(file.type)) {
      alert('请选择图片文件（JPG、PNG、GIF）');
      return;
    }

    // 验证文件大小
    if (file.size > this.maxSize) {
      alert('图片大小不能超过5MB');
      return;
    }

    // 读取并预览
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      previewImg.style.display = 'block';
      placeholder.style.display = 'none';
      
      // 启用上传按钮
      document.getElementById('uploadBtn').disabled = false;
      
      // 保存数据
      this.currentImage = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // 从相册选择
  selectFromGallery() {
    document.getElementById('avatarInput').click();
  }

  // 选择默认头像
  selectAvatar() {
    const defaultAvatars = [
      '😊', '😎', '🤗', '😇', '🥰', '😁',
      '🐱', '🐶', '🐼', '🦊', '🐻', '🐨',
      '🌟', '⭐', '💫', '✨', '🌈', '🔥'
    ];

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width: 400px;">
        <div class="modal-header">选择默认头像</div>
        <div class="modal-body">
          <div class="avatar-grid">
            ${defaultAvatars.map(emoji => `
              <div class="avatar-option" onclick="imageUpload.useDefaultAvatar('${emoji}')">
                ${emoji}
              </div>
            `).join('')}
          </div>
        </div>
        <div class="modal-actions">
          <button class="modal-btn cancel" onclick="this.closest('.modal-overlay').remove()">取消</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  // 使用默认头像
  async useDefaultAvatar(emoji) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ avatar: emoji })
      });

      if (response.ok) {
        // 关闭所有modal
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
        
        // 更新显示
        document.getElementById('profileAvatarLarge').textContent = emoji;
        
        this.showToast('头像已更新');
      }
    } catch (error) {
      alert('更新失败：' + error.message);
    }
  }

  // 上传头像
  async uploadAvatar() {
    if (!this.currentImage) {
      alert('请先选择图片');
      return;
    }

    const btn = document.getElementById('uploadBtn');
    btn.disabled = true;
    btn.textContent = '上传中...';

    try {
      // 这里可以实现真实的图片上传到服务器
      // 目前使用base64保存到profile中（演示用）
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          avatar: this.currentImage  // 实际应用中应该上传到图片服务器
        })
      });

      if (response.ok) {
        // 关闭modal
        document.querySelector('.modal-overlay').remove();
        
        // 更新显示
        const avatar = document.getElementById('profileAvatarLarge');
        avatar.style.backgroundImage = `url(${this.currentImage})`;
        avatar.style.backgroundSize = 'cover';
        avatar.textContent = '';
        
        this.showToast('头像已更新');
      } else {
        throw new Error('上传失败');
      }
    } catch (error) {
      alert('上传失败：' + error.message);
      btn.disabled = false;
      btn.textContent = '上传';
    }
  }

  // 裁剪图片
  cropImage(base64, callback) {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = Math.min(img.width, img.height);
      canvas.width = 300;
      canvas.height = 300;
      
      const ctx = canvas.getContext('2d');
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 300, 300);
      
      callback(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = base64;
  }

  // 压缩图片
  compressImage(base64, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = base64;
    });
  }

  // 显示提示
  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-message show';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // 注入样式
  injectStyles() {
    if (document.getElementById('uploadStyles')) return;

    const style = document.createElement('style');
    style.id = 'uploadStyles';
    style.textContent = `
      .upload-preview {
        width: 200px;
        height: 200px;
        margin: 0 auto 20px;
        border: 2px dashed #e5e5e5;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s;
        overflow: hidden;
        position: relative;
      }

      .upload-preview:hover {
        border-color: #07c160;
      }

      .upload-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .upload-placeholder {
        text-align: center;
        color: #999;
        padding: 20px;
      }

      .upload-placeholder i {
        font-size: 48px;
        margin-bottom: 12px;
        display: block;
      }

      .upload-placeholder p {
        margin: 4px 0;
      }

      .upload-options {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin-top: 16px;
      }

      .option-btn {
        padding: 12px;
        border: 1px solid #e5e5e5;
        border-radius: 8px;
        background: white;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
      }

      .option-btn:hover {
        border-color: #07c160;
        background: #f7f7f7;
      }

      .option-btn i {
        font-size: 24px;
        color: #07c160;
      }

      .option-btn span {
        font-size: 13px;
        color: #333;
      }

      .avatar-grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 8px;
      }

      .avatar-option {
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        border: 2px solid #e5e5e5;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .avatar-option:hover {
        border-color: #07c160;
        transform: scale(1.1);
      }

      .toast-message {
        position: fixed;
        top: 60px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 3000;
        opacity: 0;
        transition: opacity 0.3s;
      }

      .toast-message.show {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }
}

// 创建全局实例
const imageUpload = new ImageUpload();
