// data-visualization.js - 数据可视化系统（使用Chart.js）

const _DV_API_URL = 'https://psych-chat-fbfnuvfetv.cn-hongkong.fcapp.run';

class DataVisualization {
  constructor() {
    this.charts = {};
    this.loadChartJS();
  }

  // 加载Chart.js库
  loadChartJS() {
    if (typeof Chart !== 'undefined') return;

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';
    script.onload = () => console.log('Chart.js 已加载');
    document.head.appendChild(script);
  }

  // 显示数据分析页面
  async showAnalytics() {
    // 获取数据
    const data = await this.fetchHealthData();
    
    if (!data || Object.keys(data).length === 0) {
      alert('暂无数据，请先完成健康测量');
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.alignItems = 'flex-start';
    overlay.style.paddingTop = '20px';
    overlay.innerHTML = `
      <div class="modal" style="max-width: 800px; max-height: 85vh; overflow-y: auto;">
        <div class="modal-header">
          <span>健康数据分析</span>
          <i class="fas fa-times" onclick="this.closest('.modal-overlay').remove()" 
             style="cursor: pointer; color: #999;"></i>
        </div>
        <div class="modal-body">
          <!-- 概览卡片 -->
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon" style="background: #e7f9f0;">😴</div>
              <div class="stat-value" id="sleepAvg">--</div>
              <div class="stat-label">平均睡眠质量</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: #fff3e0;">😊</div>
              <div class="stat-value" id="happinessAvg">--</div>
              <div class="stat-label">平均幸福感</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: #e3f2fd;">😰</div>
              <div class="stat-value" id="anxietyAvg">--</div>
              <div class="stat-label">平均焦虑指数</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: #f3e5f5;">📊</div>
              <div class="stat-value" id="recordDays">--</div>
              <div class="stat-label">记录天数</div>
            </div>
          </div>

          <!-- 趋势图表 -->
          <div class="chart-section">
            <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 12px;">
              <i class="fas fa-chart-line"></i> 情绪趋势
            </h3>
            <canvas id="trendChart" style="max-height: 250px;"></canvas>
          </div>

          <!-- 对比雷达图 -->
          <div class="chart-section">
            <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 12px;">
              <i class="fas fa-spider"></i> 综合状态雷达图
            </h3>
            <canvas id="radarChart" style="max-height: 300px;"></canvas>
          </div>

          <!-- 活动统计 -->
          <div class="chart-section">
            <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 12px;">
              <i class="fas fa-chart-bar"></i> 健康活动统计
            </h3>
            <canvas id="activityChart" style="max-height: 200px;"></canvas>
          </div>

          <!-- 洞察建议 -->
          <div class="insights-section">
            <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 12px;">
              <i class="fas fa-lightbulb"></i> 个性化建议
            </h3>
            <div id="insightsList"></div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    // 注入样式
    this.injectStyles();

    // 等待Chart.js加载完成
    this.waitForChart(() => {
      this.renderCharts(data);
      this.calculateStats(data);
      this.generateInsights(data);
    });
  }

  // 等待Chart.js加载
  waitForChart(callback) {
    if (typeof Chart !== 'undefined') {
      callback();
    } else {
      setTimeout(() => this.waitForChart(callback), 100);
    }
  }

  // 获取健康数据
  async fetchHealthData() {
    try {
      const token = localStorage.getItem('token');
      const apiBase = typeof API_URL !== 'undefined' ? API_URL : _DV_API_URL;
      const response = await fetch(`${apiBase}/api/health/records?token=${encodeURIComponent(token)}`, {
        headers: { 'Content-Type': 'text/plain' }
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.records || {};
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    }
    return {};
  }

  // 渲染图表
  renderCharts(data) {
    // 准备数据
    const dates = Object.keys(data).sort();
    const sleepData = dates.map(date => data[date].sleep?.score || null);
    const anxietyData = dates.map(date => data[date].anxiety?.score || null);
    const depressionData = dates.map(date => data[date].depression?.score || null);
    const happinessData = dates.map(date => data[date].happiness?.score || null);

    // 1. 趋势折线图
    const trendCtx = document.getElementById('trendChart');
    if (trendCtx) {
      this.charts.trend = new Chart(trendCtx, {
        type: 'line',
        data: {
          labels: dates.map(d => d.split('-').slice(1).join('/')),
          datasets: [
            {
              label: '睡眠质量',
              data: sleepData,
              borderColor: '#4CAF50',
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              tension: 0.4
            },
            {
              label: '幸福感',
              data: happinessData,
              borderColor: '#FF9800',
              backgroundColor: 'rgba(255, 152, 0, 0.1)',
              tension: 0.4
            },
            {
              label: '焦虑指数',
              data: anxietyData,
              borderColor: '#F44336',
              backgroundColor: 'rgba(244, 67, 54, 0.1)',
              tension: 0.4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: true,
              position: 'bottom'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 10
            }
          }
        }
      });
    }

    // 2. 雷达图
    const latestDate = dates[dates.length - 1];
    const latestData = data[latestDate];
    
    const radarCtx = document.getElementById('radarChart');
    if (radarCtx && latestData) {
      this.charts.radar = new Chart(radarCtx, {
        type: 'radar',
        data: {
          labels: ['睡眠质量', '幸福感', '情绪稳定', '精力水平', '社交活力'],
          datasets: [{
            label: '当前状态',
            data: [
              latestData.sleep?.score || 0,
              latestData.happiness?.score || 0,
              10 - (latestData.depression?.score || 0),
              10 - (latestData.anxiety?.score || 0),
              8  // 示例值
            ],
            backgroundColor: 'rgba(7, 193, 96, 0.2)',
            borderColor: '#07c160',
            pointBackgroundColor: '#07c160'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          scales: {
            r: {
              beginAtZero: true,
              max: 10
            }
          }
        }
      });
    }

    // 3. 活动柱状图
    let exerciseCount = 0;
    let drinkCount = 0;
    let sittingCount = 0;
    let aiCount = 0;

    dates.forEach(date => {
      if (data[date].exercise) exerciseCount++;
      if (data[date].drink) drinkCount++;
      if (data[date].sitting) sittingCount++;
      if (data[date].ai) aiCount++;
    });

    const activityCtx = document.getElementById('activityChart');
    if (activityCtx) {
      this.charts.activity = new Chart(activityCtx, {
        type: 'bar',
        data: {
          labels: ['运动', '含糖饮料', '久坐', 'AI使用'],
          datasets: [{
            label: '天数',
            data: [exerciseCount, drinkCount, sittingCount, aiCount],
            backgroundColor: [
              'rgba(76, 175, 80, 0.8)',
              'rgba(244, 67, 54, 0.8)',
              'rgba(255, 152, 0, 0.8)',
              'rgba(33, 150, 243, 0.8)'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1
              }
            }
          }
        }
      });
    }
  }

  // 计算统计数据
  calculateStats(data) {
    const dates = Object.keys(data);
    let sleepSum = 0, sleepCount = 0;
    let happinessSum = 0, happinessCount = 0;
    let anxietySum = 0, anxietyCount = 0;

    dates.forEach(date => {
      if (data[date].sleep) {
        sleepSum += data[date].sleep.score;
        sleepCount++;
      }
      if (data[date].happiness) {
        happinessSum += data[date].happiness.score;
        happinessCount++;
      }
      if (data[date].anxiety) {
        anxietySum += data[date].anxiety.score;
        anxietyCount++;
      }
    });

    document.getElementById('sleepAvg').textContent = 
      sleepCount > 0 ? (sleepSum / sleepCount).toFixed(1) + '/10' : '--';
    document.getElementById('happinessAvg').textContent = 
      happinessCount > 0 ? (happinessSum / happinessCount).toFixed(1) + '/10' : '--';
    document.getElementById('anxietyAvg').textContent = 
      anxietyCount > 0 ? (anxietySum / anxietyCount).toFixed(1) + '/10' : '--';
    document.getElementById('recordDays').textContent = dates.length + '天';
  }

  // 生成洞察建议
  generateInsights(data) {
    const insights = [];
    const dates = Object.keys(data);
    
    // 分析睡眠
    let sleepScores = dates.map(d => data[d].sleep?.score).filter(s => s !== undefined);
    if (sleepScores.length > 0) {
      const avgSleep = sleepScores.reduce((a, b) => a + b, 0) / sleepScores.length;
      if (avgSleep < 5) {
        insights.push({
          icon: '😴',
          type: 'warning',
          text: '您的睡眠质量偏低，建议每天保持7-8小时睡眠，睡前避免使用电子设备。'
        });
      } else if (avgSleep >= 7) {
        insights.push({
          icon: '✨',
          type: 'success',
          text: '您的睡眠质量很好，继续保持规律的作息时间！'
        });
      }
    }

    // 分析运动
    let exerciseCount = dates.filter(d => data[d].exercise).length;
    if (exerciseCount < dates.length * 0.3) {
      insights.push({
        icon: '🏃',
        type: 'info',
        text: '建议增加运动频率，每周至少3次，每次30分钟以上的有氧运动。'
      });
    }

    // 分析焦虑
    let anxietyScores = dates.map(d => data[d].anxiety?.score).filter(s => s !== undefined);
    if (anxietyScores.length > 0) {
      const avgAnxiety = anxietyScores.reduce((a, b) => a + b, 0) / anxietyScores.length;
      if (avgAnxiety > 6) {
        insights.push({
          icon: '🧘',
          type: 'warning',
          text: '您的焦虑水平较高，建议每天进行10-15分钟的正念冥想或深呼吸练习。'
        });
      }
    }

    // 分析数据完整性
    if (dates.length >= 7) {
      insights.push({
        icon: '🎯',
        type: 'success',
        text: `太棒了！您已连续记录${dates.length}天，坚持记录有助于更好地了解自己。`
      });
    }

    // 默认建议
    if (insights.length === 0) {
      insights.push({
        icon: '💚',
        type: 'info',
        text: '继续记录您的健康数据，我们将为您提供更多个性化建议。'
      });
    }

    // 渲染洞察
    const container = document.getElementById('insightsList');
    if (container) {
      container.innerHTML = insights.map(insight => `
        <div class="insight-item ${insight.type}">
          <div class="insight-icon">${insight.icon}</div>
          <div class="insight-text">${insight.text}</div>
        </div>
      `).join('');
    }
  }

  // 注入样式
  injectStyles() {
    if (document.getElementById('chartStyles')) return;

    const style = document.createElement('style');
    style.id = 'chartStyles';
    style.textContent = `
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin-bottom: 24px;
      }

      .stat-card {
        background: white;
        border-radius: 12px;
        padding: 16px;
        text-align: center;
        border: 1px solid #e5e5e5;
      }

      .stat-icon {
        width: 48px;
        height: 48px;
        margin: 0 auto 8px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
      }

      .stat-value {
        font-size: 24px;
        font-weight: 700;
        color: #000;
        margin-bottom: 4px;
      }

      .stat-label {
        font-size: 12px;
        color: #999;
      }

      .chart-section {
        background: white;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
        border: 1px solid #e5e5e5;
      }

      .insights-section {
        margin-top: 24px;
      }

      .insight-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 12px;
        border-left: 3px solid;
      }

      .insight-item.success {
        background: #e7f9f0;
        border-color: #07c160;
      }

      .insight-item.warning {
        background: #fff3e0;
        border-color: #ff9800;
      }

      .insight-item.info {
        background: #e3f2fd;
        border-color: #2196f3;
      }

      .insight-icon {
        font-size: 24px;
        flex-shrink: 0;
      }

      .insight-text {
        font-size: 14px;
        line-height: 1.6;
        color: #333;
      }

      @media (max-width: 480px) {
        .stats-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // 销毁图表
  destroy() {
    Object.values(this.charts).forEach(chart => {
      if (chart) chart.destroy();
    });
    this.charts = {};
  }
}

// 创建全局实例
const dataVisualization = new DataVisualization();
