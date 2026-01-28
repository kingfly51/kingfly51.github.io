// audio-player.js - 音频播放系统

class AudioPlayer {
  constructor() {
    this.audio = null;
    this.currentTrack = null;
    this.isPlaying = false;
    this.playlist = this.getPlaylist();
  }

  // 音频库（可替换为实际音频文件URL）
  getPlaylist() {
    return {
      meditation: {
        '身体扫描冥想': { duration: 900, url: 'audio/meditation/body-scan.mp3' },
        '呼吸觉察冥想': { duration: 600, url: 'audio/meditation/breath-awareness.mp3' },
        '慈心冥想': { duration: 720, url: 'audio/meditation/loving-kindness.mp3' },
        '行走冥想': { duration: 480, url: 'audio/meditation/walking.mp3' },
        '正念进食': { duration: 600, url: 'audio/meditation/mindful-eating.mp3' },
        '睡前冥想': { duration: 1200, url: 'audio/meditation/sleep.mp3' }
      },
      breathing: {
        '4-7-8呼吸法': { duration: 300, url: 'audio/breathing/478.mp3' },
        '腹式呼吸': { duration: 480, url: 'audio/breathing/abdominal.mp3' },
        '盒式呼吸': { duration: 360, url: 'audio/breathing/box.mp3' },
        '交替鼻孔呼吸': { duration: 600, url: 'audio/breathing/alternate.mp3' }
      },
      relaxation: {
        '全身肌肉放松': { duration: 900, url: 'audio/relaxation/muscle.mp3' },
        '快速放松训练': { duration: 300, url: 'audio/relaxation/quick.mp3' },
        '睡眠放松引导': { duration: 1500, url: 'audio/relaxation/sleep-guide.mp3' }
      }
    };
  }

  // 播放音频
  play(type, name) {
    const track = this.playlist[type]?.[name];
    
    if (!track) {
      this.showError('音频文件未找到');
      return;
    }

    // 如果已有音频在播放，先停止
    if (this.audio) {
      this.audio.pause();
    }

    this.currentTrack = { type, name, ...track };
    this.showPlayer();
    
    // 尝试加载音频
    this.audio = new Audio(track.url);
    
    this.audio.addEventListener('loadedmetadata', () => {
      this.updatePlayerUI();
      this.audio.play().catch(err => {
        console.error('播放失败:', err);
        this.showError('音频加载失败，请确保音频文件存在');
      });
    });

    this.audio.addEventListener('error', (e) => {
      console.error('音频错误:', e);
      this.showError('音频文件不存在，请上传音频文件到 audio/ 目录');
    });

    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.updatePlayButton();
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.updatePlayButton();
    });

    this.audio.addEventListener('timeupdate', () => {
      this.updateProgress();
    });

    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.updatePlayButton();
    });
  }

  // 显示播放器
  showPlayer() {
    let player = document.getElementById('audioPlayer');
    
    if (!player) {
      player = document.createElement('div');
      player.id = 'audioPlayer';
      player.className = 'audio-player';
      player.innerHTML = `
        <div class="player-header">
          <div class="player-title" id="playerTitle"></div>
          <div class="player-close" onclick="audioPlayer.close()">
            <i class="fas fa-times"></i>
          </div>
        </div>
        <div class="player-progress">
          <div class="progress-bar">
            <div class="progress-fill" id="progressFill"></div>
            <div class="progress-handle" id="progressHandle"></div>
          </div>
          <div class="progress-time">
            <span id="currentTime">0:00</span>
            <span id="totalTime">0:00</span>
          </div>
        </div>
        <div class="player-controls">
          <button class="control-btn" onclick="audioPlayer.seekBackward()">
            <i class="fas fa-backward"></i>
          </button>
          <button class="control-btn play-btn" id="playPauseBtn" onclick="audioPlayer.togglePlay()">
            <i class="fas fa-play"></i>
          </button>
          <button class="control-btn" onclick="audioPlayer.seekForward()">
            <i class="fas fa-forward"></i>
          </button>
        </div>
      `;
      document.body.appendChild(player);

      // 进度条拖动
      const progressBar = player.querySelector('.progress-bar');
      progressBar.addEventListener('click', (e) => {
        const rect = progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        this.seek(percent);
      });
    }

    player.classList.add('show');
  }

  // 更新播放器UI
  updatePlayerUI() {
    if (!this.currentTrack) return;

    document.getElementById('playerTitle').textContent = this.currentTrack.name;
    document.getElementById('totalTime').textContent = this.formatTime(this.audio.duration);
  }

  // 切换播放/暂停
  togglePlay() {
    if (!this.audio) return;

    if (this.isPlaying) {
      this.audio.pause();
    } else {
      this.audio.play();
    }
  }

  // 更新播放按钮
  updatePlayButton() {
    const btn = document.getElementById('playPauseBtn');
    if (!btn) return;

    const icon = btn.querySelector('i');
    if (this.isPlaying) {
      icon.className = 'fas fa-pause';
    } else {
      icon.className = 'fas fa-play';
    }
  }

  // 更新进度
  updateProgress() {
    if (!this.audio) return;

    const percent = (this.audio.currentTime / this.audio.duration) * 100;
    const fill = document.getElementById('progressFill');
    const handle = document.getElementById('progressHandle');
    const currentTime = document.getElementById('currentTime');

    if (fill) fill.style.width = percent + '%';
    if (handle) handle.style.left = percent + '%';
    if (currentTime) currentTime.textContent = this.formatTime(this.audio.currentTime);
  }

  // 跳转
  seek(percent) {
    if (!this.audio) return;
    this.audio.currentTime = this.audio.duration * percent;
  }

  // 快退15秒
  seekBackward() {
    if (!this.audio) return;
    this.audio.currentTime = Math.max(0, this.audio.currentTime - 15);
  }

  // 快进15秒
  seekForward() {
    if (!this.audio) return;
    this.audio.currentTime = Math.min(this.audio.duration, this.audio.currentTime + 15);
  }

  // 关闭播放器
  close() {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    
    const player = document.getElementById('audioPlayer');
    if (player) {
      player.classList.remove('show');
    }
  }

  // 显示错误
  showError(message) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">音频提示</div>
        <div class="modal-body">
          <p>${message}</p>
          <p style="margin-top: 12px; font-size: 14px; color: #666;">
            <strong>解决方案：</strong><br>
            1. 创建 audio/ 目录<br>
            2. 在目录下创建子目录：meditation、breathing、relaxation<br>
            3. 上传对应的MP3音频文件<br>
            4. 或使用在线音频URL
          </p>
        </div>
        <div class="modal-actions">
          <button class="modal-btn confirm" onclick="this.closest('.modal-overlay').remove()">知道了</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  // 格式化时间
  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

// 创建全局实例
const audioPlayer = new AudioPlayer();

// 样式注入
const audioStyles = `
<style>
.audio-player {
  position: fixed;
  bottom: -200px;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid #e5e5e5;
  padding: 16px 20px 20px;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1500;
  transition: bottom 0.3s ease;
}

.audio-player.show {
  bottom: 0;
}

.player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.player-title {
  font-size: 16px;
  font-weight: 600;
  color: #000;
}

.player-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #999;
}

.player-close:active {
  opacity: 0.6;
}

.player-progress {
  margin-bottom: 20px;
}

.progress-bar {
  height: 4px;
  background: #e5e5e5;
  border-radius: 2px;
  position: relative;
  cursor: pointer;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: #07c160;
  border-radius: 2px;
  width: 0%;
  transition: width 0.1s;
}

.progress-handle {
  position: absolute;
  top: 50%;
  left: 0%;
  width: 12px;
  height: 12px;
  background: #07c160;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: left 0.1s;
}

.progress-time {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
}

.player-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 24px;
}

.control-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: #f7f7f7;
  color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.control-btn:active {
  transform: scale(0.95);
}

.control-btn.play-btn {
  width: 56px;
  height: 56px;
  background: #07c160;
  color: white;
  font-size: 20px;
}

@media (max-width: 768px) {
  .audio-player {
    padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  }
}
</style>
`;

// 注入样式
if (!document.getElementById('audioPlayerStyles')) {
  const styleEl = document.createElement('div');
  styleEl.id = 'audioPlayerStyles';
  styleEl.innerHTML = audioStyles;
  document.head.appendChild(styleEl);
}
