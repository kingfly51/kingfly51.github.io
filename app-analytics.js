// app-analytics.js - 带完整数据追踪和图片保存的版本

const API_URL = 'https://psych-chat-fbfnuvfetv.cn-hongkong.fcapp.run';
let token = localStorage.getItem('token');
let username = localStorage.getItem('username');
let currentPage = 'conversations';
let currentYear = 2026;
let currentMonth = 0;
let selectedDimension = 'overall';
let currentConversationId = null; // 当前对话ID
let audioStartTimes = {}; // 记录音频开始时间
let audioPlayCounts = {}; // 记录音频播放次数
let pageStartTime = Date.now(); // 页面开始时间

if (!token || !username) {
  window.location.href = 'login.html';
}

// =======================================
// 数据追踪函数
// =======================================

// 记录音频播放
async function logAudioPlay(audioId, audioType, duration, completed) {
  try {
    await apiRequest('/api/analytics/audio-played', {
      method: 'POST',
      body: JSON.stringify({
        audio_id: audioId,
        audio_type: audioType,
        duration: duration,
        completed: completed,
        conversation_id: currentConversationId
      })
    });
    console.log('✅ 音频播放已记录:', { audioId, duration, completed });
  } catch (error) {
    console.error('记录音频播放失败:', error);
  }
}

// 记录点击事件
async function logClick(element, elementType, context = {}) {
  try {
    await apiRequest('/api/analytics/click', {
      method: 'POST',
      body: JSON.stringify({
        element: element,
        element_type: elementType,
        page: currentPage,
        context: context
      })
    });
    console.log('✅ 点击已记录:', element);
  } catch (error) {
    console.error('记录点击失败:', error);
  }
}

// 记录页面浏览
async function logPageView(page, duration) {
  try {
    // 使用 sendBeacon 确保在页面卸载时也能发送
    const data = JSON.stringify({
      page: page,
      referrer: document.referrer,
      duration: duration
    });
    
    const blob = new Blob([data], { type: 'application/json' });
    const sent = navigator.sendBeacon(`${API_URL}/api/analytics/page-view`, blob);
    
    if (!sent) {
      // 如果 sendBeacon 失败，使用普通请求
      await apiRequest('/api/analytics/page-view', {
        method: 'POST',
        body: data
      });
    }
    
    console.log('✅ 页面浏览已记录:', { page, duration });
  } catch (error) {
    console.error('记录页面浏览失败:', error);
  }
}

// 标记对话结束
async function endConversation(convId) {
  if (!convId) return;
  
  try {
    await apiRequest(`/api/conversations/${convId}/end`, {
      method: 'POST'
    });
    console.log('✅ 对话已标记为结束:', convId);
  } catch (error) {
    console.error('标记对话结束失败:', error);
  }
}

// =======================================
// 页面事件监听
// =======================================

// 页面卸载前记录浏览时长
window.addEventListener('beforeunload', () => {
  const duration = (Date.now() - pageStartTime) / 1000;
  logPageView(currentPage, duration);
  
  // 如果有正在进行的对话，标记为结束
  if (currentConversationId) {
    endConversation(currentConversationId);
  }
});

// 页面可见性变化
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // 页面隐藏时记录
    const duration = (Date.now() - pageStartTime) / 1000;
    logPageView(currentPage, duration);
  } else {
    // 页面恢复时重置计时
    pageStartTime = Date.now();
  }
});

// =======================================
// API请求封装
// =======================================
async function apiRequest(endpoint, options = {}) {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...defaultOptions,
      ...options,
      headers: { ...defaultOptions.headers, ...options.headers }
    });

    if (response.status === 401) {
      localStorage.clear();
      window.location.href = 'login.html';
      return null;
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || '请求失败');
    }

    return data;
  } catch (error) {
    console.error('API错误:', error);
    throw error;
  }
}

// =======================================
// 页面切换
// =======================================
const navItems = document.querySelectorAll('.nav-item');
const pages = {
  conversations: document.getElementById('conversationsPage'),
  calendar: document.getElementById('calendarPage'),
  training: document.getElementById('trainingPage'),
  profile: document.getElementById('profilePage')
};

const navTitles = {
  conversations: '对话',
  calendar: '健康日历',
  training: '训练中心',
  profile: '我的'
};

navItems.forEach(item => {
  item.addEventListener('click', () => {
    // 记录导航点击
    logClick(`nav_${item.dataset.page}`, 'navigation');
    
    // 记录之前页面的浏览时长
    const duration = (Date.now() - pageStartTime) / 1000;
    logPageView(currentPage, duration);
    
    // 切换页面
    switchPage(item.dataset.page);
    
    // 重置页面开始时间
    pageStartTime = Date.now();
  });
});

function switchPage(page) {
  currentPage = page;
  
  navItems.forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  
  Object.values(pages).forEach(p => p.classList.add('hidden'));
  pages[page].classList.remove('hidden');
  
  document.getElementById('navbarTitle').textContent = navTitles[page];
  
  const navbarAction = document.getElementById('navbarAction');
  if (page === 'conversations') {
    navbarAction.innerHTML = '<i class="fas fa-plus"></i>';
    navbarAction.style.display = 'flex';
    navbarAction.onclick = () => {
      logClick('new_conversation_button', 'button');
      createNewConversation();
    };
  } else {
    navbarAction.style.display = 'none';
  }
  
  if (page === 'conversations') loadConversations();
  if (page === 'calendar') loadCalendar();
  if (page === 'training') loadTraining();
  if (page === 'profile') loadProfile();
}

// =======================================
// 对话列表
// =======================================
async function loadConversations() {
  try {
    const data = await apiRequest('/api/conversations');
    
    const list = document.getElementById('conversationsList');
    
    if (!data || !data.conversations || data.conversations.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #999;">
          <i class="fas fa-comments" style="font-size: 48px; margin-bottom: 16px;"></i>
          <p style="font-size: 14px;">还没有对话</p>
          <p style="font-size: 12px; margin-top: 8px;">点击右上角 + 开始新对话</p>
        </div>
      `;
      return;
    }
    
    list.innerHTML = data.conversations.map(conv => `
      <div class="conversation-item" onclick="openConversation('${conv.id}')">
        <div style="flex: 1;">
          <div style="font-weight: 500; margin-bottom: 4px;">${conv.title}</div>
          <div style="font-size: 12px; color: #999;">
            ${conv.message_count} 条消息 • ${formatTime(conv.updated_at)}
          </div>
        </div>
        <i class="fas fa-chevron-right" style="color: #ddd;"></i>
      </div>
    `).join('');
  } catch (error) {
    console.error('加载对话列表失败:', error);
  }
}

async function createNewConversation() {
  try {
    const data = await apiRequest('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ title: '新对话' })
    });
    
    if (data && data.conversation_id) {
      openConversation(data.conversation_id);
    }
  } catch (error) {
    alert('创建对话失败: ' + error.message);
  }
}

function openConversation(convId) {
  currentConversationId = convId;
  logClick(`conversation_${convId}`, 'conversation_item');
  
  document.getElementById('conversationsPage').classList.add('hidden');
  document.getElementById('chatPage').classList.remove('hidden');
  document.getElementById('navbarTitle').textContent = '对话';
  
  const navbarAction = document.getElementById('navbarAction');
  navbarAction.innerHTML = '<i class="fas fa-arrow-left"></i>';
  navbarAction.style.display = 'flex';
  navbarAction.onclick = () => {
    logClick('back_to_conversations', 'button');
    // 标记对话结束
    endConversation(currentConversationId);
    currentConversationId = null;
    closeChatPage();
  };
  
  loadChatMessages(convId);
}

function closeChatPage() {
  document.getElementById('chatPage').classList.add('hidden');
  document.getElementById('conversationsPage').classList.remove('hidden');
  document.getElementById('navbarTitle').textContent = '对话';
  
  const navbarAction = document.getElementById('navbarAction');
  navbarAction.innerHTML = '<i class="fas fa-plus"></i>';
  navbarAction.onclick = () => {
    logClick('new_conversation_button', 'button');
    createNewConversation();
  };
  
  loadConversations();
}

async function loadChatMessages(convId) {
  try {
    const data = await apiRequest(`/api/conversations/${convId}`);
    
    if (!data || !data.conversation) return;
    
    const messages = data.conversation.messages;
    const container = document.getElementById('messagesContainer');
    
    container.innerHTML = messages.map(msg => {
      if (msg.role === 'user') {
        return `
          <div class="message user-message">
            <div class="message-content">${msg.content}</div>
          </div>
        `;
      } else {
        return `
          <div class="message assistant-message">
            <div class="message-avatar">AI</div>
            <div class="message-content">${msg.content}</div>
          </div>
        `;
      }
    }).join('');
    
    container.scrollTop = container.scrollHeight;
  } catch (error) {
    console.error('加载消息失败:', error);
  }
}

async function sendMessage() {
  const input = document.getElementById('messageInput');
  const message = input.value.trim();
  
  if (!message || !currentConversationId) return;
  
  // 记录发送消息点击
  logClick('send_message_button', 'button', { message_length: message.length });
  
  input.value = '';
  
  const container = document.getElementById('messagesContainer');
  
  // 显示用户消息
  container.innerHTML += `
    <div class="message user-message">
      <div class="message-content">${message}</div>
    </div>
  `;
  
  // 显示加载中
  container.innerHTML += `
    <div class="message assistant-message" id="loadingMessage">
      <div class="message-avatar">AI</div>
      <div class="message-content">
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  `;
  
  container.scrollTop = container.scrollHeight;
  
  try {
    const data = await apiRequest(`/api/conversations/${currentConversationId}/message`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });
    
    document.getElementById('loadingMessage')?.remove();
    
    if (data && data.reply) {
      container.innerHTML += `
        <div class="message assistant-message">
          <div class="message-avatar">AI</div>
          <div class="message-content">${data.reply}</div>
        </div>
      `;
      
      container.scrollTop = container.scrollHeight;
    }
  } catch (error) {
    document.getElementById('loadingMessage')?.remove();
    alert('发送失败: ' + error.message);
  }
}

document.getElementById('messageInput')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

document.getElementById('sendButton')?.addEventListener('click', sendMessage);

// =======================================
// 健康日历
// =======================================
async function loadCalendar() {
  renderCalendar();
  await loadMonthRecords();
}

function renderCalendar() {
  const calendar = document.getElementById('calendarGrid');
  const monthDisplay = document.getElementById('monthDisplay');
  
  monthDisplay.textContent = `${currentYear}年${currentMonth + 1}月`;
  
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  let html = '<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin-bottom: 12px;">';
  ['日', '一', '二', '三', '四', '五', '六'].forEach(day => {
    html += `<div style="text-align: center; color: #999; font-size: 12px; padding: 8px 0;">${day}</div>`;
  });
  html += '</div>';
  
  html += '<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px;">';
  
  for (let i = 0; i < firstDay; i++) {
    html += '<div></div>';
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = dateStr === new Date().toISOString().split('T')[0];
    
    html += `
      <div class="calendar-day ${isToday ? 'today' : ''}" onclick="selectDate('${dateStr}')" data-date="${dateStr}">
        <div style="font-size: 14px; font-weight: 500;">${day}</div>
        <div class="record-indicator" id="indicator-${day}"></div>
      </div>
    `;
  }
  
  html += '</div>';
  calendar.innerHTML = html;
}

async function loadMonthRecords() {
  try {
    const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const data = await apiRequest(`/api/health/records?month=${monthStr}`);
    
    if (!data || !data.records) return;
    
    Object.entries(data.records).forEach(([day, record]) => {
      const indicator = document.getElementById(`indicator-${day}`);
      if (indicator) {
        const dimensions = Object.keys(record).filter(k => 
          ['sleep', 'anxiety', 'depression', 'happiness'].includes(k)
        );
        
        if (dimensions.length > 0) {
          indicator.innerHTML = `<div style="width: 4px; height: 4px; background: #10b981; border-radius: 50%;"></div>`;
        }
      }
    });
  } catch (error) {
    console.error('加载月度记录失败:', error);
  }
}

function prevMonth() {
  logClick('calendar_prev_month', 'button');
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar();
  loadMonthRecords();
}

function nextMonth() {
  logClick('calendar_next_month', 'button');
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
  loadMonthRecords();
}

function selectDate(dateStr) {
  logClick(`calendar_date_${dateStr}`, 'calendar_day');
  
  document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
  document.querySelector(`[data-date="${dateStr}"]`)?.classList.add('selected');
  
  loadDayRecords(dateStr);
}

async function loadDayRecords(dateStr) {
  try {
    const data = await apiRequest('/api/health/records');
    
    if (!data || !data.records || !data.records[dateStr]) {
      document.getElementById('dayRecords').innerHTML = `
        <div style="text-align: center; padding: 20px; color: #999; font-size: 14px;">
          该日期暂无记录
        </div>
      `;
      return;
    }
    
    const record = data.records[dateStr];
    let html = '<div style="padding: 16px;">';
    html += `<div style="font-weight: 500; margin-bottom: 12px; color: #333;">${dateStr}</div>`;
    
    const dimensions = {
      sleep: { name: '睡眠质量', icon: 'fa-moon', color: '#8b5cf6' },
      anxiety: { name: '焦虑水平', icon: 'fa-heart-pulse', color: '#ef4444' },
      depression: { name: '抑郁程度', icon: 'fa-cloud-rain', color: '#3b82f6' },
      happiness: { name: '快乐指数', icon: 'fa-smile', color: '#10b981' }
    };
    
    html += '<div style="display: grid; gap: 12px;">';
    
    Object.entries(dimensions).forEach(([key, info]) => {
      if (record[key]) {
        const score = record[key].score || record[key];
        html += `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f7f7f7; border-radius: 8px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <i class="fas ${info.icon}" style="color: ${info.color};"></i>
              <span style="font-size: 14px;">${info.name}</span>
            </div>
            <span style="font-weight: 500; color: ${info.color};">${typeof score === 'number' ? score.toFixed(1) : score}</span>
          </div>
        `;
      }
    });
    
    html += '</div></div>';
    document.getElementById('dayRecords').innerHTML = html;
  } catch (error) {
    console.error('加载日记录失败:', error);
  }
}

// 快速记录
async function quickRecord(type) {
  logClick(`quick_record_${type}`, 'button');
  
  try {
    const today = new Date().toISOString().split('T')[0];
    await apiRequest('/api/health/quick-record', {
      method: 'POST',
      body: JSON.stringify({
        type: type,
        date: today,
        value: true
      })
    });
    
    alert('记录成功！');
    loadMonthRecords();
  } catch (error) {
    alert('记录失败: ' + error.message);
  }
}

// =======================================
// 训练中心 - 带音频追踪
// =======================================
function loadTraining() {
  const container = document.getElementById('trainingContent');
  
  const breathingExercises = [
    { name: '4-7-8呼吸法', duration: '5分钟', icon: 'fa-wind', description: '吸气4秒，屏气7秒，呼气8秒' },
    { name: '腹式呼吸', duration: '10分钟', icon: 'fa-lungs', description: '深呼吸，让腹部充分扩张' },
    { name: '正念呼吸', duration: '8分钟', icon: 'fa-spa', description: '专注于呼吸的感觉' }
  ];
  
  const relaxationAudios = [
    { name: '海浪声', duration: '15分钟', icon: 'fa-water', description: '舒缓的海浪声助眠' },
    { name: '雨声', duration: '20分钟', icon: 'fa-cloud-rain', description: '温柔的雨声放松身心' },
    { name: '森林声', duration: '18分钟', icon: 'fa-tree', description: '大自然的声音' }
  ];
  
  const guidedMeditations = [
    { name: '身体扫描', duration: '12分钟', icon: 'fa-heart', description: '从头到脚放松身体' },
    { name: '正念冥想', duration: '15分钟', icon: 'fa-om', description: '观察当下的感受' },
    { name: '慈心禅', duration: '10分钟', icon: 'fa-hands-praying', description: '培养慈爱之心' }
  ];
  
  let html = '<div style="padding: 16px;">';
  
  html += '<div class="section-title">呼吸练习</div>';
  html += '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">';
  breathingExercises.forEach(item => {
    html += `
      <div class="training-card" onclick="playAudio('${item.name}', 'breathing')">
        <i class="fas ${item.icon}" style="font-size: 24px; color: #10b981; margin-bottom: 8px;"></i>
        <div style="font-weight: 500; margin-bottom: 4px;">${item.name}</div>
        <div style="font-size: 12px; color: #999;">${item.duration}</div>
      </div>
    `;
  });
  html += '</div>';
  
  html += '<div class="section-title">放松音频</div>';
  html += '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">';
  relaxationAudios.forEach(item => {
    html += `
      <div class="training-card" onclick="playAudio('${item.name}', 'relaxation')">
        <i class="fas ${item.icon}" style="font-size: 24px; color: #3b82f6; margin-bottom: 8px;"></i>
        <div style="font-weight: 500; margin-bottom: 4px;">${item.name}</div>
        <div style="font-size: 12px; color: #999;">${item.duration}</div>
      </div>
    `;
  });
  html += '</div>';
  
  html += '<div class="section-title">引导冥想</div>';
  html += '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">';
  guidedMeditations.forEach(item => {
    html += `
      <div class="training-card" onclick="playAudio('${item.name}', 'meditation')">
        <i class="fas ${item.icon}" style="font-size: 24px; color: #8b5cf6; margin-bottom: 8px;"></i>
        <div style="font-weight: 500; margin-bottom: 4px;">${item.name}</div>
        <div style="font-size: 12px; color: #999;">${item.duration}</div>
      </div>
    `;
  });
  html += '</div>';
  
  html += '</div>';
  
  container.innerHTML = html;
}

// 改进的音频播放函数 - 带完整追踪
window.playAudio = function(name, type = 'general') {
  const audioId = `${type}_${name.replace(/\s+/g, '_')}`;
  
  // 记录点击次数
  if (!audioPlayCounts[audioId]) {
    audioPlayCounts[audioId] = 0;
  }
  audioPlayCounts[audioId]++;
  
  // 记录点击事件
  logClick(`audio_play_${audioId}`, 'audio_button', {
    audio_name: name,
    audio_type: type,
    play_count: audioPlayCounts[audioId]
  });
  
  // 记录开始时间
  audioStartTimes[audioId] = Date.now();
  
  // 创建音频播放界面
  const modal = document.createElement('div');
  modal.id = 'audioModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;
  
  modal.innerHTML = `
    <div style="background: white; padding: 24px; border-radius: 16px; max-width: 300px; width: 90%; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 16px;">🎵</div>
      <div style="font-weight: 500; font-size: 18px; margin-bottom: 8px;">${name}</div>
      <div style="font-size: 14px; color: #999; margin-bottom: 16px;">音频类型: ${type}</div>
      <div style="font-size: 12px; color: #666; margin-bottom: 20px;">
        播放次数: ${audioPlayCounts[audioId]} 次
      </div>
      
      <div style="margin-bottom: 20px;">
        <div style="font-size: 24px; font-weight: 500; color: #10b981;" id="audioTimer">00:00</div>
      </div>
      
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button onclick="stopAudio('${audioId}', false)" style="flex: 1; padding: 12px; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer;">
          停止
        </button>
        <button onclick="stopAudio('${audioId}', true)" style="flex: 1; padding: 12px; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer;">
          播放完成
        </button>
      </div>
      
      <div style="margin-top: 12px; font-size: 12px; color: #999;">
        实际应用时，这里会播放真实音频文件
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // 模拟计时器
  let seconds = 0;
  const timer = setInterval(() => {
    seconds++;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const timerDisplay = document.getElementById('audioTimer');
    if (timerDisplay) {
      timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
  }, 1000);
  
  // 保存计时器ID以便停止
  modal.dataset.timerId = timer;
};

// 停止音频并记录
window.stopAudio = function(audioId, completed) {
  const modal = document.getElementById('audioModal');
  if (!modal) return;
  
  // 停止计时器
  const timerId = parseInt(modal.dataset.timerId);
  if (timerId) {
    clearInterval(timerId);
  }
  
  // 计算播放时长
  const startTime = audioStartTimes[audioId];
  if (startTime) {
    const duration = (Date.now() - startTime) / 1000; // 秒
    
    // 记录音频播放
    logAudioPlay(audioId, 'training', duration, completed);
    
    // 清除开始时间
    delete audioStartTimes[audioId];
  }
  
  // 移除模态框
  modal.remove();
  
  // 显示反馈
  const feedback = completed ? '✅ 音频播放完成！' : '⏹️ 音频已停止';
  alert(feedback);
};

// =======================================
// 个人中心 - 带图片上传功能
// =======================================
async function loadProfile() {
  try {
    const data = await apiRequest('/api/profile');
    
    if (!data || !data.profile) return;
    
    const profile = data.profile;
    
    // 显示头像
    const avatarLarge = document.getElementById('profileAvatarLarge');
    if (profile.avatar) {
      avatarLarge.innerHTML = `<img src="${profile.avatar}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">`;
    } else {
      avatarLarge.textContent = username[0].toUpperCase();
    }
    
    document.getElementById('nicknameDisplay').textContent = profile.nickname || '未设置';
    document.getElementById('phoneDisplay').textContent = profile.phone || '未设置';
    document.getElementById('emailDisplay').textContent = profile.email || '未设置';
    document.getElementById('ageDisplay').textContent = profile.age || '未设置';
    
    const genderMap = { male: '男', female: '女', other: '其他' };
    document.getElementById('genderDisplay').textContent = genderMap[profile.gender] || '未设置';
    
    const educationMap = {
      high_school: '高中',
      college: '大专',
      bachelor: '本科',
      master: '硕士',
      phd: '博士'
    };
    document.getElementById('educationDisplay').textContent = educationMap[profile.education] || '未设置';
    
    document.getElementById('occupationDisplay').textContent = profile.occupation || '未设置';
    document.getElementById('bioDisplay').textContent = profile.bio || '未设置';
    
    // 显示自定义图片
    if (profile.custom_images) {
      displayCustomImages(profile.custom_images);
    }
  } catch (error) {
    console.error('加载个人资料失败:', error);
  }
}

function displayCustomImages(customImages) {
  const container = document.getElementById('customImagesContainer');
  if (!container) return;
  
  let html = '<div style="margin-top: 20px;"><div class="section-title">我的图片</div>';
  html += '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">';
  
  Object.entries(customImages).forEach(([key, img]) => {
    html += `
      <div style="position: relative; padding-top: 100%; background: #f0f0f0; border-radius: 8px; overflow: hidden;">
        <img src="${img.url}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;">
      </div>
    `;
  });
  
  html += '</div></div>';
  container.innerHTML = html;
}

async function editField(field) {
  logClick(`edit_${field}`, 'button');
  
  const currentValue = document.getElementById(`${field}Display`).textContent;
  const displayValue = currentValue === '未设置' ? '' : currentValue;
  
  let inputHtml = '';
  
  if (field === 'gender') {
    const genderValue = displayValue === '男' ? 'male' : displayValue === '女' ? 'female' : displayValue === '其他' ? 'other' : '';
    inputHtml = `
      <select id="editInput" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        <option value="">请选择</option>
        <option value="male" ${genderValue === 'male' ? 'selected' : ''}>男</option>
        <option value="female" ${genderValue === 'female' ? 'selected' : ''}>女</option>
        <option value="other" ${genderValue === 'other' ? 'selected' : ''}>其他</option>
      </select>
    `;
  } else if (field === 'education') {
    const educationValue = {
      '高中': 'high_school',
      '大专': 'college',
      '本科': 'bachelor',
      '硕士': 'master',
      '博士': 'phd'
    }[displayValue] || '';
    
    inputHtml = `
      <select id="editInput" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        <option value="">请选择</option>
        <option value="high_school" ${educationValue === 'high_school' ? 'selected' : ''}>高中</option>
        <option value="college" ${educationValue === 'college' ? 'selected' : ''}>大专</option>
        <option value="bachelor" ${educationValue === 'bachelor' ? 'selected' : ''}>本科</option>
        <option value="master" ${educationValue === 'master' ? 'selected' : ''}>硕士</option>
        <option value="phd" ${educationValue === 'phd' ? 'selected' : ''}>博士</option>
      </select>
    `;
  } else if (field === 'age') {
    inputHtml = `<input type="number" id="editInput" value="${displayValue}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" min="1" max="150">`;
  } else if (field === 'bio') {
    inputHtml = `<textarea id="editInput" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; min-height: 80px;">${displayValue}</textarea>`;
  } else {
    inputHtml = `<input type="text" id="editInput" value="${displayValue}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">`;
  }
  
  const fieldNames = {
    nickname: '昵称',
    phone: '手机号',
    email: '邮箱',
    age: '年龄',
    gender: '性别',
    education: '学历',
    occupation: '职业',
    bio: '个人简介'
  };
  
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;
  
  modal.innerHTML = `
    <div style="background: white; padding: 20px; border-radius: 12px; width: 90%; max-width: 400px;">
      <div style="font-weight: 500; margin-bottom: 16px;">编辑${fieldNames[field]}</div>
      ${inputHtml}
      <div style="display: flex; gap: 12px; margin-top: 16px;">
        <button onclick="this.closest('div[style*=fixed]').remove()" style="flex: 1; padding: 10px; background: #f3f4f6; border: none; border-radius: 8px; cursor: pointer;">
          取消
        </button>
        <button onclick="saveField('${field}')" style="flex: 1; padding: 10px; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer;">
          保存
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

async function saveField(field) {
  const input = document.getElementById('editInput');
  let value = input.value.trim();
  
  if (field === 'age') {
    value = parseInt(value);
    if (isNaN(value) || value <= 0) {
      alert('请输入有效的年龄');
      return;
    }
  }
  
  try {
    const updateData = { [field]: value };
    
    await apiRequest('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
    
    document.querySelector('div[style*="position: fixed"]')?.remove();
    
    logClick(`save_${field}`, 'button', { value: field === 'age' ? value : undefined });
    
    loadProfile();
    alert('保存成功！');
  } catch (error) {
    alert('保存失败: ' + error.message);
  }
}

// 上传图片功能
async function uploadCustomImage() {
  logClick('upload_custom_image', 'button');
  
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // 检查文件大小 (最大5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过5MB');
      return;
    }
    
    // 显示加载提示
    const loading = document.createElement('div');
    loading.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      color: white;
      font-size: 16px;
    `;
    loading.textContent = '上传中...';
    document.body.appendChild(loading);
    
    try {
      // 转换为base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Image = event.target.result;
        
        // 上传到服务器
        const response = await apiRequest('/api/profile/upload-image', {
          method: 'POST',
          body: JSON.stringify({
            image: base64Image,
            key: `custom_${Date.now()}`
          })
        });
        
        loading.remove();
        
        if (response && response.url) {
          alert('✅ 图片上传成功！');
          loadProfile(); // 重新加载资料以显示新图片
        } else {
          alert('❌ 图片上传失败');
        }
      };
      
      reader.onerror = () => {
        loading.remove();
        alert('❌ 图片读取失败');
      };
      
      reader.readAsDataURL(file);
      
    } catch (error) {
      loading.remove();
      alert('上传失败: ' + error.message);
    }
  };
  
  input.click();
}

// 上传头像
async function uploadAvatar() {
  logClick('upload_avatar', 'button');
  
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过5MB');
      return;
    }
    
    const loading = document.createElement('div');
    loading.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      color: white;
      font-size: 16px;
    `;
    loading.textContent = '上传中...';
    document.body.appendChild(loading);
    
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Image = event.target.result;
        
        // 先上传图片获取URL
        const uploadResponse = await apiRequest('/api/profile/upload-image', {
          method: 'POST',
          body: JSON.stringify({
            image: base64Image,
            key: 'avatar'
          })
        });
        
        if (uploadResponse && uploadResponse.url) {
          // 然后更新资料中的头像字段
          await apiRequest('/api/profile', {
            method: 'PUT',
            body: JSON.stringify({
              avatar: uploadResponse.url
            })
          });
          
          loading.remove();
          alert('✅ 头像上传成功！');
          loadProfile();
        } else {
          loading.remove();
          alert('❌ 头像上传失败');
        }
      };
      
      reader.onerror = () => {
        loading.remove();
        alert('❌ 图片读取失败');
      };
      
      reader.readAsDataURL(file);
      
    } catch (error) {
      loading.remove();
      alert('上传失败: ' + error.message);
    }
  };
  
  input.click();
}

function logout() {
  logClick('logout', 'button');
  
  if (confirm('确定要退出登录吗？')) {
    // 记录当前页面浏览时长
    const duration = (Date.now() - pageStartTime) / 1000;
    logPageView(currentPage, duration);
    
    localStorage.clear();
    window.location.href = 'login.html';
  }
}

// 工具函数
function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
  
  return date.toLocaleDateString();
}

// 初始化
switchPage('conversations');
