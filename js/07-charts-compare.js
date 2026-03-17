/** =========================
 *  Canvas helpers
 *  ========================= */
function getDprCanvas(canvas){
  const dpr=window.devicePixelRatio||1;
  const rect=canvas.getBoundingClientRect();
  const w=Math.max(10, Math.floor(rect.width));
  const h=Math.max(10, Math.floor(rect.height));
  canvas.width=Math.floor(w*dpr);
  canvas.height=Math.floor(h*dpr);
  const ctx=canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  return {ctx,w,h};
}
function drawAxes(ctx,x0,y0,x1,y1){
  ctx.strokeStyle='rgba(15,23,42,.18)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x0,y1); ctx.lineTo(x1,y1); ctx.stroke();
}
function drawGrid(ctx,x0,y0,x1,y1,ticks=4){
  ctx.strokeStyle='rgba(15,23,42,.06)'; ctx.lineWidth=1;
  for(let i=1;i<=ticks;i++){
    const y=y0+(y1-y0)*(i/(ticks+1));
    ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1,y); ctx.stroke();
  }
}
function drawLine(ctx,pts){
  if(pts.length<2) return;
  ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y);
  for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x,pts[i].y);
  ctx.stroke();
}
function niceShortLabel(s, max=10){
  const t=String(s||'');
  if(t.length<=max) return t;
  return t.slice(0,max-1)+'…';
}

let mainHover = { dbPoints: [], spendPoints: [] };

/** =========================
 *  Main charts
 *  ========================= */
function drawDbChart(canvas, rows){
  const {ctx,w,h}=getDprCanvas(canvas);
  ctx.clearRect(0,0,w,h);
  const padL=44,padR=12,padT=14,padB=26;
  const x0=padL,y0=padT,x1=w-padR,y1=h-padB;

  drawGrid(ctx,x0,y0,x1,y1,4);
  drawAxes(ctx,x0,y0,x1,y1);
  mainHover.dbPoints = [];

  if(!rows.length){
    ctx.fillStyle='rgba(100,116,139,.9)';
    ctx.font='12px system-ui';
    ctx.fillText('데이터가 없습니다', x0+10, y0+20);
    return;
  }

  const maxY=Math.max(...rows.map(r=>r.ownedCum), ...rows.map(r=>r.paidCum), ...rows.map(r=>r.recruitDb)) || 1;
  const n=rows.length;
  const xs=i=> x0 + (x1-x0)*(n===1?0:i/(n-1));
  const ys=v=> y1 - (y1-y0)*(v/maxY);

  const ptsOwned=rows.map((r,i)=>({x:xs(i),y:ys(r.ownedCum)}));
  const ptsPaid =rows.map((r,i)=>({x:xs(i),y:ys(r.paidCum)}));
  const ptsRec  =rows.map((r,i)=>({x:xs(i),y:ys(r.recruitDb)}));

  ctx.lineWidth=2;
  ctx.strokeStyle='rgba(15,23,42,.85)'; drawLine(ctx,ptsRec);
  ctx.strokeStyle='rgba(37,99,235,.95)'; drawLine(ctx,ptsOwned);
  ctx.strokeStyle='rgba(16,185,129,.95)'; drawLine(ctx,ptsPaid);

  for(let i=0;i<n;i++){
    mainHover.dbPoints.push({
      x: xs(i),
      date: rows[i].date,
      owned: rows[i].ownedCum,
      paid: rows[i].paidCum,
      recruit: rows[i].recruitDb
    });
  }
}
function drawDailySpendChart(canvas, rows, dailyBudget){
  const {ctx,w,h}=getDprCanvas(canvas);
  ctx.clearRect(0,0,w,h);
  const padL=60, padR=14, padT=14, padB=30;
  const x0=padL, y0=padT, x1=w-padR, y1=h-padB;

  drawGrid(ctx,x0,y0,x1,y1,4);
  drawAxes(ctx,x0,y0,x1,y1);
  mainHover.spendPoints = [];

  if(!rows.length){
    ctx.fillStyle='rgba(100,116,139,.9)';
    ctx.font='12px system-ui';
    ctx.fillText('데이터가 없습니다', x0+10, y0+20);
    return;
  }

  const spends = rows.map(r => Number(r.spendDay||0));
  const maxSpend = Math.max(...spends, 1);
  const n=rows.length;
  const xs=i=> x0 + (x1-x0)*(n===1?0:i/(n-1));
  const ys=v=> y1 - (y1-y0)*(v/maxSpend);
  const pts = spends.map((v,i)=>({x:xs(i), y:ys(v)}));

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, y1);
  for(let i=0;i<pts.length-1;i++){
    const p0 = pts[i-1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i+1];
    const p3 = pts[i+2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
  ctx.lineTo(pts[pts.length-1].x, y1);
  ctx.closePath();
  ctx.fillStyle='rgba(37,99,235,.12)';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for(let i=0;i<pts.length-1;i++){
    const p0 = pts[i-1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i+1];
    const p3 = pts[i+2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
  ctx.strokeStyle='rgba(37,99,235,.95)';
  ctx.lineWidth=2.6;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle='rgba(37,99,235,.95)';
  for(const p of pts){ ctx.beginPath(); ctx.arc(p.x,p.y,2.7,0,Math.PI*2); ctx.fill(); }
  ctx.restore();

  const bud = Number(dailyBudget||0);
  if(bud > 0 && bud <= maxSpend){
    const yB = ys(bud);
    ctx.save();
    ctx.strokeStyle='rgba(15,23,42,.40)';
    ctx.setLineDash([6,5]);
    ctx.beginPath(); ctx.moveTo(x0,yB); ctx.lineTo(x1,yB); ctx.stroke();
    ctx.restore();
  }

  for(let i=0;i<n;i++){
    mainHover.spendPoints.push({ x: xs(i), y: pts[i].y, date: rows[i].date, spend: spends[i] });
  }
}

/** =========================
 *  Compare colors
 *  ========================= */
function hashHue(str){
  let h=0;
  const s=String(str||'');
  for(let i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}
function projectColor(p, alpha=0.95){
  const hue = hashHue(`${p.instructor}||${p.cohort}`);
  return `hsla(${hue}, 78%, 45%, ${alpha})`;
}
function projectSoftColor(p, alpha=0.26){
  const hue = hashHue(`${p.instructor}||${p.cohort}`);
  return `hsla(${hue}, 78%, 45%, ${alpha})`;
}

/** =========================
 *  Snapshot & Metrics
 *  ========================= */
function getFinalSnapshot(p){
  const {last}=buildMainRows(p);
  const adsAll=computeAdAverages(p,'all');

  const paidFinal=last?Number(last.paidCum||0):0;
  const ownedFinal=last?Number(last.ownedCum||0):0;
  const recruitFinal=last?Number(last.recruitDb||0):0;
  const expectedFinal=last?Number(last.expectedRev||0):0;

  const spendFinal=adsAll.spend;
  const actual = Number(p.actualRevenue||0);
  const roas = (spendFinal>0) ? (actual/spendFinal) : 0;
  const instructorRate = Number(p.settlement?.instructorRate||0);
  const adShareRate = Number(p.settlement?.adShareRate||0);
  const instructorSettlement = actual * instructorRate / 100;
  const adShareAmount = spendFinal * adShareRate / 100;
  const netAfterSettlementAndAdShare = actual - instructorSettlement - adShareAmount;

  const prevValuePerDb = getPrevValuePerDbForProject(p);
  const valuePerDb = getValuePerDbAuto(p, recruitFinal);

  return {
    label: projLabel(p),
    instructor: p.instructor,
    cohort: p.cohort,
    recruitDb: recruitFinal,
    paidDb: paidFinal,
    ownedDb: ownedFinal,
    spend: spendFinal,
    clicks: adsAll.clicks,
    conv: adsAll.conv,
    avgCpc: adsAll.avgCpc,
    avgCpa: adsAll.avgCpa,
    cvr: adsAll.cvr,
    prevValuePerDb,
    valuePerDb,
    expectedRevenue: expectedFinal,
    actualRevenue: actual,
    roas,
    instructorRate,
    adShareRate,
    instructorSettlement,
    adShareAmount,
    netAfterSettlementAndAdShare
  };
}
function metricDefs(){
  return [
    { key:'actualRevenue',   name:'총 매출(실매출)', type:'won',  get:s=>s.actualRevenue },
    { key:'expectedRevenue', name:'예상 매출(이전 DB당가치×현모집DB)', type:'won', get:s=>s.expectedRevenue },
    { key:'valuePerDb',      name:'DB당 가치(실매출/모집DB)', type:'won', get:s=>s.valuePerDb },
    { key:'prevValuePerDb',  name:'이전기수 DB당 가치(이전실매출/이전모집DB)', type:'won', get:s=>s.prevValuePerDb },
    { key:'instructorSettlement', name:'강사 정산 예상액', type:'won', get:s=>s.instructorSettlement },
    { key:'adShareAmount', name:'광고 분담 예상액', type:'won', get:s=>s.adShareAmount },
    { key:'netAfterSettlementAndAdShare', name:'정산·광고차감 후 금액', type:'won', get:s=>s.netAfterSettlementAndAdShare },
    { key:'spend',  name:'광고비(총예산)', type:'won',  get:s=>s.spend },
    { key:'roas',   name:'ROAS(실매출/예산)', type:'x',  get:s=>s.roas },
    { key:'recruitDb', name:'모집DB(Owned+Paid)', type:'int', get:s=>s.recruitDb },
    { key:'paidDb', name:'Paid DB', type:'int', get:s=>s.paidDb },
    { key:'ownedDb',name:'Owned DB', type:'int', get:s=>s.ownedDb },
    { key:'avgCpc', name:'평균 CPC', type:'won', get:s=>s.avgCpc },
    { key:'avgCpa', name:'평균 CPA', type:'won', get:s=>s.avgCpa },
    { key:'cvr',    name:'CVR(전환/클릭)', type:'rate', get:s=>s.cvr },
  ];
}
function formatMetric(val, type){
  if(type==='won') return fmtWon(val);
  if(type==='int') return fmtInt(val);
  if(type==='rate') return fmtRate(val);
  if(type==='x') return (Number.isFinite(val)? val.toFixed(1)+'배' : '0.0배');
  return String(val??'');
}

/** =========================
 *  Compare UI helpers
 *  ========================= */
function ensureCompareIds(){
  const ps=listProjects();
  if(ps.length===0) return;
  if(!state.compare) state.compare = defaultCompare(ps[0].id);
  if(!state.projects[state.compare.leftId]) state.compare.leftId = ps[0].id;
  if(!state.projects[state.compare.rightId]) state.compare.rightId = ps[0].id;
}
function instructorList(){
  const ps=listProjects();
  const set=new Set(ps.map(p=>p.instructor).filter(Boolean));
  return ['all', ...[...set].sort((a,b)=>a.localeCompare(b))];
}
function buildVsRows(leftSnap, rightSnap){
  const defs = metricDefs();
  return defs.map(def=>{
    const lv = Number(def.get(leftSnap) || 0);
    const rv = Number(def.get(rightSnap) || 0);
    const delta = rv - lv;

    const deltaText = (def.type==='won') ? fmtWon(Math.abs(delta))
                     : (def.type==='int') ? fmtInt(Math.abs(delta))
                     : (def.type==='rate') ? (Math.abs(delta*100).toFixed(2)+'%p')
                     : (def.type==='x') ? (Math.abs(delta).toFixed(1)+'p')
                     : String(Math.abs(delta));

    const rightHigher = delta>0;
    const leftHigher = delta<0;
    const dir = rightHigher ? '▲' : (leftHigher ? '▼' : '■');

    const midMain = (rightHigher||leftHigher) ? `${dir} ${deltaText}` : `변화 없음`;
    const midCls = rightHigher ? 'up' : (leftHigher ? 'down' : '');

    let sub='';
    if((def.type==='won' || def.type==='int') && Number(lv)>0){
      const rate = (delta/Number(lv))*100;
      sub = `(${rate.toFixed(2)}%)`;
    }else if(def.type==='rate'){ sub = `(p 차이)`; }
    else if(def.type==='x'){ sub = `(배수 차이)`; }

    const maxBase = Math.max(Math.abs(lv), Math.abs(rv), 1);
    const leftRatio = Math.max(8, Math.round((Math.abs(lv)/maxBase)*100));
    const rightRatio = Math.max(8, Math.round((Math.abs(rv)/maxBase)*100));
    const winner = leftHigher ? 'left' : (rightHigher ? 'right' : 'tie');
    const winnerText = leftHigher ? '좌측 우세' : (rightHigher ? '우측 우세' : '동일');

    return {
      metric:def.name,
      leftText: formatMetric(lv, def.type),
      rightText: formatMetric(rv, def.type),
      midMain, midSub: sub, midCls,
      winner, winnerText,
      leftRatio, rightRatio
    };
  });
}
function setOptionsPreserve(selectEl, options, wantedValue){
  const current = wantedValue ?? selectEl.value;
  const html = options.map(o=>`<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
  const hash = btoa(unescape(encodeURIComponent(html)));
  if(selectEl.dataset.optHash !== hash){
    selectEl.innerHTML = html;
    selectEl.dataset.optHash = hash;
  }
  const values = new Set(options.map(o=>String(o.value)));
  if(values.has(String(current))) selectEl.value = String(current);
  else if(options[0]) selectEl.value = String(options[0].value);
}

/** =========================
 *  Compare chart
 *  ========================= */
let compareHover = { items:[] };

function drawCompareBarChart(canvas, items){
  const {ctx,w,h}=getDprCanvas(canvas);
  ctx.clearRect(0,0,w,h);

  const padL=56, padR=18, padT=18, padB=52;
  const x0=padL, y0=padT, x1=w-padR, y1=h-padB;

  drawGrid(ctx,x0,y0,x1,y1,4);
  drawAxes(ctx,x0,y0,x1,y1);

  compareHover.items = [];

  if(!items.length){
    ctx.fillStyle='rgba(100,116,139,.9)';
    ctx.font='12px system-ui';
    ctx.fillText('표시할 데이터가 없습니다', x0+10, y0+20);
    return;
  }

  const maxV = Math.max(...items.map(x=>x.value), 1);
  const n = items.length;
  const slotW = (x1-x0) / n;
  const barW = Math.max(18, Math.min(54, slotW - 10));
  const yVal = v => y1 - (y1-y0) * (v / maxV);

  const placed=[];
  function box(x,y,w,h){ return {x1:x,y1:y,x2:x+w,y2:y+h}; }
  function overlaps(a,b){ return !(a.x2<b.x1||a.x1>b.x2||a.y2<b.y1||a.y1>b.y2); }

  for(let i=0;i<n;i++){
    const it = items[i];
    const cx = x0 + slotW*i + slotW/2;
    const bx = cx - barW/2;
    const by = yVal(it.value);
    const bh = Math.max(0, y1 - by);

    const r=10;
    ctx.save();
    ctx.fillStyle = it.colorFill;
    ctx.strokeStyle = it.colorStroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx, y1);
    ctx.lineTo(bx, by+r);
    ctx.quadraticCurveTo(bx, by, bx+r, by);
    ctx.lineTo(bx+barW-r, by);
    ctx.quadraticCurveTo(bx+barW, by, bx+barW, by+r);
    ctx.lineTo(bx+barW, y1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const text = it.valueText;
    ctx.save();
    ctx.font='12px system-ui';
    const tw = ctx.measureText(text).width;
    const padX=8, boxH=24, boxW=tw+padX*2;
    let lx = cx - boxW/2;
    let ly = by - 10 - boxH;
    let b = box(lx,ly,boxW,boxH);
    let guard=0;
    while(placed.some(p=>overlaps(p,b)) && guard<12){
      ly -= (boxH + 6);
      b = box(lx,ly,boxW,boxH);
      guard++;
    }
    if(ly<y0) ly=y0;
    placed.push(box(lx,ly,boxW,boxH));

    ctx.fillStyle='rgba(255,255,255,.95)';
    ctx.strokeStyle='rgba(226,232,240,.95)';
    ctx.lineWidth=1;

    const rr=10;
    ctx.beginPath();
    ctx.moveTo(lx+rr, ly);
    ctx.lineTo(lx+boxW-rr, ly);
    ctx.quadraticCurveTo(lx+boxW, ly, lx+boxW, ly+rr);
    ctx.lineTo(lx+boxW, ly+boxH-rr);
    ctx.quadraticCurveTo(lx+boxW, ly+boxH, lx+boxW-rr, ly+boxH);
    ctx.lineTo(lx+rr, ly+boxH);
    ctx.quadraticCurveTo(lx, ly+boxH, lx, ly+boxH-rr);
    ctx.lineTo(lx, ly+rr);
    ctx.quadraticCurveTo(lx, ly, lx+rr, ly);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = it.colorStroke;
    ctx.textBaseline='middle';
    ctx.fillText(text, lx+padX, ly+boxH/2);
    ctx.restore();

    ctx.save();
    ctx.fillStyle='rgba(71,85,105,.95)';
    ctx.font='11px system-ui';
    const xl = niceShortLabel(it.label, 14);
    const tww = ctx.measureText(xl).width;
    ctx.fillText(xl, cx - tww/2, y1 + 28);
    ctx.restore();

    compareHover.items.push({
      x: bx, y: by, w: barW, h: bh,
      tooltipLines: it.tooltipLines,
      color: it.colorStroke
    });
  }
}

function getSelectedCompareMetricKeys(){
  const defs = metricDefs();
  const valid = new Set(defs.map(d=>d.key));
  let keys = Array.isArray(state.compare?.selectedMetricKeys) ? state.compare.selectedMetricKeys.filter(k=>valid.has(k)) : [];
  if(!keys.length) keys = ['actualRevenue','expectedRevenue','valuePerDb','recruitDb','spend','instructorSettlement'].filter(k=>valid.has(k));
  state.compare.selectedMetricKeys = keys;
  return keys;
}
function projectsForInstructor(inst){
  const ps = listProjects().sort((a,b)=>projLabel(a).localeCompare(projLabel(b)));
  if(!inst || inst==='all') return ps;
  return ps.filter(p=>p.instructor===inst);
}
function syncCompareSide(which){
  ensureCompareIds();
  const projectKey = which==='left' ? 'leftId' : 'rightId';
  const instEl = which==='left' ? cmpLeftInstructor : cmpRightInstructor;
  const projEl = which==='left' ? cmpLeftProject : cmpRightProject;
  const currentId = state.compare[projectKey];
  const currentProj = state.projects[currentId];
  const instructors = [...new Set(listProjects().map(p=>p.instructor).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const wantedInst = instEl.value || currentProj?.instructor || instructors[0] || '';
  setOptionsPreserve(instEl, instructors.map(x=>({value:x,label:x})), wantedInst);
  const ps = projectsForInstructor(instEl.value || wantedInst);
  let wantedId = currentId;
  if(!ps.some(p=>p.id===wantedId)) wantedId = ps[0]?.id || '';
  setOptionsPreserve(projEl, ps.map(p=>({value:p.id,label:p.cohort})), wantedId);
  state.compare[projectKey] = projEl.value || wantedId || '';
}
function renderComparePickers(){
  ensureCompareIds();
  syncCompareSide('left');
  syncCompareSide('right');

  const selectedMetricKeys = new Set(getSelectedCompareMetricKeys());
  const defs = metricDefs();
  cmpMetricPicker.innerHTML = defs.map(d=>{
    const checked = selectedMetricKeys.has(d.key);
    return `<label class="metricChip ${checked?'active':''}"><input type="checkbox" value="${esc(d.key)}" ${checked?'checked':''}>${esc(d.name)}</label>`;
  }).join('');

  cmpMetricPicker.querySelectorAll('input[type="checkbox"]').forEach(chk=>{
    chk.addEventListener('change', ()=>{
      let keys = getSelectedCompareMetricKeys().slice();
      if(chk.checked){ if(!keys.includes(chk.value)) keys.push(chk.value); }
      else keys = keys.filter(x=>x!==chk.value);
      state.compare.selectedMetricKeys = keys;
      renderCompare();
    });
  });

  cmpLeftInstructor.onchange = ()=>{
    state.compare.leftId = '';
    syncCompareSide('left');
    saveState();
    renderCompare();
  };
  cmpRightInstructor.onchange = ()=>{
    state.compare.rightId = '';
    syncCompareSide('right');
    saveState();
    renderCompare();
  };
  cmpLeftProject.onchange = ()=>{
    state.compare.leftId = cmpLeftProject.value || '';
    saveState();
    renderCompare();
  };
  cmpRightProject.onchange = ()=>{
    state.compare.rightId = cmpRightProject.value || '';
    saveState();
    renderCompare();
  };
}
function renderCompareVs(){
  if(!hasProject()) return;
  ensureCompareIds();
  renderComparePickers();

  const left = state.projects[state.compare.leftId];
  const right = state.projects[state.compare.rightId];
  const defs = metricDefs().filter(d=>getSelectedCompareMetricKeys().includes(d.key));
  if(!left || !right || !defs.length){
    cmpVsTbody.innerHTML = '<tr><td class="vsMidCell" colspan="3" style="text-align:center;color:#64748b;padding:24px 10px">비교 대상을 선택해줘.</td></tr>';
    cmpSummaryBadges.innerHTML = '';
    return;
  }

  const leftSnap = getFinalSnapshot(left);
  const rightSnap = getFinalSnapshot(right);
  cmpLeftTitle.textContent = `${leftSnap.instructor} · ${leftSnap.cohort}`;
  cmpRightTitle.textContent = `${rightSnap.instructor} · ${rightSnap.cohort}`;

  const rows = buildVsRows(leftSnap, rightSnap).filter(r=>defs.some(d=>d.name===r.metric));
  const leftWins = rows.filter(r=>r.winner==='left').length;
  const rightWins = rows.filter(r=>r.winner==='right').length;
  const ties = rows.filter(r=>r.winner==='tie').length;

  cmpVsTbody.innerHTML = rows.map(r=>`
    <tr>
      <td class="vsLeftCell"><span class="valPill blue ${r.winner==='left'?'win':(r.winner==='right'?'lose':'')}">${esc(r.leftText)}</span></td>
      <td class="vsMidCell">
        <div class="metricCompareWrap">
          <div class="metricLabel">${esc(r.metric)}</div>
          <div class="winnerBadge ${r.winner}">${r.winner==='left'?'👈':(r.winner==='right'?'👉':'🤝')} ${esc(r.winnerText)}</div>
          <div class="miniCompare">
            <div class="miniBarTrack"><div class="miniBarFill left" style="width:${r.leftRatio}%"></div></div>
            <div class="miniBarVs">VS</div>
            <div class="miniBarTrack"><div class="miniBarFill right" style="width:${r.rightRatio}%"></div></div>
          </div>
          <div class="deltaBox">
            <div class="deltaTop">우측 - 좌측</div>
            <div class="deltaVal ${r.midCls}">${esc(r.midMain)}</div>
            <div class="deltaSub">${esc(r.midSub || ' ')}</div>
          </div>
        </div>
      </td>
      <td class="vsRightCell"><span class="valPill red ${r.winner==='right'?'win':(r.winner==='left'?'lose':'')}">${esc(r.rightText)}</span></td>
    </tr>
  `).join('');

  const overall = leftWins===rightWins ? '접전' : (leftWins>rightWins ? '좌측 우세' : '우측 우세');
  cmpSummaryBadges.innerHTML = [
    `<span class="badge"><b>좌측</b> ${esc(leftSnap.instructor)} · ${esc(leftSnap.cohort)}</span>`,
    `<span class="badge"><b>우측</b> ${esc(rightSnap.instructor)} · ${esc(rightSnap.cohort)}</span>`,
    `<span class="badge"><b>비교 항목</b> ${defs.length}개</span>`,
    `<span class="badge"><b>승부</b> ${esc(overall)}</span>`,
    `<span class="badge"><b>좌측 우세</b> ${leftWins}개</span>`,
    `<span class="badge"><b>우측 우세</b> ${rightWins}개</span>`,
    `<span class="badge"><b>동률</b> ${ties}개</span>`
  ].join('');
  saveState();
}
function renderCompareGraphControls(){
  const defs = metricDefs();
  setOptionsPreserve(cmpMetric, defs.map(d=>({value:d.key, label:d.name})), state.compare.metric || 'actualRevenue');
  state.compare.metric = cmpMetric.value;
}
function buildCompareGraphData(){
  const defs = metricDefs();
  const def = defs.find(d=>d.key===cmpMetric.value) || defs[0];
  const left = state.projects[state.compare.leftId];
  const right = state.projects[state.compare.rightId];
  const snaps = [left, right].filter(Boolean).map(p=>({p, s:getFinalSnapshot(p)}));
  const items = snaps.map(({p,s}, idx)=>{
    const v = Number(def.get(s) || 0);
    const isLeft = idx===0;
    return {
      label: `${s.instructor}/${s.cohort}`,
      value: v,
      valueText: formatMetric(v, def.type),
      colorStroke: isLeft ? 'rgba(37,99,235,.95)' : 'rgba(220,38,38,.95)',
      colorFill: isLeft ? 'rgba(37,99,235,.22)' : 'rgba(239,68,68,.22)',
      tooltipLines: [`${isLeft?'좌측':'우측'} · ${s.instructor} / ${s.cohort}`, `${def.name}: ${formatMetric(v, def.type)}`]
    };
  });
  const leftVal = items[0]?.value ?? 0;
  const rightVal = items[1]?.value ?? 0;
  const winnerText = leftVal===rightVal ? '동일' : (leftVal>rightVal ? '좌측 우세' : '우측 우세');
  return {
    items,
    title: `좌·우 비교 그래프 · ${def.name}`,
    subtitle: `${left ? projLabel(left) : '-'}  vs  ${right ? projLabel(right) : '-'}`,
    winnerText
  };
}
function renderCompareGraph(){
  if(!hasProject()){
    cmpGraphTitle.textContent = '-';
    cmpGraphSub.textContent = '로그인 후 데이터를 불러와줘';
    requestAnimationFrame(()=> drawCompareBarChart(chartCompare, []));
    return;
  }
  renderCompareGraphControls();
  const {items,title,subtitle,winnerText}=buildCompareGraphData();
  cmpGraphTitle.textContent = title;
  cmpGraphSub.innerHTML = `<div>${esc(subtitle)}</div><div class="cmpGraphHeadline"><span class="badge"><b>그래프 판정</b> ${esc(winnerText||'-')}</span></div>`;
  requestAnimationFrame(()=> drawCompareBarChart(chartCompare, items));
  state.compare.metric = cmpMetric.value;
  saveState();
}
function renderCompare(){
  if(!hasProject()){
    cmpVsTbody.innerHTML = '';
    cmpSummaryBadges.innerHTML = '';
    renderCompareGraph();
    return;
  }
  renderCompareVs();
  renderCompareGraph();
}
