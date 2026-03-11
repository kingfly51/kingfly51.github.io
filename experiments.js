/**
 * experiments.js  v4.0
 *
 * 修复清单：
 * 1. 滚动修复：flex-child + min-height:0 正确传递
 * 2. 音频：用户点击按钮即为手势，AudioContext 在此时创建/resume
 * 3. 电影级场景：SVG 城市剪影 + Canvas 粒子动效（热浪/萤火虫/雪花/等）
 * 4. 情境诱导屏：全屏沉浸遮罩 + 倒计时 + 音频同步启动
 */

// ─────────────────────────────────────────────────────────────
//  注册到 app.js 的 switchPage 体系
// ─────────────────────────────────────────────────────────────
(function waitForApp() {
  if (typeof pages === 'undefined' || typeof navTitles === 'undefined')
    return setTimeout(waitForApp, 60);
  pages['experiments']     = document.getElementById('experimentsPage');
  navTitles['experiments'] = '实验中心';
})();

// ─────────────────────────────────────────────────────────────
//  全局音频 & 动画状态
// ─────────────────────────────────────────────────────────────
let _AC        = null;   // AudioContext（首次手势后创建）
let _auNodes   = {};     // 活跃音频节点
let _animId    = null;   // rAF handle
let _auEnabled = false;  // 音频开关

function getAC() {
  if (!_AC) _AC = new (window.AudioContext || window.webkitAudioContext)();
  return _AC;
}
function stopAudio() {
  Object.values(_auNodes).forEach(n => { try { n.stop(); } catch(e) {} });
  _auNodes = {};
}
function rn(k, n) { _auNodes[k] = n; }

// ─────────────────────────────────────────────────────────────
//  启动 / 关闭实验
// ─────────────────────────────────────────────────────────────
function launchExperiment(type) {
  const runner = document.getElementById('experimentRunner');
  runner.innerHTML = '';
  runner.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  _auEnabled = false;
  if      (type === 'stroop')      initStroop(runner);
  else if (type === 'gonogo')      initGoNoGo(runner);
  else if (type === 'temperature') initTempExp(runner);
}

function closeExperiment() {
  stopAudio();
  cancelAnimationFrame(_animId);
  _animId = null;
  _auEnabled = false;
  const r = document.getElementById('experimentRunner');
  r.classList.add('hidden');
  r.innerHTML = '';
  document.body.style.overflow = '';
}

function setPBar(n, total) {
  const b = document.getElementById('expPBar');
  if (b) b.style.width = (n / total * 100) + '%';
}

function makeTopbar(title, rightSlot = '') {
  return `<div class="exp-topbar">
    <div class="exp-topbar-back" onclick="closeExperiment()"><i class="fas fa-times"></i></div>
    <div class="exp-topbar-title">${title}</div>
    <div style="width:36px;display:flex;justify-content:flex-end">${rightSlot}</div>
    <div class="exp-progress-bar" id="expPBar" style="width:0%"></div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
//  STROOP 实验
// ═══════════════════════════════════════════════════════════════
const COLORS = [
  { name:'红', hex:'#ef4444' },
  { name:'蓝', hex:'#3b82f6' },
  { name:'绿', hex:'#22c55e' },
  { name:'黄', hex:'#eab308' }
];

function initStroop(runner) {
  runner.innerHTML =
    makeTopbar('Stroop 色词干扰') +
    `<div id="expContent" style="background:#111;color:#fff"></div>`;

  function mkTrial(type) {
    const w = COLORS[~~(Math.random()*4)];
    let c = w;
    if (type === 'inc') { do { c = COLORS[~~(Math.random()*4)]; } while (c === w); }
    return { word: w.name, color: c.hex, correct: c.name, type };
  }

  const prac = [...Array(10)].map(() => mkTrial('con'));
  const test  = [
    ...[...Array(30)].map(() => mkTrial('con')),
    ...[...Array(30)].map(() => mkTrial('inc'))
  ].sort(() => Math.random() - .5);

  let phase = 'intro', idx = 0, list = [], res = { con:[], inc:[] }, t0 = 0, busy = false;
  const C = () => document.getElementById('expContent');

  function wrap(inner) {
    return `<div style="display:flex;flex-direction:column;align-items:center;
      padding:28px 20px 64px;min-height:100%;font-size:14px;line-height:1.7">${inner}</div>`;
  }

  function render() {
    if      (phase === 'intro')              showSIntro();
    else if (phase === 'prac' || phase === 'test') showSTrial();
    else                                     showSResult();
  }

  function showSIntro() {
    setPBar(0, 1);
    C().innerHTML = wrap(`
      <div style="font-size:22px;font-weight:800;margin-bottom:4px">🎨 Stroop 色词干扰</div>
      <div style="font-size:13px;color:rgba(255,255,255,.45);margin-bottom:24px">认知控制能力测量</div>
      <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:14px;
        padding:20px;width:100%;max-width:340px;color:rgba(255,255,255,.78);font-size:13px;line-height:2;margin-bottom:20px">
        屏幕会出现一个颜色词，请选择该词<strong style="color:#eab308">文字的显示颜色</strong>，而非词语含义。<br><br>
        例如看到 <span style="color:#3b82f6;font-weight:800">红</span>（蓝色字）→ 按<strong style="color:#3b82f6">蓝色</strong>。<br><br>
        先练习 10 次，再正式测试 60 次。尽量<strong style="color:#fff">快而准确</strong>。
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;max-width:320px;margin-bottom:28px">
        ${COLORS.map(c => `<div style="height:50px;border-radius:12px;border:1.5px solid ${c.hex}55;
          color:${c.hex};background:rgba(255,255,255,.04);display:flex;align-items:center;
          justify-content:center;gap:8px;font-weight:700;font-size:15px">
          <span style="width:12px;height:12px;border-radius:50%;background:${c.hex}"></span>${c.name}</div>`).join('')}
      </div>
      <button onclick="sStartPrac()" style="${btnStyle('#22c55e')}">开始练习 →</button>
    `);
    window.sStartPrac = () => { phase='prac'; list=prac; idx=0; render(); };
  }

  function showSTrial() {
    const isPrac = phase === 'prac';
    const total  = isPrac ? prac.length : test.length;
    setPBar(idx, total);
    busy = false;
    const tr = list[idx];
    C().innerHTML = wrap(`
      <div style="font-size:14px;font-weight:700;margin-bottom:4px">
        ${isPrac ? '练习阶段' : `第 ${idx+1} / ${total} 题`}</div>
      <div style="font-size:12px;color:rgba(255,255,255,.35);margin-bottom:42px">
        ${isPrac ? '熟悉规则 · 不计入结果' : '选择文字的显示颜色'}</div>
      <div style="font-size:18px;color:rgba(255,255,255,.28);margin-bottom:14px" id="sFix">+</div>
      <div id="sStim" style="font-size:clamp(44px,12vw,72px);font-weight:900;
        min-height:88px;display:flex;align-items:center;justify-content:center;
        opacity:0;transition:opacity .1s;letter-spacing:2px"></div>
      <p style="font-size:12px;color:rgba(255,255,255,.28);margin:16px 0 22px">
        选择文字的<span style="color:#eab308">显示颜色</span></p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%;max-width:320px">
        ${COLORS.map(c => `<div id="sb-${c.name}" onclick="sAns('${c.name}')"
          style="height:54px;border-radius:13px;border:1.5px solid ${c.hex}55;color:${c.hex};
          background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center;
          gap:8px;font-weight:700;font-size:15px;cursor:pointer;transition:all .15s">
          <span style="width:12px;height:12px;border-radius:50%;background:${c.hex}"></span>${c.name}</div>`).join('')}
      </div>
    `);
    setTimeout(() => {
      const fix = document.getElementById('sFix'); if (fix) fix.style.opacity = '0';
      const stm = document.getElementById('sStim');
      if (stm) { stm.textContent = tr.word; stm.style.color = tr.color; stm.style.opacity = '1'; }
      t0 = Date.now();
      window._sTO = setTimeout(() => { if (!busy) sAns(null); }, 2000);
    }, 550);

    window.sAns = chosen => {
      if (busy) return; busy = true; clearTimeout(window._sTO);
      const rt = Date.now() - t0, ok = chosen === tr.correct;
      const el = document.getElementById('sb-' + chosen);
      if (el) el.style.background = ok ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.25)';
      const cel = document.getElementById('sb-' + tr.correct);
      if (cel && !ok) cel.style.background = 'rgba(34,197,94,.2)';
      if (!isPrac) res[tr.type].push({ rt, ok });
      setTimeout(() => {
        idx++;
        if (idx >= list.length) {
          if (isPrac) {
            C().innerHTML = wrap(`
              <div style="font-size:22px;font-weight:800;margin-bottom:16px">✅ 练习完成</div>
              <p style="color:rgba(255,255,255,.55);text-align:center;margin-bottom:28px">
                准备好正式测试了吗？<br>共 60 题，含一致与不一致两类刺激。</p>
              <button onclick="sStartTest()" style="${btnStyle('#22c55e')}">开始正式测试 →</button>`);
            window.sStartTest = () => { phase='test'; list=test; idx=0; render(); };
          } else { phase = 'result'; render(); }
        } else render();
      }, 380);
    };
  }

  function showSResult() {
    setPBar(1, 1);
    const avg = a => a.length ? Math.round(a.reduce((s,x)=>s+x.rt,0)/a.length) : '--';
    const acc = a => a.length ? Math.round(a.filter(x=>x.ok).length/a.length*100) + '%' : '--';
    const eff = (avg(res.con) !== '--' && avg(res.inc) !== '--') ? avg(res.inc) - avg(res.con) : '--';
    C().innerHTML = wrap(`
      <div style="font-size:22px;font-weight:800;margin-bottom:4px">🎉 测试完成</div>
      <p style="color:rgba(255,255,255,.4);font-size:13px;margin-bottom:24px">你的 Stroop 结果</p>
      <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);
        border-radius:16px;padding:20px;width:100%;max-width:340px;margin-bottom:16px">
        ${[['一致条件 均RT', avg(res.con)+' ms', '#22c55e'],
           ['不一致条件 均RT', avg(res.inc)+' ms', '#f59e0b'],
           ['Stroop 效应量', '+'+eff+' ms', '#eab308'],
           ['一致正确率', acc(res.con), '#22c55e'],
           ['不一致正确率', acc(res.inc), '#f59e0b']]
          .map(([l,v,c]) => `<div style="display:flex;justify-content:space-between;padding:10px 0;
            border-bottom:1px solid rgba(255,255,255,.07);font-size:14px">
            <span>${l}</span><span style="font-weight:800;color:${c}">${v}</span></div>`).join('')}
      </div>
      <div style="background:rgba(255,255,255,.04);border-radius:12px;padding:16px;max-width:340px;
        width:100%;font-size:12px;line-height:1.8;color:rgba(255,255,255,.55);margin-bottom:24px">
        <strong style="color:#fff">Stroop 效应</strong>：不一致条件反应更慢，说明大脑需要抑制阅读冲动。效应量越大，认知冲突越强。
      </div>
      <button onclick="sSave()" style="${btnStyle('#22c55e')}">保存并返回 →</button>
    `);
    window.sSave = () => {
      saveExpResult('stroop', {
        cong_rt:avg(res.con), incg_rt:avg(res.inc),
        stroop_effect:eff, cong_acc:acc(res.con), incg_acc:acc(res.inc)
      });
      closeExperiment();
    };
  }
  render();
}

// ═══════════════════════════════════════════════════════════════
//  GO / NO-GO 实验
// ═══════════════════════════════════════════════════════════════
function initGoNoGo(runner) {
  runner.innerHTML =
    makeTopbar('Go / No-Go 抑制控制') +
    `<div id="expContent" style="background:#0a0a0a;color:#fff"></div>`;

  const TOTAL=80, GO_N=64, NOGO_N=16;
  const trials = [...Array(GO_N).fill('go'),...Array(NOGO_N).fill('nogo')].sort(()=>Math.random()-.5);
  const GO_E = ['🟢','⭕','🔵'], NG_E = ['🔴','⛔','❌'];
  let idx=0, hits=0, misses=0, fas=0, rts=[], busy=false, phase='intro';
  const C = () => document.getElementById('expContent');

  function wrap(inner) {
    return `<div style="display:flex;flex-direction:column;align-items:center;
      padding:28px 20px 64px;min-height:100%;font-size:14px;line-height:1.7">${inner}</div>`;
  }
  function render() {
    if (phase==='intro') showGI(); else if (phase==='trial') showGT(); else showGR();
  }

  function showGI() {
    C().innerHTML = wrap(`
      <div style="font-size:22px;font-weight:800;margin-bottom:6px">🚦 Go / No-Go</div>
      <div style="font-size:13px;color:rgba(255,255,255,.45);margin-bottom:24px">行为抑制控制测量</div>
      <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:14px;
        padding:20px;max-width:340px;width:100%;font-size:13px;line-height:2;
        color:rgba(255,255,255,.75);margin-bottom:20px">
        <span style="color:#22c55e;font-weight:800">绿色图形</span> → 尽快<strong style="color:#fff">点击</strong>按钮<br>
        <span style="color:#ef4444;font-weight:800">红色图形</span> → <strong style="color:#fff">不要点击！</strong><br><br>
        共 ${TOTAL} 题，约 4 分钟。尽量<strong style="color:#fff">快而准确</strong>。
      </div>
      <div style="display:flex;gap:40px;margin-bottom:32px">
        <div style="text-align:center"><div style="font-size:52px">🟢</div>
          <div style="font-size:12px;color:rgba(255,255,255,.4);margin-top:6px">点击</div></div>
        <div style="text-align:center"><div style="font-size:52px">🔴</div>
          <div style="font-size:12px;color:rgba(255,255,255,.4);margin-top:6px">不点击</div></div>
      </div>
      <button onclick="gStart()" style="${btnStyle('#22c55e')}">开始任务 →</button>
    `);
    window.gStart = () => { phase='trial'; render(); };
  }

  function showGT() {
    setPBar(idx, TOTAL); busy = false;
    const isGo = trials[idx]==='go';
    const emoji = (isGo ? GO_E : NG_E)[~~(Math.random()*3)];
    const avgRt = rts.length ? Math.round(rts.reduce((a,b)=>a+b,0)/rts.length) : '--';
    C().innerHTML = wrap(`
      <div style="font-size:12px;color:rgba(255,255,255,.3);margin-bottom:4px">${idx+1} / ${TOTAL}</div>
      <div style="width:180px;height:180px;margin:18px auto;position:relative;display:flex;align-items:center;justify-content:center">
        <div style="position:absolute;inset:0;border-radius:50%;border:2px solid rgba(255,255,255,.06)"></div>
        <div style="width:140px;height:140px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:58px;
          background:radial-gradient(circle,${isGo?'rgba(34,197,94,.22),rgba(34,197,94,.04)':'rgba(239,68,68,.22),rgba(239,68,68,.04)'});
          box-shadow:0 0 40px ${isGo?'rgba(34,197,94,.3)':'rgba(239,68,68,.25)'}">
          ${emoji}</div>
      </div>
      <div style="height:30px;font-size:18px;font-weight:800;margin-bottom:10px" id="gFb"></div>
      <div style="display:flex;gap:24px;margin-bottom:28px">
        ${[['命中',hits,'#22c55e'],['漏报',misses,'#f59e0b'],['误报',fas,'#ef4444'],['均RT',avgRt,'#fff']]
          .map(([l,v,c])=>`<div style="text-align:center">
            <div style="font-size:22px;font-weight:800;color:${c}">${v}</div>
            <div style="font-size:11px;color:rgba(255,255,255,.35);margin-top:2px">${l}</div></div>`).join('')}
      </div>
      <div id="gBtn" onclick="gTap()" style="width:152px;height:152px;border-radius:50%;
        background:rgba(34,197,94,.1);border:2px solid rgba(34,197,94,.4);color:#22c55e;
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        gap:8px;cursor:pointer;user-select:none;-webkit-user-select:none;transition:all .12s">
        <i class="fas fa-hand-pointer" style="font-size:30px"></i>
        <span style="font-size:14px;font-weight:700">点击</span>
      </div>
    `);
    const t0 = Date.now();
    window._gTO = setTimeout(() => {
      if (busy) return; busy = true;
      if (isGo) { misses++; gFb('漏报', '#f59e0b'); }
      setTimeout(gNext, 320);
    }, 700);
    window.gTap = () => {
      if (busy) return; busy = true; clearTimeout(window._gTO);
      const rt = Date.now() - t0;
      const btn = document.getElementById('gBtn');
      if (isGo) {
        hits++; rts.push(rt);
        if (btn) btn.style.background = 'rgba(34,197,94,.3)';
        gFb(`✓ ${rt}ms`, '#22c55e');
      } else {
        fas++;
        if (btn) btn.style.background = 'rgba(239,68,68,.3)';
        gFb('误报！', '#ef4444');
      }
      setTimeout(gNext, 260);
    };
  }
  function gFb(t, c) { const e=document.getElementById('gFb'); if(e){e.textContent=t;e.style.color=c;} }
  function gNext() { idx++; if(idx>=TOTAL){phase='result';render();}else setTimeout(render,200+~~(Math.random()*300)); }

  function showGR() {
    setPBar(TOTAL, TOTAL);
    const avg = rts.length ? Math.round(rts.reduce((a,b)=>a+b,0)/rts.length) : '--';
    const hr = Math.round(hits/GO_N*100), fr = Math.round(fas/NOGO_N*100);
    const dp = (() => {
      const z = p => { p=Math.max(.01,Math.min(.99,p));const t=Math.sqrt(-2*Math.log(p<=.5?p:1-p));
        return(p<=.5?-1:1)*(t-(2.515517+.802853*t+.010328*t*t)/(1+1.432788*t+.189269*t*t+.001308*t*t*t)); };
      return (z(hr/100)-z(fr/100)).toFixed(2);
    })();
    C().innerHTML = wrap(`
      <div style="font-size:22px;font-weight:800;margin-bottom:4px">🎉 任务完成</div>
      <p style="color:rgba(255,255,255,.4);font-size:13px;margin-bottom:24px">你的抑制控制结果</p>
      <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);
        border-radius:16px;padding:20px;width:100%;max-width:340px;margin-bottom:16px">
        ${[['命中率', hr+'%', '#22c55e'],['误报率', fr+'%', '#ef4444'],
           ['漏报次数', misses+'次', '#f59e0b'],['平均反应时', avg+' ms', '#fff'],["辨别力 d'", dp, '#eab308']]
          .map(([l,v,c])=>`<div style="display:flex;justify-content:space-between;padding:10px 0;
            border-bottom:1px solid rgba(255,255,255,.07);font-size:14px">
            <span>${l}</span><span style="font-weight:800;color:${c}">${v}</span></div>`).join('')}
      </div>
      <div style="background:rgba(255,255,255,.04);border-radius:12px;padding:16px;max-width:340px;
        width:100%;font-size:12px;line-height:1.8;color:rgba(255,255,255,.55);margin-bottom:24px">
        <strong style="color:#fff">d' 辨别力</strong>越高（通常 &gt;2.0），说明 Go/No-Go 区分越精准，抑制控制能力越强。
      </div>
      <button onclick="gSave()" style="${btnStyle('#22c55e')}">保存并返回 →</button>
    `);
    window.gSave = () => { saveExpResult('gonogo',{hit_rate:hr,fa_rate:fr,misses,avg_rt:avg,dprime:dp}); closeExperiment(); };
  }
  render();
}

// ═══════════════════════════════════════════════════════════════
//  温度-睡眠沉浸实验  ★ 核心
// ═══════════════════════════════════════════════════════════════
const TS_CONDS = [
  { id:'summer_hot',  season:'summer', anomaly:+3, accent:'#e8723a', bg:'#0d0703',
    icon:'🌡️', badgeTxt:'比往年偏热约 3°C', badgeColor:'rgba(255,100,40,.15)', badgeBorder:'rgba(255,100,40,.4)', badgeTextColor:'#ff9060',
    title:'盛夏·热浪之夜', sub:'城市气温高于往年同期', moonColor:'#ffa060' },
  { id:'summer_zero', season:'summer', anomaly: 0, accent:'#5db87a', bg:'#040c06',
    icon:'🌿', badgeTxt:'与往年同期相近',    badgeColor:'rgba(80,180,100,.15)', badgeBorder:'rgba(80,180,100,.4)', badgeTextColor:'#70c090',
    title:'盛夏·寻常之夜', sub:'与往年同期气温相近', moonColor:'#d8f0c0' },
  { id:'summer_cold', season:'summer', anomaly:-3, accent:'#5fa0d0', bg:'#040810',
    icon:'🍃', badgeTxt:'比往年偏凉约 3°C', badgeColor:'rgba(60,140,220,.15)', badgeBorder:'rgba(60,140,220,.4)', badgeTextColor:'#80b8f0',
    title:'盛夏·清爽之夜', sub:'气温低于往年同期', moonColor:'#cce4ff' },
  { id:'winter_hot',  season:'winter', anomaly:+3, accent:'#7aa0d8', bg:'#040810',
    icon:'☀️', badgeTxt:'比往年偏暖约 3°C', badgeColor:'rgba(100,150,220,.15)', badgeBorder:'rgba(100,150,220,.4)', badgeTextColor:'#90b8f0',
    title:'隆冬·暖意之夜', sub:'城市气温高于往年同期', moonColor:'#c8d8ff' },
  { id:'winter_zero', season:'winter', anomaly: 0, accent:'#5878c0', bg:'#030608',
    icon:'❄️', badgeTxt:'与往年同期相近',    badgeColor:'rgba(60,100,200,.15)', badgeBorder:'rgba(60,100,200,.4)', badgeTextColor:'#7090e8',
    title:'隆冬·寻常之夜', sub:'与往年同期气温相近', moonColor:'#d0e2ff' },
  { id:'winter_cold', season:'winter', anomaly:-3, accent:'#3858a8', bg:'#020408',
    icon:'🌨️', badgeTxt:'比往年偏寒约 3°C', badgeColor:'rgba(40,70,180,.15)', badgeBorder:'rgba(40,70,180,.4)', badgeTextColor:'#6080d0',
    title:'隆冬·严寒之夜', sub:'气温低于往年同期', moonColor:'#b8d0ff' },
];

const TS_TEXT = {
  summer_hot:  `现在是盛夏的一个夜晚。你结束了漫长一天，疲惫地回到家，冲了个澡，躺在床上。今天，你所在的城市气温比这个季节往年高出不少。窗缝里透进来的是依然带着余热的空气——没有想象中的凉爽。空气中弥漫着挥之不去的燥热感。你闭上眼睛，试图让自己安静下来，让思绪慢慢沉淀，准备入睡……`,
  summer_zero: `现在是盛夏的一个夜晚。你结束了一天的工作，回到家，洗漱完毕，躺在床上。今天的气温与这个季节往年大致相同，窗外传来夏夜熟悉的声音。你闭上眼睛，感受着这个寻常的夏夜，让身体慢慢放松，准备入睡……`,
  summer_cold: `现在是盛夏的一个夜晚。你结束了一天的工作，回到家，躺在床上。今天的气温比这个季节往年低一些，带着意外的清爽。空气清新，夜风中带着难得的凉意。你闭上眼睛，感受着这个不寻常的清爽夏夜，慢慢沉入睡意……`,
  winter_hot:  `现在是隆冬的一个夜晚。你结束了一天的工作，回到家，钻进被窝。今天，你所在的城市气温比冬天往年高出不少——窗外没有预想中的严寒。你闭上眼睛，感受着这个比往年暖和的冬夜，让思绪慢慢平息，进入睡眠……`,
  winter_zero: `现在是隆冬的一个夜晚。你结束了一天的工作，回到家，钻进温暖的被窝。今天的气温与冬天往年大致相同，窗外是熟悉的冬夜寂静。你闭上眼睛，蜷缩在被窝里，让自己慢慢沉入梦乡……`,
  winter_cold: `现在是隆冬的一个夜晚。你结束了一天的工作，裹紧大衣回到家，迫不及待地钻进被窝。今天，你所在的城市气温比往年这个时候低了不少，窗缝里渗进来的寒气让你把自己裹得更紧。你闭上眼睛，感受着这个格外寒冷的冬夜，试图让自己平静下来，进入睡眠……`,
};

function assignCond() {
  const cnt = JSON.parse(localStorage.getItem('ts_cc') || '{}');
  const mn  = Math.min(...TS_CONDS.map(c => cnt[c.id] || 0));
  const pool = TS_CONDS.filter(c => (cnt[c.id]||0) === mn);
  return pool[~~(Math.random()*pool.length)];
}

function initTempExp(runner) {
  const COND = assignCond();
  const A = COND.accent;

  // ── 关键布局 ──────────────────────────────────────────────
  // runner（fixed, flex-column）
  //  ├─ tsBg canvas（fixed, z:0, 背景渐变+城市剪影）
  //  ├─ tsScene div（fixed, z:1, Canvas粒子层）
  //  ├─ topbar div（relative, z:10, flex-shrink:0）
  //  └─ tsScroll div（relative, z:10, flex:1 1 0, min-height:0 ← 关键！）
  //       └─ tsC div（实际内容）
  runner.style.cssText = `position:fixed;inset:0;z-index:2000;display:flex;flex-direction:column;background:${COND.bg}`;
  runner.innerHTML = `
    <canvas id="tsBg" style="position:fixed;inset:0;z-index:0;pointer-events:none"></canvas>
    <div id="tsScene" style="position:fixed;inset:0;z-index:1;pointer-events:none;overflow:hidden"></div>

    <div style="position:relative;z-index:10;flex-shrink:0">
      <div class="exp-topbar" style="background:rgba(0,0,0,.62);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)">
        <div class="exp-topbar-back" onclick="closeExperiment()"><i class="fas fa-times"></i></div>
        <div class="exp-topbar-title">温度·睡眠·心理研究</div>
        <button id="tsAuBtn" onclick="tsTapAudio()"
          style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.12);
          border:1px solid rgba(255,255,255,.25);color:#fff;cursor:pointer;font-size:17px;
          display:flex;align-items:center;justify-content:center;padding:0;outline:none;
          flex-shrink:0;transition:all .2s">🔇</button>
        <div class="exp-progress-bar" id="expPBar" style="width:0%"></div>
      </div>
    </div>

    <div id="tsScroll" style="position:relative;z-index:10;
      flex:1 1 0;min-height:0;
      overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain">
      <div id="tsC" style="max-width:600px;margin:0 auto;padding:22px 18px 56px;color:#fff"></div>
    </div>

    <div id="tsImm" style="position:fixed;inset:0;z-index:500;background:${COND.bg};
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;
      opacity:0;pointer-events:none;transition:opacity .9s ease">
      <div id="tsImmT" style="font-size:clamp(28px,8vw,52px);font-weight:900;color:#fff;
        text-align:center;text-shadow:0 0 60px ${A};line-height:1.3"></div>
      <div id="tsImmS" style="font-size:11px;letter-spacing:4px;color:${A};opacity:.85"></div>
    </div>`;

  // 初始化场景
  buildScene(COND);

  // 状态
  const tsD = { condition:COND.id, season:COND.season, anomaly:COND.anomaly };
  const tsV = {};
  let cdTimer = null;

  const tc = () => document.getElementById('tsC');
  const sp = n => setPBar(n, 5);

  // ── HTML 构建辅助 ──────────────────────────────────────────
  const ey  = t => `<div style="font-size:10px;letter-spacing:4px;color:${A};opacity:.9;margin-bottom:10px">${t}</div>`;
  const h1  = t => `<div style="font-size:clamp(24px,6vw,36px);font-weight:900;color:#fff;line-height:1.3;margin-bottom:16px">${t}</div>`;
  const p   = t => `<p style="font-size:14px;line-height:1.9;color:rgba(255,255,255,.65);margin-bottom:18px">${t}</p>`;
  const glass = (inner, ex='') => `<div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);
    border-radius:16px;padding:22px;${ex}">${inner}</div>`;
  const tBtn = (lbl, id, fn, dis=false) =>
    `<button id="${id}" ${dis?'disabled':''} onclick="${fn}()"
      style="${btnStyle(A)};margin-top:8px;opacity:${dis?.22:1};pointer-events:${dis?'none':'auto'}"
      >${lbl}</button>`;

  function scaleRow(id, code, text, la, ra) {
    return `<div style="display:flex;flex-direction:column;gap:6px;padding:4px 0">
      <div style="font-size:10px;letter-spacing:2.5px;color:${A};opacity:.9">${code}</div>
      <div style="font-size:13px;line-height:1.7;color:rgba(255,255,255,.82)">${text}</div>
      <div style="display:flex;align-items:center;gap:6px">
        <span style="font-size:10px;color:rgba(255,255,255,.3);min-width:44px;line-height:1.3">${la}</span>
        <div style="display:flex;gap:4px;flex:1;justify-content:center" id="${id}"></div>
        <span style="font-size:10px;color:rgba(255,255,255,.3);min-width:44px;text-align:right;line-height:1.3">${ra}</span>
      </div>
    </div>`;
  }

  function buildScales(ids, btnId) {
    ids.forEach(id => {
      const el = document.getElementById(id); if (!el) return;
      for (let i = 1; i <= 7; i++) {
        const n = document.createElement('div');
        n.textContent = i; n.dataset.g = id;
        n.style.cssText = `width:34px;height:34px;border-radius:50%;border:1.5px solid rgba(255,255,255,.14);
          background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;
          font-size:11px;color:rgba(255,255,255,.28);transition:all .18s;flex-shrink:0`;
        n.onclick = () => {
          document.querySelectorAll(`[data-g="${id}"]`).forEach(x => {
            x.style.background='transparent'; x.style.borderColor='rgba(255,255,255,.14)';
            x.style.color='rgba(255,255,255,.28)'; x.style.transform='';
          });
          n.style.background=A; n.style.borderColor=A; n.style.color='#111'; n.style.transform='scale(1.2)';
          tsV[id]=i; tsD[id]=i;
          if (ids.every(x=>tsV[x]!==undefined)) {
            const b=document.getElementById(btnId);
            if(b){b.disabled=false;b.style.opacity='1';b.style.pointerEvents='auto';}
          }
        };
        el.appendChild(n);
      }
    });
  }

  // ── 各屏 ──────────────────────────────────────────────────

  function s0() { // 欢迎
    sp(0);
    tc().innerHTML = `<div style="animation:tsFadeIn .8s ease">
      ${ey('研究编号 · STUDY-04')}
      ${h1('睡眠、温度<br>与心理健康')}
      ${p('本研究探讨<strong style="color:'+A+'">环境温度异常</strong>如何影响认知状态与睡眠质量。共五个部分，约 <strong style="color:#fff">20 分钟</strong>。')}
      ${glass(`<p style="font-size:13px;line-height:2;color:rgba(255,255,255,.7);margin:0">
        🎧 <strong style="color:#fff">建议佩戴耳机</strong>，在安静私密环境中参与。<br>
        点击右上角 <span style="color:${A}">🔇</span> 按钮可开启沉浸音效。<br>
        数据仅用于学术研究，完全匿名，参与自愿。
      </p>`,'margin-bottom:20px')}
      ${tBtn('开始参与 →','bs0','tsS1')}
    </div>`;
    window.tsS1 = s1;
  }

  function s1() { // 基线
    sp(1);
    tc().innerHTML = `<div style="animation:tsFadeIn .8s ease">
      ${ey('一 · 基线测量')}${h1('此刻的心理状态')}
      ${p('请描述您<strong style="color:#fff">此刻真实</strong>的心理状态。')}
      <div style="display:flex;flex-direction:column;gap:22px;margin-bottom:24px;width:100%">
        ${scaleRow('b1','B-01 · 状态反刍','此刻，我脑海中有一些想法在反复出现，很难停下来','完全不符合','完全符合')}
        ${scaleRow('b2','B-02 · 状态反刍','此刻，我很难把注意力从令我担忧的想法上移开','完全不符合','完全符合')}
        ${scaleRow('b3','B-03 · 情绪','此刻，我感到焦虑或紧张','完全不符合','完全符合')}
        ${scaleRow('b4','B-04 · 情绪','此刻，我感到心情低落或消沉','完全不符合','完全符合')}
      </div>
      ${tBtn('继续 →','bs1','tsS2',true)}
    </div>`;
    buildScales(['b1','b2','b3','b4'],'bs1');
    window.tsS2 = s2;
  }

  function s2() { // 情境诱导
    sp(2);
    // ★ 音频在用户点击"继续"按钮后触发 → 此处已是合法手势上下文
    _auEnabled = true;
    const auBtn = document.getElementById('tsAuBtn');
    if (auBtn) auBtn.textContent = '🔊';
    startAudio(COND);

    // 沉浸闪入
    showImmFlash(COND);

    tc().innerHTML = `<div style="animation:tsFadeIn .8s ease">
      ${ey('二 · 情境诱导')}${h1('请沉浸在以下情境中')}
      <span style="display:inline-flex;align-items:center;gap:8px;padding:8px 18px;border-radius:30px;
        font-size:12px;border:1px solid;background:${COND.badgeColor};border-color:${COND.badgeBorder};
        color:${COND.badgeTextColor};margin-bottom:18px">${COND.icon} ${COND.badgeTxt}</span>
      ${glass(`<div style="border-left:3px solid ${A};padding-left:16px;font-size:14px;
        line-height:2.2;color:rgba(255,255,255,.92);font-style:italic">
        ${TS_TEXT[COND.id]}</div>`,'margin-bottom:18px')}
      ${glass(`
        <p style="font-size:12px;line-height:1.9;color:rgba(255,255,255,.5);margin-bottom:16px">
          请<strong style="color:#fff">闭上眼睛</strong>，真实想象上述情境。<br>
          感受周围的温度，聆听夜晚的声音，感知身体的感觉。
        </p>
        <div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:10px 0">
          <div style="position:relative;width:96px;height:96px">
            <svg viewBox="0 0 100 100" style="transform:rotate(-90deg);width:96px;height:96px">
              <circle fill="none" stroke="rgba(255,255,255,.06)" stroke-width="3" cx="50" cy="50" r="45"/>
              <circle id="tsArc" fill="none" stroke="${A}" stroke-width="3" stroke-linecap="round"
                cx="50" cy="50" r="45"
                style="stroke-dasharray:283;stroke-dashoffset:283;transition:stroke-dashoffset 1s linear;
                filter:drop-shadow(0 0 6px ${A})"/>
            </svg>
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
              font-size:22px;font-weight:900;color:${A}" id="tsCd">5:00</div>
          </div>
          <div style="font-size:10px;color:rgba(255,255,255,.3);letter-spacing:2px">沉浸计时</div>
        </div>
      `,'margin-bottom:18px')}
      <div style="width:100%">
        <div style="font-size:10px;letter-spacing:2.5px;color:${A};opacity:.9;margin-bottom:8px">
          内心独白 · 请写下此刻脑海中的想法（150字以上）</div>
        <textarea id="tsMono" oninput="tsMonoIn()"
          placeholder="此刻我躺在床上，脑海中……"
          style="width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);
          border-radius:12px;padding:16px;color:#fff;font-family:inherit;font-size:13px;line-height:2;
          resize:vertical;min-height:160px;outline:none;box-sizing:border-box;
          -webkit-appearance:none;transition:border-color .3s"></textarea>
        <div style="font-size:10px;text-align:right;color:rgba(255,255,255,.3);margin-top:4px" id="tsCC">0 字</div>
      </div>
      ${tBtn('提交内心独白 →','bs2','tsS3',true)}
    </div>`;

    startCd(300);
    window.tsMonoIn = () => {
      const t = document.getElementById('tsMono').value;
      const n = t.replace(/\s/g,'').length;
      document.getElementById('tsCC').textContent = n+' 字';
      document.getElementById('tsCC').style.color = n>=150?'#70c090':'rgba(255,255,255,.3)';
      const b = document.getElementById('bs2');
      if(b){b.disabled=n<150;b.style.opacity=n<150?.22:1;b.style.pointerEvents=n<150?'none':'auto';}
      tsD.monologue = t;
    };
    window.tsS3 = s3;
  }

  function startCd(secs) {
    const C = 2*Math.PI*45; let left = secs;
    clearInterval(cdTimer);
    cdTimer = setInterval(() => {
      left--;
      const el=document.getElementById('tsCd'), arc=document.getElementById('tsArc');
      if(el) el.textContent=`${~~(left/60)}:${String(left%60).padStart(2,'0')}`;
      if(arc) arc.style.strokeDashoffset=C*(left/secs);
      if(left<=0){clearInterval(cdTimer);if(el)el.textContent='完成';}
    },1000);
  }

  function s3() { // 操纵检验
    clearInterval(cdTimer); sp(3);
    tc().innerHTML = `<div style="animation:tsFadeIn .8s ease">
      ${ey('三 · 操纵检验')}${h1('关于刚才的想象')}
      <div style="display:flex;flex-direction:column;gap:22px;margin-bottom:24px;width:100%">
        ${scaleRow('m1','M-01 · 温度感知','在想象中，您感受到的温度与这个季节平时相比','明显更凉','明显更热')}
        ${scaleRow('m2','M-02 · 沉浸程度','您对刚才情境的沉浸程度','完全未沉浸','非常沉浸')}
        ${scaleRow('m3','M-03 · 真实感','刚才描述的情境感觉有多真实','完全不真实','非常真实')}
      </div>
      ${tBtn('继续 →','bs3','tsS4',true)}
    </div>`;
    buildScales(['m1','m2','m3'],'bs3');
    window.tsS4 = s4;
  }

  function s4() { // 核心测量
    sp(4);
    tc().innerHTML = `<div style="animation:tsFadeIn .8s ease">
      ${ey('四 · 核心测量')}${h1('此刻的认知与睡眠预期')}
      ${p('基于刚才的情境想象，如实回答以下问题。')}
      <div style="display:flex;flex-direction:column;gap:22px;margin-bottom:24px;width:100%">
        <div style="font-size:10px;letter-spacing:2.5px;color:${A};opacity:.85">▌ 认知状态（状态反刍）</div>
        ${scaleRow('c1','C-01','此刻，我脑海中有一些想法在反复出现，难以停止','完全不符合','完全符合')}
        ${scaleRow('c2','C-02','此刻，我在反复思考一些令我担忧的事情','完全不符合','完全符合')}
        ${scaleRow('c3','C-03','此刻，我很难让脑子安静下来','完全不符合','完全符合')}
        <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent)"></div>
        <div style="font-size:10px;letter-spacing:2.5px;color:${A};opacity:.85">▌ 情绪状态</div>
        ${scaleRow('c4','C-04 · 焦虑','此刻，我感到焦虑或不安','完全不符合','完全符合')}
        ${scaleRow('c5','C-05 · 抑郁','此刻，我感到情绪低落或沮丧','完全不符合','完全符合')}
        <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent)"></div>
        <div style="font-size:10px;letter-spacing:2.5px;color:${A};opacity:.85">▌ 预期睡眠质量</div>
        ${scaleRow('s1','S-01 · 入睡','您预计今晚需要多长时间才能入睡','很快入睡','很长时间')}
        ${scaleRow('s2','S-02 · 质量','您预计今晚整体睡眠质量如何','非常差','非常好')}
        ${scaleRow('s3','S-03 · 觉醒','您预计今晚会在夜间醒来几次','不会醒来','多次醒来')}
        ${scaleRow('s4','S-04 · 晨起','您预计明天醒来时的精神状态如何','非常疲惫','神清气爽')}
      </div>
      ${tBtn('提交并完成研究 →','bs4','tsS5',true)}
    </div>`;
    buildScales(['c1','c2','c3','c4','c5','s1','s2','s3','s4'],'bs4');
    window.tsS5 = s5;
  }

  function s5() { // 感谢/揭示
    sp(5); clearInterval(cdTimer);
    tsD.timestamp = new Date().toISOString();
    saveExpResult('temperature', tsD);
    const cnt = JSON.parse(localStorage.getItem('ts_cc')||'{}');
    cnt[COND.id]=(cnt[COND.id]||0)+1;
    localStorage.setItem('ts_cc', JSON.stringify(cnt));
    stopAudio(); cancelAnimationFrame(_animId);
    tc().innerHTML = `<div style="animation:tsFadeIn .8s ease;text-align:center;padding:20px 0">
      <div style="font-size:56px;margin-bottom:12px">🌙</div>
      ${ey('研究完成')}${h1('感谢您的参与')}
      ${p('您的数据已成功提交。您的参与对推进<strong style="color:'+A+'">气候变化与人类睡眠健康</strong>研究具有重要价值。')}
      ${glass(`<p style="font-size:12px;line-height:1.9;color:rgba(255,255,255,.6);margin:0;text-align:left">
        <strong style="color:#fff">研究说明</strong><br>
        本研究中，参与者被随机分配到不同温度情境（夏季/冬季 × 偏热/正常/偏冷）。核心问题是：想象处于温度异常的夜晚时，
        <strong style="color:${A}">认知反刍水平</strong>和<strong style="color:${A}">预期睡眠质量</strong>是否随之改变，
        以及反刍是否在温度与睡眠之间起中介作用。
      </p>`,'margin-bottom:24px')}
      <button onclick="closeExperiment()" style="${btnStyle(A)}">返回实验中心</button>
    </div>`;
  }

  window.tsTapAudio = () => {
    _auEnabled = !_auEnabled;
    const btn = document.getElementById('tsAuBtn');
    if (btn) btn.textContent = _auEnabled ? '🔊' : '🔇';
    if (_auEnabled) startAudio(COND); else stopAudio();
  };

  s0();
}

// ─────────────────────────────────────────────────────────────
//  沉浸闪入遮罩
// ─────────────────────────────────────────────────────────────
function showImmFlash(cond) {
  const ov = document.getElementById('tsImm'); if (!ov) return;
  document.getElementById('tsImmT').textContent = cond.title;
  document.getElementById('tsImmS').textContent = cond.sub;
  ov.style.pointerEvents = 'all'; ov.style.opacity = '1';
  setTimeout(() => {
    ov.style.opacity = '0';
    setTimeout(() => { ov.style.pointerEvents = 'none'; }, 900);
  }, 2800);
}

// ═══════════════════════════════════════════════════════════════
//  ★ 电影级动态场景  SVG 城市剪影 + Canvas 粒子
// ═══════════════════════════════════════════════════════════════
function buildScene(cond) {
  const bg    = document.getElementById('tsBg');
  const scene = document.getElementById('tsScene');
  if (!bg || !scene) return;
  const W = window.innerWidth, H = window.innerHeight;
  bg.width = W; bg.height = H;
  const ctx = bg.getContext('2d');

  // 天空渐变
  const grd = ctx.createLinearGradient(0,0,0,H);
  if (cond.season==='summer' && cond.anomaly>0) {
    grd.addColorStop(0,'#0d0703'); grd.addColorStop(.55,'#170b04'); grd.addColorStop(1,'#1e0e05');
  } else if (cond.season==='winter' && cond.anomaly<0) {
    grd.addColorStop(0,'#010209'); grd.addColorStop(1,'#02050f');
  } else {
    grd.addColorStop(0,'#030710'); grd.addColorStop(1,'#040913');
  }
  ctx.fillStyle = grd; ctx.fillRect(0,0,W,H);

  // 路由到对应场景
  if      (cond.season==='summer' && cond.anomaly>0)  scene_SummerHot(scene, W, H, cond);
  else if (cond.season==='summer' && cond.anomaly<0)  scene_SummerCool(scene, W, H, cond);
  else if (cond.season==='summer')                    scene_SummerNorm(scene, W, H, cond);
  else if (cond.anomaly < 0)                          scene_WinterCold(scene, W, H, cond);
  else if (cond.anomaly > 0)                          scene_WinterMild(scene, W, H, cond);
  else                                                scene_WinterNorm(scene, W, H, cond);
}

// SVG 辅助：星空
function svgStars(W, H, n=120, maxY=.65, op=.85) {
  return [...Array(n)].map(() =>
    `<circle cx="${(Math.random()*W).toFixed(1)}" cy="${(Math.random()*H*maxY).toFixed(1)}"
     r="${(.5+Math.random()*1.3).toFixed(2)}" fill="white"
     opacity="${((.1+Math.random()*.75)*op).toFixed(2)}">
     <animate attributeName="opacity"
       values="${(Math.random()*.4+.1).toFixed(2)};${(Math.random()*.7+.3).toFixed(2)};${(Math.random()*.4+.1).toFixed(2)}"
       dur="${(2+Math.random()*4).toFixed(1)}s" repeatCount="indefinite"/></circle>`
  ).join('');
}

// SVG 辅助：城市轮廓（随机楼栋）
function svgCity(W, H, flY=.87, fill='#100602') {
  const out = []; let x = 0;
  while (x < W) {
    const bw = 28 + ~~(Math.random()*56);
    const bh = (.07+Math.random()*.27);
    const by = flY - bh;
    out.push(`<rect x="${x}" y="${(by*H).toFixed(1)}" width="${bw}" height="${((flY-by)*H).toFixed(1)}" fill="${fill}"/>`);
    // 天线
    if (Math.random()>.55)
      out.push(`<rect x="${(x+bw/2-1).toFixed(1)}" y="${((by-.04)*H).toFixed(1)}" width="2" height="${(.04*H).toFixed(1)}" fill="${fill}"/>`);
    // 偶尔加窗灯
    if (Math.random()>.7) {
      const wx=x+4+~~(Math.random()*(bw-10)), wy=(by+.04+Math.random()*(.18))*H;
      out.push(`<rect x="${wx}" y="${wy.toFixed(1)}" width="5" height="7" fill="rgba(255,200,100,.35)" rx="1"/>`);
    }
    x += bw + (Math.random()>.5?1:0);
  }
  return out.join('');
}

// Canvas 粒子辅助
function mkParticleCanvas(scene) {
  const c = document.createElement('canvas');
  c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
  c.width = window.innerWidth; c.height = window.innerHeight;
  scene.appendChild(c);
  return { c, ctx: c.getContext('2d'), W: c.width, H: c.height };
}

// ── 场景 1：盛夏·热浪 ──
function scene_SummerHot(scene, W, H, cond) {
  scene.innerHTML = `<svg width="${W}" height="${H}" style="position:absolute;inset:0" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="haze" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.013 0.075" numOctaves="3" seed="5">
          <animate attributeName="baseFrequency"
            values="0.013 0.075;0.018 0.1;0.013 0.075" dur="5s" repeatCount="indefinite"/>
        </feTurbulence>
        <feDisplacementMap in="SourceGraphic" scale="9" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <radialGradient id="horizonGlow" cx="50%" cy="100%" r="55%">
        <stop offset="0%" stop-color="rgba(200,65,10,.14)"/>
        <stop offset="100%" stop-color="transparent"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#horizonGlow)"/>
    <!-- 月亮 -->
    <circle cx="${W*.68}" cy="${H*.14}" r="${W*.055}" fill="#ff8840" opacity=".26"/>
    <circle cx="${W*.68}" cy="${H*.14}" r="${W*.028}" fill="#ffc090" opacity=".72"/>
    <circle cx="${W*.68}" cy="${H*.14}" r="${W*.012}" fill="#fff0e0" opacity=".96"/>
    <!-- 热浪扭曲层 -->
    <rect x="0" y="${H*.62}" width="${W}" height="${H*.1}"
      fill="rgba(210,70,15,.08)" filter="url(#haze)"/>
    <!-- 城市 -->
    ${svgCity(W, H, .87, '#110602')}
    <rect x="0" y="${H*.87}" width="${W}" height="${H*.13}" fill="#0c0502"/>
  </svg>`;

  const { ctx, W:CW, H:CH } = mkParticleCanvas(scene);
  // 热气粒子：从地面向上飘
  const pts = [...Array(180)].map(() => ({
    x: Math.random()*CW, y: CH*.6+Math.random()*CH*.4,
    vx: (Math.random()-.5)*.4, vy: -(Math.random()*1.8+.3),
    r: Math.random()*3+.4, a: Math.random()*.18+.04, w: Math.random()*Math.PI*2
  }));
  const frame = () => {
    ctx.clearRect(0,0,CW,CH);
    pts.forEach(p => {
      p.w+=.025; p.x+=Math.sin(p.w)*.8+p.vx; p.y+=p.vy;
      if (p.y<-12) { p.y=CH*.6+Math.random()*CH*.4; p.x=Math.random()*CW; }
      const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*5);
      g.addColorStop(0,`rgba(255,140,40,${p.a})`);
      g.addColorStop(1,'rgba(255,80,10,0)');
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r*5,0,Math.PI*2);
      ctx.fillStyle=g; ctx.fill();
    });
    _animId = requestAnimationFrame(frame);
  };
  frame();
}

// ── 场景 2：盛夏·清爽 ──
function scene_SummerCool(scene, W, H, cond) {
  scene.innerHTML = `<svg width="${W}" height="${H}" style="position:absolute;inset:0" xmlns="http://www.w3.org/2000/svg">
    ${svgStars(W,H,100,.72,.9)}
    <circle cx="${W*.25}" cy="${H*.18}" r="${W*.042}" fill="#cce4ff" opacity=".9"/>
    <circle cx="${W*.25}" cy="${H*.18}" r="${W*.065}" fill="rgba(160,210,255,.1)"/>
    <!-- 树木剪影 -->
    ${[0,9,19,31,44,55,67,79,90].map(xp=>`
      <ellipse cx="${(xp+3)/100*W}" cy="${H*.78}" rx="${W*.025}" ry="${H*.12}" fill="#030c06"/>
      <rect x="${(xp+2.7)/100*W}" y="${H*.78}" width="${W*.008}" height="${H*.22}" fill="#030c06"/>`
    ).join('')}
    ${svgCity(W,H,.9,'#040e07')}
    <rect x="0" y="${H*.9}" width="${W}" height="${H*.1}" fill="#020a04"/>
  </svg>`;

  const { ctx, W:CW, H:CH } = mkParticleCanvas(scene);
  // 萤火虫：随机飘动，脉冲发光
  const flies = [...Array(50)].map(() => ({
    x: Math.random()*CW, y: CH*.25+Math.random()*CH*.65,
    vx: (Math.random()-.5)*.55, vy: (Math.random()-.5)*.42,
    r: Math.random()*2.5+.8, phase: Math.random()*Math.PI*2, ps: .012+Math.random()*.022
  }));
  const frame = () => {
    ctx.clearRect(0,0,CW,CH);
    flies.forEach(p => {
      p.phase+=p.ps; p.x+=p.vx; p.y+=p.vy;
      if(p.x<0||p.x>CW) p.vx*=-1;
      if(p.y<CH*.15||p.y>CH*.95) p.vy*=-1;
      const a = (Math.sin(p.phase)+1)/2*.6;
      const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*6);
      g.addColorStop(0,`rgba(180,255,140,${a})`);
      g.addColorStop(1,'rgba(80,200,60,0)');
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r*6,0,Math.PI*2);
      ctx.fillStyle=g; ctx.fill();
    });
    _animId = requestAnimationFrame(frame);
  };
  frame();
}

// ── 场景 3：盛夏·正常 ──
function scene_SummerNorm(scene, W, H, cond) {
  scene.innerHTML = `<svg width="${W}" height="${H}" style="position:absolute;inset:0" xmlns="http://www.w3.org/2000/svg">
    ${svgStars(W,H,70,.67,.72)}
    <circle cx="${W*.62}" cy="${H*.20}" r="${W*.038}" fill="#d8f0c0" opacity=".82"/>
    ${svgCity(W,H,.88,'#040c06')}
    <rect x="0" y="${H*.88}" width="${W}" height="${H*.12}" fill="#030a04"/>
  </svg>`;

  const { ctx, W:CW, H:CH } = mkParticleCanvas(scene);
  const pts = [...Array(32)].map(() => ({
    x: Math.random()*CW, y: Math.random()*CH,
    vx:(Math.random()-.5)*.3, vy:(Math.random()-.5)*.25,
    r:Math.random()*2+.4, a:Math.random()*.065+.02
  }));
  const frame = () => {
    ctx.clearRect(0,0,CW,CH);
    pts.forEach(p => {
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0||p.x>CW) p.vx*=-1; if(p.y<0||p.y>CH) p.vy*=-1;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(200,240,180,${p.a})`; ctx.fill();
    });
    _animId = requestAnimationFrame(frame);
  };
  frame();
}

// ── 场景 4：隆冬·严寒 ──
function scene_WinterCold(scene, W, H, cond) {
  scene.innerHTML = `<svg width="${W}" height="${H}" style="position:absolute;inset:0" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="coldVig" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stop-color="transparent"/>
        <stop offset="100%" stop-color="rgba(20,50,170,.22)"/>
      </radialGradient>
    </defs>
    ${svgStars(W,H,230,.74,1.0)}
    <rect width="${W}" height="${H}" fill="url(#coldVig)"/>
    <!-- 月亮 -->
    <circle cx="${W*.80}" cy="${H*.13}" r="${W*.038}" fill="#b8d0ff" opacity=".94"/>
    <circle cx="${W*.80}" cy="${H*.13}" r="${W*.058}" fill="rgba(130,175,255,.12)"/>
    <!-- 地面积雪 -->
    <ellipse cx="50%" cy="${H*.87}" rx="${W*.62}" ry="${H*.025}" fill="rgba(190,215,255,.14)"/>
    ${svgCity(W,H,.87,'#030510')}
    <rect x="0" y="${H*.87}" width="${W}" height="${H*.13}" fill="#02040c"/>
  </svg>`;

  const { ctx, W:CW, H:CH } = mkParticleCanvas(scene);
  // 雪花：飘落+摇摆，大的有雪花臂
  const flakes = [...Array(220)].map(() => ({
    x: Math.random()*CW, y: Math.random()*CH,
    vx:(Math.random()-.5)*.5, vy: Math.random()*1.9+.3,
    r: Math.random()*3.8+.4, a: Math.random()*.55+.15,
    w: Math.random()*Math.PI*2, big: Math.random()>.55
  }));
  const frame = () => {
    ctx.clearRect(0,0,CW,CH);
    flakes.forEach(p => {
      p.w+=.022; p.x+=Math.sin(p.w)*.65+p.vx; p.y+=p.vy;
      if(p.y>CH+8) { p.y=-8; p.x=Math.random()*CW; }
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(210,230,255,${p.a})`; ctx.fill();
      if (p.big && p.r>1.8) { // 雪花结晶臂
        ctx.strokeStyle=`rgba(200,225,255,${p.a*.42})`; ctx.lineWidth=.45;
        for(let i=0;i<6;i++){
          const ag=i*Math.PI/3;
          ctx.beginPath(); ctx.moveTo(p.x,p.y);
          ctx.lineTo(p.x+Math.cos(ag)*p.r*2.2, p.y+Math.sin(ag)*p.r*2.2);
          ctx.stroke();
        }
      }
    });
    _animId = requestAnimationFrame(frame);
  };
  frame();
}

// ── 场景 5：隆冬·正常 ──
function scene_WinterNorm(scene, W, H, cond) {
  scene.innerHTML = `<svg width="${W}" height="${H}" style="position:absolute;inset:0" xmlns="http://www.w3.org/2000/svg">
    ${svgStars(W,H,160,.68,.9)}
    <circle cx="${W*.36}" cy="${H*.19}" r="${W*.033}" fill="#d0e2ff" opacity=".88"/>
    ${svgCity(W,H,.88,'#020408')}
    <rect x="0" y="${H*.88}" width="${W}" height="${H*.12}" fill="#010306"/>
  </svg>`;

  const { ctx, W:CW, H:CH } = mkParticleCanvas(scene);
  const fl = [...Array(65)].map(()=>({
    x:Math.random()*CW, y:Math.random()*CH,
    vx:(Math.random()-.5)*.32, vy:Math.random()*.95+.2,
    r:Math.random()*2.2+.3, a:Math.random()*.32+.08,
    w:Math.random()*Math.PI*2
  }));
  const frame = () => {
    ctx.clearRect(0,0,CW,CH);
    fl.forEach(p=>{
      p.w+=.018; p.x+=Math.sin(p.w)*.45+p.vx; p.y+=p.vy;
      if(p.y>CH+5){p.y=-5;p.x=Math.random()*CW;}
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(200,220,255,${p.a})`; ctx.fill();
    });
    _animId = requestAnimationFrame(frame);
  };
  frame();
}

// ── 场景 6：隆冬·偏暖 ──
function scene_WinterMild(scene, W, H, cond) {
  scene.innerHTML = `<svg width="${W}" height="${H}" style="position:absolute;inset:0" xmlns="http://www.w3.org/2000/svg">
    ${svgStars(W,H,120,.68,.76)}
    <circle cx="${W*.55}" cy="${H*.17}" r="${W*.036}" fill="#c8d8ff" opacity=".84"/>
    ${svgCity(W,H,.88,'#030510')}
    <!-- 窗灯（暖意） -->
    ${[...Array(24)].map(() => {
      const bx = ~~(Math.random()*W*.92), by = H*(.52+Math.random()*.3);
      return `<rect x="${bx}" y="${by.toFixed(1)}" width="5" height="7" fill="rgba(255,195,80,.42)" rx="1">
        <animate attributeName="opacity" values="0.4;0.9;0.4"
          dur="${(2+Math.random()*5).toFixed(1)}s" repeatCount="indefinite"/>
      </rect>`;
    }).join('')}
    <rect x="0" y="${H*.88}" width="${W}" height="${H*.12}" fill="#020408"/>
  </svg>`;

  const { ctx, W:CW, H:CH } = mkParticleCanvas(scene);
  // 轻飘的温暖粒子（暗示室内暖气）
  const pts = [...Array(24)].map(()=>({
    x:Math.random()*CW, y:Math.random()*CH,
    vx:(Math.random()-.5)*.25, vy:-(Math.random()*.2+.06),
    r:Math.random()*3+2, a:Math.random()*.05+.014
  }));
  const frame = () => {
    ctx.clearRect(0,0,CW,CH);
    pts.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy;
      if(p.y<-12) p.y=CH+12; if(p.x<0||p.x>CW) p.vx*=-1;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(155,185,240,${p.a})`; ctx.fill();
    });
    _animId = requestAnimationFrame(frame);
  };
  frame();
}

// ═══════════════════════════════════════════════════════════════
//  Web Audio 音景  ★ 用户手势后立即调用
// ═══════════════════════════════════════════════════════════════
function startAudio(cond) {
  stopAudio();
  if (!_auEnabled) return;
  const ctx = getAC();
  if (ctx.state === 'suspended') ctx.resume();

  const M = ctx.createGain();
  M.gain.setValueAtTime(0, ctx.currentTime);
  M.gain.linearRampToValueAtTime(.55, ctx.currentTime+2.5);
  M.connect(ctx.destination);
  rn('M', M);

  if      (cond.season==='summer' && cond.anomaly>0) au_SummerHot(ctx, M);
  else if (cond.season==='summer' && cond.anomaly<0) au_SummerCool(ctx, M);
  else if (cond.season==='summer')                   au_SummerNorm(ctx, M);
  else if (cond.anomaly<0)                           au_WinterCold(ctx, M);
  else if (cond.anomaly>0)                           au_WinterMild(ctx, M);
  else                                               au_WinterNorm(ctx, M);
}

function mkNoise(ctx, type='white') {
  const len = ctx.sampleRate*4, buf = ctx.createBuffer(1,len,ctx.sampleRate), d = buf.getChannelData(0);
  let l=0;
  for(let i=0;i<len;i++){
    if(type==='brown'){d[i]=l=(l+.02*(Math.random()*2-1))*.98; if(Math.abs(l)>.02)l*=.5;}
    else d[i]=Math.random()*2-1;
  }
  const s=ctx.createBufferSource(); s.buffer=buf; s.loop=true; return s;
}

// 盛夏热浪：蝉鸣 AM×6 + 棕噪声（闷热感）+ 电扇嗡嗡
function au_SummerHot(ctx, M) {
  for(let i=0;i<6;i++){
    const o=ctx.createOscillator(), am=ctx.createOscillator(), amG=ctx.createGain(), g=ctx.createGain();
    o.frequency.value=3000+i*220+Math.random()*120;
    am.frequency.value=14+i*3.5+Math.random()*5;
    amG.gain.value=.65; g.gain.value=.025+Math.random()*.02;
    am.connect(amG); amG.connect(g.gain); o.connect(g); g.connect(M);
    o.start(ctx.currentTime+i*.08); am.start(ctx.currentTime+i*.08);
    rn('o'+i,o); rn('a'+i,am);
  }
  const n=mkNoise(ctx,'brown'), lp=ctx.createBiquadFilter(), ng=ctx.createGain();
  lp.type='lowpass'; lp.frequency.value=310; ng.gain.value=.08;
  n.connect(lp); lp.connect(ng); ng.connect(M); n.start(); rn('nb',n);
  const h=ctx.createOscillator(), hg=ctx.createGain(), hf=ctx.createBiquadFilter();
  h.frequency.value=60; h.type='sawtooth'; hf.type='bandpass'; hf.frequency.value=120; hg.gain.value=.01;
  h.connect(hf); hf.connect(hg); hg.connect(M); h.start(); rn('hum',h);
}

// 盛夏正常：蟋蟀 AM×4 + 微风
function au_SummerNorm(ctx, M) {
  for(let i=0;i<4;i++){
    const o=ctx.createOscillator(), am=ctx.createOscillator(), amG=ctx.createGain(), g=ctx.createGain();
    o.frequency.value=2700+i*145; am.frequency.value=3.5+i*1.5;
    amG.gain.value=.5; g.gain.value=.018+Math.random()*.013;
    am.connect(amG); amG.connect(g.gain); o.connect(g); g.connect(M);
    o.start(ctx.currentTime+i*.3); am.start(ctx.currentTime+i*.3);
    rn('o'+i,o); rn('a'+i,am);
  }
  const w=mkNoise(ctx), bp=ctx.createBiquadFilter(), wg=ctx.createGain();
  bp.type='bandpass'; bp.frequency.value=650; bp.Q.value=.5; wg.gain.value=.026;
  w.connect(bp); bp.connect(wg); wg.connect(M); w.start(); rn('w',w);
}

// 盛夏清爽：青蛙叫 + 微风 + 远处蟋蟀
function au_SummerCool(ctx, M) {
  function frog(t) {
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.frequency.setValueAtTime(200+Math.random()*80,t);
    o.frequency.exponentialRampToValueAtTime(110,t+.18);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.055,t+.025);
    g.gain.exponentialRampToValueAtTime(.001,t+.22);
    o.connect(g); g.connect(M); o.start(t); o.stop(t+.26);
    setTimeout(()=>frog(ctx.currentTime+1.5+Math.random()*5),(1.5+Math.random()*5)*1000);
  }
  frog(ctx.currentTime+.6);
  const w=mkNoise(ctx), bp=ctx.createBiquadFilter(), wg=ctx.createGain();
  bp.type='bandpass'; bp.frequency.value=800; bp.Q.value=.3; wg.gain.value=.022;
  w.connect(bp); bp.connect(wg); wg.connect(M); w.start(); rn('w',w);
}

// 隆冬严寒：呼啸北风（LFO调制）+ 风哨声 + 木板嘎吱
function au_WinterCold(ctx, M) {
  const w=mkNoise(ctx), hp=ctx.createBiquadFilter(), lp=ctx.createBiquadFilter(), wg=ctx.createGain();
  hp.type='highpass'; hp.frequency.value=180;
  lp.type='lowpass';  lp.frequency.value=1400;
  wg.gain.value=.18;
  const lfo=ctx.createOscillator(), lg=ctx.createGain();
  lfo.frequency.value=.1; lg.gain.value=.14;
  lfo.connect(lg); lg.connect(wg.gain); lfo.start(); rn('lfo',lfo);
  w.connect(hp); hp.connect(lp); lp.connect(wg); wg.connect(M); w.start(); rn('w',w);
  // 风哨
  const wh=ctx.createOscillator(), wl=ctx.createOscillator(), wlg=ctx.createGain(), whg=ctx.createGain();
  wh.frequency.value=650; wl.frequency.value=.28; wlg.gain.value=62; whg.gain.value=.02;
  wl.connect(wlg); wlg.connect(wh.frequency); wh.connect(whg); whg.connect(M);
  wh.start(); wl.start(); rn('wh',wh); rn('wl',wl);
  // 木板嘎吱
  function creak(t) {
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.frequency.setValueAtTime(72+Math.random()*32,t);
    o.frequency.exponentialRampToValueAtTime(52,t+.38);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.04,t+.07);
    g.gain.exponentialRampToValueAtTime(.001,t+.42);
    o.connect(g); g.connect(M); o.start(t); o.stop(t+.48);
    setTimeout(()=>creak(ctx.currentTime+4+Math.random()*10),(4+Math.random()*10)*1000);
  }
  creak(ctx.currentTime+3);
}

// 隆冬正常：柔和风声 + 暖气管道金属声
function au_WinterNorm(ctx, M) {
  const w=mkNoise(ctx), bp=ctx.createBiquadFilter(), wg=ctx.createGain();
  bp.type='bandpass'; bp.frequency.value=370; bp.Q.value=.4; wg.gain.value=.05;
  w.connect(bp); bp.connect(wg); wg.connect(M); w.start(); rn('w',w);
  function tick(t) {
    const buf=ctx.createBuffer(1,~~(ctx.sampleRate*.058),ctx.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.exp(-i/(ctx.sampleRate*.013));
    const s=ctx.createBufferSource(), g=ctx.createGain();
    s.buffer=buf; g.gain.value=.07; s.connect(g); g.connect(M); s.start(t); s.stop(t+.08);
    setTimeout(()=>tick(ctx.currentTime+5+Math.random()*12),(5+Math.random()*12)*1000);
  }
  tick(ctx.currentTime+2);
}

// 隆冬偏暖：室内低嗡 + 远处城市噪声
function au_WinterMild(ctx, M) {
  const o=ctx.createOscillator(), g=ctx.createGain();
  o.frequency.value=50; g.gain.value=.012;
  o.connect(g); g.connect(M); o.start(); rn('o',o);
  const w=mkNoise(ctx), lp=ctx.createBiquadFilter(), wg=ctx.createGain();
  lp.type='lowpass'; lp.frequency.value=280; wg.gain.value=.036;
  w.connect(lp); lp.connect(wg); wg.connect(M); w.start(); rn('w',w);
}

// ─────────────────────────────────────────────────────────────
//  通用：保存结果
// ─────────────────────────────────────────────────────────────
function btnStyle(color) {
  return `width:100%;padding:14px;border-radius:30px;border:1.5px solid ${color};background:transparent;
    color:${color};font-size:13px;letter-spacing:2px;cursor:pointer;font-family:inherit;
    transition:background .3s,color .3s`;
}

async function saveExpResult(type, result) {
  try {
    const token = localStorage.getItem('token');
    await fetch('/api/experiments/result', {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body:JSON.stringify({experiment_type:type,result,timestamp:new Date().toISOString()})
    });
  } catch(e) {
    console.log('[Exp] offline save:', type, result);
  }
}
