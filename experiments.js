/**
 * experiments.js  v8.0
 * 范式：
 *  1. Stroop 色词干扰
 *  2. Go/No-Go 抑制控制（重做：注视点 + 清晰ITI + 计分面板）
 *  3. N-Back 2-back 工作记忆
 *  4. Flanker 注意冲突
 *  5. 简单反应时 SRT 基线
 *  6. 情绪 Dot-Probe 注意偏向
 *  7. 数字广度 Digit Span 短时记忆
 *  8. 温度·睡眠·心理（iframe）
 */

/* ─────────────────── 页面注册 ─────────────────── */
(function waitForApp(){
  if(typeof pages==='undefined'||typeof navTitles==='undefined')
    return setTimeout(waitForApp,60);
  pages['experiments']    = document.getElementById('experimentsPage');
  navTitles['experiments'] = '实验中心';
})();

/* ─────────────────── iframe（温度实验）─────────── */
let _expIframe = null;
window.addEventListener('message', e => {
  if(e.data && e.data.type === 'closeExp') closeExpIframe();
});
function closeExpIframe(){
  if(_expIframe){ _expIframe.remove(); _expIframe = null; }
}
function launchTempExp(){
  if(_expIframe) return;
  _expIframe = document.createElement('iframe');
  _expIframe.src = 'exp_temperature.html';
  _expIframe.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:none;z-index:9999;background:#000';
  _expIframe.allow = 'autoplay';
  document.body.appendChild(_expIframe);
}

/* ─────────────────── 主入口 ───────────────────── */
function launchExperiment(type){
  if(type === 'temperature'){ launchTempExp(); return; }
  const runner = document.getElementById('experimentRunner');
  runner.innerHTML = '';
  runner.classList.remove('hidden');
  const dispatch = {
    stroop:   initStroop,
    gonogo:   initGoNoGo,
    nback:    initNBack,
    flanker:  initFlanker,
    srt:      initSRT,
    dotprobe: initDotProbe,
    digitspan:initDigitSpan,
    riat:     initSCIAT,
  };
  if(dispatch[type]) dispatch[type](runner);
}
function closeExperiment(){
  const r = document.getElementById('experimentRunner');
  r.classList.add('hidden'); r.innerHTML = '';
}
function setPBar(n,t){
  const b = document.getElementById('expPBar');
  if(b) b.style.width = (n/t*100) + '%';
}

/* ─────────────────── 共用 UI 片段 ─────────────── */
function mkBar(title){
  return `<div class="exp-topbar">
    <div class="exp-topbar-back" onclick="closeExperiment()">
      <i class="fas fa-times"></i>
    </div>
    <div class="exp-topbar-title">${title}</div>
    <div style="width:36px"></div>
    <div class="exp-progress-bar" id="expPBar" style="width:0%"></div>
  </div>`;
}

const wrap = inner =>
  `<div style="display:flex;flex-direction:column;align-items:center;
    padding:28px 20px 72px;min-height:100%;color:#fff">${inner}</div>`;

function cardBox(inner){
  return `<div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);
    border-radius:14px;padding:18px;max-width:340px;width:100%;margin-bottom:16px">${inner}</div>`;
}

function resultRow(label, value, color){
  return `<div style="display:flex;justify-content:space-between;align-items:center;
    padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:14px">
    <span style="color:rgba(255,255,255,.7)">${label}</span>
    <span style="font-weight:800;color:${color}">${value}</span>
  </div>`;
}

function bigBtn(label, handler, color='#22c55e'){
  return `<button onclick="${handler}"
    style="width:100%;max-width:340px;padding:15px;border-radius:30px;
    border:1.5px solid ${color};background:transparent;color:${color};
    font-size:13px;letter-spacing:2px;cursor:pointer;font-family:inherit;
    transition:all .2s;margin-top:10px">
    ${label}</button>`;
}

function fixCross(opacity='.5'){
  return `<div style="font-size:52px;color:rgba(255,255,255,${opacity});
    font-weight:100;line-height:1;letter-spacing:0;margin:16px 0">＋</div>`;
}

const API_BASE = 'https://psych-chat-fbfnuvfetv.cn-hongkong.fcapp.run';

async function saveExp(type, data){
  try{
    const tok = localStorage.getItem('token')||'';
    const payload = JSON.stringify({experiment_type:type, result:data,
      timestamp:new Date().toISOString()});
    const res = await fetch(API_BASE+'/api/experiments/result?token='+encodeURIComponent(tok),{
      method:'POST',
      headers:{'Content-Type':'text/plain'},
      body: payload
    });
    if(!res.ok){
      console.warn('[Exp] 保存失败 HTTP', res.status);
    } else {
      console.log('[Exp] 数据已保存:', type);
    }
  } catch(e){
    console.warn('[Exp] 保存异常:', e);
  }
}

/* 先保存再关闭，防止 async 请求被中断 */
async function saveAndClose(type, data){
  await saveExp(type, data);
  closeExperiment();
}


/* ══════════════════════════════════════════════════
   1. STROOP 色词干扰
══════════════════════════════════════════════════ */
function initStroop(runner){
  runner.innerHTML = mkBar('Stroop 色词干扰') +
    `<div id="expContent" style="background:#111;color:#fff;overflow-y:auto"></div>`;
  const COLS = [
    {n:'红',h:'#ef4444'},{n:'蓝',h:'#3b82f6'},
    {n:'绿',h:'#22c55e'},{n:'黄',h:'#eab308'}
  ];
  const mkT = type => {
    const w = COLS[~~(Math.random()*4)];
    let c = w;
    if(type==='inc'){ do{ c=COLS[~~(Math.random()*4)]; }while(c===w); }
    return {word:w.n, color:c.h, correct:c.n, type};
  };
  const prac = Array.from({length:10}, ()=>mkT('con'));
  const test  = [
    ...Array.from({length:30}, ()=>mkT('con')),
    ...Array.from({length:30}, ()=>mkT('inc'))
  ].sort(()=>Math.random()-.5);

  let phase='intro', idx=0, list=[], res={con:[],inc:[]}, busy=false, t0=0;
  const C = ()=> document.getElementById('expContent');

  const render = () => {
    if(phase==='intro') showIntro();
    else if(phase==='prac'||phase==='test') showTrial();
    else showResult();
  };

  function showIntro(){
    setPBar(0,1);
    C().innerHTML = wrap(`
      <div style="font-size:24px;font-weight:800;margin-bottom:6px">🎨 Stroop 色词干扰</div>
      <div style="color:rgba(255,255,255,.4);font-size:13px;margin-bottom:22px">认知控制 · 干扰抑制</div>
      ${cardBox(`
        <div style="font-size:13px;line-height:2.1;color:rgba(255,255,255,.78)">
          看到颜色词后，选择<strong style="color:#eab308">文字的显示颜色</strong>，忽略词义。<br><br>
          例：看到 <span style="color:#3b82f6;font-weight:800;font-size:16px">红</span> → 按<strong style="color:#3b82f6">蓝色</strong>
        </div>
      `)}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:320px;width:100%;margin-bottom:22px">
        ${COLS.map(c=>`
          <div style="height:50px;border-radius:12px;border:1.5px solid ${c.h}66;color:${c.h};
            background:rgba(255,255,255,.03);display:flex;align-items:center;
            justify-content:center;gap:8px;font-weight:700;font-size:15px">
            <span style="width:10px;height:10px;border-radius:50%;background:${c.h}"></span>${c.n}
          </div>`).join('')}
      </div>
      ${bigBtn('开始练习（10题）→','window.__stStart()')}
    `);
    window.__stStart = ()=>{ phase='prac'; list=prac; idx=0; render(); };
  }

  function showTrial(){
    const isPrac = phase==='prac';
    const total  = list.length;
    setPBar(idx, total); busy=false;
    const tr = list[idx];

    C().innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;
        justify-content:center;min-height:calc(100vh - 44px);padding:20px;gap:0">

        <div style="font-size:11px;color:rgba(255,255,255,.22);margin-bottom:10px">
          ${isPrac ? `练习 ${idx+1}/${total}` : `${idx+1} / ${total}`}
        </div>

        ${fixCross()}

        <div id="stStim" style="font-size:clamp(52px,14vw,80px);font-weight:900;
          min-height:96px;display:flex;align-items:center;justify-content:center;
          letter-spacing:2px;opacity:0;transition:opacity .07s"></div>

        <p style="font-size:11px;color:rgba(255,255,255,.22);margin:16px 0 24px">
          选择文字的<span style="color:#eab308">显示颜色</span>
        </p>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:300px;width:100%">
          ${COLS.map(c=>`
            <div id="sb_${c.n}" onclick="window.__stAns('${c.n}')"
              style="height:54px;border-radius:13px;border:1.5px solid ${c.h}55;
              color:${c.h};background:rgba(255,255,255,.03);display:flex;align-items:center;
              justify-content:center;gap:7px;font-weight:700;cursor:pointer;
              transition:all .14s;font-size:15px">
              <span style="width:10px;height:10px;border-radius:50%;background:${c.h}"></span>${c.n}
            </div>`).join('')}
        </div>
      </div>`;

    // 注视点500ms → 显示刺激
    setTimeout(()=>{
      const el = document.getElementById('stStim');
      if(!el) return;
      el.textContent = tr.word; el.style.color = tr.color; el.style.opacity = '1';
      t0 = Date.now();
      window._stTO = setTimeout(()=>{ if(!busy) window.__stAns(null); }, 2000);
    }, 500);

    window.__stAns = ch => {
      if(busy) return; busy=true; clearTimeout(window._stTO);
      const rt = Date.now()-t0, ok = ch===tr.correct;
      const el = document.getElementById('sb_'+ch);
      if(el) el.style.background = ok ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.25)';
      const ce = document.getElementById('sb_'+tr.correct);
      if(ce&&!ok) ce.style.background = 'rgba(34,197,94,.18)';
      if(!isPrac) res[tr.type].push({rt,ok});
      setTimeout(()=>{
        idx++;
        if(idx>=list.length){
          if(isPrac){
            C().innerHTML = wrap(`
              <div style="text-align:center;padding:30px 0">
                <div style="font-size:48px;margin-bottom:12px">✅</div>
                <div style="font-size:20px;font-weight:800;margin-bottom:12px">练习完成</div>
                <p style="color:rgba(255,255,255,.5);margin-bottom:28px">接下来60题正式测试</p>
                ${bigBtn('开始正式测试 →','window.__stFormal()')}
              </div>`);
            window.__stFormal = ()=>{ phase='test'; list=test; idx=0; render(); };
          } else { phase='result'; render(); }
        } else render();
      }, 350);
    };
  }

  function showResult(){
    setPBar(1,1);
    const av = a => a.length ? Math.round(a.reduce((s,x)=>s+x.rt,0)/a.length) : '--';
    const ac = a => a.length ? Math.round(a.filter(x=>x.ok).length/a.length*100)+'%' : '--';
    const eff = (av(res.con)!=='--'&&av(res.inc)!=='--') ? av(res.inc)-av(res.con) : '--';
    C().innerHTML = wrap(`
      <div style="font-size:24px;font-weight:800;margin-bottom:6px">测试完成 🎉</div>
      <div style="color:rgba(255,255,255,.4);font-size:13px;margin-bottom:22px">Stroop 干扰效应</div>
      ${cardBox(`
        ${resultRow('一致条件 均RT', av(res.con)+' ms', '#22c55e')}
        ${resultRow('不一致条件 均RT', av(res.inc)+' ms', '#f59e0b')}
        ${resultRow('Stroop 效应量', (eff!=='--'?'+':'')+eff+' ms', '#eab308')}
        ${resultRow('一致 正确率', ac(res.con), '#22c55e')}
        ${resultRow('不一致 正确率', ac(res.inc), '#f59e0b')}
      `)}
      <div style="font-size:12px;color:rgba(255,255,255,.42);line-height:1.9;
        max-width:340px;text-align:center;margin-bottom:22px">
        效应量越大，说明词义对颜色判断干扰越强，需要更多认知资源来抑制阅读反应。
      </div>
      ${bigBtn('保存并返回 →',
        `saveAndClose('stroop',{con_rt:${av(res.con)},inc_rt:${av(res.inc)},effect:${eff},con_acc:'${ac(res.con)}',inc_acc:'${ac(res.inc)}'})`)}
    `);
  }
  render();
}


/* ══════════════════════════════════════════════════
   2. GO / NO-GO（重做：注视点 + 清晰ITI + 计分面板）
══════════════════════════════════════════════════ */
function initGoNoGo(runner){
  runner.innerHTML = mkBar('Go / No-Go 抑制控制') +
    `<div id="expContent" style="background:#0d0d0d;color:#fff;overflow-y:auto"></div>`;

  const TOTAL=80, GO_N=64, NOGO_N=16;
  const seq = [
    ...Array(GO_N).fill('go'),
    ...Array(NOGO_N).fill('nogo')
  ].sort(()=>Math.random()-.5);

  let idx=0, hits=0, misses=0, fas=0, rts=[], phase='intro';
  let _stimTO=null, _stimShown=false, _responded=false, _t0=0;
  const C = ()=> document.getElementById('expContent');

  function render(){
    if(phase==='intro') showIntro();
    else if(phase==='trial') runTrial();
    else showResult();
  }

  function showIntro(){
    C().innerHTML = wrap(`
      <div style="font-size:24px;font-weight:800;margin-bottom:6px">🚦 Go / No-Go</div>
      <div style="color:rgba(255,255,255,.4);font-size:13px;margin-bottom:22px">行为抑制控制</div>
      ${cardBox(`
        <div style="font-size:13px;line-height:1;color:rgba(255,255,255,.75)">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
            <div style="font-size:22px;color:rgba(255,255,255,.3);flex-shrink:0">＋</div>
            <div style="font-size:12px;color:rgba(255,255,255,.4)">注视点（500 ms）</div>
          </div>
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px">
            <div style="width:46px;height:46px;border-radius:50%;border:2.5px solid #22c55e;
              background:rgba(34,197,94,.15);display:flex;align-items:center;
              justify-content:center;font-size:22px;flex-shrink:0">🟢</div>
            <div><strong style="color:#22c55e;font-size:15px">绿色圆</strong><br>
              <span style="color:rgba(255,255,255,.55);font-size:12px">立即点击大按钮</span></div>
          </div>
          <div style="display:flex;align-items:center;gap:14px">
            <div style="width:46px;height:46px;border-radius:50%;border:2.5px solid #ef4444;
              background:rgba(239,68,68,.15);display:flex;align-items:center;
              justify-content:center;font-size:22px;flex-shrink:0">🔴</div>
            <div><strong style="color:#ef4444;font-size:15px">红色圆</strong><br>
              <span style="color:rgba(255,255,255,.55);font-size:12px">忍住！<strong>不要点击</strong></span></div>
          </div>
        </div>
      `)}
      <div style="font-size:12px;color:rgba(255,255,255,.38);margin-bottom:24px;text-align:center">
        共 ${TOTAL} 题 · 约 3 分钟 · 速度与准确度同样重要
      </div>
      ${bigBtn('开始任务 →','window.__gnStart()')}
    `);
    window.__gnStart = ()=>{ phase='trial'; render(); };
  }

  function runTrial(){
    if(idx>=TOTAL){ phase='result'; render(); return; }
    setPBar(idx, TOTAL);
    _stimShown=false; _responded=false;
    const isGo = seq[idx]==='go';

    // ── 1. 注视点屏 ─────────────────────────────────
    C().innerHTML = `
      <div id="gnWrap" onclick="window.__gnTap()"
        style="position:fixed;inset:44px 0 0 0;display:flex;flex-direction:column;
        align-items:center;justify-content:center;gap:0;
        cursor:pointer;-webkit-tap-highlight-color:transparent;
        user-select:none;-webkit-user-select:none;touch-action:manipulation">

        <!-- 进度 & 计分 -->
        <div style="position:absolute;top:12px;left:0;right:0;
          display:flex;justify-content:center;gap:24px">
          ${[
            ['命中',  hits,    '#22c55e'],
            ['漏报',  misses,  '#f59e0b'],
            ['误报',  fas,     '#ef4444'],
          ].map(([l,v,c])=>`
            <div style="text-align:center">
              <div style="font-size:20px;font-weight:800;color:${c}">${v}</div>
              <div style="font-size:10px;color:rgba(255,255,255,.28);margin-top:1px">${l}</div>
            </div>`).join('')}
        </div>

        <!-- 注视点（固定位置） -->
        <div id="gnFix" style="font-size:56px;color:rgba(255,255,255,.45);
          font-weight:100;line-height:1;transition:opacity .06s">＋</div>

        <!-- 刺激（隐藏，同位置） -->
        <div id="gnStim" style="font-size:72px;position:absolute;
          opacity:0;transition:opacity .05s;pointer-events:none"></div>

        <!-- 反馈文字 -->
        <div id="gnFb" style="height:32px;font-size:15px;font-weight:800;
          margin-top:18px;letter-spacing:1px"></div>

        <!-- 大点击按钮 -->
        <div style="position:absolute;bottom:36px;left:50%;transform:translateX(-50%)">
          <div style="width:130px;height:130px;border-radius:50%;
            background:rgba(255,255,255,.05);border:2px solid rgba(255,255,255,.12);
            display:flex;align-items:center;justify-content:center;
            font-size:13px;color:rgba(255,255,255,.25);pointer-events:none">
            点击区域
          </div>
        </div>
      </div>`;

    // ── 2. 500ms 后显示刺激 ──────────────────────────
    _stimTO = setTimeout(()=>{
      _stimShown = true;
      _t0 = Date.now();

      const fix  = document.getElementById('gnFix');
      const stim = document.getElementById('gnStim');
      if(!fix||!stim) return;
      fix.style.opacity = '0';
      stim.textContent  = isGo ? '🟢' : '🔴';
      stim.style.filter = isGo
        ? 'drop-shadow(0 0 20px rgba(34,197,94,.8))'
        : 'drop-shadow(0 0 20px rgba(239,68,68,.8))';
      stim.style.opacity = '1';

      // 刺激窗口 700ms 到期：未响应 → 漏报 / 正确拒绝
      _stimTO = setTimeout(()=>{
        if(_responded) return;
        _responded = true;
        stim.style.opacity = '0';
        const fb = document.getElementById('gnFb');
        if(isGo){
          misses++;
          if(fb){ fb.textContent='漏报'; fb.style.color='#f59e0b'; }
        }
        // nogo无点击 = 正确拒绝，无反馈
        setTimeout(nextITI, 400);
      }, 700);
    }, 500);

    // ── 3. 点击处理 ──────────────────────────────────
    window.__gnTap = ()=>{
      if(!_stimShown || _responded) return;
      _responded = true;
      clearTimeout(_stimTO);
      const rt   = Date.now() - _t0;
      const stim = document.getElementById('gnStim');
      const fb   = document.getElementById('gnFb');
      if(stim) stim.style.opacity = '0';
      if(isGo){
        hits++; rts.push(rt);
        if(fb){ fb.textContent=`✓ ${rt} ms`; fb.style.color='#22c55e'; }
      } else {
        fas++;
        if(fb){ fb.textContent='误报!'; fb.style.color='#ef4444'; }
      }
      setTimeout(nextITI, 350);
    };
  }

  // ── ITI 空白屏（250-450ms 随机）────────────────────
  function nextITI(){
    idx++;
    if(idx>=TOTAL){ phase='result'; render(); return; }
    C().innerHTML = `
      <div style="position:fixed;inset:44px 0 0 0;display:flex;
        align-items:center;justify-content:center">
        <div style="width:6px;height:6px;border-radius:50%;
          background:rgba(255,255,255,.08)"></div>
      </div>`;
    setTimeout(()=>runTrial(), 300+Math.random()*200);
  }

  function showResult(){
    setPBar(TOTAL,TOTAL);
    const avgRt  = rts.length ? Math.round(rts.reduce((a,b)=>a+b,0)/rts.length) : '--';
    const hrPct  = Math.round(hits/GO_N*100);
    const farPct = Math.round(fas/NOGO_N*100);
    const dp = (()=>{
      const norm = p => {
        p = Math.max(.01, Math.min(.99,p));
        const t = Math.sqrt(-2*Math.log(p<=.5?p:1-p));
        return (p<=.5?-1:1)*(t-(2.515517+.802853*t+.010328*t*t)
          /(1+1.432788*t+.189269*t*t+.001308*t*t*t));
      };
      return (norm(hrPct/100)-norm(Math.max(farPct,1)/100)).toFixed(2);
    })();

    C().innerHTML = wrap(`
      <div style="font-size:24px;font-weight:800;margin-bottom:6px">任务完成 🎉</div>
      <div style="color:rgba(255,255,255,.4);font-size:13px;margin-bottom:22px">抑制控制结果</div>
      ${cardBox(`
        ${resultRow('命中率（Go）',    hrPct+'%',      '#22c55e')}
        ${resultRow('误报率（NoGo）',  farPct+'%',     '#ef4444')}
        ${resultRow('漏报次数',        misses+' 次',   '#f59e0b')}
        ${resultRow('Go 平均反应时',   avgRt+' ms',    '#fff')}
        ${resultRow("辨别力 d'",       dp,             '#818cf8')}
      `)}
      <div style="font-size:12px;color:rgba(255,255,255,.42);line-height:1.9;
        max-width:340px;text-align:center;margin-bottom:22px">
        d' > 2.0 表示辨别能力良好。误报率越低，抑制控制越强。
      </div>
      ${bigBtn('保存并返回 →',
        `saveAndClose('gonogo',{hit_rate:${hrPct},fa_rate:${farPct},misses:${misses},avg_rt:${avgRt},dprime:'${dp}'})`)}
    `);
  }
  render();
}


/* ══════════════════════════════════════════════════
   3. N-BACK（2-back 工作记忆）
══════════════════════════════════════════════════ */
function initNBack(runner){
  runner.innerHTML = mkBar('2-Back 工作记忆') +
    `<div id="expContent" style="background:#080c18;color:#fff;overflow-y:auto"></div>`;

  const LETTERS = 'BCDFGHJKLMNPQRSTVWXZ'.split('');
  const N=2, TRIALS=30, MATCH_RATE=.33;
  const seq = [];
  for(let i=0;i<TRIALS;i++){
    if(i>=N && Math.random()<MATCH_RATE) seq.push(seq[i-N]);
    else {
      let l; do{ l=LETTERS[~~(Math.random()*LETTERS.length)]; }
      while(i>=N && l===seq[i-N]);
      seq.push(l);
    }
  }

  let idx=0, phase='intro', hits=0, misses=0, fas=0, crejects=0, rts=[];
  let _responded=false, _t0=0, _trTO=null;
  const C = ()=>document.getElementById('expContent');

  function render(){
    if(phase==='intro') nbIntro();
    else if(phase==='trial') nbTrial();
    else nbResult();
  }

  function nbIntro(){
    C().innerHTML = wrap(`
      <div style="font-size:24px;font-weight:800;margin-bottom:6px">🧠 2-Back 工作记忆</div>
      <div style="color:rgba(255,255,255,.4);font-size:13px;margin-bottom:22px">工作记忆容量 · 持续更新</div>
      ${cardBox(`
        <div style="font-size:13px;line-height:2;color:rgba(255,255,255,.78)">
          每次看到字母后，判断：<br>
          <strong style="color:#818cf8">当前字母</strong> 与 <strong style="color:#818cf8">2个之前</strong> 是否相同？
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin:12px 0;flex-wrap:wrap">
          ${['B','K','B'].map((l,i)=>`
            <div style="width:40px;height:40px;border-radius:10px;
              display:flex;align-items:center;justify-content:center;
              font-size:18px;font-weight:800;
              background:${i===2?'rgba(129,140,248,.25)':'rgba(255,255,255,.06)'};
              border:${i===2?'1.5px solid #818cf8':'1px solid rgba(255,255,255,.1)'};
              color:${i===2?'#818cf8':'rgba(255,255,255,.4)'}">${l}</div>
            ${i<2?'<div style="color:rgba(255,255,255,.25)">→</div>':''}`).join('')}
          <div style="font-size:11px;color:#818cf8;margin-left:4px">← 匹配！</div>
        </div>
        <div style="font-size:12px;color:rgba(255,255,255,.45);line-height:1.8">
          前 ${N} 个字母无需回答，之后每题必须作答。
        </div>
      `)}
      ${bigBtn('开始任务 →','window.__nbStart()', '#818cf8')}
    `);
    window.__nbStart = ()=>{ phase='trial'; render(); };
  }

  function nbTrial(){
    if(idx>=TRIALS){ phase='result'; render(); return; }
    setPBar(idx, TRIALS);
    _responded=false;
    const letter  = seq[idx];
    const canResp = idx >= N;
    const isMatch = canResp && seq[idx]===seq[idx-N];
    _t0 = Date.now();

    // 历史显示（最近3个）
    const histSlice = seq.slice(Math.max(0,idx-3), idx);
    const histHtml  = histSlice.map((l,i,arr)=>{
      const isNpos = canResp && (arr.length-1-i)===1; // 2个前
      return `<div style="width:36px;height:36px;border-radius:8px;
        display:flex;align-items:center;justify-content:center;
        font-size:15px;font-weight:700;
        background:${isNpos?'rgba(129,140,248,.22)':'rgba(255,255,255,.05)'};
        border:${isNpos?'1.5px solid #818cf8':'1px solid rgba(255,255,255,.08)'};
        color:${isNpos?'#818cf8':'rgba(255,255,255,.35)'}">${l}</div>`;
    }).join('');

    C().innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;
        justify-content:center;min-height:calc(100vh - 44px);padding:20px">

        <div style="font-size:11px;color:rgba(255,255,255,.22);margin-bottom:24px">
          ${idx+1} / ${TRIALS}${!canResp?' · 记忆阶段':''}
        </div>

        <!-- 历史记录 -->
        <div style="display:flex;gap:8px;margin-bottom:22px;min-height:40px;align-items:center">
          ${histHtml}
        </div>

        <!-- 当前字母 -->
        <div style="width:110px;height:110px;border-radius:20px;
          background:rgba(129,140,248,.12);border:2px solid rgba(129,140,248,.5);
          display:flex;align-items:center;justify-content:center;
          font-size:64px;font-weight:900;color:#818cf8;
          box-shadow:0 0 30px rgba(129,140,248,.25);
          margin-bottom:34px;
          animation:nbPop .15s ease both">${letter}</div>

        <!-- 按钮 -->
        <div style="display:flex;gap:14px;max-width:310px;width:100%">
          <button id="nbYes" onclick="window.__nbAns(true)"
            style="flex:1;padding:17px;border-radius:15px;
            border:1.5px solid #22c55e;background:rgba(34,197,94,.08);
            color:#22c55e;font-size:14px;font-weight:700;
            cursor:pointer;transition:all .15s;
            ${!canResp?'opacity:.2;pointer-events:none':''}">
            ✓ 匹配</button>
          <button id="nbNo" onclick="window.__nbAns(false)"
            style="flex:1;padding:17px;border-radius:15px;
            border:1.5px solid #f87171;background:rgba(248,113,113,.08);
            color:#f87171;font-size:14px;font-weight:700;
            cursor:pointer;transition:all .15s;
            ${!canResp?'opacity:.2;pointer-events:none':''}">
            ✗ 不同</button>
        </div>
        ${!canResp?`<div style="font-size:11px;color:rgba(255,255,255,.2);margin-top:14px">记住这个字母</div>`:''}
      </div>
      <style>@keyframes nbPop{from{transform:scale(.5);opacity:0}to{transform:scale(1);opacity:1}}</style>`;

    // 1500ms 自动推进（未响应）
    _trTO = setTimeout(()=>{
      if(_responded) return;
      if(canResp){ isMatch ? misses++ : crejects++; }
      nextNB();
    }, 1500);

    window.__nbAns = resp => {
      if(_responded || !canResp) return;
      _responded=true; clearTimeout(_trTO);
      const rt = Date.now()-_t0;
      const correct = resp===isMatch;
      if(correct){ isMatch ? (hits++,rts.push(rt)) : crejects++; }
      else        { isMatch ? misses++ : fas++; }
      const bY=document.getElementById('nbYes'), bN=document.getElementById('nbNo');
      if(bY) bY.style.background = resp  ? (correct?'rgba(34,197,94,.35)':'rgba(239,68,68,.25)') : '';
      if(bN) bN.style.background = !resp ? (correct?'rgba(34,197,94,.25)':'rgba(239,68,68,.25)') : '';
      setTimeout(nextNB, 280);
    };
  }

  function nextNB(){ idx++; setTimeout(render, 200); }

  function nbResult(){
    setPBar(TRIALS,TRIALS);
    const acc  = hits+misses>0 ? Math.round(hits/(hits+misses)*100) : 0;
    const spec  = crejects+fas>0 ? Math.round(crejects/(crejects+fas)*100) : 0;
    const avgRt = rts.length ? Math.round(rts.reduce((a,b)=>a+b,0)/rts.length) : '--';
    C().innerHTML = wrap(`
      <div style="font-size:24px;font-weight:800;margin-bottom:6px">任务完成 🎉</div>
      <div style="color:rgba(255,255,255,.4);font-size:13px;margin-bottom:22px">2-Back 工作记忆</div>
      ${cardBox(`
        ${resultRow('匹配命中率',  acc+'%',    '#818cf8')}
        ${resultRow('正确拒绝率',  spec+'%',   '#22c55e')}
        ${resultRow('漏报次数',    misses+'次', '#f59e0b')}
        ${resultRow('误报次数',    fas+'次',    '#ef4444')}
        ${resultRow('命中均RT',    avgRt+' ms', '#fff')}
      `)}
      <div style="font-size:12px;color:rgba(255,255,255,.42);line-height:1.9;
        max-width:340px;text-align:center;margin-bottom:22px">
        2-Back 测量工作记忆的<strong style="color:#fff">持续更新能力</strong>。
        命中率越高、误报越少，工作记忆容量越好。
      </div>
      ${bigBtn('保存并返回 →',
        `saveAndClose('nback',{hits:${hits},misses:${misses},fas:${fas},accuracy:'${acc}%',avg_rt:${avgRt}})`,
        '#818cf8')}
    `);
  }
  render();
}


/* ══════════════════════════════════════════════════
   4. FLANKER 注意冲突
══════════════════════════════════════════════════ */
function initFlanker(runner){
  runner.innerHTML = mkBar('Flanker 注意冲突') +
    `<div id="expContent" style="background:#0f0a00;color:#fff;overflow-y:auto"></div>`;

  const STIMS = [
    {arr:'→→→→→', tgt:'→', type:'con'},
    {arr:'←←←←←', tgt:'←', type:'con'},
    {arr:'→→←→→', tgt:'←', type:'inc'},
    {arr:'←←→←←', tgt:'→', type:'inc'},
  ];
  const prac = Array.from({length:8},  ()=>STIMS[~~(Math.random()*4)]);
  const test  = Array.from({length:40}, ()=>STIMS[~~(Math.random()*4)]);

  let phase='intro', idx=0, list=[], res={con:[],inc:[]}, busy=false, t0=0;
  const C = ()=>document.getElementById('expContent');

  function render(){
    if(phase==='intro') flIntro();
    else if(phase==='prac'||phase==='test') flTrial();
    else flResult();
  }

  function flIntro(){
    C().innerHTML = wrap(`
      <div style="font-size:24px;font-weight:800;margin-bottom:6px">🎯 Flanker 注意冲突</div>
      <div style="color:rgba(255,255,255,.4);font-size:13px;margin-bottom:22px">选择性注意 · 冲突监控</div>
      ${cardBox(`
        <div style="font-size:13px;line-height:2;color:rgba(255,255,255,.78);margin-bottom:12px">
          判断<strong style="color:#f59e0b">中间箭头</strong>方向，忽略两侧干扰箭头：
        </div>
        <div style="font-size:30px;letter-spacing:8px;text-align:center;margin:8px 0">→→→→→</div>
        <div style="font-size:11px;text-align:center;color:rgba(255,255,255,.35);margin-bottom:10px">一致（简单）</div>
        <div style="font-size:30px;letter-spacing:8px;text-align:center;margin:8px 0">
          →→<span style="color:#f59e0b">←</span>→→</div>
        <div style="font-size:11px;text-align:center;color:rgba(255,255,255,.35)">不一致（困难）仍按中间</div>
      `)}
      <div style="display:flex;gap:16px;max-width:310px;width:100%;margin-bottom:22px">
        <div style="flex:1;height:58px;border-radius:14px;
          border:1.5px solid rgba(251,146,60,.6);background:rgba(251,146,60,.08);
          display:flex;align-items:center;justify-content:center;
          font-size:22px;font-weight:800;color:#fb923c">← 左</div>
        <div style="flex:1;height:58px;border-radius:14px;
          border:1.5px solid rgba(96,165,250,.6);background:rgba(96,165,250,.08);
          display:flex;align-items:center;justify-content:center;
          font-size:22px;font-weight:800;color:#60a5fa">右 →</div>
      </div>
      ${bigBtn('开始练习（8题）→','window.__flStart()', '#f59e0b')}
    `);
    window.__flStart = ()=>{ phase='prac'; list=prac; idx=0; render(); };
  }

  function flTrial(){
    const isPrac=phase==='prac', total=list.length;
    setPBar(idx,total); busy=false;
    const s = list[idx];
    const mid = s.arr[2];
    const arrowHtml = s.arr.split('').map((c,i)=>
      i===2 ? `<span style="color:#f59e0b">${c}</span>` : c
    ).join('');

    C().innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;
        justify-content:center;min-height:calc(100vh - 44px);padding:20px">

        <div style="font-size:11px;color:rgba(255,255,255,.22);margin-bottom:14px">
          ${isPrac ? `练习 ${idx+1}/${total}` : `${idx+1} / ${total}`}
        </div>

        ${fixCross()}

        <div id="flStim" style="font-size:clamp(38px,10vw,54px);letter-spacing:12px;
          font-weight:900;min-height:72px;display:flex;align-items:center;
          opacity:0;transition:opacity .07s;margin:10px 0 8px">${arrowHtml}</div>

        <div style="font-size:10px;color:rgba(255,255,255,.18);margin-bottom:28px">
          判断<span style="color:#f59e0b">中间</span>箭头方向
        </div>

        <div id="flFb" style="height:28px;font-size:16px;font-weight:800;margin-bottom:20px"></div>

        <div style="display:flex;gap:14px;max-width:310px;width:100%">
          <button id="flL" onclick="window.__flAns('←')"
            style="flex:1;padding:18px;border-radius:15px;
            border:1.5px solid rgba(251,146,60,.6);background:rgba(251,146,60,.08);
            color:#fb923c;font-size:24px;font-weight:800;cursor:pointer;
            transition:all .13s">←</button>
          <button id="flR" onclick="window.__flAns('→')"
            style="flex:1;padding:18px;border-radius:15px;
            border:1.5px solid rgba(96,165,250,.6);background:rgba(96,165,250,.08);
            color:#60a5fa;font-size:24px;font-weight:800;cursor:pointer;
            transition:all .13s">→</button>
        </div>
      </div>`;

    setTimeout(()=>{
      const el=document.getElementById('flStim');
      if(el){ el.style.opacity='1'; t0=Date.now();
        window._flTO=setTimeout(()=>{ if(!busy)window.__flAns(null); }, 1500);
      }
    }, 500);

    window.__flAns = ch => {
      if(busy) return; busy=true; clearTimeout(window._flTO);
      const rt=Date.now()-t0, ok=ch===mid;
      const fb=document.getElementById('flFb');
      if(fb){ fb.textContent=ok?'✓':'✗'; fb.style.color=ok?'#22c55e':'#ef4444'; }
      const bL=document.getElementById('flL'), bR=document.getElementById('flR');
      if(bL) bL.style.background = ch==='←'?(ok?'rgba(34,197,94,.3)':'rgba(239,68,68,.22)'):'';
      if(bR) bR.style.background = ch==='→'?(ok?'rgba(34,197,94,.3)':'rgba(239,68,68,.22)'):'';
      if(!isPrac) res[s.type].push({rt,ok});
      setTimeout(()=>{
        idx++;
        if(idx>=list.length){
          if(isPrac){
            C().innerHTML=wrap(`
              <div style="text-align:center;padding:30px 0">
                <div style="font-size:48px;margin-bottom:12px">✅</div>
                <div style="font-size:20px;font-weight:800;margin-bottom:12px">练习完成</div>
                <p style="color:rgba(255,255,255,.5);margin-bottom:28px">接下来40题正式测试</p>
                ${bigBtn('开始正式测试 →','window.__flFormal()', '#f59e0b')}
              </div>`);
            window.__flFormal=()=>{ phase='test'; list=test; idx=0; render(); };
          } else { phase='result'; render(); }
        } else render();
      }, 360);
    };
  }

  function flResult(){
    setPBar(1,1);
    const av = a=>a.length?Math.round(a.reduce((s,x)=>s+x.rt,0)/a.length):'--';
    const ac = a=>a.length?Math.round(a.filter(x=>x.ok).length/a.length*100)+'%':'--';
    const eff=(av(res.con)!=='--'&&av(res.inc)!=='--')?av(res.inc)-av(res.con):'--';
    C().innerHTML=wrap(`
      <div style="font-size:24px;font-weight:800;margin-bottom:6px">任务完成 🎉</div>
      <div style="color:rgba(255,255,255,.4);font-size:13px;margin-bottom:22px">Flanker 冲突效应</div>
      ${cardBox(`
        ${resultRow('一致条件 均RT',    av(res.con)+' ms', '#22c55e')}
        ${resultRow('不一致条件 均RT',  av(res.inc)+' ms', '#f59e0b')}
        ${resultRow('Flanker 效应量',   (eff!=='--'?'+':'')+eff+' ms', '#eab308')}
        ${resultRow('一致 正确率',      ac(res.con), '#22c55e')}
        ${resultRow('不一致 正确率',    ac(res.inc), '#f59e0b')}
      `)}
      <div style="font-size:12px;color:rgba(255,255,255,.42);line-height:1.9;
        max-width:340px;text-align:center;margin-bottom:22px">
        Flanker 效应量反映<strong style="color:#fff">选择性注意</strong>强度——在干扰存在时锁定目标的能力。
      </div>
      ${bigBtn('保存并返回 →',
        `saveAndClose('flanker',{con_rt:${av(res.con)},inc_rt:${av(res.inc)},effect:${eff}})`,
        '#f59e0b')}
    `);
  }
  render();
}


/* ══════════════════════════════════════════════════
   5. 简单反应时 SRT 基线
══════════════════════════════════════════════════ */
function initSRT(runner){
  runner.innerHTML = mkBar('简单反应时基线') +
    `<div id="expContent" style="background:#06050f;color:#fff;overflow-y:auto"></div>`;

  const TRIALS=20;
  let idx=0, rts=[], phase='intro', stimOn=false, _stimTO=null, _t0=0;
  const C = ()=>document.getElementById('expContent');

  function render(){
    if(phase==='intro') srtIntro();
    else if(phase==='trial') srtTrial();
    else srtResult();
  }

  function srtIntro(){
    C().innerHTML=wrap(`
      <div style="font-size:24px;font-weight:800;margin-bottom:6px">⚡ 简单反应时</div>
      <div style="color:rgba(255,255,255,.4);font-size:13px;margin-bottom:22px">神经处理速度基线</div>
      ${cardBox(`
        <div style="font-size:13px;line-height:2;color:rgba(255,255,255,.78)">
          屏幕中央出现<span style="color:#a78bfa;font-weight:700">紫色圆圈</span>时，
          <strong>立即点击</strong>屏幕。<br>
          等待时间随机（1-4秒），不要提前点。<br>
          共 ${TRIALS} 次，约 1 分钟。
        </div>
      `)}
      ${bigBtn('开始 →','window.__srtStart()', '#a78bfa')}
    `);
    window.__srtStart=()=>{ phase='trial'; render(); };
  }

  function srtTrial(){
    if(idx>=TRIALS){ phase='result'; render(); return; }
    setPBar(idx,TRIALS);
    stimOn=false;

    C().innerHTML=`
      <div id="srtWrap" onclick="window.__srtTap()"
        style="position:fixed;inset:44px 0 0 0;display:flex;flex-direction:column;
        align-items:center;justify-content:center;gap:0;
        cursor:pointer;user-select:none;-webkit-user-select:none;
        touch-action:manipulation">

        <div style="font-size:11px;color:rgba(255,255,255,.2);margin-bottom:36px">
          ${idx+1} / ${TRIALS}
        </div>

        <div id="srtCircle"
          style="width:120px;height:120px;border-radius:50%;
          background:rgba(255,255,255,.04);
          border:2px solid rgba(255,255,255,.1);
          display:flex;align-items:center;justify-content:center;
          font-size:13px;color:rgba(255,255,255,.18);
          transition:all .08s">
          等待…
        </div>

        <div id="srtHint" style="font-size:12px;color:rgba(255,255,255,.22);margin-top:28px">
          出现紫色圆圈后立即点击
        </div>
      </div>`;

    const delay=1000+Math.random()*3000;
    _stimTO=setTimeout(()=>{
      stimOn=true; _t0=Date.now();
      const c=document.getElementById('srtCircle');
      const h=document.getElementById('srtHint');
      if(c){
        c.style.background='rgba(167,139,250,.28)';
        c.style.border='2.5px solid #a78bfa';
        c.style.boxShadow='0 0 36px rgba(167,139,250,.55)';
        c.style.color='#a78bfa';
        c.style.fontSize='48px';
        c.textContent='●';
      }
      if(h){ h.textContent='点！'; h.style.color='#a78bfa'; }
      // 超时
      setTimeout(()=>{
        if(!stimOn) return;
        stimOn=false;
        if(c){ c.style.background='rgba(239,68,68,.18)'; c.style.border='2px solid #ef4444';
               c.style.boxShadow=''; c.style.color='#ef4444'; c.style.fontSize='13px'; c.textContent='超时'; }
        setTimeout(nextSRT,700);
      },1200);
    },delay);

    window.__srtTap=()=>{
      if(!stimOn){
        clearTimeout(_stimTO);
        const c=document.getElementById('srtCircle');
        const h=document.getElementById('srtHint');
        if(c){ c.style.background='rgba(239,68,68,.18)'; c.style.border='2px solid #ef4444';
               c.style.color='#ef4444'; c.textContent='过早!'; }
        if(h){ h.textContent='等圆圈变色再点'; h.style.color='#ef4444'; }
        setTimeout(()=>srtTrial(),900); return;
      }
      stimOn=false;
      const rt=Date.now()-_t0; rts.push(rt);
      const c=document.getElementById('srtCircle');
      if(c){ c.style.background='rgba(34,197,94,.22)'; c.style.border='2px solid #22c55e';
             c.style.boxShadow=''; c.style.color='#22c55e'; c.style.fontSize='14px'; c.textContent=rt+' ms'; }
      setTimeout(nextSRT,420);
    };
  }

  function nextSRT(){ idx++; setTimeout(()=>render(), 250+Math.random()*200); }

  function srtResult(){
    setPBar(TRIALS,TRIALS);
    const valid=rts.filter(r=>r>80&&r<1100);
    const avg=valid.length?Math.round(valid.reduce((a,b)=>a+b,0)/valid.length):'--';
    const mn =valid.length?Math.min(...valid):'--';
    const mx =valid.length?Math.max(...valid):'--';
    const sd =valid.length>1
      ?Math.round(Math.sqrt(valid.reduce((s,x)=>s+(x-avg)**2,0)/valid.length)):'--';
    C().innerHTML=wrap(`
      <div style="font-size:24px;font-weight:800;margin-bottom:6px">测量完成 🎉</div>
      <div style="color:rgba(255,255,255,.4);font-size:13px;margin-bottom:22px">简单反应时结果</div>
      ${cardBox(`
        ${resultRow('平均反应时',  avg+' ms', '#a78bfa')}
        ${resultRow('最快',        mn+' ms',  '#22c55e')}
        ${resultRow('最慢',        mx+' ms',  '#f59e0b')}
        ${resultRow('标准差',      sd+' ms',  '#fff')}
        ${resultRow('有效试次',    valid.length+' / '+TRIALS, 'rgba(255,255,255,.5)')}
      `)}
      <div style="font-size:12px;color:rgba(255,255,255,.42);line-height:1.9;
        max-width:340px;text-align:center;margin-bottom:22px">
        成人均值约 <strong style="color:#fff">200–280 ms</strong>。SD 越小反应越稳定，
        可作为其他范式 RT 的个体基线。
      </div>
      ${bigBtn('保存并返回 →',
        `saveAndClose('srt',{avg:${avg},min:${mn},max:${mx},sd:${sd},n:${valid.length}})`,
        '#a78bfa')}
    `);
  }
  render();
}


/* ══════════════════════════════════════════════════
   6. 情绪 DOT-PROBE 注意偏向
══════════════════════════════════════════════════ */
function initDotProbe(runner){
  runner.innerHTML = mkBar('Dot-Probe 注意偏向') +
    `<div id="expContent" style="background:#080810;color:#fff;overflow-y:auto"></div>`;

  // 用表情符号代替图片
  const HAPPY  = ['😊','😄','😁','🙂','😀'];
  const THREAT = ['😠','😤','😡','😨','😰'];
  const rnd    = arr => arr[~~(Math.random()*arr.length)];

  // 生成试次：一致（探针与威胁同侧）/ 不一致
  const prac = Array.from({length:16},(_,i)=>mkDP(i%2===0?'con':'inc'));
  const test  = Array.from({length:80},(_,i)=>mkDP(i%2===0?'con':'inc')).sort(()=>Math.random()-.5);

  function mkDP(type){
    const threatSide = Math.random()<.5 ? 'left':'right';
    const probeSide  = type==='con' ? threatSide : (threatSide==='left'?'right':'left');
    return {type, threatSide, probeSide,
      happyE:rnd(HAPPY), threatE:rnd(THREAT),
      probeDir: Math.random()<.5 ? '▲':'▼'};
  }

  let phase='intro', idx=0, list=[], res={con:[],inc:[]}, busy=false, t0=0;
  const C=()=>document.getElementById('expContent');

  function render(){
    if(phase==='intro') dpIntro();
    else if(phase==='prac'||phase==='test') dpTrial();
    else dpResult();
  }

  function dpIntro(){
    C().innerHTML=wrap(`
      <div style="font-size:24px;font-weight:800;margin-bottom:6px">👁 Dot-Probe</div>
      <div style="color:rgba(255,255,255,.4);font-size:13px;margin-bottom:22px">情绪注意偏向测量</div>
      ${cardBox(`
        <div style="font-size:13px;line-height:2;color:rgba(255,255,255,.78)">
          每次先出现<strong>两张表情</strong>（一喜一忧），
          随后某侧出现<strong style="color:#34d399">探针箭头 ▲ 或 ▼</strong>，
          快速按对应按钮。<br><br>
          关注哪侧，那侧出现探针时就会更快——
          这反映了你对<span style="color:#f87171">威胁情绪</span>的注意偏向。
        </div>
      `)}
      <div style="display:flex;gap:14px;max-width:310px;width:100%;margin-bottom:22px">
        <div style="flex:1;height:58px;border-radius:14px;
          border:1.5px solid rgba(52,211,153,.5);background:rgba(52,211,153,.08);
          display:flex;align-items:center;justify-content:center;
          font-size:22px;font-weight:800;color:#34d399">▲</div>
        <div style="flex:1;height:58px;border-radius:14px;
          border:1.5px solid rgba(167,139,250,.5);background:rgba(167,139,250,.08);
          display:flex;align-items:center;justify-content:center;
          font-size:22px;font-weight:800;color:#a78bfa">▼</div>
      </div>
      ${bigBtn('开始练习（16题）→','window.__dpStart()', '#34d399')}
    `);
    window.__dpStart=()=>{ phase='prac'; list=prac; idx=0; render(); };
  }

  function dpTrial(){
    const isPrac=phase==='prac', total=list.length;
    setPBar(idx,total); busy=false;
    const tr=list[idx];
    const leftE  = tr.threatSide==='left' ? tr.threatE : tr.happyE;
    const rightE = tr.threatSide==='right'? tr.threatE : tr.happyE;

    C().innerHTML=`
      <div style="display:flex;flex-direction:column;align-items:center;
        justify-content:center;min-height:calc(100vh - 44px);padding:20px">

        <div style="font-size:11px;color:rgba(255,255,255,.22);margin-bottom:20px">
          ${isPrac?`练习 ${idx+1}/${total}`:`${idx+1} / ${total}`}
        </div>

        ${fixCross('.4')}

        <!-- 表情对 -->
        <div id="dpFaces" style="display:flex;gap:50px;margin:14px 0;opacity:0;transition:opacity .05s">
          <div id="dpL" style="font-size:56px;line-height:1">${leftE}</div>
          <div id="dpR" style="font-size:56px;line-height:1">${rightE}</div>
        </div>

        <!-- 探针位置（与表情同位置，先隐藏）-->
        <div id="dpProbe" style="display:flex;gap:50px;margin:0;opacity:0;transition:opacity .05s">
          <div id="dpPL" style="font-size:38px;font-weight:900;color:#34d399;
            min-width:56px;text-align:center;
            ${tr.probeSide==='left'?'':'visibility:hidden'}">
            ${tr.probeDir}</div>
          <div id="dpPR" style="font-size:38px;font-weight:900;color:#34d399;
            min-width:56px;text-align:center;
            ${tr.probeSide==='right'?'':'visibility:hidden'}">
            ${tr.probeDir}</div>
        </div>

        <div id="dpFb" style="height:28px;font-size:15px;font-weight:800;margin:14px 0"></div>

        <div style="display:flex;gap:14px;max-width:310px;width:100%">
          <button id="dpUp" onclick="window.__dpAns('▲')"
            style="flex:1;padding:18px;border-radius:15px;
            border:1.5px solid rgba(52,211,153,.5);background:rgba(52,211,153,.07);
            color:#34d399;font-size:24px;font-weight:800;cursor:pointer;transition:all .13s">▲</button>
          <button id="dpDn" onclick="window.__dpAns('▼')"
            style="flex:1;padding:18px;border-radius:15px;
            border:1.5px solid rgba(167,139,250,.5);background:rgba(167,139,250,.07);
            color:#a78bfa;font-size:24px;font-weight:800;cursor:pointer;transition:all .13s">▼</button>
        </div>
      </div>`;

    // 表情呈现500ms → 探针
    setTimeout(()=>{
      const faces=document.getElementById('dpFaces');
      if(faces) faces.style.opacity='1';
      setTimeout(()=>{
        if(!document.getElementById('dpFaces')) return;
        const faces=document.getElementById('dpFaces');
        const probe=document.getElementById('dpProbe');
        if(faces) faces.style.opacity='0';
        if(probe) probe.style.opacity='1';
        t0=Date.now();
        window._dpTO=setTimeout(()=>{ if(!busy)window.__dpAns(null); },1500);
      },500);
    },500);

    window.__dpAns=ch=>{
      if(busy)return; busy=true; clearTimeout(window._dpTO);
      const rt=Date.now()-t0, ok=ch===tr.probeDir;
      const fb=document.getElementById('dpFb');
      if(fb){ fb.textContent=ok?'✓':'✗'; fb.style.color=ok?'#22c55e':'#ef4444'; }
      const bu=document.getElementById('dpUp'), bd=document.getElementById('dpDn');
      if(bu) bu.style.background=ch==='▲'?(ok?'rgba(34,197,94,.3)':'rgba(239,68,68,.22)'):'';
      if(bd) bd.style.background=ch==='▼'?(ok?'rgba(34,197,94,.3)':'rgba(239,68,68,.22)'):'';
      if(!isPrac) res[tr.type].push({rt,ok});
      setTimeout(()=>{
        idx++;
        if(idx>=list.length){
          if(isPrac){
            C().innerHTML=wrap(`
              <div style="text-align:center;padding:30px 0">
                <div style="font-size:48px;margin-bottom:12px">✅</div>
                <div style="font-size:20px;font-weight:800;margin-bottom:12px">练习完成</div>
                <p style="color:rgba(255,255,255,.5);margin-bottom:28px">接下来80题正式测试</p>
                ${bigBtn('开始正式测试 →','window.__dpFormal()', '#34d399')}
              </div>`);
            window.__dpFormal=()=>{ phase='test'; list=test; idx=0; render(); };
          } else { phase='result'; render(); }
        } else render();
      },360);
    };
  }

  function dpResult(){
    setPBar(1,1);
    const av=a=>a.length?Math.round(a.reduce((s,x)=>s+x.rt,0)/a.length):'--';
    const ac=a=>a.length?Math.round(a.filter(x=>x.ok).length/a.length*100)+'%':'--';
    const conRt=av(res.con), incRt=av(res.inc);
    const bias=conRt!=='--'&&incRt!=='--'?incRt-conRt:'--';
    const biasDir = bias!=='--'?(bias>0?'对威胁存在注意偏向（趋近）':'对威胁存在注意回避'):'--';
    C().innerHTML=wrap(`
      <div style="font-size:24px;font-weight:800;margin-bottom:6px">任务完成 🎉</div>
      <div style="color:rgba(255,255,255,.4);font-size:13px;margin-bottom:22px">注意偏向结果</div>
      ${cardBox(`
        ${resultRow('一致条件 均RT',    conRt+' ms',  '#34d399')}
        ${resultRow('不一致条件 均RT',  incRt+' ms',  '#f87171')}
        ${resultRow('注意偏向分',       (bias>0?'+':'')+bias+' ms', bias>0?'#f87171':'#34d399')}
        ${resultRow('一致 正确率',      ac(res.con),  '#22c55e')}
        ${resultRow('不一致 正确率',    ac(res.inc),  '#f59e0b')}
      `)}
      <div style="font-size:12px;color:rgba(255,255,255,.42);line-height:1.9;
        max-width:340px;text-align:center;margin-bottom:22px">
        ${biasDir}。偏向分 > 0 说明注意更多朝向威胁侧，常见于焦虑倾向个体。
      </div>
      ${bigBtn('保存并返回 →',
        `saveAndClose('dotprobe',{con_rt:${conRt},inc_rt:${incRt},bias:${bias}})`,
        '#34d399')}
    `);
  }
  render();
}


/* ══════════════════════════════════════════════════
   7. 数字广度 DIGIT SPAN（顺序 + 逆序）
══════════════════════════════════════════════════ */
function initDigitSpan(runner){
  runner.innerHTML = mkBar('数字广度记忆') +
    `<div id="expContent" style="background:#0a0f08;color:#fff;overflow-y:auto"></div>`;

  let mode='forward', level=3, success=0, fail=0, maxFwd=0, maxBwd=0;
  let phase='intro', presenting=false;
  const C=()=>document.getElementById('expContent');

  function render(){
    if(phase==='intro') dsIntro();
    else if(phase==='present') dsPresent();
    else if(phase==='recall') dsRecall();
    else if(phase==='transition') dsTrans();
    else dsResult();
  }

  function dsIntro(){
    C().innerHTML=wrap(`
      <div style="font-size:24px;font-weight:800;margin-bottom:6px">🔢 数字广度</div>
      <div style="color:rgba(255,255,255,.4);font-size:13px;margin-bottom:22px">短时记忆容量 · 顺序+逆序</div>
      ${cardBox(`
        <div style="font-size:13px;line-height:2;color:rgba(255,255,255,.78)">
          数字会依次出现，每次显示 <strong>800ms</strong>。<br>
          <strong style="color:#86efac">顺序</strong>：按原顺序用键盘/按钮输入<br>
          <strong style="color:#fbbf24">逆序</strong>：倒序输入（例：1-2-3 → 输入 3-2-1）<br><br>
          长度从 3 位逐渐增加，连续两次失败则该部分结束。
        </div>
      `)}
      ${bigBtn('开始（顺序）→','window.__dsStart()', '#86efac')}
    `);
    window.__dsStart=()=>{ mode='forward'; level=3; success=0; fail=0; phase='present'; render(); };
  }

  let _seq=[], _inputBuf='';

  function dsPresent(){
    // 生成数字序列
    _seq=[];
    const digits='123456789'.split('');
    for(let i=0;i<level;i++){
      let d; do{ d=digits[~~(Math.random()*9)]; }while(_seq.length&&d===_seq[_seq.length-1]);
      _seq.push(d);
    }
    _inputBuf='';
    presenting=true;
    let shown=0;

    function showNext(){
      if(shown>=_seq.length){ presenting=false; setTimeout(()=>{ phase='recall'; render(); },400); return; }
      C().innerHTML=`
        <div style="display:flex;flex-direction:column;align-items:center;
          justify-content:center;min-height:calc(100vh - 44px)">
          <div style="font-size:12px;color:rgba(255,255,255,.25);margin-bottom:28px">
            ${mode==='forward'?'顺序':'逆序'} · ${level} 位 · ${shown+1}/${level}
          </div>
          <div style="font-size:88px;font-weight:900;
            color:${mode==='forward'?'#86efac':'#fbbf24'};
            animation:dsFlash .15s ease both">${_seq[shown]}</div>
        </div>
        <style>@keyframes dsFlash{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}</style>`;
      setTimeout(()=>{
        // 空白
        C().innerHTML=`<div style="display:flex;align-items:center;justify-content:center;min-height:calc(100vh - 44px)">
          <div style="width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.1)"></div></div>`;
        shown++;
        setTimeout(showNext,200);
      },800);
    }
    showNext();
  }

  function dsRecall(){
    const target = mode==='forward' ? [..._seq] : [..._seq].reverse();
    _inputBuf='';

    C().innerHTML=`
      <div style="display:flex;flex-direction:column;align-items:center;
        justify-content:center;min-height:calc(100vh - 44px);padding:20px">

        <div style="font-size:12px;color:rgba(255,255,255,.28);margin-bottom:6px">
          ${mode==='forward'?'按原顺序输入':'按逆序输入'}
        </div>
        <div style="font-size:12px;color:rgba(255,255,255,.18);margin-bottom:24px">
          ${level} 位数字
        </div>

        <!-- 输入显示 -->
        <div id="dsDisp" style="min-width:200px;height:64px;border-radius:14px;
          border:1.5px solid rgba(255,255,255,.15);background:rgba(255,255,255,.05);
          display:flex;align-items:center;justify-content:center;
          font-size:34px;font-weight:800;letter-spacing:8px;
          color:${mode==='forward'?'#86efac':'#fbbf24'};
          margin-bottom:24px"></div>

        <!-- 数字键盘 -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;
          max-width:280px;width:100%;margin-bottom:14px">
          ${[1,2,3,4,5,6,7,8,9].map(n=>`
            <button onclick="window.__dsTap('${n}')"
              style="height:58px;border-radius:13px;
              border:1px solid rgba(255,255,255,.15);
              background:rgba(255,255,255,.05);
              color:#fff;font-size:22px;font-weight:700;cursor:pointer;
              transition:background .12s">
              ${n}</button>`).join('')}
          <div></div>
          <button onclick="window.__dsTap('0')"
            style="height:58px;border-radius:13px;
            border:1px solid rgba(255,255,255,.15);
            background:rgba(255,255,255,.05);
            color:#fff;font-size:22px;font-weight:700;cursor:pointer">
            0</button>
          <button onclick="window.__dsDel()"
            style="height:58px;border-radius:13px;
            border:1px solid rgba(255,255,255,.15);
            background:rgba(255,255,255,.05);
            color:#f87171;font-size:18px;cursor:pointer">
            ⌫</button>
        </div>

        <button onclick="window.__dsSubmit()"
          style="width:100%;max-width:280px;padding:14px;border-radius:30px;
          border:1.5px solid ${mode==='forward'?'#86efac':'#fbbf24'};
          background:transparent;
          color:${mode==='forward'?'#86efac':'#fbbf24'};
          font-size:13px;letter-spacing:2px;cursor:pointer;font-family:inherit">
          确认提交 →</button>
      </div>`;

    const upd=()=>{
      const d=document.getElementById('dsDisp');
      if(d) d.textContent=_inputBuf||'';
    };
    window.__dsTap=n=>{ if(_inputBuf.length<level){ _inputBuf+=n; upd(); } };
    window.__dsDel=()=>{ _inputBuf=_inputBuf.slice(0,-1); upd(); };
    window.__dsSubmit=()=>{
      const correct=target.join('')===_inputBuf;
      if(correct){
        success++; fail=0;
        if(mode==='forward') maxFwd=Math.max(maxFwd,level);
        else maxBwd=Math.max(maxBwd,level);
        level++;
        // 顺序最多9位
        if(mode==='forward'&&level>9){ dsSwitchBwd(); return; }
        if(mode==='backward'&&level>9){ phase='result'; render(); return; }
        showFb(true,()=>{ phase='present'; render(); });
      } else {
        fail++;
        if(fail>=2){
          if(mode==='forward'){ dsSwitchBwd(); }
          else { phase='result'; render(); }
          return;
        }
        showFb(false,()=>{ _inputBuf=''; phase='present'; render(); });
      }
    };
  }

  function showFb(ok, cb){
    C().innerHTML=`
      <div style="display:flex;flex-direction:column;align-items:center;
        justify-content:center;min-height:calc(100vh - 44px)">
        <div style="font-size:72px;margin-bottom:12px">${ok?'✓':'✗'}</div>
        <div style="font-size:16px;font-weight:700;
          color:${ok?'#86efac':'#ef4444'}">
          ${ok?'正确！':'错误，再试一次'}</div>
        ${!ok?`<div style="font-size:13px;color:rgba(255,255,255,.4);margin-top:8px">
          正确答案：${(mode==='forward'?[..._seq]:[..._seq].reverse()).join(' - ')}</div>`:''}
      </div>`;
    setTimeout(cb, 1200);
  }

  function dsSwitchBwd(){
    mode='backward'; level=3; fail=0; success=0;
    phase='transition'; render();
  }

  function dsTrans(){
    C().innerHTML=wrap(`
      <div style="text-align:center;padding:30px 0">
        <div style="font-size:48px;margin-bottom:12px">🔄</div>
        <div style="font-size:20px;font-weight:800;margin-bottom:12px;color:#fbbf24">顺序部分完成</div>
        <p style="color:rgba(255,255,255,.5);margin-bottom:8px">接下来进行<strong style="color:#fbbf24">逆序</strong>部分</p>
        <p style="font-size:12px;color:rgba(255,255,255,.35);margin-bottom:28px">数字倒着输入（例：1-2-3 → 输入 3-2-1）</p>
        ${bigBtn('开始逆序 →','window.__dsStartBwd()', '#fbbf24')}
      </div>`);
    window.__dsStartBwd=()=>{ phase='present'; render(); };
  }

  function dsResult(){
    setPBar(1,1);
    C().innerHTML=wrap(`
      <div style="font-size:24px;font-weight:800;margin-bottom:6px">任务完成 🎉</div>
      <div style="color:rgba(255,255,255,.4);font-size:13px;margin-bottom:22px">数字广度结果</div>
      ${cardBox(`
        ${resultRow('顺序广度',  maxFwd+' 位', '#86efac')}
        ${resultRow('逆序广度',  maxBwd+' 位', '#fbbf24')}
        ${resultRow('总广度',    (maxFwd+maxBwd)+' 位', '#fff')}
      `)}
      <div style="font-size:12px;color:rgba(255,255,255,.42);line-height:1.9;
        max-width:340px;text-align:center;margin-bottom:22px">
        成人顺序广度均值约 <strong style="color:#fff">7±2</strong> 位，
        逆序广度略低。逆序更能反映工作记忆的主动操控能力。
      </div>
      ${bigBtn('保存并返回 →',
        `saveAndClose('digitspan',{forward:${maxFwd},backward:${maxBwd},total:${maxFwd+maxBwd}})`,
        '#86efac')}
    `);
  }
  render();
}


/* ══════════════════════════════════════════════════
   SC-IAT  休息—道德威胁单类内隐联结测验  v4
   ──────────────────────────────────────────────────
   基于 v3，本版修正以下两个相互关联的核心问题：

   [v4-1] Block 结构修正：rest 在两个联合 block 中换侧
     ──────────────────────────────────────────────
     原 v3 问题：两个联合 block 中 rest 始终在同一侧（左键），
     导致被试内按键频率无法平衡（两个 block 均 58% 同侧）。

     参考 Karpinski & Steinman (2006) Coke SC-IAT：
       Stage 1：Coke+good → 左键（58%），bad → 右键（42%）
       Stage 2：bad → 左键（42%），Coke+bad → 右键（58%）
       Coke 在两个 stage 换侧，被试内跨 stage 均值恰好 50%。

     本版修正：
       相容 block：  leftCats=['rest','threat'], rightCats=['virtue']   → rest 在左(E)
       不相容 block：leftCats=['threat'],         rightCats=['rest','virtue'] → rest 在右(I)
       两个 block rest 所在侧相反 → 被试内平均 E/I 各 50% ✅

   [v4-2] 试次比例修正：7:7:10
     ──────────────────────────────────────────────
     原 v3 问题：联合 block 中目标词(rest)50%、配对属性词50%，
     非配对属性词不出现，不符合原版 SC-IAT 三类词同时呈现的设计。

     参考原文比例（Karpinski & Steinman, 2006）：
       目标类别(rest) : 配对属性 : 非配对属性 = 7 : 7 : 10
       24 试次 → 7 + 7 + 10 = 24
       72 试次 → 21 + 21 + 30 = 72

     每个联合 block 的按键频率：
       相容 block：
         E键(rest+threat) = 21+21 = 42 次 = 58.3%
         I键(virtue)      = 30 次 = 41.7%
       不相容 block：
         E键(threat)       = 30 次 = 41.7%
         I键(rest+virtue) = 21+21 = 42 次 = 58.3%
       被试内 E 键均值 = (58.3+41.7)/2 = 50.0% ✅

     设计意图：
       · 非配对属性词出现确保被试始终需要区分三类刺激，
         维持认知负荷，防止任务退化为简单的二元判断
       · 目标词(rest)在两个 block 中呈现次数相同(21次)，
         消除词频对 RT 的混淆
       · 比例 7:7:10 是原版 SC-IAT 经验证的标准设置

   ──────────────────────────────────────────────────
   继承自 v3 的所有修正（保持不变）：
     [v3-1]  注视点 jitter：randInt(300, 600) ms
     [v3-2]  ISI jitter：randInt(400, 700) ms
     [v3-3]  performance.now() 高精度计时 + setTimeout 漂移补偿
     [v3-5]  MaxRepeat-aware Greedy Shuffle（同类最多连续 3 次）
     [v3-6]  全局命名空间隔离（唯一实例 ID）
     [v3-7]  virtue_prac / virtue_formal 严格不重叠
     [v3-8]  Block 标签动态化
     [v3-9]  慢反应比例检查（RT > 2000ms > 10% 警告）
     [v3-10] 练习阶段错误率检查（> 40% 警告）
     [原版]  D 值方向、计分算法、Counterbalancing、宿主接口
══════════════════════════════════════════════════ */
function initSCIAT(runner) {
  /* 唯一实例 ID，防止多实例全局命名冲突 */
  const IID = 'sc_' + Math.random().toString(36).slice(2, 8);

  runner.innerHTML = mkBar('SC-IAT 休息—羞耻联结测验') +
    `<div id="expContent_${IID}" style="background:#0a0a12;color:#fff;overflow-y:auto"></div>`;

  /* ────────────────────────────────────────────────
     词表
     threat_prac / threat_formal 严格不重叠
     virtue_prac / virtue_formal 严格不重叠（v3-7）
     rest_prac   / rest_formal   严格不重叠
  ──────────────────────────────────────────────── */
  const STIM = {
    threat_prac:   ['悔过','愧对','失格','心虚','亏欠','惭色','赎罪','歉疚'],
    threat_formal: ['羞耻','惭愧','负罪','悔恨','内疚','懊悔','愧疚','自惭','愧色','羞惭'],

    virtue_prac:   ['安然','平和','坦荡','从容','知足','洒脱','顺遂','淡然'],
    virtue_formal: ['自豪','无愧','心安','正直','清白','踏实','释然','坦然','无憾','平静'],

    rest_prac:     ['赖床','打盹','歇息','放空','闲逛','假寐','踱步','晒太阳'],
    rest_formal:   ['散步','泡澡','懒觉','午睡','放松','观影','发呆','闲坐','赏景','养神'],
  };

  /* ────────────────────────────────────────────────
     Counterbalancing
       ORDER A：先相容（rest+threat→E），后不相容（threat→E）
       ORDER B：先不相容，后相容
     注：两种顺序下 rest 均在相容block按E、不相容block按I，
         被试内 E/I 频率均为 50%，counterbalancing 仅影响顺序效应。
  ──────────────────────────────────────────────── */
  const ORDER = Math.random() < 0.5 ? 'A' : 'B';

  const SUBJECT_ID = 'sub_' + Date.now().toString(36) +
                     '_' + Math.random().toString(36).slice(2, 6);
  const START_TIME = Date.now();

  /* ────────────────────────────────────────────────
     [v4-1] Block 定义修正
     相容 block：  leftCats=['rest','threat'], rightCats=['virtue']
     不相容 block：leftCats=['threat'],         rightCats=['rest','virtue']
     rest 在两个 block 换侧（左 → 右），实现被试内按键频率平衡。

     [v4-2] 比例标注（实际在 makeTrials 中实现）
     正式 72 试次：rest=21, 配对属性=21, 非配对属性=30
     练习 24 试次：rest=7,  配对属性=7,  非配对属性=10
  ──────────────────────────────────────────────── */
  function makeBlocks(order) {
    /*
      相容 block 固定结构（两种 order 共用）：
        E键：休息 / 道德威胁（rest+threat）
        I键：道德正向（virtue）
        比例：rest=21, threat=21, virtue=30（正式）/ 7,7,10（练习）
        E键频率：(21+21)/72 = 58.3%

      不相容 block 固定结构（两种 order 共用）：
        E键：道德威胁（threat）← 单独类别，非配对属性，出现最多
        I键：道德正向 / 休息（virtue+rest）
        比例：threat=30, rest=21, virtue=21（正式）/ 10,7,7（练习）
        E键频率：30/72 = 41.7%
    */
    const compatDef = {
      type:     'compat',
      leftLbl:  '休息 / 道德威胁',
      rightLbl: '道德正向',
      leftCats: ['rest', 'threat'],
      rightCats:['virtue'],
    };
    const incompatDef = {
      type:     'incompat',
      leftLbl:  '道德威胁',
      rightLbl: '道德正向 / 休息',
      leftCats: ['threat'],
      rightCats:['virtue', 'rest'],
    };

    const first  = order === 'A' ? compatDef   : incompatDef;
    const second = order === 'A' ? incompatDef : compatDef;

    /* 属性辨别练习 block（无 rest，仅 threat vs virtue） */
    const attrDef = {
      id:1, label:'属性辨别练习',
      n:24, prac:true, type:'attr',
      leftLbl: '道德威胁', rightLbl: '道德正向',
      leftCats:['threat'], rightCats:['virtue'],
    };

    return [
      { ...attrDef },
      { ...first,  id:2, label:`联合任务练习（${first.type==='compat'?'相容':'不相容'}）`,
        n:24, prac:true  },
      { ...first,  id:3, label:`联合任务正式（${first.type==='compat'?'相容':'不相容'}）`,
        n:72, prac:false },
      { ...second, id:4, label:`联合任务练习（${second.type==='compat'?'相容':'不相容'}）`,
        n:24, prac:true  },
      { ...second, id:5, label:`联合任务正式（${second.type==='compat'?'相容':'不相容'}）`,
        n:72, prac:false },
    ];
  }

  const BLOCKS = makeBlocks(ORDER);

  /* ══ 工具函数 ══════════════════════════════════════ */

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = ~~(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function randInt(lo, hi) {
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
  }

  function getWords(cat, prac) {
    const k = cat + (prac ? '_prac' : '_formal');
    return [...(STIM[k] || STIM[cat + '_formal'] || [])];
  }

  function correctKey(blk, cat) {
    return blk.leftCats.includes(cat) ? 'left' : 'right';
  }

  /* fillQueue：循环补充词库至指定数量，内部先打乱 */
  function fillQueue(words, n) {
    let q = [];
    while (q.length < n) q = q.concat(shuffle(words));
    return q.slice(0, n);
  }

  /* ──────────────────────────────────────────────────
     MaxRepeat-aware Greedy Shuffle（v3-5，沿用）
     ──────────────────────────────────────────────────
     经 500 次模拟验证，2类/3类均保证同一类别最多连续 MAX_RUN 次。
     算法：
       1. 按 cat 分桶，各桶内词序独立 shuffle
       2. 贪心重建序列：优先选"剩余最多且不触发连续上限"的 cat
          · 以剩余数量加权：防止末尾堆积大量同类
          · 若唯一剩余 cat 已达上限，强制继续（极端情况）
  ────────────────────────────────────────────────── */
  const MAX_RUN = 3;

  function maxRepeatShuffle(items) {
    const counts = {}, queues = {};
    for (const t of items) {
      counts[t.cat] = (counts[t.cat] || 0) + 1;
      if (!queues[t.cat]) queues[t.cat] = [];
      queues[t.cat].push(t);
    }
    for (const c in queues) {
      const q = queues[c];
      for (let i = q.length - 1; i > 0; i--) {
        const j = ~~(Math.random() * (i + 1));
        [q[i], q[j]] = [q[j], q[i]];
      }
    }

    const result = [];
    const n      = items.length;
    const recent = [];

    while (result.length < n) {
      const cats = Object.keys(counts).filter(c => counts[c] > 0);
      if (!cats.length) break;

      const streak = (recent.length >= MAX_RUN &&
        recent.slice(-MAX_RUN).every(c => c === recent[recent.length - 1]))
        ? recent[recent.length - 1] : null;

      const allowed = streak ? cats.filter(c => c !== streak) : cats;
      const pool    = allowed.length ? allowed : cats;

      pool.sort((a, b) => counts[b] - counts[a]);
      const chosen = pool[0];

      result.push(queues[chosen].shift());
      counts[chosen]--;
      recent.push(chosen);
      if (recent.length > MAX_RUN) recent.shift();
    }

    return result;
  }

  /* ──────────────────────────────────────────────────
     [v4-2] 试次生成：7:7:10 比例
     ──────────────────────────────────────────────────
     联合 block（含 rest）：
       · 识别"目标类别"(rest)、"配对属性"、"非配对属性"
       · 配对属性 = 与 rest 共享同侧的非 rest 类别
       · 非配对属性 = 独占另一侧的类别
       · 比例：rest : 配对属性 : 非配对属性 = 7 : 7 : 10（24 次基准）
       · 正式 72 次：21 : 21 : 30
       · 练习 24 次：7  : 7  : 10

     属性辨别 block（无 rest）：
       · 两类各 50%（12:12 或 n/2 : n/2）
  ────────────────────────────────────────────────── */
  function makeTrials(blk) {
    const hasRest = blk.leftCats.includes('rest') ||
                    blk.rightCats.includes('rest');
    const rawTrials = [];

    if (hasRest) {
      /*
        确定配对属性和非配对属性：
          · rest 所在侧的其他 cat = 配对属性
          · rest 不在侧的所有 cat = 非配对属性
        例：
          相容 block：leftCats=['rest','threat'], rightCats=['virtue']
            → 配对属性 = ['threat']，非配对属性 = ['virtue']
          不相容 block：leftCats=['threat'], rightCats=['virtue','rest']
            → 配对属性 = ['virtue']，非配对属性 = ['threat']
      */
      const restSide   = blk.leftCats.includes('rest') ? blk.leftCats : blk.rightCats;
      const otherSide  = blk.leftCats.includes('rest') ? blk.rightCats : blk.leftCats;
      const pairedCats = restSide.filter(c => c !== 'rest');  /* 配对属性 */
      const unpairCats = otherSide;                           /* 非配对属性 */

      /* 基准比例：7:7:10（对应 24 次），按 blk.n 等比缩放 */
      const base    = blk.n / 24;          /* 24->1, 72->3 */
      const nRest   = Math.round(7  * base); /* 7  or 21 */
      const nPaired = Math.round(7  * base); /* 7  or 21 */
      const nUnpair = blk.n - nRest - nPaired; /* 10 or 30，残差防止取整误差 */

      /* rest */
      fillQueue(getWords('rest', blk.prac), nRest)
        .forEach(w => rawTrials.push({ word: w, cat: 'rest', correct: correctKey(blk, 'rest') }));

      /* 配对属性词（各类均分，通常只有一类） */
      const nPerPaired = Math.floor(nPaired / pairedCats.length);
      let remP = nPaired - nPerPaired * pairedCats.length;
      pairedCats.forEach(cat => {
        const cnt = nPerPaired + (remP-- > 0 ? 1 : 0);
        fillQueue(getWords(cat, blk.prac), cnt)
          .forEach(w => rawTrials.push({ word: w, cat, correct: correctKey(blk, cat) }));
      });

      /* 非配对属性词（各类均分，通常只有一类） */
      const nPerUnpair = Math.floor(nUnpair / unpairCats.length);
      let remU = nUnpair - nPerUnpair * unpairCats.length;
      unpairCats.forEach(cat => {
        const cnt = nPerUnpair + (remU-- > 0 ? 1 : 0);
        fillQueue(getWords(cat, blk.prac), cnt)
          .forEach(w => rawTrials.push({ word: w, cat, correct: correctKey(blk, cat) }));
      });
    } else {
      /* 属性辨别 block：threat / virtue 各 50% */
      const cats = [...new Set([...blk.leftCats, ...blk.rightCats])];
      const nPer = Math.floor(blk.n / cats.length);
      let rem    = blk.n - nPer * cats.length;
      cats.forEach(cat => {
        const cnt = nPer + (rem-- > 0 ? 1 : 0);
        fillQueue(getWords(cat, blk.prac), cnt)
          .forEach(w => rawTrials.push({ word: w, cat, correct: correctKey(blk, cat) }));
      });
    }

    return maxRepeatShuffle(rawTrials);
  }

  /* ══ 状态 ═══════════════════════════════════════════ */
  let blkIdx = 0, trialIdx = 0, curTrials = [];
  let needCorrect = false, wordShown = false;
  let t0 = 0;
  const DATA = { compat: [], incompat: [] };
  let fastCount = 0, slowCount = 0, totalFormal = 0;
  let phase = 'consent';
  let pracErrCount = 0, pracTrialCount = 0;

  const C      = () => document.getElementById(`expContent_${IID}`);
  const ACCENT = '#a78bfa';
  const COL_L  = '#60a5fa';
  const COL_R  = '#f87171';

  function reg(name, fn) { window[`__${IID}_${name}`] = fn; }
  function call(name)    { return `window.__${IID}_${name}()`; }

  /* ══ 渲染入口 ══════════════════════════════════════ */
  function render() {
    if      (phase === 'consent')    showConsent();
    else if (phase === 'welcome')    showWelcome();
    else if (phase === 'blockIntro') showBlockIntro();
    else if (phase === 'trial')      showTrial();
    else if (phase === 'blockDone')  showBlockDone();
    else if (phase === 'errAbort')   showErrAbort();
    else if (phase === 'pracWarn')   showPracWarn();
    else if (phase === 'result')     showResult();
  }

  /* ══ 知情同意页 ══════════════════════════════════════ */
  function showConsent() {
    setPBar(0, 1);
    C().innerHTML = wrap(`
      <div style="font-size:11px;color:rgba(255,255,255,.35);
        letter-spacing:1.5px;margin-bottom:10px">参与须知</div>
      <div style="font-size:18px;font-weight:700;margin-bottom:16px">
        知情同意书
      </div>
      ${cardBox(`
        <div style="font-size:13px;line-height:1.95;color:rgba(255,255,255,.75)">
          本测验用于学术研究，测量您对「休息」的内隐道德情绪联结。<br>
          参与前请阅读以下说明：
          <br><br>
          · 全程约 <strong>10–12 分钟</strong>，共 5 个阶段。<br>
          · 仅记录<strong>按键反应时</strong>和错误率，不收集任何个人信息。<br>
          · 数据仅以匿名形式用于学术研究，不用于商业目的。<br>
          · 您可在<strong>任何时候关闭页面退出</strong>，无需说明理由。<br>
          · 结果仅供参考，<strong>不构成任何心理学或医学诊断</strong>。<br>
          · 建议在<strong>安静环境使用键盘</strong>完成，保证测量精度。
        </div>
      `)}
      <div style="font-size:12px;color:rgba(255,255,255,.35);margin-bottom:16px">
        点击「同意并继续」即表示您已阅读上述内容并自愿参与。
      </div>
      ${bigBtn('同意并继续 →', call('go'), ACCENT)}
      <div style="height:10px"></div>
      ${bigBtn('不同意，退出', "alert('您可以关闭此页面退出测验。')", '#4b5563')}
    `);
    reg('go', () => { phase = 'welcome'; render(); });
  }

  /* ══ 欢迎页 ══════════════════════════════════════════ */
  function showWelcome() {
    setPBar(0, 1);
    C().innerHTML = wrap(`
      <div style="font-size:26px;font-weight:900;margin-bottom:4px;
        background:linear-gradient(135deg,#a78bfa,#818cf8);
        -webkit-background-clip:text;-webkit-text-fill-color:transparent">
        SC-IAT
      </div>
      <div style="font-size:15px;font-weight:700;
        color:rgba(255,255,255,.88);margin-bottom:4px">
        休息—道德联结内隐测验
      </div>
      <div style="color:rgba(255,255,255,.4);font-size:12px;margin-bottom:24px">
        单类内隐联结 · 道德情绪自动激活
      </div>
      ${cardBox(`
        <div style="font-size:13px;line-height:2;color:rgba(255,255,255,.78)">
          本测验通过<strong style="color:${ACCENT}">按键速度</strong>，
          测量你在潜意识层面对「休息」所触发的道德情绪倾向。<br><br>
          屏幕中央出现一个词，根据顶部标签<br>
          按 <strong style="color:${COL_L}">E 键（左）</strong> 或
          <strong style="color:${COL_R}">I 键（右）</strong>。<br><br>
          答错会显示红色 ✗，<strong style="color:#fbbf24">须按正确键纠正</strong>后才能继续。<br>
          <span style="color:rgba(255,255,255,.4);font-size:12px">
            共 5 个阶段 · 约 10–12 分钟 · 请在安静、不受打扰的环境完成
          </span>
        </div>
      `)}
      <div style="display:grid;grid-template-columns:1fr 1fr;
        gap:10px;max-width:320px;width:100%;margin-bottom:22px">
        <div style="height:52px;border-radius:12px;
          border:1.5px solid ${COL_L}66;color:${COL_L};
          background:rgba(96,165,250,.06);
          display:flex;align-items:center;justify-content:center;
          font-weight:800;font-size:16px">E &nbsp;←&nbsp; 左</div>
        <div style="height:52px;border-radius:12px;
          border:1.5px solid ${COL_R}66;color:${COL_R};
          background:rgba(248,113,113,.06);
          display:flex;align-items:center;justify-content:center;
          font-weight:800;font-size:16px">右 &nbsp;→&nbsp; I</div>
      </div>
      ${bigBtn('开始测验 →', call('go'), ACCENT)}
    `);
    reg('go', () => { phase = 'blockIntro'; render(); });
  }

  /* ══ Block 说明页 ══════════════════════════════════ */
  function showBlockIntro() {
    const blk      = BLOCKS[blkIdx];
    const isSwitch = blkIdx === 3;
    setPBar(blkIdx, BLOCKS.length);

    pracErrCount   = 0;
    pracTrialCount = 0;

    /* 按键频率提示（仅联合 block） */
    let freqHint = '';
    if (blk.type !== 'attr') {
      const leftPct  = blk.leftCats.includes('rest')
        ? '58%' : '42%';
      const rightPct = blk.leftCats.includes('rest')
        ? '42%' : '58%';
      freqHint = `
        <div style="font-size:11px;color:rgba(255,255,255,.28);
          text-align:center;margin-bottom:14px;line-height:1.7">
          本阶段 E 键约 ${leftPct} · I 键约 ${rightPct}（正常现象）
        </div>`;
    }

    C().innerHTML = wrap(`
      <div style="font-size:11px;color:rgba(255,255,255,.3);
        letter-spacing:2px;margin-bottom:8px">
        阶段 ${blkIdx + 1} / ${BLOCKS.length}
      </div>
      <div style="font-size:18px;font-weight:800;
        margin-bottom:20px;color:${ACCENT}">${blk.label}</div>

      ${isSwitch ? `
        <div style="background:rgba(251,191,36,.1);
          border:1px solid rgba(251,191,36,.35);border-radius:10px;
          padding:12px 16px;max-width:320px;width:100%;
          font-size:13px;color:#fbbf24;margin-bottom:14px;
          text-align:center;line-height:1.7">
          ⚠️ 注意：按键规则已改变<br>
          <span style="color:rgba(255,255,255,.6);font-size:12px">
            请认真阅读下方新规则再开始
          </span>
        </div>` : ''}

      <div style="display:grid;grid-template-columns:1fr 1fr;
        gap:10px;max-width:340px;width:100%;margin-bottom:20px">
        <div style="background:rgba(96,165,250,.1);
          border:1.5px solid rgba(96,165,250,.4);
          border-radius:14px;padding:16px 10px;text-align:center">
          <div style="font-size:22px;font-weight:900;
            color:${COL_L};margin-bottom:8px">E</div>
          ${blk.leftLbl.split(' / ').map(s =>
            `<div style="font-size:13px;font-weight:700;
              color:${COL_L};line-height:1.6">${s}</div>`
          ).join('')}
        </div>
        <div style="background:rgba(248,113,113,.1);
          border:1.5px solid rgba(248,113,113,.4);
          border-radius:14px;padding:16px 10px;text-align:center">
          <div style="font-size:22px;font-weight:900;
            color:${COL_R};margin-bottom:8px">I</div>
          ${blk.rightLbl.split(' / ').map(s =>
            `<div style="font-size:13px;font-weight:700;
              color:${COL_R};line-height:1.6">${s}</div>`
          ).join('')}
        </div>
      </div>

      ${blk.type !== 'attr' ? `
        <div style="background:rgba(255,255,255,.04);
          border:1px solid rgba(255,255,255,.1);border-radius:10px;
          padding:13px 15px;max-width:340px;width:100%;
          margin-bottom:16px;font-size:13px;
          color:rgba(255,255,255,.72);line-height:1.85">
          <div style="font-weight:700;color:rgba(255,255,255,.9);
            margin-bottom:7px;font-size:13px">📋 操作说明</div>
          屏幕中央每次出现<strong style="color:#fff">一个词</strong>，
          根据它所属的类别，按下对应的键：<br><br>
          · 若该词属于<strong style="color:${COL_L}">左侧</strong>任意一个类别
          → 按 <strong style="color:${COL_L}">E 键</strong><br>
          · 若该词属于<strong style="color:${COL_R}">右侧</strong>任意一个类别
          → 按 <strong style="color:${COL_R}">I 键</strong><br><br>
          <span style="color:rgba(255,255,255,.45);font-size:12px">
            每个词只属于一个类别，请<strong style="color:#fbbf24">尽可能又快又准</strong>地作答。
            答错后会出现提示，按正确键后方可继续。
          </span>
        </div>` : ''}

      ${freqHint}

      <div style="font-size:12px;color:rgba(255,255,255,.38);
        text-align:center;margin-bottom:20px">
        ${blk.prac
          ? '练习阶段，数据不计入分析'
          : '<strong style="color:#fbbf24">正式阶段，数据将被记录分析</strong>'}
        &nbsp;·&nbsp; 共 ${blk.n} 题
      </div>
      ${bigBtn(
        blk.prac ? '开始练习 →' : '开始正式任务 →',
        call('begin'),
        blk.prac ? '#94a3b8' : ACCENT
      )}
    `);

    reg('begin', () => {
      curTrials = makeTrials(blk);
      trialIdx  = 0;
      phase     = 'trial';
      render();
    });
  }

  /* ══ 试次画面 ════════════════════════════════════════ */
  function showTrial() {
    const blk      = BLOCKS[blkIdx];
    const tr       = curTrials[trialIdx];
    const isFormel = !blk.prac;
    setPBar(blkIdx * 100 + trialIdx, BLOCKS.length * 100);

    document.removeEventListener('keydown', window[`__${IID}_keyHandler`]);

    needCorrect = false;
    wordShown   = false;
    window[`__${IID}_firstRT`] = 0;

    C().innerHTML = `
      <div style="position:fixed;inset:44px 0 0 0;display:flex;
        flex-direction:column;user-select:none;
        -webkit-user-select:none;touch-action:manipulation">

        <div style="display:flex;height:60px;flex-shrink:0">
          <div id="sc_left_${IID}" onclick="${call('tap_left')}"
            style="flex:1;background:rgba(96,165,250,.07);
            border-right:0.5px solid rgba(255,255,255,.06);
            display:flex;align-items:center;justify-content:center;
            cursor:pointer;transition:background .1s;padding:0 10px">
            <div style="text-align:center">
              <div style="font-size:10px;color:rgba(96,165,250,.55);
                letter-spacing:1px;margin-bottom:3px">E 键</div>
              ${blk.leftLbl.split(' / ').map(s =>
                `<div style="font-size:13px;font-weight:700;
                  color:${COL_L};line-height:1.4">${s}</div>`
              ).join('')}
            </div>
          </div>
          <div id="sc_right_${IID}" onclick="${call('tap_right')}"
            style="flex:1;background:rgba(248,113,113,.07);
            border-left:0.5px solid rgba(255,255,255,.06);
            display:flex;align-items:center;justify-content:center;
            cursor:pointer;transition:background .1s;padding:0 10px">
            <div style="text-align:center">
              <div style="font-size:10px;color:rgba(248,113,113,.55);
                letter-spacing:1px;margin-bottom:3px">I 键</div>
              ${blk.rightLbl.split(' / ').map(s =>
                `<div style="font-size:13px;font-weight:700;
                  color:${COL_R};line-height:1.4">${s}</div>`
              ).join('')}
            </div>
          </div>
        </div>

        <div style="flex:1;display:flex;flex-direction:column;
          align-items:center;justify-content:center">

          ${isFormel ? '' : `
            <div style="font-size:10px;color:rgba(255,255,255,.22);
              margin-bottom:14px;letter-spacing:1.5px">
              练习 ${trialIdx + 1} / ${blk.n}
            </div>`}

          <div style="position:relative;width:320px;height:80px;
            display:flex;align-items:center;justify-content:center">
            <div id="scFix_${IID}"
              style="position:absolute;inset:0;
              display:flex;align-items:center;justify-content:center;
              font-size:32px;color:rgba(255,255,255,.3);
              transition:opacity .05s;opacity:1">＋</div>
            <div id="scWord_${IID}"
              style="position:absolute;inset:0;
              display:flex;align-items:center;justify-content:center;
              font-size:clamp(36px,10vw,52px);font-weight:900;
              letter-spacing:3px;color:#ffffff;
              transition:opacity .05s;opacity:0">${tr.word}</div>
          </div>

          <div id="scFb_${IID}"
            style="margin-top:24px;font-size:28px;min-height:36px;
            color:#ef4444;opacity:0;transition:opacity .08s;
            display:flex;align-items:center;justify-content:center">✗</div>

          ${isFormel ? '' : `
            <div style="font-size:10px;color:rgba(255,255,255,.15);
              margin-top:12px">按 E 或 I 作答</div>`}
        </div>

        <div style="display:flex;height:68px;flex-shrink:0;
          border-top:0.5px solid rgba(255,255,255,.05)">
          <div onclick="${call('tap_left')}"
            style="flex:1;display:flex;align-items:center;
            justify-content:center;cursor:pointer;
            color:${COL_L};font-size:24px;font-weight:900;
            background:rgba(96,165,250,.04)">E</div>
          <div onclick="${call('tap_right')}"
            style="flex:1;display:flex;align-items:center;
            justify-content:center;cursor:pointer;
            color:${COL_R};font-size:24px;font-weight:900;
            background:rgba(248,113,113,.04)">I</div>
        </div>
      </div>`;

    /* [v3-1] 注视点 jitter 300–600ms，[v3-3] t0 = performance.now() */
    const fixDur = randInt(300, 600);
    setTimeout(() => {
      const fixEl  = document.getElementById(`scFix_${IID}`);
      const wordEl = document.getElementById(`scWord_${IID}`);
      if (fixEl)  fixEl.style.opacity  = '0';
      if (wordEl) wordEl.style.opacity = '1';
      t0        = performance.now();
      wordShown = true;
    }, fixDur);

    window[`__${IID}_keyHandler`] = function(e) {
      if (e.key === 'e' || e.key === 'E') window[`__${IID}_tap`]('left');
      if (e.key === 'i' || e.key === 'I') window[`__${IID}_tap`]('right');
    };
    document.addEventListener('keydown', window[`__${IID}_keyHandler`]);

    reg('tap_left',  () => window[`__${IID}_tap`]('left'));
    reg('tap_right', () => window[`__${IID}_tap`]('right'));

    window[`__${IID}_tap`] = (side) => {
      if (!wordShown) return;

      if (side !== tr.correct) {
        if (!needCorrect) {
          window[`__${IID}_firstRT`] = Math.round(performance.now() - t0);
          needCorrect = true;
        }
        if (blk.prac) pracErrCount++;
        const fb  = document.getElementById(`scFb_${IID}`);
        if (fb) fb.style.opacity = '1';
        const cel = document.getElementById(`sc_${tr.correct}_${IID}`);
        if (cel) cel.style.background = tr.correct === 'left'
          ? 'rgba(96,165,250,.28)' : 'rgba(248,113,113,.28)';
        return;
      }

      document.removeEventListener('keydown', window[`__${IID}_keyHandler`]);
      const rt       = needCorrect
        ? window[`__${IID}_firstRT`]
        : Math.round(performance.now() - t0);
      const hadError = needCorrect;

      const sel = document.getElementById(`sc_${side}_${IID}`);
      if (sel) sel.style.background = side === 'left'
        ? 'rgba(96,165,250,.28)' : 'rgba(248,113,113,.28)';
      const fb = document.getElementById(`scFb_${IID}`);
      if (fb) fb.style.opacity = '0';

      if (blk.prac) pracTrialCount++;

      if (!blk.prac) {
        DATA[blk.type].push({
          trial_n:  DATA[blk.type].length + 1,
          block_id: blk.id,
          word:     tr.word,
          cat:      tr.cat,
          correct:  tr.correct,
          rt,
          err:      hadError ? 1 : 0,
        });
        totalFormal++;
        if (rt < 200)  fastCount++;
        if (rt > 2000) slowCount++;
      }

      /* [v3-2] ISI jitter 400–700ms */
      setTimeout(() => {
        trialIdx++;
        if (trialIdx >= curTrials.length) {
          if (!blk.prac) {
            const blkData = DATA[blk.type].filter(d => d.block_id === blk.id);
            const errRate = blkData.filter(d => d.err).length / blkData.length;
            if (errRate > 0.30) { phase = 'errAbort'; render(); return; }
          }
          if (blk.prac && pracTrialCount > 0) {
            if (pracErrCount / pracTrialCount > 0.40) {
              phase = 'pracWarn'; render(); return;
            }
          }
          phase = blkIdx < BLOCKS.length - 1 ? 'blockDone' : 'result';
        } else {
          phase = 'trial';
        }
        render();
      }, randInt(400, 700));
    };
  }

  /* ══ 练习高错误率警告页 ══════════════════════════════ */
  function showPracWarn() {
    setPBar(blkIdx, BLOCKS.length);
    C().innerHTML = wrap(`
      <div style="text-align:center;padding:28px 0">
        <div style="font-size:52px;margin-bottom:14px">⚠️</div>
        <div style="font-size:19px;font-weight:800;
          margin-bottom:12px;color:#fbbf24">练习错误率偏高</div>
        ${cardBox(`
          <div style="font-size:13px;line-height:1.9;color:rgba(255,255,255,.75)">
            本练习阶段错误率超过 <strong style="color:#fbbf24">40%</strong>，
            建议在继续正式任务前重新熟悉规则。<br><br>
            · 请重新阅读按键规则后再开始<br>
            · 每次只需判断词语属于左侧还是右侧类别<br>
            · 不确定时先猜，答错会有提示，按正确键后继续<br><br>
            <span style="color:rgba(255,255,255,.4);font-size:12px">
              如选择继续，正式阶段数据仍会被记录分析。
            </span>
          </div>
        `)}
        <div style="display:flex;gap:10px;max-width:320px;width:100%">
          ${bigBtn('重新练习 →', call('reprac'), '#fbbf24')}
          ${bigBtn('继续正式任务', call('skipcont'), '#4b5563')}
        </div>
      </div>
    `);
    reg('reprac',   () => { phase = 'blockIntro'; render(); });
    reg('skipcont', () => {
      blkIdx++;
      if (blkIdx >= BLOCKS.length) { phase = 'result'; render(); return; }
      phase = 'blockIntro'; render();
    });
  }

  /* ══ Block 完成过渡 ══════════════════════════════════ */
  function showBlockDone() {
    blkIdx++;
    if (blkIdx >= BLOCKS.length) { phase = 'result'; render(); return; }
    const isSwitch = blkIdx === 3;
    setPBar(blkIdx, BLOCKS.length);

    C().innerHTML = wrap(`
      <div style="text-align:center;padding:28px 0">
        <div style="font-size:52px;margin-bottom:14px">
          ${isSwitch ? '🔄' : '✓'}</div>
        <div style="font-size:19px;font-weight:800;margin-bottom:10px;
          color:${isSwitch ? '#fbbf24' : '#4ade80'}">
          阶段 ${blkIdx} 完成</div>
        ${isSwitch
          ? `<p style="color:rgba(255,255,255,.65);font-size:13px;
              line-height:1.7;max-width:280px;margin:0 auto 16px">
              ⚠️ 注意：接下来按键规则改变，<br>请认真阅读新规则。</p>`
          : `<p style="color:rgba(255,255,255,.45);font-size:13px;
              margin-bottom:16px">继续下一阶段</p>`}
        <div style="font-size:11px;color:rgba(255,255,255,.28);
          margin-bottom:28px;letter-spacing:1px">
          已完成 ${blkIdx} / ${BLOCKS.length} 阶段</div>
        ${bigBtn('继续 →', call('cont'), isSwitch ? '#fbbf24' : ACCENT)}
      </div>
    `);
    reg('cont', () => { phase = 'blockIntro'; render(); });
  }

  /* ══ 高错误率中断（正式 block）══════════════════════ */
  function showErrAbort() {
    setPBar(0, 1);
    C().innerHTML = wrap(`
      <div style="text-align:center;padding:28px 0">
        <div style="font-size:52px;margin-bottom:14px">⚠️</div>
        <div style="font-size:19px;font-weight:800;
          margin-bottom:12px;color:#f87171">错误率过高，数据无效</div>
        ${cardBox(`
          <div style="font-size:13px;line-height:1.9;color:rgba(255,255,255,.75)">
            本阶段错误率超过 <strong style="color:#fbbf24">30%</strong>，
            不符合 SC-IAT 数据质量要求。<br><br>
            常见原因：<br>
            · 按键规则尚不熟悉，请重新阅读说明<br>
            · 操作节奏过快，请适当放慢<br>
            · 环境干扰，请在安静处重新完成<br><br>
            <span style="color:rgba(255,255,255,.4);font-size:12px">
              重新开始后之前的数据将被清除。
            </span>
          </div>
        `)}
        ${bigBtn('重新开始测验 →', call('restart'), '#f87171')}
      </div>
    `);
    reg('restart', () => {
      DATA.compat = []; DATA.incompat = [];
      fastCount = 0; slowCount = 0; totalFormal = 0;
      blkIdx = 0; trialIdx = 0; phase = 'welcome';
      render();
    });
  }

  /* ══ 结果页 ════════════════════════════════════════════ */
  function showResult() {
    setPBar(1, 1);

    function calcD(compat, incompat) {
      if (!compat.length || !incompat.length)
        return { d: null, flag: 'no_data' };
      const valid = arr =>
        arr.filter(d => d.err === 0 && d.rt >= 200 && d.rt <= 2000);
      const cV = valid(compat);
      const iV = valid(incompat);
      if (!cV.length || !iV.length)
        return { d: null, flag: 'insufficient_correct' };
      const mean = arr => arr.reduce((s, d) => s + d.rt, 0) / arr.length;
      const cM   = mean(cV);
      const iM   = mean(iV);
      const all  = [...cV, ...iV].map(d => d.rt);
      const mu   = all.reduce((a, b) => a + b, 0) / all.length;
      const sd   = Math.sqrt(
        all.reduce((s, x) => s + (x - mu) ** 2, 0) / (all.length - 1)
      );
      if (!sd) return { d: null, flag: 'zero_sd' };
      return { d: (iM - cM) / sd, flag: null,
               cN: cV.length, iN: iV.length };
    }

    const { d: D, flag: calcFlag,
            cN: nValidC, iN: nValidI } = calcD(DATA.compat, DATA.incompat);
    const Dnum = D !== null ? parseFloat(D.toFixed(3)) : null;
    const Dstr = Dnum !== null ? Dnum.toFixed(3) : '--';

    const validArr = arr =>
      arr.filter(d => d.err === 0 && d.rt >= 200 && d.rt <= 2000);

    const avRT  = arr => {
      const v = validArr(arr);
      return v.length ? Math.round(v.reduce((s, d) => s + d.rt, 0) / v.length) : '--';
    };
    const errPct = arr =>
      arr.length
        ? (arr.filter(d => d.err).length / arr.length * 100).toFixed(1) : '--';
    const nExcl = arr =>
      arr.filter(d => d.err === 0 && (d.rt < 200 || d.rt > 2000)).length;

    const cRT   = avRT(DATA.compat);
    const iRT   = avRT(DATA.incompat);
    const errC  = errPct(DATA.compat);
    const errI  = errPct(DATA.incompat);
    const dRT   = (cRT !== '--' && iRT !== '--') ? iRT - cRT : '--';
    const exclC = nExcl(DATA.compat);
    const exclI = nExcl(DATA.incompat);

    const fastPct = totalFormal > 0
      ? (fastCount / totalFormal * 100).toFixed(1) : '--';
    const slowPct = totalFormal > 0
      ? (slowCount / totalFormal * 100).toFixed(1) : '--';
    const speedFlag = totalFormal > 0 && (fastCount / totalFormal) > 0.10;
    const slowFlag  = totalFormal > 0 && (slowCount / totalFormal) > 0.10;

    /* [v3-8] 动态读取 block 标签 */
    const compatBlk   = BLOCKS.find(b => b.type === 'compat'   && !b.prac);
    const incompatBlk = BLOCKS.find(b => b.type === 'incompat' && !b.prac);
    const compatBlkLabel   = compatBlk
      ? `Block${compatBlk.id}（E:${compatBlk.leftLbl} / I:${compatBlk.rightLbl}）` : '未知';
    const incompatBlkLabel = incompatBlk
      ? `Block${incompatBlk.id}（E:${incompatBlk.leftLbl} / I:${incompatBlk.rightLbl}）` : '未知';

    let interp = '', ic = '#94a3b8';
    if (Dnum !== null) {
      if      (Dnum >=  0.65) { interp = '强烈「休息—道德威胁」内隐联结';      ic = '#f87171'; }
      else if (Dnum >=  0.35) { interp = '中等联结，休息易自动触发道德威胁感'; ic = '#fbbf24'; }
      else if (Dnum >=  0.15) { interp = '轻微联结，接近一般人群基线';         ic = '#a3e635'; }
      else if (Dnum >= -0.15) { interp = '无明显方向性联结';                   ic = '#4ade80'; }
      else                    { interp = '休息偏向自动激活道德正向情绪';       ic = '#60a5fa'; }
    }
    const barPct = Dnum !== null
      ? Math.min(100, Math.max(0, (Dnum + 1) / 2 * 100)) : 50;

    let warns = '';
    if (Dnum === null) {
      warns += `<div style="background:rgba(251,191,36,.1);
        border:1px solid rgba(251,191,36,.35);border-radius:10px;
        padding:10px 14px;max-width:340px;width:100%;
        font-size:12px;color:#fbbf24;margin-bottom:12px;line-height:1.7">
        有效正确试次不足，D 值无法计算（原因：${calcFlag}）。</div>`;
    }
    if (speedFlag) {
      warns += `<div style="background:rgba(251,191,36,.1);
        border:1px solid rgba(251,191,36,.35);border-radius:10px;
        padding:10px 14px;max-width:340px;width:100%;
        font-size:12px;color:#fbbf24;margin-bottom:12px;line-height:1.7">
        ⚠️ 极快反应（RT &lt; 200ms）占比 ${fastPct}%，超过 10%，请核查数据有效性。</div>`;
    }
    if (slowFlag) {
      warns += `<div style="background:rgba(251,191,36,.1);
        border:1px solid rgba(251,191,36,.35);border-radius:10px;
        padding:10px 14px;max-width:340px;width:100%;
        font-size:12px;color:#fbbf24;margin-bottom:12px;line-height:1.7">
        ⚠️ 慢速反应（RT &gt; 2000ms）占比 ${slowPct}%，超过 10%，可能存在走神。</div>`;
    }

    C().innerHTML = wrap(`
      <div style="font-size:22px;font-weight:800;margin-bottom:4px">
        测验完成 🎉</div>
      <div style="color:rgba(255,255,255,.4);font-size:13px;margin-bottom:20px">
        SC-IAT · 休息—道德联结结果</div>

      ${warns}

      <div style="background:rgba(167,139,250,.07);
        border:1.5px solid rgba(167,139,250,.28);
        border-radius:18px;padding:22px 20px;
        max-width:340px;width:100%;margin-bottom:16px">
        <div style="text-align:center;margin-bottom:16px">
          <div style="font-size:10px;color:rgba(255,255,255,.4);
            letter-spacing:2px;margin-bottom:6px">SC-IAT D 值</div>
          <div style="font-size:60px;font-weight:900;line-height:1;
            background:linear-gradient(135deg,${ic},${ACCENT});
            -webkit-background-clip:text;-webkit-text-fill-color:transparent">
            ${Dstr}</div>
          <div style="font-size:12px;color:${ic};margin-top:8px;
            line-height:1.55;max-width:250px;
            margin-left:auto;margin-right:auto">${interp}</div>
        </div>

        <div style="margin:14px 0 4px">
          <div style="display:flex;justify-content:space-between;
            font-size:9px;color:rgba(255,255,255,.28);margin-bottom:5px">
            <span>−1.0<br>道德正向</span>
            <span style="text-align:center">0<br>中性</span>
            <span style="text-align:right">+1.0<br>道德威胁</span>
          </div>
          <div style="height:8px;border-radius:4px;
            background:rgba(255,255,255,.08);position:relative">
            <div style="position:absolute;inset:0;border-radius:4px;
              background:linear-gradient(90deg,
                #60a5fa 0%,rgba(255,255,255,.08) 50%,#f87171 100%)"></div>
            <div style="position:absolute;top:50%;left:${barPct}%;
              transform:translate(-50%,-50%);width:14px;height:14px;
              border-radius:50%;background:${ic};border:2.5px solid #0a0a12;
              box-shadow:0 0 10px ${ic}99;z-index:2"></div>
          </div>
        </div>
        <div style="font-size:9px;color:rgba(255,255,255,.22);
          text-align:center;margin-top:8px">
          D = (M_不相容 − M_相容) / SD_合并；仅正确试次；RT 200–2000ms；样本SD(N-1)<br>
          效应量：|D| ≥ 0.15 小 · ≥ 0.35 中 · ≥ 0.65 大
          （Karpinski &amp; Steinman, 2006）<br>
          Counterbalancing：${ORDER === 'A' ? '相容先（顺序 A）' : '不相容先（顺序 B）'}
        </div>
      </div>

      ${cardBox(`
        ${resultRow('相容块 均RT（有效正确）',  cRT !== '--' ? cRT + ' ms' : '--', COL_L)}
        ${resultRow('不相容块 均RT（有效正确）', iRT !== '--' ? iRT + ' ms' : '--', COL_R)}
        ${resultRow('ΔRT（不相容 − 相容）',
          dRT !== '--' ? (dRT >= 0 ? '+' : '') + dRT + ' ms' : '--', '#fbbf24')}
        ${resultRow('相容块 错误率',   errC + ' %', COL_L)}
        ${resultRow('不相容块 错误率', errI + ' %', COL_R)}
        ${resultRow('相容块 RT窗外排除',   exclC + ' / ' + DATA.compat.length,   '#94a3b8')}
        ${resultRow('不相容块 RT窗外排除', exclI + ' / ' + DATA.incompat.length, '#94a3b8')}
        ${resultRow('极快反应占比（< 200ms）',  fastPct + ' %', '#94a3b8')}
        ${resultRow('慢速反应占比（> 2000ms）', slowPct + ' %', '#94a3b8')}
        ${resultRow('被试编号', SUBJECT_ID, '#94a3b8')}
      `)}

      <div style="font-size:12px;color:rgba(255,255,255,.38);
        line-height:1.95;max-width:340px;text-align:center;margin-bottom:22px">
        D &gt; 0：休息更自动激活道德威胁情绪（leisure guilt 倾向高）。<br>
        <span style="color:rgba(255,255,255,.22)">
          本结果仅供学术参考，不构成临床诊断依据。
        </span>
      </div>
      ${bigBtn('保存并返回 →', call('save'), ACCENT)}
    `);

    reg('save', async () => {
      const payload = {
        subject_id:             SUBJECT_ID,
        start_time:             new Date(START_TIME).toISOString(),
        end_time:               new Date().toISOString(),
        version:                'SC-IAT-v4',
        counterbalancing_order: ORDER,
        scoring_method:  '仅正确试次均值，RT窗口200–2000ms，样本SD(N-1)',
        d_formula:       'D = (M_不相容 - M_相容) / SD_合并',
        trial_ratio:     '目标(rest):配对属性:非配对属性 = 7:7:10（参考 Karpinski & Steinman, 2006）',
        key_balance:     '相容block E键58.3%，不相容block E键41.7%，被试内均值50.0%',
        compat_block:    compatBlkLabel,
        incompat_block:  incompatBlkLabel,
        D:               Dnum,
        calc_flag:       calcFlag,
        n_valid_compat:  nValidC,
        n_valid_incompat:nValidI,
        compat_rt:       cRT,
        incompat_rt:     iRT,
        delta_rt:        dRT,
        err_compat:      errC,
        err_incompat:    errI,
        speed_flag:      speedFlag,
        slow_flag:       slowFlag,
        fast_rt_pct:     fastPct + '%',
        slow_rt_pct:     slowPct + '%',
        trials_compat:   DATA.compat,
        trials_incompat: DATA.incompat,
        n_compat:        DATA.compat.length,
        n_incompat:      DATA.incompat.length,
      };
      await saveAndClose('sciat', payload);
    });
  }

  render();
}