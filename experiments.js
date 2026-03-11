/**
 * experiments.js  v6.0
 * 温度实验：独立 iframe（彻底解决父级 body{position:fixed;overflow:hidden} 导致的滚动失效）
 * 关闭时：iframe postMessage → 父页面移除 iframe
 * 音频：iframe 内独立管理，关闭时自动停止
 */

/* ── 注册页面 ─────────────────────────────── */
(function waitForApp(){
  if(typeof pages==='undefined'||typeof navTitles==='undefined')
    return setTimeout(waitForApp,60);
  pages['experiments']    =document.getElementById('experimentsPage');
  navTitles['experiments']='实验中心';
})();

/* ── iframe 容器 ─────────────────────────── */
let _expIframe=null;

window.addEventListener('message',function(e){
  if(e.data&&e.data.type==='closeExp') closeExpIframe();
});

function closeExpIframe(){
  if(_expIframe){ _expIframe.remove(); _expIframe=null; }
  document.body.style.overflow='';
}

function launchTempExp(){
  if(_expIframe) return;
  _expIframe=document.createElement('iframe');
  _expIframe.src='exp_temperature.html';
  _expIframe.style.cssText=`
    position:fixed;inset:0;width:100%;height:100%;
    border:none;z-index:9999;background:#000`;
  _expIframe.allow='autoplay';
  document.body.appendChild(_expIframe);
}

/* ── 主入口 ──────────────────────────────── */
function launchExperiment(type){
  if(type==='temperature'){ launchTempExp(); return; }
  const runner=document.getElementById('experimentRunner');
  runner.innerHTML=''; runner.classList.remove('hidden');
  document.body.style.overflow='hidden';
  if(type==='stroop') initStroop(runner);
  else if(type==='gonogo') initGoNoGo(runner);
}

function closeExperiment(){
  const r=document.getElementById('experimentRunner');
  r.classList.add('hidden'); r.innerHTML='';
  document.body.style.overflow='';
}

function setPBar(n,t){const b=document.getElementById('expPBar');if(b)b.style.width=(n/t*100)+'%';}

function btnCss(col){
  return`width:100%;padding:14px;border-radius:30px;border:1.5px solid ${col};background:transparent;
    color:${col};font-size:13px;letter-spacing:2px;cursor:pointer;font-family:inherit;
    transition:background .3s,color .3s`;
}

function mkTopbar(title,right=''){
  return`<div class="exp-topbar">
    <div class="exp-topbar-back" onclick="closeExperiment()"><i class="fas fa-times"></i></div>
    <div class="exp-topbar-title">${title}</div>
    <div style="width:36px;display:flex;justify-content:flex-end">${right}</div>
    <div class="exp-progress-bar" id="expPBar" style="width:0%"></div>
  </div>`;
}

/* ═══════════════════════════════════════════
   STROOP
═══════════════════════════════════════════ */
const COLS=[{name:'红',hex:'#ef4444'},{name:'蓝',hex:'#3b82f6'},{name:'绿',hex:'#22c55e'},{name:'黄',hex:'#eab308'}];

function initStroop(runner){
  runner.innerHTML=mkTopbar('Stroop 色词干扰')+`<div id="expContent" style="background:#111;color:#fff"></div>`;
  function mkT(type){
    const w=COLS[~~(Math.random()*4)];let c=w;
    if(type==='inc'){do{c=COLS[~~(Math.random()*4)];}while(c===w);}
    return{word:w.name,color:c.hex,correct:c.name,type};
  }
  const prac=[...Array(10)].map(()=>mkT('con'));
  const test=[...[...Array(30)].map(()=>mkT('con')),...[...Array(30)].map(()=>mkT('inc'))].sort(()=>Math.random()-.5);
  let phase='intro',idx=0,list=[],res={con:[],inc:[]},t0=0,busy=false;
  const C=()=>document.getElementById('expContent');
  const pg=inner=>`<div style="display:flex;flex-direction:column;align-items:center;padding:28px 20px 64px;min-height:100%;font-size:14px;line-height:1.7">${inner}</div>`;

  function render(){
    if(phase==='intro')showI();
    else if(phase==='prac'||phase==='test')showT();
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
    setPBar(idx,total);busy=false;
    const tr=list[idx];
    C().innerHTML=pg(`
      <div style="font-size:14px;font-weight:700;margin-bottom:4px">${isPrac?'练习阶段':`第 ${idx+1} / ${total} 题`}</div>
      <div style="font-size:12px;color:rgba(255,255,255,.35);margin-bottom:42px">${isPrac?'熟悉规则·不计入结果':'选择文字的显示颜色'}</div>
      <div style="font-size:18px;color:rgba(255,255,255,.28);margin-bottom:14px" id="sFix">+</div>
      <div id="sStim" style="font-size:clamp(44px,12vw,72px);font-weight:900;min-height:88px;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .1s;letter-spacing:2px"></div>
      <p style="font-size:12px;color:rgba(255,255,255,.28);margin:16px 0 22px">选择文字的<span style="color:#eab308">显示颜色</span></p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:320px;width:100%">
        ${COLS.map(c=>`<div id="sb-${c.name}" onclick="sA('${c.name}')" style="height:54px;border-radius:13px;border:1.5px solid ${c.hex}55;color:${c.hex};background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center;gap:8px;font-weight:700;font-size:15px;cursor:pointer;transition:all .15s"><span style="width:12px;height:12px;border-radius:50%;background:${c.hex}"></span>${c.name}</div>`).join('')}
      </div>
    `);
    setTimeout(()=>{
      const f=document.getElementById('sFix');if(f)f.style.opacity='0';
      const s=document.getElementById('sStim');if(s){s.textContent=tr.word;s.style.color=tr.color;s.style.opacity='1';}
      t0=Date.now();window._sTO=setTimeout(()=>{if(!busy)sA(null);},2000);
    },550);
    window.sA=chosen=>{
      if(busy)return;busy=true;clearTimeout(window._sTO);
      const rt=Date.now()-t0,ok=chosen===tr.correct;
      const el=document.getElementById('sb-'+chosen);if(el)el.style.background=ok?'rgba(34,197,94,.25)':'rgba(239,68,68,.25)';
      const cel=document.getElementById('sb-'+tr.correct);if(cel&&!ok)cel.style.background='rgba(34,197,94,.2)';
      if(!isPrac)res[tr.type].push({rt,ok});
      setTimeout(()=>{idx++;if(idx>=list.length){if(isPrac){C().innerHTML=pg(`<div style="text-align:center"><div style="font-size:22px;font-weight:800;margin-bottom:16px">✅ 练习完成</div><p style="color:rgba(255,255,255,.55);margin-bottom:28px">准备好正式测试了吗？共 60 题。</p><button onclick="sT()" style="${btnCss('#22c55e')}">开始正式测试 →</button></div>`);window.sT=()=>{phase='test';list=test;idx=0;render();};}else{phase='result';render();}}else render();},380);
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
      <button onclick="sSv()" style="${btnCss('#22c55e')}">保存并返回 →</button>
    `);
    window.sSv=()=>{saveExp('stroop',{cong_rt:avg(res.con),incg_rt:avg(res.inc),stroop_effect:eff,cong_acc:acc(res.con),incg_acc:acc(res.inc)});closeExperiment();};
  }
  render();
}

/* ═══════════════════════════════════════════
   GO / NO-GO
═══════════════════════════════════════════ */
function initGoNoGo(runner){
  runner.innerHTML=mkTopbar('Go / No-Go 抑制控制')+`<div id="expContent" style="background:#0a0a0a;color:#fff"></div>`;
  const TOTAL=80,GO_N=64,NOGO_N=16;
  const trials=[...Array(GO_N).fill('go'),...Array(NOGO_N).fill('nogo')].sort(()=>Math.random()-.5);
  const GO_E=['🟢','⭕','🔵'],NG_E=['🔴','⛔','❌'];
  let idx=0,hits=0,misses=0,fas=0,rts=[],busy=false,phase='intro';
  const C=()=>document.getElementById('expContent');
  const pg=inner=>`<div style="display:flex;flex-direction:column;align-items:center;padding:28px 20px 64px;min-height:100%;font-size:14px;line-height:1.7">${inner}</div>`;
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
    setPBar(idx,TOTAL);busy=false;
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

/* ── 保存结果 ─────────────────────────────── */
async function saveExp(type,result){
  try{
    const token=localStorage.getItem('token')||'';
    await fetch('/api/experiments/result',{method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body:JSON.stringify({experiment_type:type,result,timestamp:new Date().toISOString()})
    });
  }catch(e){console.log('[Exp] offline:',type);}
}
