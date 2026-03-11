/**
 * experiments.js
 * 实验中心模块：Stroop / Go-NoGo / 温度-睡眠情境诱导实验
 * 挂载到 psy_index.html，与现有 switchPage 体系集成
 */

// ─────────────────────────────────────────────
//  1. 注册实验页到 switchPage 系统
// ─────────────────────────────────────────────
(function patchSwitchPage() {
  // 等待 app.js 中 pages / navTitles 就绪
  const ready = () => {
    if (typeof pages === 'undefined' || typeof navTitles === 'undefined') {
      return setTimeout(ready, 50);
    }
    pages['experiments'] = document.getElementById('experimentsPage');
    navTitles['experiments'] = '实验中心';

    // 在原 switchPage 后钩入
    const orig = window.switchPage;
    window.switchPage = function(page) {
      orig(page);
      const audioBtn = document.getElementById('tsAudioBtn');
      if (audioBtn) audioBtn.classList.toggle('vis', page === 'experiments' && !!window._tsRunning);
    };
  };
  ready();
})();

// ─────────────────────────────────────────────
//  2. 入口：启动实验
// ─────────────────────────────────────────────
function launchExperiment(type) {
  const runner = document.getElementById('experimentRunner');
  runner.innerHTML = '';
  runner.classList.remove('hidden');

  // 阻止底部导航的点击穿透
  document.body.style.overflow = 'hidden';

  if (type === 'stroop')      initStroop(runner);
  else if (type === 'gonogo') initGoNoGo(runner);
  else if (type === 'temperature') initTempExp(runner);
}

function closeExperiment() {
  const runner = document.getElementById('experimentRunner');
  runner.classList.add('hidden');
  runner.innerHTML = '';
  document.body.style.overflow = '';
  window._tsRunning = false;
  stopTsAudio();
  cancelAnimationFrame(window._tsAnimId);
  document.getElementById('tsAudioBtn')?.classList.remove('vis');
}

function makeTopbar(title, progress = 0) {
  return `
    <div class="exp-topbar">
      <div class="exp-topbar-back" onclick="closeExperiment()">
        <i class="fas fa-times"></i>
      </div>
      <div class="exp-topbar-title">${title}</div>
      <div style="width:36px"></div>
      <div class="exp-progress-bar" id="expPBar" style="width:${progress}%"></div>
    </div>
    <div id="expContent"></div>
  `;
}

// ═══════════════════════════════════════════════════════════
//  3. STROOP 范式
// ═══════════════════════════════════════════════════════════
const STROOP_COLORS = [
  { name: '红', hex: '#ef4444' },
  { name: '蓝', hex: '#3b82f6' },
  { name: '绿', hex: '#22c55e' },
  { name: '黄', hex: '#eab308' },
];

function initStroop(runner) {
  runner.innerHTML = makeTopbar('Stroop 色词干扰');
  const content = document.getElementById('expContent');

  // 生成 trial 列表
  // 练习：10 congruent；正式：30 congruent + 30 incongruent
  function makeTrial(type) {
    const word  = STROOP_COLORS[Math.floor(Math.random() * 4)];
    let   color = word;
    if (type === 'incongruent') {
      do { color = STROOP_COLORS[Math.floor(Math.random() * 4)]; } while (color === word);
    }
    return { word: word.name, color: color.hex, correctName: color.name, type };
  }

  const pracTrials = Array.from({ length: 10 }, () => makeTrial('congruent'));
  const testTrials = [
    ...Array.from({ length: 30 }, () => makeTrial('congruent')),
    ...Array.from({ length: 30 }, () => makeTrial('incongruent')),
  ].sort(() => Math.random() - 0.5);

  let phase = 'intro';  // intro | practice | test | result
  let trialIdx = 0;
  let trials = [];
  let results = { congruent: [], incongruent: [] };
  let stimStart = 0;
  let responded = false;

  function render() {
    if (phase === 'intro') renderIntro();
    else if (phase === 'practice') renderTrial(true);
    else if (phase === 'test') renderTrial(false);
    else renderResult();
  }

  function renderIntro() {
    document.getElementById('expPBar').style.width = '0%';
    content.innerHTML = `
      <div class="stroop-wrap">
        <div style="margin-top:20px"></div>
        <div class="stroop-phase-title">🎨 Stroop 色词干扰任务</div>
        <div class="stroop-phase-sub">测量你的认知控制能力</div>
        <div class="ts-glass" style="max-width:340px;color:rgba(255,255,255,0.8);font-size:13px;line-height:2;margin:20px 0">
          <strong style="color:#fff">规则</strong><br>
          屏幕会出现一个颜色词，请选择该词<strong style="color:#eab308">文字的显示颜色</strong>，而不是词语的含义。<br><br>
          例如：如果看到 <span style="color:#3b82f6;font-weight:700">红</span>（蓝色字），请按<strong style="color:#3b82f6">蓝色</strong>。<br><br>
          先进行 10 次练习，然后正式测试 60 次。尽可能<strong style="color:#fff">快而准确</strong>。
        </div>
        <div class="stroop-btn-grid" style="margin-top:8px">
          ${STROOP_COLORS.map(c => `
            <div class="stroop-btn" style="border-color:${c.hex};color:${c.hex}" onclick="void(0)">
              <span style="width:14px;height:14px;border-radius:50%;background:${c.hex};display:inline-block"></span>
              ${c.name}
            </div>`).join('')}
        </div>
        <button class="ts-btn" style="margin-top:32px" onclick="startPractice()">开始练习 →</button>
      </div>`;
    window.startPractice = () => { phase = 'practice'; trials = pracTrials; trialIdx = 0; render(); };
  }

  function renderTrial(isPractice) {
    const total = isPractice ? pracTrials.length : testTrials.length;
    document.getElementById('expPBar').style.width = (trialIdx / total * 100) + '%';
    responded = false;

    content.innerHTML = `
      <div class="stroop-wrap">
        <div class="stroop-phase-title">${isPractice ? '练习阶段' : '正式测试'}</div>
        <div class="stroop-phase-sub">${isPractice ? '熟悉规则 · 不计入结果' : `第 ${trialIdx + 1} / ${total} 题`}</div>
        <div class="stroop-fixation" id="stroopFix">+</div>
        <div class="stroop-stimulus" id="stroopStim" style="opacity:0">▬▬▬</div>
        <div class="stroop-instruction">选择文字的<strong style="color:#eab308">显示颜色</strong></div>
        <div class="stroop-btn-grid" id="stroopBtns">
          ${STROOP_COLORS.map(c => `
            <div class="stroop-btn" id="sbtn-${c.name}"
              style="border-color:${c.hex}50;color:${c.hex}"
              data-name="${c.name}"
              onclick="stroopAnswer('${c.name}')">
              <span style="width:12px;height:12px;border-radius:50%;background:${c.hex};display:inline-block"></span>
              ${c.name}
            </div>`).join('')}
        </div>
        <div class="stroop-counter">${isPractice ? '' : `一致: ${trials.filter((t,i)=>i<trialIdx&&t.type==='congruent').length} | 不一致: ${trials.filter((t,i)=>i<trialIdx&&t.type==='incongruent').length}`}</div>
      </div>`;

    // 注视点 500ms → 刺激
    const trial = trials[trialIdx];
    setTimeout(() => {
      const fix = document.getElementById('stroopFix');
      if (fix) fix.style.opacity = '0';
      const stim = document.getElementById('stroopStim');
      if (stim) {
        stim.style.opacity = '1';
        stim.textContent  = trial.word;
        stim.style.color  = trial.color;
      }
      stimStart = Date.now();
      // 2000ms 超时
      window._stroopTimeout = setTimeout(() => {
        if (!responded) stroopAnswer(null);
      }, 2000);
    }, 600);

    window.stroopAnswer = (chosen) => {
      if (responded) return;
      responded = true;
      clearTimeout(window._stroopTimeout);
      const rt = Date.now() - stimStart;
      const correct = chosen === trial.correctName;

      // Flash feedback
      const btn = document.getElementById(`sbtn-${chosen}`);
      if (btn) btn.classList.add(correct ? 'correct-flash' : 'wrong-flash');
      const correctBtn = document.getElementById(`sbtn-${trial.correctName}`);
      if (correctBtn && !correct) correctBtn.classList.add('correct-flash');

      if (!isPractice) {
        results[trial.type].push({ rt, correct });
      }

      setTimeout(() => {
        trialIdx++;
        if (trialIdx >= trials.length) {
          if (isPractice) { phase = 'test'; trials = testTrials; trialIdx = 0; renderTestIntro(); }
          else { phase = 'result'; renderResult(); }
        } else {
          render();
        }
      }, 350);
    };
  }

  function renderTestIntro() {
    content.innerHTML = `
      <div class="stroop-wrap">
        <div class="stroop-phase-title">✅ 练习完成</div>
        <div class="stroop-phase-sub">准备开始正式测试（60 题）</div>
        <div class="ts-glass" style="max-width:340px;margin:24px 0;font-size:13px;line-height:2;color:rgba(255,255,255,0.75)">
          正式测试将包含<strong style="color:#fff">一致</strong>（词与颜色相同）和
          <strong style="color:#eab308">不一致</strong>（词与颜色不同）两类刺激。<br>
          继续保持专注，尽量快速且准确地反应。
        </div>
        <button class="ts-btn" onclick="startTest()">开始正式测试 →</button>
      </div>`;
    window.startTest = () => { render(); };
  }

  function renderResult() {
    document.getElementById('expPBar').style.width = '100%';
    const cong = results.congruent;
    const incg = results.incongruent;
    const avg   = arr => arr.length ? Math.round(arr.reduce((a,b)=>a+b.rt,0)/arr.length) : '--';
    const acc   = arr => arr.length ? Math.round(arr.filter(r=>r.correct).length/arr.length*100) : '--';
    const stroopEffect = (avg(incg) !== '--' && avg(cong) !== '--') ? avg(incg) - avg(cong) : '--';

    content.innerHTML = `
      <div class="stroop-wrap">
        <div class="stroop-phase-title">🎉 测试完成</div>
        <div class="stroop-phase-sub">以下是你的结果</div>
        <div class="stroop-result-card">
          <div class="result-row"><span>一致条件 平均反应时</span><span class="result-val">${avg(cong)} ms</span></div>
          <div class="result-row"><span>不一致条件 平均反应时</span><span class="result-val">${avg(incg)} ms</span></div>
          <div class="result-row"><span>Stroop 效应量</span><span class="result-val" style="color:#eab308">+${stroopEffect} ms</span></div>
          <div class="result-row"><span>一致条件 正确率</span><span class="result-val">${acc(cong)}%</span></div>
          <div class="result-row"><span>不一致条件 正确率</span><span class="result-val">${acc(incg)}%</span></div>
        </div>
        <div class="ts-glass" style="max-width:340px;margin-top:16px;font-size:12px;line-height:1.8;color:rgba(255,255,255,0.6)">
          <strong style="color:#fff">什么是 Stroop 效应？</strong><br>
          当词义与颜色冲突时，大脑需要额外时间抑制阅读冲动、聚焦于颜色判断。效应量越大，说明认知冲突越强。
        </div>
        <button class="ts-btn" style="margin-top:24px" onclick="saveStroopAndClose(${JSON.stringify({
          cong_rt: avg(cong), incg_rt: avg(incg),
          stroop_effect: stroopEffect, cong_acc: acc(cong), incg_acc: acc(incg)
        })})">保存结果 →</button>
      </div>`;

    window.saveStroopAndClose = (res) => {
      saveExpResult('stroop', res);
      closeExperiment();
    };
  }

  render();
}

// ═══════════════════════════════════════════════════════════
//  4. GO / NO-GO 范式
// ═══════════════════════════════════════════════════════════
function initGoNoGo(runner) {
  runner.innerHTML = makeTopbar('Go / No-Go 抑制控制');
  const content = document.getElementById('expContent');

  // 刺激配置：80% Go / 20% NoGo
  const TOTAL = 80;
  const GO_N  = 64, NOGO_N = 16;
  const trials = [
    ...Array(GO_N).fill('go'),
    ...Array(NOGO_N).fill('nogo'),
  ].sort(() => Math.random() - 0.5);

  const GO_STIMS   = ['🟢', '⭕', '🔵'];  // 随机 go 图形
  const NOGO_STIMS = ['🔴', '⛔', '❌'];  // 随机 nogo 图形

  let phase = 'intro';
  let idx = 0;
  let hits = 0, misses = 0, fas = 0, rts = [];
  let stimStart = 0;
  let waiting = false;

  function render() {
    if (phase === 'intro') renderIntro();
    else if (phase === 'trial') renderTrial();
    else renderResult();
  }

  function renderIntro() {
    content.innerHTML = `
      <div class="gngo-wrap">
        <div class="stroop-phase-title">🚦 Go / No-Go 任务</div>
        <div class="stroop-phase-sub">测量你的行为抑制能力</div>
        <div class="ts-glass" style="max-width:340px;margin:20px 0;font-size:13px;line-height:2;color:rgba(255,255,255,0.75)">
          屏幕中央会出现图形：<br>
          🟢 <strong style="color:#07c160">绿色图形（Go）</strong>：尽快点击下方按钮<br>
          🔴 <strong style="color:#ff5a5a">红色图形（No-Go）</strong>：<strong>不要</strong>点击！<br><br>
          共 <strong style="color:#fff">${TOTAL} 题</strong>，约 4 分钟。反应要<strong style="color:#eab308">快而准确</strong>。
        </div>
        <div style="display:flex;gap:24px;margin-bottom:24px">
          <div style="text-align:center"><div style="font-size:48px">🟢</div><div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:6px">点击</div></div>
          <div style="text-align:center"><div style="font-size:48px">🔴</div><div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:6px">不点击</div></div>
        </div>
        <button class="ts-btn" onclick="startGNG()">开始任务 →</button>
      </div>`;
    window.startGNG = () => { phase = 'trial'; render(); };
  }

  function renderTrial() {
    document.getElementById('expPBar').style.width = (idx / TOTAL * 100) + '%';
    waiting = false;
    const type  = trials[idx];
    const isGo  = type === 'go';
    const stims = isGo ? GO_STIMS : NOGO_STIMS;
    const emoji = stims[Math.floor(Math.random() * stims.length)];

    content.innerHTML = `
      <div class="gngo-wrap">
        <div class="gngo-label">${idx + 1} / ${TOTAL}</div>
        <div class="gngo-circle-wrap">
          <div class="gngo-ring"></div>
          <div class="gngo-circle ${isGo ? 'go-stim' : 'nogo-stim'}" id="gngoCircle">${emoji}</div>
        </div>
        <div class="gngo-feedback" id="gngoFb"></div>
        <div class="gngo-stats">
          <div class="gngo-stat">
            <div class="gngo-stat-val" style="color:#07c160">${hits}</div>
            <div class="gngo-stat-lbl">命中</div>
          </div>
          <div class="gngo-stat">
            <div class="gngo-stat-val" style="color:#ff9800">${misses}</div>
            <div class="gngo-stat-lbl">漏报</div>
          </div>
          <div class="gngo-stat">
            <div class="gngo-stat-val" style="color:#ff5a5a">${fas}</div>
            <div class="gngo-stat-lbl">误报</div>
          </div>
          <div class="gngo-stat">
            <div class="gngo-stat-val" style="color:#fff">${rts.length ? Math.round(rts.reduce((a,b)=>a+b,0)/rts.length) : '--'}</div>
            <div class="gngo-stat-lbl">平均RT</div>
          </div>
        </div>
        <button class="gngo-tap-btn" id="gngoBtn" onclick="gngoTap()">
          <i class="fas fa-hand-pointer"></i>
          点击
        </button>
      </div>`;

    stimStart = Date.now();
    waiting = true;

    // 超时（600ms）→ 自动判定
    window._gngoTimeout = setTimeout(() => {
      if (!waiting) return;
      waiting = false;
      if (isGo) {
        misses++;
        showFb('miss', '漏报！');
      }
      nextTrial();
    }, 700);

    window.gngoTap = () => {
      if (!waiting) return;
      waiting = false;
      clearTimeout(window._gngoTimeout);
      const rt = Date.now() - stimStart;
      if (isGo) {
        hits++;
        rts.push(rt);
        showFb('hit', `✓ ${rt}ms`);
      } else {
        fas++;
        showFb('fa', '误报！');
      }
      setTimeout(nextTrial, 250);
    };
  }

  function showFb(cls, txt) {
    const fb = document.getElementById('gngoFb');
    if (fb) { fb.className = `gngo-feedback ${cls}`; fb.textContent = txt; }
  }

  function nextTrial() {
    idx++;
    if (idx >= TOTAL) { phase = 'result'; render(); }
    else {
      // 300-600ms ITI
      setTimeout(() => render(), 300 + Math.random() * 300);
    }
  }

  function renderResult() {
    document.getElementById('expPBar').style.width = '100%';
    const avgRt  = rts.length ? Math.round(rts.reduce((a,b)=>a+b,0)/rts.length) : '--';
    const hitRate = Math.round(hits / GO_N * 100);
    const faRate  = Math.round(fas / NOGO_N * 100);
    const dprime  = (() => {
      const zHit = jStat(hitRate / 100);
      const zFa  = jStat(faRate  / 100);
      return (zHit - zFa).toFixed(2);
    })();

    content.innerHTML = `
      <div class="gngo-wrap">
        <div class="stroop-phase-title">🎉 任务完成</div>
        <div class="stroop-phase-sub">你的抑制控制结果</div>
        <div class="stroop-result-card">
          <div class="result-row"><span>命中率 (Go 正确)</span><span class="result-val" style="color:#07c160">${hitRate}%</span></div>
          <div class="result-row"><span>误报率 (No-Go 错误)</span><span class="result-val" style="color:#ff5a5a">${faRate}%</span></div>
          <div class="result-row"><span>漏报次数</span><span class="result-val" style="color:#ff9800">${misses}</span></div>
          <div class="result-row"><span>平均反应时</span><span class="result-val">${avgRt} ms</span></div>
          <div class="result-row"><span>辨别力 d'</span><span class="result-val" style="color:#eab308">${dprime}</span></div>
        </div>
        <div class="ts-glass" style="max-width:340px;margin-top:16px;font-size:12px;line-height:1.8;color:rgba(255,255,255,0.6)">
          <strong style="color:#fff">d' 辨别力指数</strong>越高（通常 &gt;2.0），代表你能更好地区分 Go/No-Go 刺激，抑制控制能力更强。
        </div>
        <button class="ts-btn" style="margin-top:24px" onclick="saveGNGAndClose(${JSON.stringify({
          hit_rate: hitRate, fa_rate: faRate, misses, avg_rt: avgRt, dprime
        })})">保存结果 →</button>
      </div>`;

    window.saveGNGAndClose = (res) => {
      saveExpResult('gonogo', res);
      closeExperiment();
    };
  }

  // 简单 normal quantile 近似（用于 d'）
  function jStat(p) {
    p = Math.max(0.01, Math.min(0.99, p));
    const a = [2.515517, 0.802853, 0.010328];
    const b = [1.432788, 0.189269, 0.001308];
    const t = Math.sqrt(-2 * Math.log(p <= 0.5 ? p : 1 - p));
    const num = a[0] + a[1]*t + a[2]*t*t;
    const den = 1 + b[0]*t + b[1]*t*t + b[2]*t*t*t;
    return (p <= 0.5 ? -1 : 1) * (t - num / den);
  }

  render();
}

// ═══════════════════════════════════════════════════════════
//  5. 温度-睡眠情境诱导实验
// ═══════════════════════════════════════════════════════════
const TS_CONDITIONS = [
  { id:'summer_hot',  season:'summer', anomaly:+3, cls:'ts-summer-hot',  badgeCls:'hot',  icon:'🌡️', badge:'比往年同期偏热约 3°C', title:'盛夏·热浪夜', sub:'城市气温高于往年' },
  { id:'summer_zero', season:'summer', anomaly: 0, cls:'ts-summer-zero', badgeCls:'norm', icon:'🌿', badge:'与往年同期气温相近', title:'盛夏·寻常夜', sub:'与往年同期相近' },
  { id:'summer_cold', season:'summer', anomaly:-3, cls:'ts-summer-cold', badgeCls:'cool', icon:'🍃', badge:'比往年同期偏凉约 3°C', title:'盛夏·清爽夜', sub:'气温低于往年' },
  { id:'winter_hot',  season:'winter', anomaly:+3, cls:'ts-winter-hot',  badgeCls:'norm', icon:'☀️', badge:'比往年同期偏暖约 3°C', title:'隆冬·暖意夜', sub:'城市气温高于往年' },
  { id:'winter_zero', season:'winter', anomaly: 0, cls:'ts-winter-zero', badgeCls:'cool', icon:'❄️', badge:'与往年同期气温相近', title:'隆冬·寻常夜', sub:'与往年同期相近' },
  { id:'winter_cold', season:'winter', anomaly:-3, cls:'ts-winter-cold', badgeCls:'cool', icon:'🌨️', badge:'比往年同期偏寒约 3°C', title:'隆冬·严寒夜', sub:'气温低于往年' },
];

const TS_SCENARIOS = {
  summer_hot:  `现在是盛夏的一个夜晚。你结束了漫长一天的工作，疲惫地回到家，冲了个澡，躺在床上。今天，你所在的城市气温比这个季节往年高出不少。窗缝里透进来的是夜晚带着余热的空气——没有想象中的凉爽。你闭上眼睛，试图让自己安静下来，让思绪慢慢沉淀，准备入睡……`,
  summer_zero: `现在是盛夏的一个夜晚。你结束了一天的工作，回到家，洗漱完毕，躺在床上。今天的气温与这个季节往年大致相同。窗外偶尔传来夏夜熟悉的声音。你闭上眼睛，让身体放松，试图让自己慢慢入睡……`,
  summer_cold: `现在是盛夏的一个夜晚。你结束了一天的工作，回到家，躺在床上。今天的气温比这个季节往年低一些，带着意外的清爽。你感受着这个不寻常的夏夜，闭上眼睛，让自己慢慢沉入睡意……`,
  winter_hot:  `现在是隆冬的一个夜晚。你结束了一天的工作，回到家，钻进被窝。今天，你所在的城市气温比冬天往年高出不少——窗外的夜晚没有预想中的严寒。你闭上眼睛，感受着这个比往年暖和的冬夜，试图让思绪慢慢平息，进入睡眠……`,
  winter_zero: `现在是隆冬的一个夜晚。你结束了一天的工作，回到家，钻进温暖的被窝。今天的气温与冬天往年大致相同，窗外是熟悉的冬夜寂静。你闭上眼睛，蜷缩在被窝里，让自己慢慢沉入梦乡……`,
  winter_cold: `现在是隆冬的一个夜晚。你结束了一天的工作，裹紧大衣回到家，迫不及待地钻进被窝。今天，你所在的城市气温比往年这个时候低了不少，窗缝里渗进来的寒气让你把自己裹得更紧。你闭上眼睛，感受着这个格外寒冷的冬夜，试图让自己平静下来，进入睡眠……`,
};

// 均衡随机分配
function assignTsCondition() {
  const stored = localStorage.getItem('ts_condition');
  if (stored) return TS_CONDITIONS.find(c => c.id === stored) || TS_CONDITIONS[0];
  // 读取计数
  const counts = JSON.parse(localStorage.getItem('ts_cond_counts') || '{}');
  const minN = Math.min(...TS_CONDITIONS.map(c => counts[c.id] || 0));
  const pool = TS_CONDITIONS.filter(c => (counts[c.id] || 0) === minN);
  const cond = pool[Math.floor(Math.random() * pool.length)];
  localStorage.setItem('ts_condition', cond.id);
  return cond;
}

function initTempExp(runner) {
  const COND = assignTsCondition();
  window._tsRunning = true;

  runner.innerHTML = `
    <canvas id="tempCanvas"></canvas>
    <div id="tsAudioBtn" class="vis" onclick="toogleTsAudio()">🔊</div>
    <div class="exp-topbar">
      <div class="exp-topbar-back" onclick="closeExperiment()"><i class="fas fa-times"></i></div>
      <div class="exp-topbar-title">温度·睡眠·心理研究</div>
      <div style="width:36px"></div>
      <div class="exp-progress-bar" id="expPBar" style="width:0%"></div>
    </div>
    <div id="tsImmOverlay">
      <div class="ts-imm-title" id="tsImmTitle"></div>
      <div class="ts-imm-sub" id="tsImmSub"></div>
    </div>
    <div id="expContent">
      <div class="temp-exp-wrap ${COND.cls}" style="background:transparent">
        <div class="temp-content" id="tsContent"></div>
      </div>
    </div>`;

  // Apply theme class to temp-exp-wrap
  document.querySelector('.temp-exp-wrap').style.minHeight = '100vh';

  const tsVals = {};
  const tsData = { condition: COND.id, season: COND.season, anomaly: COND.anomaly };
  let tsCdownTimer = null;
  let tsScreen = 0;

  // ── Canvas init ──
  initTsCanvas(COND);
  if (window._tsAudioEnabled) startTsAudio(COND);

  function setProgress(n) { document.getElementById('expPBar').style.width = (n * 20) + '%'; }

  function buildScales(ids) {
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      for (let i = 1; i <= 7; i++) {
        const n = document.createElement('div');
        n.className = 'ts-node'; n.textContent = i; n.dataset.v = i; n.dataset.g = id;
        n.onclick = () => {
          document.querySelectorAll(`.ts-node[data-g="${id}"]`).forEach(x => x.classList.remove('on'));
          n.classList.add('on');
          tsVals[id] = i; tsData[id] = i;
          checkBtn(ids, 'ts-btn-' + ids[0].charAt(0));
        };
        el.appendChild(n);
      }
    });
  }

  function checkBtn(ids, btnId) {
    const ok = ids.every(id => tsVals[id] !== undefined);
    const btn = document.getElementById(btnId);
    if (btn) btn.disabled = !ok;
  }

  function watchGroup(ids, btnId) {
    const t = setInterval(() => {
      if (ids.every(id => tsVals[id] !== undefined)) {
        const b = document.getElementById(btnId);
        if (b) b.disabled = false;
        clearInterval(t);
      }
    }, 400);
  }

  // ── Screen 0: Intro / consent ──
  function showTs0() {
    setProgress(0);
    document.getElementById('tsContent').innerHTML = `
      <div class="temp-screen active">
        <div class="ts-eyebrow">研究编号 · STUDY-04</div>
        <div class="ts-h1">睡眠、温度<br>与心理健康</div>
        <div class="ts-p">本研究探讨<strong>环境温度异常</strong>如何影响人们的认知状态与睡眠质量。共五个部分，约 <strong>20 分钟</strong>。</div>
        <div class="ts-glass">
          <div class="ts-p" style="font-size:13px">
            🎧 <strong>强烈建议佩戴耳机</strong>，在安静私密环境中参与。<br>
            数据仅用于学术研究，完全匿名，参与自愿，可随时退出。
          </div>
        </div>
        <button class="ts-btn" onclick="showTs1()">开始参与 →</button>
      </div>`;
  }

  // ── Screen 1: Baseline ──
  function showTs1() {
    setProgress(1);
    document.getElementById('tsContent').innerHTML = `
      <div class="temp-screen active">
        <div class="ts-eyebrow">一 · 基线测量</div>
        <div class="ts-h1">此刻的心理状态</div>
        <div class="ts-p">请描述您<strong>此刻真实</strong>的心理状态。</div>
        <div class="ts-scale-group">
          ${tsScaleHTML('b1','B-01','此刻，我脑海中有一些想法在反复出现，很难停下来','完全不符合','完全符合')}
          ${tsScaleHTML('b2','B-02','此刻，我很难把注意力从令我担忧的想法上移开','完全不符合','完全符合')}
          ${tsScaleHTML('b3','B-03','此刻，我感到焦虑或紧张','完全不符合','完全符合')}
          ${tsScaleHTML('b4','B-04','此刻，我感到心情低落或情绪消沉','完全不符合','完全符合')}
        </div>
        <button class="ts-btn" id="ts-btn-b" onclick="showTs2()" disabled>继续 →</button>
      </div>`;
    buildScales(['b1','b2','b3','b4']);
    watchGroup(['b1','b2','b3','b4'], 'ts-btn-b');
  }

  // ── Screen 2: Induction ──
  function showTs2() {
    setProgress(2);
    // Show immersion overlay
    const ov = document.getElementById('tsImmOverlay');
    document.getElementById('tsImmTitle').textContent = COND.title;
    document.getElementById('tsImmSub').textContent   = COND.sub;
    ov.classList.add('show');
    setTimeout(() => ov.classList.remove('show'), 2600);

    // Start audio
    if (!window._tsAudioEnabled) { window._tsAudioEnabled = false; }
    startTsAudio(COND);
    startParticles(COND);

    document.getElementById('tsContent').innerHTML = `
      <div class="temp-screen active">
        <div class="ts-eyebrow">二 · 情境诱导</div>
        <div class="ts-h1">请沉浸在以下情境中</div>
        <span class="ts-badge ${COND.badgeCls}">${COND.icon} ${COND.badge}</span>
        <div class="ts-glass">
          <div class="ts-scenario">${TS_SCENARIOS[COND.id]}</div>
        </div>
        <div class="ts-glass">
          <div class="ts-p" style="font-size:12px;margin-bottom:16px">请<strong>闭上眼睛</strong>，真实地想象上述情境。感受周围的温度、夜晚的寂静、身体的感觉。计时结束后，写下你的内心独白。</div>
          <div class="ts-ring-wrap">
            <div class="ts-ring">
              <svg viewBox="0 0 100 100">
                <circle class="ts-ring-bg" cx="50" cy="50" r="45"/>
                <circle class="ts-ring-arc" id="tsArc" cx="50" cy="50" r="45"/>
              </svg>
              <div class="ts-ring-num" id="tsCdown">5:00</div>
            </div>
            <div class="ts-ring-sub">沉浸计时</div>
          </div>
        </div>
        <div>
          <div class="ts-q-code" style="margin-bottom:8px">内心独白 · 请写下此刻脑海中的想法（150字以上）</div>
          <textarea class="ts-textarea" id="tsMono" placeholder="此刻我躺在床上，脑海中……" oninput="onTsMono()"></textarea>
          <div class="ts-char-ct" id="tsCharCt">0 字</div>
        </div>
        <button class="ts-btn ts-btn-full" id="ts-btn-m" onclick="showTs3()" disabled>提交内心独白 →</button>
      </div>`;

    startTsCdown(300);
    window.onTsMono = () => {
      const t = document.getElementById('tsMono').value;
      const n = t.replace(/\s/g,'').length;
      const el = document.getElementById('tsCharCt');
      el.textContent = n + ' 字';
      el.className = 'ts-char-ct' + (n >= 150 ? ' ok' : '');
      document.getElementById('ts-btn-m').disabled = n < 150;
      tsData.monologue = t;
    };
  }

  function startTsCdown(secs) {
    const total = secs; let left = secs;
    const C = 2 * Math.PI * 45; // r=45
    const arc = document.getElementById('tsArc');
    if (arc) { arc.style.strokeDasharray = C; arc.style.strokeDashoffset = C; }
    clearInterval(tsCdownTimer);
    tsCdownTimer = setInterval(() => {
      left--;
      const m = Math.floor(left / 60), s = left % 60;
      const num = document.getElementById('tsCdown');
      if (num) num.textContent = `${m}:${s.toString().padStart(2,'0')}`;
      if (arc) arc.style.strokeDashoffset = C * (left / total);
      if (left <= 0) { clearInterval(tsCdownTimer); if (num) num.textContent = '完成'; }
    }, 1000);
  }

  // ── Screen 3: Manipulation check ──
  function showTs3() {
    clearInterval(tsCdownTimer);
    setProgress(3);
    document.getElementById('tsContent').innerHTML = `
      <div class="temp-screen active">
        <div class="ts-eyebrow">三 · 操纵检验</div>
        <div class="ts-h1">关于刚才的想象</div>
        <div class="ts-scale-group">
          ${tsScaleHTML('m1','M-01','在想象中，您感受到的温度与这个季节平时相比','明显更凉','明显更热')}
          ${tsScaleHTML('m2','M-02','您对刚才情境的沉浸程度','完全未沉浸','非常沉浸')}
          ${tsScaleHTML('m3','M-03','刚才描述的情境感觉有多真实','完全不真实','非常真实')}
        </div>
        <button class="ts-btn" id="ts-btn-m1" onclick="showTs4()" disabled>继续 →</button>
      </div>`;
    buildScales(['m1','m2','m3']);
    watchGroup(['m1','m2','m3'], 'ts-btn-m1');
  }

  // ── Screen 4: Core measures ──
  function showTs4() {
    setProgress(4);
    document.getElementById('tsContent').innerHTML = `
      <div class="temp-screen active">
        <div class="ts-eyebrow">四 · 核心测量</div>
        <div class="ts-h1">此刻的认知与睡眠预期</div>
        <div class="ts-p">基于刚才的情境想象，如实回答以下问题。</div>
        <div class="ts-scale-group">
          <div class="ts-section-lbl">▌ 认知状态（状态反刍）</div>
          ${tsScaleHTML('c1','C-01','此刻，我脑海中有一些想法在反复出现，难以停止','完全不符合','完全符合')}
          ${tsScaleHTML('c2','C-02','此刻，我在反复思考一些令我担忧的事情','完全不符合','完全符合')}
          ${tsScaleHTML('c3','C-03','此刻，我很难让脑子安静下来','完全不符合','完全符合')}
          <div class="ts-divider"></div>
          <div class="ts-section-lbl">▌ 情绪状态</div>
          ${tsScaleHTML('c4','C-04 · 焦虑','此刻，我感到焦虑或不安','完全不符合','完全符合')}
          ${tsScaleHTML('c5','C-05 · 抑郁','此刻，我感到情绪低落或沮丧','完全不符合','完全符合')}
          <div class="ts-divider"></div>
          <div class="ts-section-lbl">▌ 预期睡眠质量</div>
          ${tsScaleHTML('s1','S-01','您预计今晚需要多长时间才能入睡','很快入睡','很长时间')}
          ${tsScaleHTML('s2','S-02','您预计今晚整体睡眠质量如何','非常差','非常好')}
          ${tsScaleHTML('s3','S-03','您预计今晚会在夜间醒来几次','不会醒来','多次醒来')}
          ${tsScaleHTML('s4','S-04','您预计明天醒来时的精神状态如何','非常疲惫','神清气爽')}
        </div>
        <button class="ts-btn ts-btn-full" id="ts-btn-c" onclick="showTs5()" disabled>提交并完成研究 →</button>
      </div>`;
    buildScales(['c1','c2','c3','c4','c5','s1','s2','s3','s4']);
    watchGroup(['c1','c2','c3','c4','c5','s1','s2','s3','s4'], 'ts-btn-c');
  }

  // ── Screen 5: Debrief ──
  function showTs5() {
    setProgress(5);
    tsData.timestamp = new Date().toISOString();
    // Save result
    saveExpResult('temperature', tsData);
    // Update cond counts
    const counts = JSON.parse(localStorage.getItem('ts_cond_counts') || '{}');
    counts[COND.id] = (counts[COND.id] || 0) + 1;
    localStorage.setItem('ts_cond_counts', JSON.stringify(counts));
    localStorage.removeItem('ts_condition');

    stopTsAudio();
    cancelAnimationFrame(window._tsAnimId);

    document.getElementById('tsContent').innerHTML = `
      <div class="temp-screen active">
        <div style="font-size:56px;margin-bottom:4px">🌙</div>
        <div class="ts-eyebrow">研究完成</div>
        <div class="ts-h1">感谢您的参与</div>
        <div class="ts-p">您的数据已成功提交。您的参与对推进<strong>气候变化与人类睡眠健康</strong>研究具有重要价值。</div>
        <div class="ts-glass">
          <div class="ts-p" style="font-size:12px;line-height:1.9">
            <strong>研究说明</strong><br>
            本研究中，参与者被随机分配到不同温度情境（夏季/冬季 × 偏热/正常/偏冷）。核心问题是：当人们想象自己处于温度异常的夜晚时，<strong>认知反刍水平</strong>和<strong>预期睡眠质量</strong>是否随之改变，以及反刍是否在温度与睡眠之间起中介作用。
          </div>
        </div>
        <button class="ts-btn" onclick="closeExperiment()">返回实验中心</button>
      </div>`;
  }

  // Init
  showTs0();

  // Expose screen functions
  window.showTs1 = showTs1; window.showTs2 = showTs2;
  window.showTs3 = showTs3; window.showTs4 = showTs4;
  window.showTs5 = showTs5;
}

function tsScaleHTML(id, code, text, lAnchor, rAnchor) {
  return `
    <div class="ts-q">
      <div class="ts-q-code">${code}</div>
      <div class="ts-q-text">${text}</div>
      <div class="ts-scale-row">
        <div class="ts-anchor">${lAnchor}</div>
        <div class="ts-nodes" id="${id}"></div>
        <div class="ts-anchor" style="text-align:right">${rAnchor}</div>
      </div>
    </div>`;
}

// ─────────────────────────────────────────────
//  6. Canvas + Audio (Temperature exp)
// ─────────────────────────────────────────────
let _ptcles = [], _animId2;

function initTsCanvas(cond) {
  const c = document.getElementById('tempCanvas');
  if (!c) return;
  c.width = window.innerWidth; c.height = window.innerHeight;
  const ctx = c.getContext('2d');
  drawTsBg(ctx, cond, c.width, c.height);
}

function drawTsBg(ctx, cond, W, H) {
  const isSummer = cond.season === 'summer';
  const isHot = cond.anomaly > 0, isCold = cond.anomaly < 0;
  ctx.clearRect(0, 0, W, H);

  let g;
  if (isSummer && isHot) {
    g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0e0804'); g.addColorStop(1, '#1a0c04');
  } else if (!isSummer && isCold) {
    g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#02040a'); g.addColorStop(1, '#040814');
  } else {
    g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#04060d'); g.addColorStop(1, '#06090f');
  }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // Stars
  if (!(isSummer && isHot)) {
    for (let i = 0; i < (isCold ? 200 : 120); i++) {
      const x = Math.random() * W, y = Math.random() * H * 0.65;
      ctx.beginPath(); ctx.arc(x, y, Math.random() * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(245,240,232,${Math.random() * 0.6 + 0.1})`; ctx.fill();
    }
  }
  if (isSummer && isHot) {
    const hg = ctx.createRadialGradient(W/2,H*0.9,0,W/2,H*0.9,W*0.7);
    hg.addColorStop(0,'rgba(180,60,10,0.12)'); hg.addColorStop(1,'transparent');
    ctx.fillStyle = hg; ctx.fillRect(0,0,W,H);
  }
}

function startParticles(cond) {
  cancelAnimationFrame(window._tsAnimId);
  _ptcles = [];
  const c = document.getElementById('tempCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;

  const isSummer = cond.season === 'summer';
  const isHot = cond.anomaly > 0, isCold = cond.anomaly < 0;
  const count = (isSummer && isHot) ? 80 : (!isSummer && isCold) ? 150 : 50;

  for (let i = 0; i < count; i++) {
    if (isSummer && isHot) {
      _ptcles.push({ x:Math.random()*W, y:H+Math.random()*H,
        vx:(Math.random()-.5)*.4, vy:-(Math.random()*1.2+.4),
        r:Math.random()*2.5+.5, a:Math.random()*.15+.03,
        color:'255,140,60', wobble:Math.random()*Math.PI*2 });
    } else if (!isSummer && isCold) {
      _ptcles.push({ x:Math.random()*W, y:Math.random()*H,
        vx:(Math.random()-.5)*.5, vy:Math.random()*1.5+.4,
        r:Math.random()*3.5+.5, a:Math.random()*.5+.15,
        color:'210,230,255', wobble:Math.random()*Math.PI*2 });
    } else if (isSummer && isCold) {
      _ptcles.push({ x:Math.random()*W, y:Math.random()*H,
        vx:(Math.random()-.5)*.5, vy:(Math.random()-.5)*.4,
        r:Math.random()*2.5+1, a:0, phase:Math.random()*Math.PI*2,
        color:'180,240,180' });
    } else {
      _ptcles.push({ x:Math.random()*W, y:Math.random()*H,
        vx:(Math.random()-.5)*.3, vy:(Math.random()-.5)*.25,
        r:Math.random()*2+.5, a:Math.random()*.08+.02,
        color:'220,215,205' });
    }
  }

  function loop() {
    ctx.clearRect(0,0,W,H);
    drawTsBg(ctx, cond, W, H);
    _ptcles.forEach(p => {
      if (p.wobble !== undefined) { p.wobble += .025; p.x += Math.sin(p.wobble)*.5; }
      if (p.phase  !== undefined) { p.phase  += .018; p.a = (Math.sin(p.phase)+1)/2*.4; }
      p.x += p.vx; p.y += p.vy;
      if (isSummer && isHot && p.y < -10) { p.y = H+10; p.x = Math.random()*W; }
      if (!isSummer && isCold && p.y > H+10) { p.y = -10; p.x = Math.random()*W; }
      if (p.x < -20 || p.x > W+20) p.vx *= -1;
      if (!isSummer&&!isCold&&!isHot && (p.y<-10||p.y>H+10)) p.vy *= -1;

      if (isSummer && isHot) {
        const grd = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*4);
        grd.addColorStop(0,`rgba(${p.color},${p.a})`); grd.addColorStop(1,`rgba(${p.color},0)`);
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r*4,0,Math.PI*2); ctx.fillStyle=grd; ctx.fill();
      } else if (!isSummer && isCold) {
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(${p.color},${p.a})`; ctx.fill();
        if (p.r > 2) {
          ctx.strokeStyle=`rgba(${p.color},${p.a*.5})`; ctx.lineWidth=.5;
          for (let a=0;a<6;a++){
            const ag=a*Math.PI/3;
            ctx.beginPath(); ctx.moveTo(p.x,p.y);
            ctx.lineTo(p.x+Math.cos(ag)*p.r*1.8,p.y+Math.sin(ag)*p.r*1.8); ctx.stroke();
          }
        }
      } else if (isSummer && isCold) {
        const grd=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*4);
        grd.addColorStop(0,`rgba(${p.color},${p.a})`); grd.addColorStop(1,`rgba(${p.color},0)`);
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r*4,0,Math.PI*2); ctx.fillStyle=grd; ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(${p.color},${p.a})`; ctx.fill();
      }
    });
    window._tsAnimId = requestAnimationFrame(loop);
  }
  loop();
}

// ── Web Audio Soundscapes ──
let _tsAudioCtx = null, _tsAudioNodes = {};
window._tsAudioEnabled = false;

function getTsACtx() {
  if (!_tsAudioCtx) _tsAudioCtx = new (window.AudioContext||window.webkitAudioContext)();
  return _tsAudioCtx;
}
function stopTsAudio() {
  Object.values(_tsAudioNodes).forEach(n => { try { n.stop(); } catch(e){} });
  _tsAudioNodes = {};
}
window.toogleTsAudio = function() {
  window._tsAudioEnabled = !window._tsAudioEnabled;
  const btn = document.getElementById('tsAudioBtn');
  if (btn) btn.textContent = window._tsAudioEnabled ? '🔊' : '🔇';
  if (window._tsAudioEnabled) {
    const cond = TS_CONDITIONS.find(c => c.id === (localStorage.getItem('ts_condition') || TS_CONDITIONS[0].id)) || TS_CONDITIONS[0];
    startTsAudio(cond);
  } else { stopTsAudio(); }
};

function startTsAudio(cond) {
  stopTsAudio();
  if (!window._tsAudioEnabled) return;
  const ctx = getTsACtx();
  if (ctx.state === 'suspended') ctx.resume();
  const m = ctx.createGain(); m.gain.value = 0.55; m.connect(ctx.destination);
  _tsAudioNodes['master'] = m;

  if (cond.season === 'summer' && cond.anomaly > 0) synthSummerHot(ctx, m);
  else if (cond.season === 'summer' && cond.anomaly < 0) synthSummerCool(ctx, m);
  else if (cond.season === 'summer') synthSummerNorm(ctx, m);
  else if (cond.anomaly < 0) synthWinterCold(ctx, m);
  else if (cond.anomaly > 0) synthWinterMild(ctx, m);
  else synthWinterNorm(ctx, m);
}

function addNode(key, node) { _tsAudioNodes[key] = node; }

function makeNoise(ctx, type='white') {
  const len = ctx.sampleRate * 3;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    if (type === 'brown') {
      d[i] = last = (last + .02*(Math.random()*2-1))*.98; if(Math.abs(last)>.02) last*=.5;
    } else { d[i] = Math.random()*2-1; }
  }
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  return src;
}

function synthSummerHot(ctx, m) {
  // Cicada AM + brown noise + hum
  for (let i = 0; i < 5; i++) {
    const osc=ctx.createOscillator(), am=ctx.createOscillator(), amG=ctx.createGain(), g=ctx.createGain();
    osc.frequency.value=3200+i*180; am.frequency.value=18+i*3;
    amG.gain.value=.6; g.gain.value=.035+Math.random()*.025;
    am.connect(amG); amG.connect(g.gain); osc.connect(g); g.connect(m);
    osc.start(); am.start(); addNode('c'+i,osc); addNode('ca'+i,am);
  }
  const n=makeNoise(ctx,'brown'), lp=ctx.createBiquadFilter(), nG=ctx.createGain();
  lp.type='lowpass'; lp.frequency.value=400; nG.gain.value=.1;
  n.connect(lp); lp.connect(nG); nG.connect(m); n.start(); addNode('n',n);
}

function synthSummerNorm(ctx, m) {
  for (let i = 0; i < 4; i++) {
    const osc=ctx.createOscillator(), am=ctx.createOscillator(), amG=ctx.createGain(), g=ctx.createGain();
    osc.frequency.value=2800+i*120; am.frequency.value=4+i*1.5;
    amG.gain.value=.5; g.gain.value=.022+Math.random()*.012;
    am.connect(amG); amG.connect(g.gain); osc.connect(g); g.connect(m);
    osc.start(); am.start(); addNode('c'+i,osc); addNode('ca'+i,am);
  }
  const w=makeNoise(ctx), bp=ctx.createBiquadFilter(), wG=ctx.createGain();
  bp.type='bandpass'; bp.frequency.value=600; bp.Q.value=.5; wG.gain.value=.035;
  w.connect(bp); bp.connect(wG); wG.connect(m); w.start(); addNode('w',w);
}

function synthSummerCool(ctx, m) {
  function frog(t) {
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.frequency.setValueAtTime(220+Math.random()*80,t);
    o.frequency.exponentialRampToValueAtTime(120,t+.15);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.05,t+.02);
    g.gain.exponentialRampToValueAtTime(.001,t+.18);
    o.connect(g); g.connect(m); o.start(t); o.stop(t+.2);
    setTimeout(()=>frog(ctx.currentTime+2.5+Math.random()*4),(2.5+Math.random()*4)*1000);
  }
  frog(ctx.currentTime+.5);
  const w=makeNoise(ctx), bp=ctx.createBiquadFilter(), wG=ctx.createGain();
  bp.type='bandpass'; bp.frequency.value=800; bp.Q.value=.3; wG.gain.value=.025;
  w.connect(bp); bp.connect(wG); wG.connect(m); w.start(); addNode('w',w);
}

function synthWinterCold(ctx, m) {
  const w=makeNoise(ctx), hp=ctx.createBiquadFilter(), lp=ctx.createBiquadFilter(), wG=ctx.createGain();
  hp.type='highpass'; hp.frequency.value=200; lp.type='lowpass'; lp.frequency.value=1200;
  wG.gain.value=.16;
  const lfo=ctx.createOscillator(), lfoG=ctx.createGain();
  lfo.frequency.value=.12; lfoG.gain.value=.1;
  lfo.connect(lfoG); lfoG.connect(wG.gain); lfo.start(); addNode('lfo',lfo);
  w.connect(hp); hp.connect(lp); lp.connect(wG); wG.connect(m); w.start(); addNode('w',w);
  const wh=ctx.createOscillator(), whLfo=ctx.createOscillator(), whLG=ctx.createGain(), whG=ctx.createGain();
  wh.frequency.value=680; whLfo.frequency.value=.3; whLG.gain.value=55; whG.gain.value=.022;
  whLfo.connect(whLG); whLG.connect(wh.frequency); wh.connect(whG); whG.connect(m);
  wh.start(); whLfo.start(); addNode('wh',wh); addNode('whlfo',whLfo);
}

function synthWinterNorm(ctx, m) {
  const w=makeNoise(ctx), bp=ctx.createBiquadFilter(), wG=ctx.createGain();
  bp.type='bandpass'; bp.frequency.value=400; bp.Q.value=.4; wG.gain.value=.05;
  w.connect(bp); bp.connect(wG); wG.connect(m); w.start(); addNode('w',w);
  function tick(t) {
    const buf=ctx.createBuffer(1,ctx.sampleRate*.05,ctx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.exp(-i/(ctx.sampleRate*.01));
    const s=ctx.createBufferSource(), g=ctx.createGain();
    s.buffer=buf; g.gain.value=.07; s.connect(g); g.connect(m); s.start(t); s.stop(t+.1);
    setTimeout(()=>tick(ctx.currentTime+5+Math.random()*10),(5+Math.random()*10)*1000);
  }
  tick(ctx.currentTime+3);
}

function synthWinterMild(ctx, m) {
  const o=ctx.createOscillator(), g=ctx.createGain();
  o.frequency.value=50; g.gain.value=.012;
  o.connect(g); g.connect(m); o.start(); addNode('o',o);
  const w=makeNoise(ctx), lp=ctx.createBiquadFilter(), wG=ctx.createGain();
  lp.type='lowpass'; lp.frequency.value=300; wG.gain.value=.035;
  w.connect(lp); lp.connect(wG); wG.connect(m); w.start(); addNode('w',w);
}

// ─────────────────────────────────────────────
//  7. Save result to backend
// ─────────────────────────────────────────────
async function saveExpResult(type, result) {
  try {
    const token = localStorage.getItem('token');
    await fetch('/api/experiments/result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ experiment_type: type, result, timestamp: new Date().toISOString() })
    });
  } catch(e) {
    console.log('[Exp] Save failed (offline mode):', type, result);
  }
}
