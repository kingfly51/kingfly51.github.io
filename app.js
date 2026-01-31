// app-fixed.js - 修复日历问题的版本

const API_URL = 'https://psych-chat-fbfnuvfetv.cn-hongkong.fcapp.run';
let token = localStorage.getItem('token');
let username = localStorage.getItem('username');
let currentPage = 'conversations';
let currentYear = 2026;
let currentMonth = 0;
let selectedDimension = 'overall'; // 当前选择的维度

if (!token || !username) {
  window.location.href = 'login.html';
}

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
    switchPage(item.dataset.page);
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
    navbarAction.onclick = createNewConversation;
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
    
    if (!data || !data.conversations) return;
    
    const conversations = data.conversations;
    const listEl = document.getElementById('conversationList');
    
    if (conversations.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fas fa-comments"></i></div>
          <div class="empty-text">还没有对话，点击右上角创建</div>
        </div>
      `;
      return;
    }
    
    listEl.innerHTML = conversations.map(conv => {
      const time = formatTime(conv.updated_at);
      const preview = conv.message_count > 0 ? `${conv.message_count} 条消息` : '开始对话';
      return `
        <div class="conversation-item" onclick="openChat('${conv.id}', '${escapeHtml(conv.title)}')">
          <div class="conv-avatar">AI</div>
          <div class="conv-content">
            <div class="conv-header">
              <div class="conv-name">${escapeHtml(conv.title)}</div>
              <div class="conv-time">${time}</div>
            </div>
            <div class="conv-preview">${preview}</div>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('加载对话失败:', error);
  }
}

function openChat(convId, title) {
  window.location.href = `chat.html?id=${convId}&title=${encodeURIComponent(title)}`;
}

async function createNewConversation() {
  const title = prompt('请输入对话标题：', '新对话 ' + new Date().toLocaleString());
  if (!title) return;

  try {
    const data = await apiRequest('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ title })
    });
    
    if (data) {
      await loadConversations();
      openChat(data.conversation_id, title);
    }
  } catch (error) {
    alert('创建失败：' + error.message);
  }
}

// =======================================
// 健康日历（修复版）
// =======================================
async function loadCalendar() {
  renderCalendar();
  loadTodayMeasurements();
  loadCalendarData();
  loadInsights();
}

function renderCalendar() {
  document.getElementById('monthText').textContent = `${currentYear}年${currentMonth + 1}月`;
  
  const daysEl = document.getElementById('calendarDays');
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = new Date();
  
  let html = '';
  
  // 添加空白格子（修复：使其正确对齐）
  for (let i = 0; i < firstDay; i++) {
    html += '<div class="calendar-day empty"></div>';
  }
  
  // 添加日期格子
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = today.getFullYear() === currentYear && 
                    today.getMonth() === currentMonth && 
                    today.getDate() === day;
    
    html += `
      <div class="calendar-day ${isToday ? 'today' : ''}" onclick="openDayDetail(${day})" id="day-${day}">
        <div class="calendar-day-number">${day}</div>
        <div class="calendar-day-icons" id="icons-${day}"></div>
      </div>
    `;
  }
  
  daysEl.innerHTML = html;
}

async function loadCalendarData() {
  try {
    const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const data = await apiRequest(`/api/health/records?month=${monthStr}`);
    
    if (data && data.records) {
      Object.keys(data.records).forEach(day => {
        const record = data.records[day];
        updateDayIcons(day, record);
      });
    }
  } catch (error) {
    console.error('加载日历数据失败:', error);
  }
}

// 更新日期图标显示
function updateDayIcons(day, record) {
  const dayEl = document.getElementById(`day-${day}`);
  const iconsEl = document.getElementById(`icons-${day}`);
  
  if (!dayEl || !iconsEl) return;
  
  let icons = '';
  let hasData = false;
  
  // 根据选择的维度显示不同的图标
  if (selectedDimension === 'overall') {
    // 综合状态：显示所有图标
    if (record.sleep) { icons += '😴'; hasData = true; }
    if (record.anxiety) { icons += '😰'; hasData = true; }
    if (record.depression) { icons += '😔'; hasData = true; }
    if (record.happiness) { icons += '😊'; hasData = true; }
    if (record.exercise) { icons += '🏃'; hasData = true; }
    if (record.drink) { icons += '🥤'; hasData = true; }
    if (record.sitting) { icons += '💺'; hasData = true; }
    if (record.ai) { icons += '🧂'; hasData = true; }
  } else if (selectedDimension === 'sleep') {
    if (record.sleep) {
      icons = getScoreIcon(record.sleep.score);
      hasData = true;
    }
  } else if (selectedDimension === 'anxiety') {
    if (record.anxiety) {
      icons = getScoreIcon(record.anxiety.score, true); // 反向
      hasData = true;
    }
  } else if (selectedDimension === 'depression') {
    if (record.depression) {
      icons = getScoreIcon(record.depression.score, true); // 反向
      hasData = true;
    }
  } else if (selectedDimension === 'happiness') {
    if (record.happiness) {
      icons = getScoreIcon(record.happiness.score);
      hasData = true;
    }
  }
  
  iconsEl.textContent = icons;
  
  if (hasData) {
    dayEl.classList.add('has-data');
    // 根据维度和分数添加颜色
    if (selectedDimension !== 'overall') {
      updateDayColor(dayEl, record);
    }
  } else {
    dayEl.classList.remove('has-data');
  }
}

// 根据分数获取图标
function getScoreIcon(score, reverse = false) {
  if (reverse) score = 10 - score; // 对于焦虑和抑郁，分数越低越好
  
  if (score >= 8) return '😊';
  if (score >= 6) return '🙂';
  if (score >= 4) return '😐';
  if (score >= 2) return '😟';
  return '😔';
}

// 根据维度更新日期颜色
function updateDayColor(dayEl, record) {
  dayEl.style.background = '';
  
  let score = 0;
  if (selectedDimension === 'sleep' && record.sleep) {
    score = record.sleep.score;
  } else if (selectedDimension === 'anxiety' && record.anxiety) {
    score = 10 - record.anxiety.score; // 反向
  } else if (selectedDimension === 'depression' && record.depression) {
    score = 10 - record.depression.score; // 反向
  } else if (selectedDimension === 'happiness' && record.happiness) {
    score = record.happiness.score;
  }
  
  if (score > 0) {
    const intensity = score / 10;
    const r = Math.floor(255 - (intensity * 100));
    const g = Math.floor(200 + (intensity * 55));
    const b = Math.floor(200 - (intensity * 50));
    dayEl.style.background = `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.3), rgba(${r}, ${g}, ${b}, 0.1))`;
  }
}

// 维度筛选变化
document.getElementById('dimensionFilter').addEventListener('change', function() {
  selectedDimension = this.value;
  loadCalendarData();
  updateInsightByDimension();
});

// 根据维度更新洞察
function updateInsightByDimension() {
  const insightEl = document.getElementById('calendarInsight');
  const insights = {
    overall: '查看您的整体健康状态，包括所有维度的记录',
    sleep: '睡眠质量直接影响您的身心健康，建议保持规律作息',
    anxiety: '焦虑是正常情绪，通过正念练习可以有效缓解',
    depression: '关注情绪变化，必要时寻求专业帮助',
    happiness: '幸福感是身心健康的重要指标'
  };
  
  insightEl.textContent = insights[selectedDimension] || insights.overall;
}

async function loadInsights() {
  try {
    const data = await apiRequest('/api/health/insights');
    if (data && data.insights && data.insights.length > 0) {
      document.getElementById('calendarInsight').textContent = data.insights[0];
    }
  } catch (error) {
    console.error('加载洞察失败:', error);
  }
}

// 打开日期详情（完善功能）
async function openDayDetail(day) {
  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  
  try {
    // 获取当月所有数据
    const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const data = await apiRequest(`/api/health/records?month=${monthStr}`);
    
    const dayData = data?.records?.[day] || {};
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width: 500px;">
        <div class="modal-header">
          ${currentYear}年${currentMonth + 1}月${day}日
        </div>
        <div class="modal-body">
          ${renderDayDetails(dayData, dateStr)}
        </div>
        <div class="modal-actions">
          <button class="modal-btn confirm" onclick="this.closest('.modal-overlay').remove()">关闭</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  } catch (error) {
    alert('加载数据失败：' + error.message);
  }
}

// 渲染日期详情
function renderDayDetails(dayData, dateStr) {
  let html = '';
  
  // 测量数据
  const measurements = [
    { key: 'sleep', name: '睡眠质量', icon: '😴' },
    { key: 'anxiety', name: '焦虑指数', icon: '😰' },
    { key: 'depression', name: '抑郁指数', icon: '😔' },
    { key: 'happiness', name: '幸福感', icon: '😊' }
  ];
  
  html += '<div style="margin-bottom: 16px;"><h3 style="font-size: 15px; font-weight: 700; margin-bottom: 12px;">测量数据</h3>';
  
  const hasMeasurements = measurements.some(m => dayData[m.key]);
  
  if (hasMeasurements) {
    measurements.forEach(m => {
      if (dayData[m.key]) {
        html += `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f7f7f7; border-radius: 8px; margin-bottom: 8px;">
            <div>
              <span style="font-size: 20px; margin-right: 8px;">${m.icon}</span>
              <span style="font-weight: 600;">${m.name}</span>
            </div>
            <div style="font-size: 18px; font-weight: 700; color: #07c160;">
              ${dayData[m.key].score.toFixed(1)}/10
            </div>
          </div>
        `;
      }
    });
  } else {
    html += '<p style="color: #999; text-align: center; padding: 20px;">暂无测量数据</p>';
  }
  
  html += '</div>';
  
  // 活动记录
  const activities = [
    { key: 'exercise', name: '运动', icon: '🏃' },
    { key: 'drink', name: '含糖饮料', icon: '🥤' },
    { key: 'sitting', name: '久坐', icon: '💺' },
    { key: 'ai', name: '高脂高盐饮食', icon: '🧂' }
  ];
  
  html += '<div><h3 style="font-size: 15px; font-weight: 700; margin-bottom: 12px;">活动记录</h3>';
  
  const hasActivities = activities.some(a => dayData[a.key]);
  
  if (hasActivities) {
    html += '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">';
    activities.forEach(a => {
      const recorded = dayData[a.key];
      html += `
        <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: ${recorded ? '#e7f9f0' : '#f7f7f7'}; border-radius: 8px;">
          <span style="font-size: 20px;">${a.icon}</span>
          <span style="font-size: 14px;">${a.name}</span>
          ${recorded ? '<i class="fas fa-check" style="color: #07c160; margin-left: auto;"></i>' : ''}
        </div>
      `;
    });
    html += '</div>';
  } else {
    html += '<p style="color: #999; text-align: center; padding: 20px;">暂无活动记录</p>';
  }
  
  html += '</div>';
  
  return html;
}

// 月份切换
document.getElementById('prevMonth').addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar();
  loadCalendarData();
});

document.getElementById('nextMonth').addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
  loadCalendarData();
});

// 快速记录（修复版）
document.querySelectorAll('.quick-action').forEach(action => {
  action.addEventListener('click', async function() {
    const actionType = this.dataset.action;
    const actionNames = {
      exercise: '运动',
      drink: '含糖饮料',
      sitting: '久坐',
      ai: '高脂高盐饮食'
    };
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">记录${actionNames[actionType]}</div>
        <div class="modal-body">
          <p style="text-align: center; padding: 20px;">
            今天是否有<strong>${actionNames[actionType]}</strong>？
          </p>
        </div>
        <div class="modal-actions">
          <button class="modal-btn cancel" onclick="this.closest('.modal-overlay').remove()">取消</button>
          <button class="modal-btn confirm" onclick="confirmQuickRecord('${actionType}', this)">确定记录</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  });
});

// 确认快速记录
window.confirmQuickRecord = async function(actionType, btn) {
  try {
    btn.disabled = true;
    btn.textContent = '记录中...';
    
    await apiRequest('/api/health/quick-record', {
      method: 'POST',
      body: JSON.stringify({
        type: actionType,
        date: new Date().toISOString().split('T')[0]
      })
    });
    
    btn.closest('.modal-overlay').remove();
    
    // 显示成功提示
    showToast('记录成功！');
    
    // 刷新日历
    loadCalendar();
  } catch (error) {
    alert('记录失败：' + error.message);
    btn.disabled = false;
    btn.textContent = '确定记录';
  }
};

// 显示toast提示
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.textContent = message;
  toast.style.cssText = `
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
    animation: fadeInOut 2s ease;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => toast.remove(), 2000);
}

// 今日待测
async function loadTodayMeasurements() {
  try {
    const data = await apiRequest('/api/health/measurements/today');
    
    if (!data) return;
    
    const pending = data.pending || [];
    const container = document.getElementById('todayMeasurements');
    
    if (pending.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">今日测量已完成 ✓</div>';
      return;
    }
    
    const measurements = {
      sleep: { name: '睡眠质量', action: 'openSleepQuestionnaire' },
      anxiety: { name: '焦虑指数', action: 'openAnxietyQuestionnaire' },
      depression: { name: '抑郁指数', action: 'openDepressionQuestionnaire' },
      happiness: { name: '幸福感', action: 'openHappinessQuestionnaire' }
    };
    
    container.innerHTML = pending.map(m => {
      const info = measurements[m];
      if (!info) return '';
      return `
        <div class="measurement-item">
          <div class="measurement-name">${info.name}</div>
          <button class="measurement-btn" onclick="${info.action}()">开始测量</button>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('加载今日待测失败:', error);
  }
}

// 测量问卷
window.openSleepQuestionnaire = function() {
  showQuestionnaire('sleep', '睡眠质量评估', [
    { type: 'slider', question: '昨晚您的睡眠时长是多少小时？', min: 0, max: 12, unit: '小时' },
    { type: 'slider', question: '今早醒来时，您感觉恢复了多少？', min: 0, max: 10, labels: ['精疲力竭', '精力充沛'] },
    { type: 'radio', question: '入睡难易程度？', options: ['很难入睡', '比较难入睡', '容易入睡', '很快入睡'] }
  ]);
};

window.openAnxietyQuestionnaire = function() {
  showQuestionnaire('anxiety', '焦虑指数评估', [
    { type: 'slider', question: '今天您感到焦虑的程度？', min: 0, max: 10, labels: ['完全不焦虑', '极度焦虑'] },
    { type: 'radio', question: '您是否感到紧张不安？', options: ['从不', '偶尔', '经常', '总是'] },
    { type: 'radio', question: '您是否难以停止担忧？', options: ['从不', '偶尔', '经常', '总是'] }
  ]);
};

window.openDepressionQuestionnaire = function() {
  showQuestionnaire('depression', '抑郁指数评估', [
    { type: 'slider', question: '今天您感到抑郁的程度？', min: 0, max: 10, labels: ['非常低落', '非常愉快'] },
    { type: 'radio', question: '您对日常活动的兴趣程度？', options: ['完全没兴趣', '兴趣较少', '有一些兴趣', '非常有兴趣'] },
    { type: 'radio', question: '您感到自己无价值或自责吗？', options: ['从不', '偶尔', '经常', '总是'] }
  ]);
};

window.openHappinessQuestionnaire = function() {
  showQuestionnaire('happiness', '幸福感评估', [
    { type: 'slider', question: '今天您的整体幸福感？', min: 0, max: 10, labels: ['非常不幸福', '非常幸福'] },
    { type: 'radio', question: '您对生活的满意度？', options: ['非常不满意', '不太满意', '比较满意', '非常满意'] },
    { type: 'radio', question: '您感到生活有意义吗？', options: ['完全没有', '不太有', '比较有', '非常有'] }
  ]);
};

function showQuestionnaire(dimension, title, questions) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">${title}</div>
      <div class="modal-body questionnaire">
        ${questions.map((q, i) => renderQuestion(q, i)).join('')}
      </div>
      <div class="modal-actions">
        <button class="modal-btn cancel" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="modal-btn confirm" onclick="submitQuestionnaire('${dimension}', this)">提交</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

function renderQuestion(q, index) {
  if (q.type === 'slider') {
    const defaultValue = Math.floor((q.min + q.max) / 2);
    return `
      <div class="question-item">
        <div class="question-text">${q.question}</div>
        <div class="slider-container">
          <input type="range" class="slider" min="${q.min}" max="${q.max}" value="${defaultValue}" 
                 data-index="${index}" oninput="updateSliderValue(this)">
          <div class="slider-labels">
            <span>${q.labels ? q.labels[0] : q.min}</span>
            <span id="slider-value-${index}">${defaultValue}${q.unit || ''}</span>
            <span>${q.labels ? q.labels[1] : q.max}</span>
          </div>
        </div>
      </div>
    `;
  } else if (q.type === 'radio') {
    return `
      <div class="question-item">
        <div class="question-text">${q.question}</div>
        <div class="radio-group">
          ${q.options.map((opt, i) => `
            <label class="radio-option">
              <input type="radio" name="q${index}" value="${i}" data-index="${index}">
              <span>${opt}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }
}

window.updateSliderValue = function(slider) {
  const index = slider.dataset.index;
  const valueEl = document.getElementById(`slider-value-${index}`);
  if (valueEl) {
    valueEl.textContent = slider.value;
  }
};

window.submitQuestionnaire = async function(dimension, btn) {
  const answers = [];
  document.querySelectorAll('.question-item').forEach((item) => {
    const slider = item.querySelector('.slider');
    const radio = item.querySelector('input[type="radio"]:checked');
    
    if (slider) {
      answers.push(parseInt(slider.value));
    } else if (radio) {
      answers.push(parseInt(radio.value));
    } else {
      answers.push(0);
    }
  });
  
  try {
    btn.disabled = true;
    btn.textContent = '提交中...';
    
    await apiRequest('/api/health/record', {
      method: 'POST',
      body: JSON.stringify({
        dimension,
        answers,
        date: new Date().toISOString().split('T')[0]
      })
    });
    
    showToast('记录成功！');
    btn.closest('.modal-overlay').remove();
    loadCalendar();
  } catch (error) {
    alert('提交失败：' + error.message);
    btn.disabled = false;
    btn.textContent = '提交';
  }
};

// 专业测评工具
document.getElementById('openSurveysBtn').addEventListener('click', () => {
  window.open('https://v.wjx.cn/vm/OtNf3pW.aspx#', '_blank');
});

// =======================================
// 训练中心
// =======================================
function loadTraining() {
  const meditationData = [
    { name: '身体扫描冥想', duration: '5分钟', icon: '🧘' },
    { name: '呼吸觉察冥想', duration: '5分钟', icon: '🌬️' },
    { name: '慈心冥想', duration: '8分钟', icon: '💚' },
    { name: '行走冥想', duration: '12分钟', icon: '🚶' },
    { name: '正念进食', duration: '10分钟', icon: '🍽️' },
    { name: '睡前冥想', duration: '20分钟', icon: '🌙' }
  ];
  
  document.getElementById('meditationGrid').innerHTML = meditationData.map(item => `
    <div class="training-card" onclick="playAudio('${item.name}')">
      <div class="training-icon">${item.icon}</div>
      <div class="training-name">${item.name}</div>
      <div class="training-duration">${item.duration}</div>
    </div>
  `).join('');
  
  const breathingData = [
    { name: '4-7-8呼吸法', duration: '5分钟', icon: '💨' },
    { name: '腹式呼吸', duration: '3分钟', icon: '🫁' },
    { name: '盒式呼吸', duration: '6分钟', icon: '📦' },
    { name: '交替鼻孔呼吸', duration: '5分钟', icon: '👃' }
  ];
  
  document.getElementById('breathingGrid').innerHTML = breathingData.map(item => `
    <div class="training-card" onclick="playAudio('${item.name}')">
      <div class="training-icon">${item.icon}</div>
      <div class="training-name">${item.name}</div>
      <div class="training-duration">${item.duration}</div>
    </div>
  `).join('');
  
  const relaxationData = [
    { name: '全身肌肉放松', duration: '5分钟', icon: '💪' },
    { name: '快速放松训练', duration: '5分钟', icon: '⚡' },
    { name: '睡眠放松引导', duration: '25分钟', icon: '😴' }
  ];
  
  document.getElementById('relaxationGrid').innerHTML = relaxationData.map(item => `
    <div class="training-card" onclick="playAudio('${item.name}')">
      <div class="training-icon">${item.icon}</div>
      <div class="training-name">${item.name}</div>
      <div class="training-duration">${item.duration}</div>
    </div>
  `).join('');
}

window.playAudio = function(name) {
  alert(`播放 ${name}\n\n音频功能开发中...\n\n请准备音频文件后替换此提示。`);
};

// =======================================
// 个人中心
// =======================================
async function loadProfile() {
  try {
    const data = await apiRequest('/api/profile');
    
    if (!data || !data.profile) return;
    
    const profile = data.profile;
    
    document.getElementById('profileAvatarLarge').textContent = username[0].toUpperCase();
    document.getElementById('profileName').textContent = profile.nickname || username;
    document.getElementById('profileUsername').textContent = '@' + username;
    
    document.getElementById('nicknameDisplay').textContent = profile.nickname || '未设置';
    document.getElementById('phoneDisplay').textContent = profile.phone || '未设置';
    document.getElementById('emailDisplay').textContent = profile.email || '未设置';
    document.getElementById('ageDisplay').textContent = profile.age || '未设置';
    
    const genderMap = { male: '男', female: '女', other: '其他' };
    document.getElementById('genderDisplay').textContent = genderMap[profile.gender] || '未设置';
    
    const educationMap = {
      'highschool': '高中',
      'college': '大专',
      'bachelor': '本科',
      'master': '硕士',
      'phd': '博士'
    };
    document.getElementById('educationDisplay').textContent = educationMap[profile.education] || '未设置';
    
    document.getElementById('occupationDisplay').textContent = profile.occupation || '未设置';
    document.getElementById('bioDisplay').textContent = profile.bio || '未设置';
  } catch (error) {
    console.error('加载资料失败:', error);
  }
}

// 个人资料编辑
document.querySelectorAll('.profile-item[data-field]').forEach(item => {
  item.addEventListener('click', function() {
    editProfileField(this.dataset.field);
  });
});

function editProfileField(field) {
  const fieldNames = {
    nickname: '昵称',
    phone: '手机号',
    email: '邮箱',
    age: '年龄',
    gender: '性别',
    education: '受教育程度',
    occupation: '职业',
    bio: '个人简介'
  };
  
  const currentValue = document.getElementById(`${field}Display`).textContent;
  const displayValue = currentValue === '未设置' ? '' : currentValue;
  
  let inputHtml = '';
  
  if (field === 'gender') {
    const genderValue = displayValue === '男' ? 'male' : displayValue === '女' ? 'female' : displayValue === '其他' ? 'other' : '';
    inputHtml = `
      <select class="modal-select" id="editInput">
        <option value="">请选择</option>
        <option value="male" ${genderValue === 'male' ? 'selected' : ''}>男</option>
        <option value="female" ${genderValue === 'female' ? 'selected' : ''}>女</option>
        <option value="other" ${genderValue === 'other' ? 'selected' : ''}>其他</option>
      </select>
    `;
  } else if (field === 'education') {
    const eduMap = { '高中': 'highschool', '大专': 'college', '本科': 'bachelor', '硕士': 'master', '博士': 'phd' };
    const eduValue = eduMap[displayValue] || '';
    inputHtml = `
      <select class="modal-select" id="editInput">
        <option value="">请选择</option>
        <option value="highschool" ${eduValue === 'highschool' ? 'selected' : ''}>高中</option>
        <option value="college" ${eduValue === 'college' ? 'selected' : ''}>大专</option>
        <option value="bachelor" ${eduValue === 'bachelor' ? 'selected' : ''}>本科</option>
        <option value="master" ${eduValue === 'master' ? 'selected' : ''}>硕士</option>
        <option value="phd" ${eduValue === 'phd' ? 'selected' : ''}>博士</option>
      </select>
    `;
  } else if (field === 'bio') {
    inputHtml = `<textarea class="modal-textarea" id="editInput" placeholder="请输入${fieldNames[field]}">${displayValue}</textarea>`;
  } else if (field === 'age') {
    const ageValue = displayValue === '未设置' ? '' : displayValue;
    inputHtml = `<input type="number" class="modal-input" id="editInput" placeholder="请输入${fieldNames[field]}" value="${ageValue}">`;
  } else {
    inputHtml = `<input type="text" class="modal-input" id="editInput" placeholder="请输入${fieldNames[field]}" value="${displayValue}">`;
  }
  
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">编辑${fieldNames[field]}</div>
      <div class="modal-body">
        ${inputHtml}
      </div>
      <div class="modal-actions">
        <button class="modal-btn cancel" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="modal-btn confirm" onclick="saveProfileField('${field}', this)">保存</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  
  setTimeout(() => {
    const input = document.getElementById('editInput');
    if (input) input.focus();
  }, 100);
}

window.saveProfileField = async function(field, btn) {
  const input = document.getElementById('editInput');
  let value = input.value.trim();
  
  if (field === 'age') {
    value = parseInt(value) || null;
  }
  
  try {
    btn.disabled = true;
    btn.textContent = '保存中...';
    
    await apiRequest('/api/profile', {
      method: 'PUT',
      body: JSON.stringify({ [field]: value })
    });
    
    btn.closest('.modal-overlay').remove();
    await loadProfile();
  } catch (error) {
    alert('保存失败：' + error.message);
    btn.disabled = false;
    btn.textContent = '保存';
  }
};

// 退出登录
document.getElementById('logoutBtn').addEventListener('click', () => {
  if (confirm('确定要退出登录吗？')) {
    localStorage.clear();
    window.location.href = 'login.html';
  }
});

// =======================================
// 工具函数
// =======================================
function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 添加fadeInOut动画
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInOut {
    0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    10% { opacity: 1; transform: translateX(-50%) translateY(0); }
    90% { opacity: 1; transform: translateX(-50%) translateY(0); }
    100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
  }
`;
document.head.appendChild(style);

// =======================================
// 初始化
// =======================================
switchPage('conversations');

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
