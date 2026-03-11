/**
 * experiments.js  v5.0
 * 修复：
 * 1. 滚动 — 不再用 runner.style.cssText 覆盖，改用 runner 内嵌固定结构
 * 2. 音效 — 用真实 Unsplash/Pixabay/公开 CDN 音频，<audio> 标签循环播放
 * 3. 场景 — Unsplash 真实季节图片全屏背景 + CSS 动画粒子叠加
 */

/* ── 注册页面 ───────────────────────────────── */
(function waitForApp() {
  if (typeof pages === 'undefined' || typeof navTitles === 'undefined')
    return setTimeout(waitForApp, 60);
  pages['experiments']     = document.getElementById('experimentsPage');
  navTitles['experiments'] = '实验中心';
})();

/* ── 全局状态 ───────────────────────────────── */
let _auEl   = null;   // <audio> element
let _animId = null;   // rAF

/* ── 音频资源（全部公开可跨域 CDN）──────────── */
const AUDIO_URLS = {
  summer_hot:  'https://cdn.freesound.org/previews/514/514506_11067970-lq.mp3',   // 热带蝉鸣
  summer_zero: 'https://cdn.freesound.org/previews/419/419988_5121236-lq.mp3',    // 夏夜蟋蟀
  summer_cold: 'https://cdn.freesound.org/previews/524/524516_11067970-lq.mp3',   // 青蛙蟋蟀
  winter_hot:  'https://cdn.freesound.org/previews/476/476178_6893798-lq.mp3',    // 室内暖风
  winter_zero: 'https://cdn.freesound.org/previews/346/346642_5121236-lq.mp3',    // 轻风
  winter_cold: 'https://cdn.freesound.org/previews/462/462087_9337855-lq.mp3',    // 暴风雪
};

/* ── 备用音频（若 freesound 不可用）─────────── */
const AUDIO_FALLBACK = {
  summer_hot:  'https://assets.mixkit.co/sfx/preview/mixkit-jungle-ambience-with-birds-and-insects-2357.mp3',
  summer_zero: 'https://assets.mixkit.co/sfx/preview/mixkit-crickets-and-insects-in-the-wild-ambience-39.mp3',
  summer_cold: 'https://assets.mixkit.co/sfx/preview/mixkit-frogs-and-insects-in-the-night-ambience-60.mp3',
  winter_hot:  'https://assets.mixkit.co/sfx/preview/mixkit-light-wind-1166.mp3',
  winter_zero: 'https://assets.mixkit.co/sfx/preview/mixkit-soft-wind-1166.mp3',
  winter_cold: 'https://assets.mixkit.co/sfx/preview/mixkit-blizzard-cold-winds-1153.mp3',
};

/* ── 场景图片（Unsplash 真实季节照片）─────────── */
const SCENE_IMGS = {
  summer_hot:  'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=1200&q=75&auto=format', // 热浪城市夜晚
  summer_zero: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=75&auto=format', // 夏夜星空田野
  summer_cold: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=75&auto=format', // 凉爽夏夜森林
  winter_hot:  'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=1200&q=75&auto=format', // 冬夜温暖室内
  winter_zero: 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=1200&q=75&auto=format', // 冬夜雪景城市
  winter_cold: 'https://images.unsplash.com/photo-1457269449834-928af64c684d?w=1200&q=75&auto=format', // 暴雪严寒
};

/* ── 启动/关闭实验 ─────────────────────────── */
function launchExperiment(type) {
  const runner = document.getElementById('experimentRunner');
  runner.innerHTML = '';
  runner.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if      (type === 'stroop')      initStroop(runner);
  else if (type === 'gonogo')      initGoNoGo(runner);
  else if (type === 'temperature') initTempExp(runner);
}

function closeExperiment() {
  stopAmbient();
  cancelAnimationFrame(_animId); _animId = null;
  const r = document.getElementById('experimentRunner');
  r.classList.add('hidden'); r.innerHTML = '';
  document.body.style.overflow = '';
}

function stopAmbient() {
  if (_auEl) { _auEl.pause(); _auEl.src = ''; _auEl = null; }
}

function playAmbient(condId) {
  stopAmbient();
  _auEl = document.createElement('audio');
  _auEl.loop = true; _auEl.volume = 0.55;
  _auEl.src = AUDIO_URLS[condId] || '';
  _auEl.onerror = () => { if (_auEl) { _auEl.src = AUDIO_FALLBACK[condId] || ''; _auEl.load(); _auEl.play().catch(()=>{}); }};
  _auEl.play().catch(() => {});
}

/* ── 进度条 ────────────────────────────────── */
function setPBar(n, t) { const b=document.getElementById('expPBar'); if(b) b.style.width=(n/t*100)+'%'; }

/* ── 通用按钮样式 ──────────────────────────── */
function btnCss(col, extra='') {
  return `width:100%;padding:14px;border-radius:30px;border:1.5px solid ${col};background:transparent;
    color:${col};font-size:13px;letter-spacing:2px;cursor:pointer;font-family:inherit;
    transition:background .3s,color .3s;${extra}`;
}

/* ── 顶栏 HTML ─────────────────────────────── */
function mkTopbar(title, rightHtml='') {
  return `<div class="exp-topbar">
    <div class="exp-topbar-back" onclick="closeExperiment()"><i class="fas fa-times"></i></div>
    <div class="exp-topbar-title">${title}</div>
    <div style="width:36px;display:flex;justify-content:flex-end">${rightHtml}</div>
    <div class="exp-progress-bar" id="expPBar" style="width:0%"></div>
  </div>`;
}

/* ═══════════════════════════════════════════
   STROOP
═══════════════════════════════════════════ */
const COLS = [
  {name:'红',hex:'#ef4444'},{name:'蓝',hex:'#3b82f6'},
  {name:'绿',hex:'#22c55e'},{name:'黄',hex:'#eab308'}
];
function initStroop(runner) {
  // 使用 #expContent（已在 psy_index.html CSS 里有 flex:1 1 0; min-height:0; overflow-y:auto）
  runner.innerHTML = mkTopbar('Stroop 色词干扰') +
    `<div id="expContent" style="background:#111;color:#fff"></div>`;

  function mkT(type) {
    const w=COLS[~~(Math.random()*4)]; let c=w;
    if(type==='inc'){do{c=COLS[~~(Math.random()*4)];}while(c===w);}
    return {word:w.name,color:c.hex,correct:c.name,type};
  }
  const prac=[...Array(10)].map(()=>mkT('con'));
  const test=[...[...Array(30)].map(()=>mkT('con')),...[...Array(30)].map(()=>mkT('inc'))].sort(()=>Math.random()-.5);
  let phase='intro',idx=0,list=[],res={con:[],inc:[]},t0=0,busy=false;
  const C=()=>document.getElementById('expContent');

  function pg(inner){return`<div style="display:flex;flex-direction:column;align-items:center;padding:28px 20px 64px;min-height:100%;font-size:14px;line-height:1.7">${inner}</div>`;}

  function render(){
    if(phase==='intro') showI();
    else if(phase==='prac'||phase==='test') showT();
    else showR();
  }

  function showI(){
    setPBar(0,1);
    C().innerHTML=pg(`
      <div style="font-size:22px;font-weight:800;margin-bottom:4px">🎨 Stroop 色词干扰</div>
      <div style="color:rgba(255,255,255,.45);font-size:13px;margin-bottom:22px">认知控制能力测量</div>
      <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:20px;max-width:340px;width:100%;font-size:13px;line-height:2;color:rgba(255,255,255,.78);margin-bottom:20px">
        屏幕会出现一个颜色词，请选择该词<strong style="color:#eab308">文字的显示颜色</strong>，而非词义。<br><br>
        例如看到 <span style="color:#3b82f6;font-weight:800">红</span>（蓝色字）→ 按<strong style="color:#3b82f6">蓝色</strong>。<br><br>
        先练习 10 次，再正式测试 60 次。尽量<strong>快而准确</strong>。
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:320px;width:100%;margin-bottom:28px">
        ${COLS.map(c=>`<div style="height:50px;border-radius:12px;border:1.5px solid ${c.hex}55;color:${c.hex};background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center;gap:8px;font-weight:700;font-size:15px"><span style="width:12px;height:12px;border-radius:50%;background:${c.hex}"></span>${c.name}</div>`).join('')}
      </div>
      <button onclick="sP()" style="${btnCss('#22c55e')}">开始练习 →</button>
    `);
    window.sP=()=>{phase='prac';list=prac;idx=0;render();};
  }

  function showT(){
    const isPrac=phase==='prac',total=isPrac?prac.length:test.length;
    setPBar(idx,total); busy=false;
    const tr=list[idx];
    C().innerHTML=pg(`
      <div style="font-size:14px;font-weight:700;margin-bottom:4px">${isPrac?'练习阶段':`第 ${idx+1} / ${total} 题`}</div>
      <div style="font-size:12px;color:rgba(255,255,255,.35);margin-bottom:42px">${isPrac?'熟悉规则 · 不计入结果':'选择文字的显示颜色'}</div>
      <div style="font-size:18px;color:rgba(255,255,255,.28);margin-bottom:14px" id="sFix">+</div>
      <div id="sStim" style="font-size:clamp(44px,12vw,72px);font-weight:900;min-height:88px;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .1s;letter-spacing:2px"></div>
      <p style="font-size:12px;color:rgba(255,255,255,.28);margin:16px 0 22px">选择文字的<span style="color:#eab308">显示颜色</span></p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:320px;width:100%">
        ${COLS.map(c=>`<div id="sb-${c.name}" onclick="sA('${c.name}')" style="height:54px;border-radius:13px;border:1.5px solid ${c.hex}55;color:${c.hex};background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center;gap:8px;font-weight:700;font-size:15px;cursor:pointer;transition:all .15s"><span style="width:12px;height:12px;border-radius:50%;background:${c.hex}"></span>${c.name}</div>`).join('')}
      </div>
    `);
    setTimeout(()=>{
      const fix=document.getElementById('sFix'); if(fix)fix.style.opacity='0';
      const stm=document.getElementById('sStim'); if(stm){stm.textContent=tr.word;stm.style.color=tr.color;stm.style.opacity='1';}
      t0=Date.now(); window._sTO=setTimeout(()=>{if(!busy)sA(null);},2000);
    },550);
    window.sA=chosen=>{
      if(busy)return; busy=true; clearTimeout(window._sTO);
      const rt=Date.now()-t0,ok=chosen===tr.correct;
      const el=document.getElementById('sb-'+chosen); if(el)el.style.background=ok?'rgba(34,197,94,.25)':'rgba(239,68,68,.25)';
      const cel=document.getElementById('sb-'+tr.correct); if(cel&&!ok)cel.style.background='rgba(34,197,94,.2)';
      if(!isPrac)res[tr.type].push({rt,ok});
      setTimeout(()=>{idx++;if(idx>=list.length){if(isPrac){C().innerHTML=pg(`<div style="text-align:center"><div style="font-size:22px;font-weight:800;margin-bottom:16px">✅ 练习完成</div><p style="color:rgba(255,255,255,.55);margin-bottom:28px">准备好正式测试了吗？<br>共 60 题。</p><button onclick="sT()" style="${btnCss('#22c55e')}">开始正式测试 →</button></div>`);window.sT=()=>{phase='test';list=test;idx=0;render();};}else{phase='result';render();}}else render();},380);
    };
  }

  function showR(){
    setPBar(1,1);
    const avg=a=>a.length?Math.round(a.reduce((s,x)=>s+x.rt,0)/a.length):'--';
    const acc=a=>a.length?Math.round(a.filter(x=>x.ok).length/a.length*100)+'%':'--';
    const eff=(avg(res.con)!=='--'&&avg(res.inc)!=='--')?avg(res.inc)-avg(res.con):'--';
    C().innerHTML=pg(`
      <div style="font-size:22px;font-weight:800;margin-bottom:4px">🎉 测试完成</div>
      <p style="color:rgba(255,255,255,.4);font-size:13px;margin-bottom:24px">你的 Stroop 结果</p>
      <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:20px;max-width:340px;width:100%;margin-bottom:16px">
        ${[['一致条件均RT',avg(res.con)+' ms','#22c55e'],['不一致条件均RT',avg(res.inc)+' ms','#f59e0b'],['Stroop效应量','+'+eff+' ms','#eab308'],['一致正确率',acc(res.con),'#22c55e'],['不一致正确率',acc(res.inc),'#f59e0b']].map(([l,v,c])=>`<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.07);font-size:14px"><span>${l}</span><span style="font-weight:800;color:${c}">${v}</span></div>`).join('')}
      </div>
      <button onclick="sS()" style="${btnCss('#22c55e')}">保存并返回 →</button>
    `);
    window.sS=()=>{saveExp('stroop',{cong_rt:avg(res.con),incg_rt:avg(res.inc),stroop_effect:eff,cong_acc:acc(res.con),incg_acc:acc(res.inc)});closeExperiment();};
  }
  render();
}

/* ═══════════════════════════════════════════
   GO / NO-GO
═══════════════════════════════════════════ */
function initGoNoGo(runner) {
  runner.innerHTML = mkTopbar('Go / No-Go 抑制控制') +
    `<div id="expContent" style="background:#0a0a0a;color:#fff"></div>`;
  const TOTAL=80,GO_N=64,NOGO_N=16;
  const trials=[...Array(GO_N).fill('go'),...Array(NOGO_N).fill('nogo')].sort(()=>Math.random()-.5);
  const GO_E=['🟢','⭕','🔵'],NG_E=['🔴','⛔','❌'];
  let idx=0,hits=0,misses=0,fas=0,rts=[],busy=false,phase='intro';
  const C=()=>document.getElementById('expContent');
  function pg(inner){return`<div style="display:flex;flex-direction:column;align-items:center;padding:28px 20px 64px;min-height:100%;font-size:14px;line-height:1.7">${inner}</div>`;}
  function render(){if(phase==='intro')showI();else if(phase==='trial')showT();else showR();}

  function showI(){
    C().innerHTML=pg(`
      <div style="font-size:22px;font-weight:800;margin-bottom:6px">🚦 Go / No-Go</div>
      <div style="color:rgba(255,255,255,.45);font-size:13px;margin-bottom:22px">行为抑制控制测量</div>
      <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:20px;max-width:340px;width:100%;font-size:13px;line-height:2;color:rgba(255,255,255,.75);margin-bottom:20px">
        <span style="color:#22c55e;font-weight:800">绿色图形</span> → 尽快<strong>点击</strong>按钮<br>
        <span style="color:#ef4444;font-weight:800">红色图形</span> → <strong>不要点击！</strong><br><br>
        共 ${TOTAL} 题，约 4 分钟。尽量<strong>快而准确</strong>。
      </div>
      <div style="display:flex;gap:40px;margin-bottom:32px">
        <div style="text-align:center"><div style="font-size:52px">🟢</div><div style="font-size:12px;color:rgba(255,255,255,.4);margin-top:6px">点击</div></div>
        <div style="text-align:center"><div style="font-size:52px">🔴</div><div style="font-size:12px;color:rgba(255,255,255,.4);margin-top:6px">不点击</div></div>
      </div>
      <button onclick="gSt()" style="${btnCss('#22c55e')}">开始任务 →</button>
    `);
    window.gSt=()=>{phase='trial';render();};
  }

  function showT(){
    setPBar(idx,TOTAL); busy=false;
    const isGo=trials[idx]==='go';
    const emoji=(isGo?GO_E:NG_E)[~~(Math.random()*3)];
    const avgRt=rts.length?Math.round(rts.reduce((a,b)=>a+b,0)/rts.length):'--';
    C().innerHTML=pg(`
      <div style="font-size:12px;color:rgba(255,255,255,.3);margin-bottom:4px">${idx+1} / ${TOTAL}</div>
      <div style="width:180px;height:180px;margin:18px auto;position:relative;display:flex;align-items:center;justify-content:center">
        <div style="position:absolute;inset:0;border-radius:50%;border:2px solid rgba(255,255,255,.06)"></div>
        <div style="width:140px;height:140px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:58px;background:radial-gradient(circle,${isGo?'rgba(34,197,94,.22),rgba(34,197,94,.04)':'rgba(239,68,68,.22),rgba(239,68,68,.04)'});box-shadow:0 0 40px ${isGo?'rgba(34,197,94,.3)':'rgba(239,68,68,.25)'}">
          ${emoji}</div>
      </div>
      <div style="height:30px;font-size:18px;font-weight:800;margin-bottom:10px" id="gFb"></div>
      <div style="display:flex;gap:24px;margin-bottom:28px">
        ${[['命中',hits,'#22c55e'],['漏报',misses,'#f59e0b'],['误报',fas,'#ef4444'],['均RT',avgRt,'#fff']].map(([l,v,c])=>`<div style="text-align:center"><div style="font-size:22px;font-weight:800;color:${c}">${v}</div><div style="font-size:11px;color:rgba(255,255,255,.35);margin-top:2px">${l}</div></div>`).join('')}
      </div>
      <div id="gBtn" onclick="gTp()" style="width:152px;height:152px;border-radius:50%;background:rgba(34,197,94,.1);border:2px solid rgba(34,197,94,.4);color:#22c55e;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;user-select:none;-webkit-user-select:none;transition:all .12s">
        <i class="fas fa-hand-pointer" style="font-size:30px"></i>
        <span style="font-size:14px;font-weight:700">点击</span>
      </div>
    `);
    const t0=Date.now();
    window._gTO=setTimeout(()=>{if(busy)return;busy=true;if(isGo){misses++;gFb('漏报','#f59e0b');}setTimeout(gN,320);},700);
    window.gTp=()=>{if(busy)return;busy=true;clearTimeout(window._gTO);const rt=Date.now()-t0;const btn=document.getElementById('gBtn');if(isGo){hits++;rts.push(rt);if(btn)btn.style.background='rgba(34,197,94,.3)';gFb(`✓ ${rt}ms`,'#22c55e');}else{fas++;if(btn)btn.style.background='rgba(239,68,68,.3)';gFb('误报！','#ef4444');}setTimeout(gN,260);};
  }
  function gFb(t,c){const e=document.getElementById('gFb');if(e){e.textContent=t;e.style.color=c;}}
  function gN(){idx++;if(idx>=TOTAL){phase='result';render();}else setTimeout(render,200+~~(Math.random()*300));}

  function showR(){
    setPBar(TOTAL,TOTAL);
    const avg=rts.length?Math.round(rts.reduce((a,b)=>a+b,0)/rts.length):'--';
    const hr=Math.round(hits/GO_N*100),fr=Math.round(fas/NOGO_N*100);
    const dp=(()=>{const z=p=>{p=Math.max(.01,Math.min(.99,p));const t=Math.sqrt(-2*Math.log(p<=.5?p:1-p));return(p<=.5?-1:1)*(t-(2.515517+.802853*t+.010328*t*t)/(1+1.432788*t+.189269*t*t+.001308*t*t*t));};return(z(hr/100)-z(fr/100)).toFixed(2);})();
    C().innerHTML=pg(`
      <div style="font-size:22px;font-weight:800;margin-bottom:4px">🎉 任务完成</div>
      <p style="color:rgba(255,255,255,.4);font-size:13px;margin-bottom:24px">你的抑制控制结果</p>
      <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:20px;max-width:340px;width:100%;margin-bottom:16px">
        ${[['命中率',hr+'%','#22c55e'],['误报率',fr+'%','#ef4444'],['漏报次数',misses+'次','#f59e0b'],['平均反应时',avg+' ms','#fff'],["辨别力 d'",dp,'#eab308']].map(([l,v,c])=>`<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.07);font-size:14px"><span>${l}</span><span style="font-weight:800;color:${c}">${v}</span></div>`).join('')}
      </div>
      <button onclick="gSv()" style="${btnCss('#22c55e')}">保存并返回 →</button>
    `);
    window.gSv=()=>{saveExp('gonogo',{hit_rate:hr,fa_rate:fr,misses,avg_rt:avg,dprime:dp});closeExperiment();};
  }
  render();
}

/* ═══════════════════════════════════════════
   温度-睡眠实验  ★ 核心
═══════════════════════════════════════════ */
const TS_CONDS = [
  {id:'summer_hot', season:'summer',anomaly:+3,accent:'#ff7a45',label:'盛夏·热浪',badge:'🌡️ 比往年偏热约3°C',badgeC:'rgba(255,100,40,.18)',overlay:'rgba(20,5,0,.52)'},
  {id:'summer_zero',season:'summer',anomaly: 0,accent:'#4ade80',label:'盛夏·寻常',badge:'🌿 与往年同期相近',  badgeC:'rgba(50,160,80,.18)',overlay:'rgba(0,10,5,.48)'},
  {id:'summer_cold',season:'summer',anomaly:-3,accent:'#60a5fa',label:'盛夏·清爽',badge:'🍃 比往年偏凉约3°C',badgeC:'rgba(50,120,220,.18)',overlay:'rgba(0,5,15,.50)'},
  {id:'winter_hot', season:'winter',anomaly:+3,accent:'#f59e0b',label:'隆冬·暖意',badge:'☀️ 比往年偏暖约3°C',badgeC:'rgba(200,130,20,.18)',overlay:'rgba(10,6,0,.50)'},
  {id:'winter_zero',season:'winter',anomaly: 0,accent:'#93c5fd',label:'隆冬·寻常',badge:'❄️ 与往年同期相近',  badgeC:'rgba(60,100,200,.18)',overlay:'rgba(0,4,12,.52)'},
  {id:'winter_cold',season:'winter',anomaly:-3,accent:'#a5b4fc',label:'隆冬·严寒',badge:'🌨️ 比往年偏寒约3°C',badgeC:'rgba(40,60,180,.18)',overlay:'rgba(0,2,8,.58)'},
];
const TS_TEXT={
  summer_hot:`现在是盛夏的一个夜晚。你结束了漫长一天，疲惫地回到家，冲了个澡，躺在床上。今天，你所在的城市气温比这个季节往年高出不少。窗缝里透进来的是依然带着余热的空气——没有想象中的凉爽。空气中弥漫着挥之不去的燥热感，身体感到黏腻不适。你闭上眼睛，试图让自己安静下来，准备入睡……`,
  summer_zero:`现在是盛夏的一个夜晚。你结束了一天的工作，回到家，洗漱完毕，躺在床上。今天的气温与这个季节往年大致相同，窗外传来夏夜熟悉的声音——蟋蟀的鸣叫，远处偶尔的车声。你闭上眼睛，感受着这个寻常的夏夜，让身体慢慢放松，准备入睡……`,
  summer_cold:`现在是盛夏的一个夜晚。你结束了一天的工作，回到家，躺在床上。今天的气温比这个季节往年低了不少，带着意外的清爽。空气清新，夜风中带着难得的凉意，让你感到格外舒适。你闭上眼睛，感受着这个不寻常的清爽夏夜，慢慢沉入睡意……`,
  winter_hot:`现在是隆冬的一个夜晚。你结束了一天的工作，回到家，钻进被窝。今天，你所在的城市气温比冬天往年高出不少——窗外没有预想中的严寒，反而透着一丝暖意。你闭上眼睛，感受着这个比往年暖和的冬夜，让思绪慢慢平息，进入睡眠……`,
  winter_zero:`现在是隆冬的一个夜晚。你结束了一天的工作，回到家，钻进温暖的被窝。今天的气温与冬天往年大致相同，窗外是熟悉的冬夜寂静，偶有风声。你闭上眼睛，蜷缩在被窝里，感受着外面的寒冷和被窝里的温暖，让自己慢慢沉入梦乡……`,
  winter_cold:`现在是隆冬的一个夜晚。你结束了一天的工作，裹紧大衣回到家，迫不及待地钻进被窝。今天，你所在的城市气温比往年这个时候低了不少，窗外的风声格外凛冽，窗缝里渗进来的寒气让你把自己裹得更紧。你闭上眼睛，感受着这个格外寒冷的冬夜，试图让自己平静下来，进入睡眠……`,
};

function assignCond(){
  const cnt=JSON.parse(localStorage.getItem('ts_cc')||'{}');
  const mn=Math.min(...TS_CONDS.map(c=>cnt[c.id]||0));
  const pool=TS_CONDS.filter(c=>(cnt[c.id]||0)===mn);
  return pool[~~(Math.random()*pool.length)];
}

function initTempExp(runner) {
  const COND = assignCond();
  const A = COND.accent;

  /* ★ 关键：不覆盖 runner 的 flex 布局
     runner（psy_index.html CSS）= position:fixed; display:flex; flex-direction:column; overflow:hidden
     topbar: flex-shrink:0
     #tsScroll: flex:1 1 0; min-height:0; overflow-y:auto  ← 在 psy_index.html CSS 已定义
  */
  runner.innerHTML = `
    <!-- ① 全屏背景图（position:fixed, z-index:0, pointer-events:none） -->
    <div id="tsBgWrap" style="position:fixed;inset:0;z-index:0;pointer-events:none">
      <div id="tsBgImg" style="width:100%;height:100%;background-size:cover;background-position:center;
        background-repeat:no-repeat;filter:blur(2px) brightness(0.55);transform:scale(1.06);
        transition:background-image 0.6s ease"></div>
      <div id="tsBgOverlay" style="position:absolute;inset:0;background:${COND.overlay}"></div>
      <!-- CSS粒子容器 -->
      <div id="tsParticles" style="position:absolute;inset:0;overflow:hidden"></div>
    </div>

    <!-- ② 顶栏（z:10, flex-shrink:0） -->
    <div style="position:relative;z-index:10;flex-shrink:0">
      <div class="exp-topbar" style="background:rgba(0,0,0,.5);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)">
        <div class="exp-topbar-back" onclick="closeExperiment()"><i class="fas fa-times"></i></div>
        <div class="exp-topbar-title">温度·睡眠·心理研究</div>
        <button id="tsAuBtn" onclick="tsTapAu()"
          style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.15);
          border:1px solid rgba(255,255,255,.3);color:#fff;cursor:pointer;font-size:16px;
          display:flex;align-items:center;justify-content:center;outline:none;padding:0;flex-shrink:0">🔇</button>
        <div class="exp-progress-bar" id="expPBar" style="width:0%"></div>
      </div>
    </div>

    <!-- ③ 滚动区（z:10, flex:1 1 0, min-height:0 → psy_index CSS #tsScroll） -->
    <div id="tsScroll" style="position:relative;z-index:10">
      <div id="tsC" style="max-width:600px;margin:0 auto;padding:24px 18px 60px;color:#fff"></div>
    </div>

    <!-- ④ 沉浸闪入遮罩 -->
    <div id="tsImm" style="position:fixed;inset:0;z-index:500;
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;
      opacity:0;pointer-events:none;transition:opacity .8s ease"></div>
  `;

  // 加载背景图
  loadBgImg(COND);
  // 启动CSS粒子
  launchParticles(COND);

  const tsD={condition:COND.id,season:COND.season,anomaly:COND.anomaly};
  const tsV={};
  let cdTimer=null;

  const tc=()=>document.getElementById('tsC');
  const sp=n=>setPBar(n,5);

  // HTML 构建辅助
  const ey=t=>`<div style="font-size:10px;letter-spacing:4px;color:${A};opacity:.9;margin-bottom:10px">${t}</div>`;
  const h1=t=>`<div style="font-size:clamp(22px,6vw,34px);font-weight:900;color:#fff;line-height:1.3;margin-bottom:14px;text-shadow:0 2px 20px rgba(0,0,0,.8)">${t}</div>`;
  const pp=t=>`<p style="font-size:14px;line-height:1.9;color:rgba(255,255,255,.82);margin-bottom:16px;text-shadow:0 1px 8px rgba(0,0,0,.7)">${t}</p>`;

  function glass(inner,ex=''){
    return `<div style="background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.12);
      border-radius:16px;padding:20px;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);${ex}">${inner}</div>`;
  }
  function tBtn(lbl,id,fn,dis=false){
    return `<button id="${id}" ${dis?'disabled':''} onclick="${fn}()"
      style="${btnCss(A,'margin-top:10px')};opacity:${dis?.2:1};pointer-events:${dis?'none':'auto'}"
      >${lbl}</button>`;
  }
  function scRow(id,code,text,la,ra){
    return `<div style="padding:6px 0">
      <div style="font-size:10px;letter-spacing:2px;color:${A};opacity:.9;margin-bottom:4px">${code}</div>
      <div style="font-size:13px;line-height:1.65;color:rgba(255,255,255,.88);margin-bottom:8px">${text}</div>
      <div style="display:flex;align-items:center;gap:5px">
        <span style="font-size:10px;color:rgba(255,255,255,.4);min-width:40px;line-height:1.3">${la}</span>
        <div style="display:flex;gap:3px;flex:1;justify-content:center" id="${id}"></div>
        <span style="font-size:10px;color:rgba(255,255,255,.4);min-width:40px;text-align:right;line-height:1.3">${ra}</span>
      </div>
    </div>`;
  }
  function buildScales(ids,bid){
    ids.forEach(id=>{
      const el=document.getElementById(id);if(!el)return;
      for(let i=1;i<=7;i++){
        const n=document.createElement('div');
        n.textContent=i;n.dataset.g=id;
        n.style.cssText=`width:36px;height:36px;border-radius:50%;border:1.5px solid rgba(255,255,255,.18);
          background:rgba(0,0,0,.3);cursor:pointer;display:flex;align-items:center;justify-content:center;
          font-size:11px;color:rgba(255,255,255,.4);transition:all .18s;flex-shrink:0`;
        n.onclick=()=>{
          document.querySelectorAll(`[data-g="${id}"]`).forEach(x=>{
            x.style.background='rgba(0,0,0,.3)';x.style.borderColor='rgba(255,255,255,.18)';
            x.style.color='rgba(255,255,255,.4)';x.style.transform='';
          });
          n.style.background=A;n.style.borderColor=A;n.style.color='#000';n.style.transform='scale(1.2)';
          tsV[id]=i;tsD[id]=i;
          if(ids.every(x=>tsV[x]!==undefined)){
            const b=document.getElementById(bid);
            if(b){b.disabled=false;b.style.opacity='1';b.style.pointerEvents='auto';}
          }
        };
        el.appendChild(n);
      }
    });
  }

  /* ── 屏幕 ── */
  function s0(){
    sp(0);
    tc().innerHTML=`<div style="animation:tsFadeIn .7s ease">
      ${ey('STUDY-04 · 温度与睡眠')}
      ${h1('睡眠、温度<br>与心理健康')}
      ${pp('本研究探讨<strong style="color:'+A+'">环境温度异常</strong>如何影响认知状态与睡眠质量。共五个部分，约 <strong>20 分钟</strong>。')}
      ${glass(`<div style="font-size:13px;line-height:2;color:rgba(255,255,255,.82)">
        🎧 <strong>建议佩戴耳机</strong>，在安静环境中参与。<br>
        点击右上角 🔇 按钮可开启沉浸音效。<br>
        数据仅用于学术研究，完全匿名。
      </div>`,'margin-bottom:18px')}
      ${tBtn('开始参与 →','bs0','tsS1')}
    </div>`;
    window.tsS1=s1;
  }

  function s1(){
    sp(1);
    tc().innerHTML=`<div style="animation:tsFadeIn .7s ease">
      ${ey('一 · 基线测量')}${h1('此刻的心理状态')}
      ${pp('请描述您<strong>此刻真实</strong>的心理状态。')}
      ${glass(`<div style="display:flex;flex-direction:column;gap:18px">${[
        ['b1','B-01 · 状态反刍','此刻，我脑海中有一些想法在反复出现，很难停下来','完全不符合','完全符合'],
        ['b2','B-02 · 状态反刍','此刻，我很难把注意力从令我担忧的想法上移开','完全不符合','完全符合'],
        ['b3','B-03 · 情绪状态','此刻，我感到焦虑或紧张','完全不符合','完全符合'],
        ['b4','B-04 · 情绪状态','此刻，我感到心情低落或消沉','完全不符合','完全符合'],
      ].map(([id,code,text,la,ra])=>scRow(id,code,text,la,ra)).join('<hr style="border:none;border-top:1px solid rgba(255,255,255,.08);margin:2px 0">')}</div>`,'margin-bottom:16px')}
      ${tBtn('继续 →','bs1','tsS2',true)}
    </div>`;
    buildScales(['b1','b2','b3','b4'],'bs1');
    window.tsS2=s2;
  }

  function s2(){
    sp(2);
    // ★ 用户点击了按钮 → 有合法手势 → 安全启动音频
    const auBtn=document.getElementById('tsAuBtn');
    if(auBtn){auBtn.textContent='🔊';}
    playAmbient(COND.id);
    showImm(COND);

    tc().innerHTML=`<div style="animation:tsFadeIn .7s ease">
      ${ey('二 · 情境诱导')}${h1('请沉浸在以下情境中')}
      <div style="display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:30px;
        font-size:12px;background:${COND.badgeC};border:1px solid rgba(255,255,255,.2);
        color:#fff;margin-bottom:16px;text-shadow:none">${COND.badge}</div>
      ${glass(`<div style="border-left:3px solid ${A};padding-left:14px;font-size:14px;
        line-height:2.1;color:rgba(255,255,255,.95);font-style:italic">
        ${TS_TEXT[COND.id]}</div>`,'margin-bottom:16px')}
      ${glass(`<p style="font-size:12px;line-height:1.9;color:rgba(255,255,255,.7);margin-bottom:14px">
          请<strong style="color:#fff">闭上眼睛</strong>，真实想象上述情境。感受温度，聆听声音，感知身体。
        </p>
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:8px 0">
          <div style="position:relative;width:88px;height:88px">
            <svg viewBox="0 0 100 100" style="transform:rotate(-90deg);width:88px;height:88px">
              <circle fill="none" stroke="rgba(255,255,255,.1)" stroke-width="4" cx="50" cy="50" r="43"/>
              <circle id="tsArc" fill="none" stroke="${A}" stroke-width="4" stroke-linecap="round"
                cx="50" cy="50" r="43" style="stroke-dasharray:270;stroke-dashoffset:270;
                transition:stroke-dashoffset 1s linear;filter:drop-shadow(0 0 4px ${A})"/>
            </svg>
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
              font-size:20px;font-weight:900;color:${A}" id="tsCd">5:00</div>
          </div>
          <div style="font-size:10px;color:rgba(255,255,255,.4);letter-spacing:2px">沉浸计时</div>
        </div>`,'margin-bottom:16px')}
      <div>
        <div style="font-size:10px;letter-spacing:2px;color:${A};margin-bottom:8px;opacity:.9">
          内心独白 · 写下此刻脑海中的想法（150字以上）</div>
        <textarea id="tsMono" oninput="tsMonoIn()"
          placeholder="此刻我躺在床上，脑海中……"
          style="width:100%;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.15);
          border-radius:12px;padding:14px;color:#fff;font-family:inherit;font-size:13px;
          line-height:2;resize:vertical;min-height:150px;outline:none;box-sizing:border-box;
          -webkit-appearance:none"></textarea>
        <div style="font-size:10px;text-align:right;color:rgba(255,255,255,.35);margin-top:4px" id="tsCC">0 字</div>
      </div>
      ${tBtn('提交内心独白 →','bs2','tsS3',true)}
    </div>`;
    startCd(300);
    window.tsMonoIn=()=>{
      const t=document.getElementById('tsMono').value,n=t.replace(/\s/g,'').length;
      document.getElementById('tsCC').textContent=n+' 字';
      document.getElementById('tsCC').style.color=n>=150?'#86efac':'rgba(255,255,255,.35)';
      const b=document.getElementById('bs2');
      if(b){b.disabled=n<150;b.style.opacity=n<150?.2:1;b.style.pointerEvents=n<150?'none':'auto';}
      tsD.monologue=t;
    };
    window.tsS3=s3;
  }

  function startCd(secs){
    const C=2*Math.PI*43;let left=secs;clearInterval(cdTimer);
    cdTimer=setInterval(()=>{
      left--;
      const el=document.getElementById('tsCd'),arc=document.getElementById('tsArc');
      if(el)el.textContent=`${~~(left/60)}:${String(left%60).padStart(2,'0')}`;
      if(arc)arc.style.strokeDashoffset=C*(left/secs);
      if(left<=0){clearInterval(cdTimer);if(el)el.textContent='完成';}
    },1000);
  }

  function s3(){
    clearInterval(cdTimer);sp(3);
    tc().innerHTML=`<div style="animation:tsFadeIn .7s ease">
      ${ey('三 · 操纵检验')}${h1('关于刚才的想象')}
      ${glass(`<div style="display:flex;flex-direction:column;gap:18px">${[
        ['m1','M-01 · 温度感知','在想象中，您感受到的温度与这个季节平时相比','明显更凉','明显更热'],
        ['m2','M-02 · 沉浸程度','您对刚才情境的沉浸程度','完全未沉浸','非常沉浸'],
        ['m3','M-03 · 真实感','刚才描述的情境感觉有多真实','完全不真实','非常真实'],
      ].map(([id,code,text,la,ra])=>scRow(id,code,text,la,ra)).join('<hr style="border:none;border-top:1px solid rgba(255,255,255,.08);margin:2px 0">')}</div>`,'margin-bottom:16px')}
      ${tBtn('继续 →','bs3','tsS4',true)}
    </div>`;
    buildScales(['m1','m2','m3'],'bs3');window.tsS4=s4;
  }

  function s4(){
    sp(4);
    tc().innerHTML=`<div style="animation:tsFadeIn .7s ease">
      ${ey('四 · 核心测量')}${h1('此刻的认知与睡眠预期')}
      ${glass(`
        <div style="font-size:10px;letter-spacing:2px;color:${A};margin-bottom:12px;opacity:.85">▌ 认知状态（状态反刍）</div>
        <div style="display:flex;flex-direction:column;gap:16px">
          ${[['c1','C-01','此刻，我脑海中有一些想法在反复出现，难以停止','完全不符合','完全符合'],
             ['c2','C-02','此刻，我在反复思考一些令我担忧的事情','完全不符合','完全符合'],
             ['c3','C-03','此刻，我很难让脑子安静下来','完全不符合','完全符合'],
          ].map(([id,code,text,la,ra])=>scRow(id,code,text,la,ra)).join('<hr style="border:none;border-top:1px solid rgba(255,255,255,.08);margin:2px 0">')}
        </div>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,.1);margin:16px 0">
        <div style="font-size:10px;letter-spacing:2px;color:${A};margin-bottom:12px;opacity:.85">▌ 情绪状态</div>
        <div style="display:flex;flex-direction:column;gap:16px">
          ${[['c4','C-04 · 焦虑','此刻，我感到焦虑或不安','完全不符合','完全符合'],
             ['c5','C-05 · 抑郁','此刻，我感到情绪低落或沮丧','完全不符合','完全符合'],
          ].map(([id,code,text,la,ra])=>scRow(id,code,text,la,ra)).join('<hr style="border:none;border-top:1px solid rgba(255,255,255,.08);margin:2px 0">')}
        </div>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,.1);margin:16px 0">
        <div style="font-size:10px;letter-spacing:2px;color:${A};margin-bottom:12px;opacity:.85">▌ 预期睡眠质量</div>
        <div style="display:flex;flex-direction:column;gap:16px">
          ${[['s1','S-01 · 入睡','您预计今晚需要多长时间才能入睡','很快入睡','很长时间'],
             ['s2','S-02 · 质量','您预计今晚整体睡眠质量如何','非常差','非常好'],
             ['s3','S-03 · 觉醒','您预计今晚会在夜间醒来几次','不会醒来','多次醒来'],
             ['s4','S-04 · 晨起','您预计明天醒来时的精神状态如何','非常疲惫','神清气爽'],
          ].map(([id,code,text,la,ra])=>scRow(id,code,text,la,ra)).join('<hr style="border:none;border-top:1px solid rgba(255,255,255,.08);margin:2px 0">')}
        </div>
      `,'margin-bottom:16px')}
      ${tBtn('提交并完成研究 →','bs4','tsS5',true)}
    </div>`;
    buildScales(['c1','c2','c3','c4','c5','s1','s2','s3','s4'],'bs4');window.tsS5=s5;
  }

  function s5(){
    sp(5);clearInterval(cdTimer);
    tsD.timestamp=new Date().toISOString();
    saveExp('temperature',tsD);
    const cnt=JSON.parse(localStorage.getItem('ts_cc')||'{}');
    cnt[COND.id]=(cnt[COND.id]||0)+1;localStorage.setItem('ts_cc',JSON.stringify(cnt));
    stopAmbient();

    tc().innerHTML=`<div style="animation:tsFadeIn .7s ease;text-align:center;padding:16px 0">
      <div style="font-size:56px;margin-bottom:10px">🌙</div>
      ${ey('研究完成')}${h1('感谢您的参与')}
      ${pp('您的数据已成功提交。您的参与对推进<strong style="color:'+A+'">气候变化与人类睡眠健康</strong>研究具有重要价值。')}
      ${glass(`<div style="font-size:12px;line-height:1.9;color:rgba(255,255,255,.75);text-align:left">
        <strong style="color:#fff">研究说明</strong><br>
        本研究中，参与者被随机分配到不同温度情境（夏/冬 × 偏热/正常/偏冷）。核心问题是：当人们想象处于温度异常的夜晚时，
        <strong style="color:${A}">认知反刍水平</strong>和<strong style="color:${A}">预期睡眠质量</strong>是否随之改变。
      </div>`,'margin-bottom:20px')}
      <button onclick="closeExperiment()" style="${btnCss(A)}">返回实验中心</button>
    </div>`;
  }

  window.tsTapAu=()=>{
    const auBtn=document.getElementById('tsAuBtn');
    if(_auEl&&!_auEl.paused){stopAmbient();if(auBtn)auBtn.textContent='🔇';}
    else{playAmbient(COND.id);if(auBtn)auBtn.textContent='🔊';}
  };

  s0();
}

/* ── 背景图加载 ─────────────────────────────── */
function loadBgImg(cond){
  const wrap=document.getElementById('tsBgImg');if(!wrap)return;
  const url=SCENE_IMGS[cond.id];
  const img=new Image();
  img.onload=()=>{wrap.style.backgroundImage=`url('${url}')`;}
  img.onerror=()=>{
    // 备用：用对应关键词的 Unsplash 随机图
    const kw=cond.season==='summer'?(cond.anomaly>0?'hot+summer+night+city':'summer+night+cool'):'winter+snow+night+city';
    wrap.style.backgroundImage=`url('https://source.unsplash.com/1200x800/?${kw}&sig=${cond.id}')`;
  };
  img.src=url;
}

/* ── CSS 粒子动画（6 套，纯CSS，无Canvas，不影响滚动）─── */
function launchParticles(cond){
  const container=document.getElementById('tsParticles');if(!container)return;
  // 先注入对应的关键帧 CSS（只注一次）
  if(!document.getElementById('tsPCSS')){
    const st=document.createElement('style');st.id='tsPCSS';
    st.textContent=`
      @keyframes floatUp{0%{transform:translateY(0) translateX(0) scale(1);opacity:var(--a)}
        50%{transform:translateY(-45vh) translateX(var(--dx)) scale(0.8)}
        100%{transform:translateY(-90vh) translateX(calc(var(--dx)*2)) scale(0.4);opacity:0}}
      @keyframes snowFall{0%{transform:translateY(-10px) translateX(0) rotate(0deg);opacity:var(--a)}
        100%{transform:translateY(105vh) translateX(var(--dx)) rotate(360deg);opacity:0}}
      @keyframes sway{0%,100%{transform:translateX(0)}50%{transform:translateX(var(--sw))}}
      @keyframes flicker{0%,100%{opacity:var(--a)}50%{opacity:calc(var(--a)*0.35)}}
      .ts-heat{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(255,140,30,0.22),transparent);
        animation:floatUp var(--dur) var(--delay) infinite ease-in}
      .ts-snow{position:absolute;border-radius:50%;background:rgba(210,230,255,var(--a));
        animation:snowFall var(--dur) var(--delay) infinite linear}
      .ts-firefly{position:absolute;border-radius:50%;background:rgba(160,255,100,var(--a));
        box-shadow:0 0 6px 2px rgba(120,220,60,0.3);
        animation:flicker var(--fdur) var(--delay) infinite ease-in-out,sway var(--sdur) var(--delay) infinite ease-in-out}
    `;
    document.head.appendChild(st);
  }

  let html='';
  if(cond.season==='summer'&&cond.anomaly>0){
    // 热浪：橙红热气泡 40个
    for(let i=0;i<40;i++){
      const x=Math.random()*100,sz=8+Math.random()*28,dur=5+Math.random()*8,delay=Math.random()*9,dx=(Math.random()-.5)*80,a=0.12+Math.random()*0.18;
      html+=`<div class="ts-heat" style="left:${x}%;bottom:${-sz}px;width:${sz}px;height:${sz}px;--dur:${dur}s;--delay:-${delay}s;--dx:${dx}px;--a:${a}"></div>`;
    }
  } else if(cond.season==='summer'&&cond.anomaly===0){
    // 夏夜：萤火虫 25个
    for(let i=0;i<25;i++){
      const x=Math.random()*95,y=20+Math.random()*70,sz=3+Math.random()*5,fdur=1.5+Math.random()*2.5,sdur=3+Math.random()*5,delay=Math.random()*5,a=0.5+Math.random()*0.5;
      html+=`<div class="ts-firefly" style="left:${x}%;top:${y}%;width:${sz}px;height:${sz}px;--a:${a};--fdur:${fdur}s;--sdur:${sdur}s;--delay:-${delay}s;--sw:${(Math.random()-.5)*60}px"></div>`;
    }
  } else if(cond.season==='summer'&&cond.anomaly<0){
    // 清爽夏夜：淡绿浮粒 20个（偏小）
    for(let i=0;i<20;i++){
      const x=Math.random()*95,sz=4+Math.random()*10,dur=8+Math.random()*12,delay=Math.random()*10,dx=(Math.random()-.5)*50,a=0.1+Math.random()*0.15;
      html+=`<div class="ts-heat" style="left:${x}%;bottom:${-sz}px;width:${sz}px;height:${sz}px;background:radial-gradient(circle,rgba(100,220,140,0.2),transparent);--dur:${dur}s;--delay:-${delay}s;--dx:${dx}px;--a:${a}"></div>`;
    }
  } else if(cond.anomaly<0){
    // 严冬：雪花 70个
    for(let i=0;i<70;i++){
      const x=Math.random()*100,sz=2+Math.random()*7,dur=5+Math.random()*12,delay=Math.random()*15,dx=(Math.random()-.5)*120,a=0.4+Math.random()*0.55;
      html+=`<div class="ts-snow" style="left:${x}%;top:-${sz}px;width:${sz}px;height:${sz}px;--a:${a};--dur:${dur}s;--delay:-${delay}s;--dx:${dx}px"></div>`;
    }
  } else if(cond.anomaly===0){
    // 普通冬夜：稀疏雪花 30个
    for(let i=0;i<30;i++){
      const x=Math.random()*100,sz=1.5+Math.random()*4,dur=8+Math.random()*15,delay=Math.random()*20,dx=(Math.random()-.5)*80,a=0.25+Math.random()*0.35;
      html+=`<div class="ts-snow" style="left:${x}%;top:-${sz}px;width:${sz}px;height:${sz}px;--a:${a};--dur:${dur}s;--delay:-${delay}s;--dx:${dx}px"></div>`;
    }
  } else {
    // 冬暖：极稀疏粒子+闪烁窗灯效果（CSS小点）
    for(let i=0;i<12;i++){
      const x=Math.random()*100,sz=2+Math.random()*4,dur=10+Math.random()*15,delay=Math.random()*20,dx=(Math.random()-.5)*40,a=0.15+Math.random()*0.15;
      html+=`<div class="ts-snow" style="left:${x}%;top:-${sz}px;width:${sz}px;height:${sz}px;--a:${a};--dur:${dur}s;--delay:-${delay}s;--dx:${dx}px"></div>`;
    }
  }
  container.innerHTML=html;
}

/* ── 沉浸闪入 ───────────────────────────────── */
function showImm(cond){
  const ov=document.getElementById('tsImm');if(!ov)return;
  ov.style.background=`linear-gradient(135deg,rgba(0,0,0,.7),rgba(0,0,0,.85))`;
  ov.innerHTML=`
    <div style="font-size:clamp(26px,7vw,48px);font-weight:900;color:#fff;text-align:center;
      text-shadow:0 0 40px ${cond.accent};line-height:1.3;padding:0 24px">${cond.label}</div>
    <div style="font-size:12px;letter-spacing:4px;color:${cond.accent};opacity:.9">${cond.badge}</div>`;
  ov.style.pointerEvents='all';ov.style.opacity='1';
  setTimeout(()=>{ov.style.opacity='0';setTimeout(()=>{ov.style.pointerEvents='none';},800);},2600);
}

/* ── 保存结果 ────────────────────────────────── */
async function saveExp(type,result){
  try{
    const token=localStorage.getItem('token');
    await fetch('/api/experiments/result',{
      method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body:JSON.stringify({experiment_type:type,result,timestamp:new Date().toISOString()})
    });
  }catch(e){console.log('[Exp] offline:',type);}
}
