/** =========================
 *  Empty / Auth UI
 *  ========================= */
function updateAuthUi(){
  if(isLoggedIn()){
    authStatus.textContent = loginIdLabelFromSession() || '로그인됨';
    btnLogout.style.display = '';
    loginOverlay.style.display = 'none';
  }else{
    authStatus.textContent = '미로그인';
    btnLogout.style.display = 'none';
    loginOverlay.style.display = 'flex';
  }
}
function resetUiForNoProject(){
  curProjLabel.textContent = isLoggedIn() ? '프로젝트 없음' : '로그인 필요';
  curInstructor.textContent = '-';
  curCohort.textContent = '-';
  statDates.textContent = '0';

  projSelect.innerHTML = '';
  if(cmpMetricPicker) cmpMetricPicker.innerHTML = '';
  if(cmpLeftInstructor) cmpLeftInstructor.innerHTML = '';
  if(cmpRightInstructor) cmpRightInstructor.innerHTML = '';
  if(cmpLeftProject) cmpLeftProject.innerHTML = '';
  if(cmpRightProject) cmpRightProject.innerHTML = '';
  if(cmpLeftTitle) cmpLeftTitle.textContent = '-';
  if(cmpRightTitle) cmpRightTitle.textContent = '-';
  prevProjSelect.innerHTML = '<option value="">(선택)</option>';
  ownedFilter.innerHTML = '<option value="all">전체</option>';
  adsFilter.value = 'all';

  kpiTotalDb.textContent = '0';
  kpiPaidDb.textContent = '0';
  kpiOwnedDb.textContent = '0';
  kpiExpectedRev.textContent = '₩0';

  kpiAvgCpc.textContent = '₩0';
  kpiAvgCpa.textContent = '₩0';
  kpiCvr.textContent = '0.00%';
  kpiAdSpend.textContent = '₩0';

  cfgDailyBudget.value = '';
  cfgInstructorRate.value = '';
  cfgAdShareCost.value = '';
  cfgValuePerDb.value = '';
  actualRevenue.value = '';
  rangeStart.value = '';
  rangeEnd.value = '';
  prevDb.value = '';
  prevSpend.value = '';
  prevRevenue.value = '';
  prevLinkInfo.textContent = '현재: 이전기수 미연결';
  revenueCompareBox.textContent = isLoggedIn()
    ? '프로젝트를 생성하면 실매출/DB당가치/예상매출 비교가 여기 표시됨'
    : '로그인 후 프로젝트를 불러오면 실매출/DB당가치/예상매출 비교가 여기 표시됨';

  mainTbody.innerHTML = `
    <tr>
      <td class="sticky" colspan="9" style="text-align:center;color:#64748b;padding:24px 10px">
        ${isLoggedIn() ? '프로젝트가 없습니다. 새 프로젝트를 만들어줘.' : '로그인 후 데이터를 불러와줘.'}
      </td>
    </tr>
  `;
  ownedTbody.innerHTML = `
    <tr><td class="sticky" colspan="3" style="text-align:center;color:#64748b;padding:24px 10px">
      ${isLoggedIn() ? '데이터가 없습니다.' : '로그인 후 데이터를 불러와줘.'}
    </td></tr>
  `;
  adsTbody.innerHTML = `
    <tr><td class="sticky" colspan="8" style="text-align:center;color:#64748b;padding:24px 10px">
      ${isLoggedIn() ? '데이터가 없습니다.' : '로그인 후 데이터를 불러와줘.'}
    </td></tr>
  `;
  cmpVsTbody.innerHTML = '';

  cmpGraphTitle.textContent = '-';
  cmpGraphSub.textContent = isLoggedIn() ? '프로젝트를 불러오면 비교 그래프가 여기 표시됨' : '로그인 후 데이터를 불러와줘';

  requestAnimationFrame(()=>{
    drawDbChart(chartDb, []);
    drawDailySpendChart(chartDailySpend, [], 0);
    drawCompareBarChart(chartCompare, []);
  });
}

/** =========================
 *  Render
 *  ========================= */
function groupProjectsByInstructor(){
  const map = new Map();
  listProjects().sort((a,b)=>projLabel(a).localeCompare(projLabel(b))).forEach(p=>{
    const key = p.instructor || '미분류';
    if(!map.has(key)) map.set(key, []);
    map.get(key).push(p);
  });
  return [...map.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
}
function renderRecentInstructorChips(groups){
  if(!recentInstructorChips) return;
  const recent = loadRecentInstructors();
  const names = recent.filter(name => groups.some(([inst]) => inst===name));
  recentInstructorChips.innerHTML = names.length
    ? names.map(name=>`<button type="button" class="recentChip" data-inst="${esc(name)}">${esc(name)}</button>`).join('')
    : `<span class="small">없음</span>`;
  recentInstructorChips.querySelectorAll('.recentChip').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(projectMenuSearch) projectMenuSearch.value = btn.dataset.inst || '';
      renderProjectMenu();
    });
  });
}
function renderProjectMenu(){
  if(!projectMenuList || !projectMenuPanel) return;
  const groups = groupProjectsByInstructor();
  renderRecentInstructorChips(groups);
  const query = String(projectMenuSearch?.value || '').trim().toLowerCase();
  if(!groups.length){
    if(projectMenuMeta) projectMenuMeta.textContent = '강사 0명 · 기수 0개';
    projectMenuList.innerHTML = `<div class="menuEmpty">등록된 프로젝트가 없습니다.</div>`;
    return;
  }
  const current = getProj();
  const filtered = groups.map(([inst, items])=>{
    if(!query) return [inst, items];
    const qItems = items.filter(p=>{
      const instructor = String(p.instructor || '').toLowerCase();
      const cohort = String(p.cohort || '').toLowerCase();
      const label = String(projLabel(p) || '').toLowerCase();
      return instructor.includes(query) || cohort.includes(query) || label.includes(query);
    });
    if(String(inst || '').toLowerCase().includes(query)) return [inst, items];
    return qItems.length ? [inst, qItems] : null;
  }).filter(Boolean);

  const totalProjects = groups.reduce((acc, [,items])=>acc + items.length, 0);
  const shownProjects = filtered.reduce((acc, [,items])=>acc + items.length, 0);
  if(projectMenuMeta) projectMenuMeta.textContent = query
    ? `검색 결과 강사 ${fmtInt(filtered.length)}명 · 기수 ${fmtInt(shownProjects)}개`
    : `전체 강사 ${fmtInt(groups.length)}명 · 기수 ${fmtInt(totalProjects)}개`;

  if(!filtered.length){
    projectMenuList.innerHTML = `<div class="menuEmpty">검색 결과가 없습니다. 강사명이나 기수명을 다시 확인해 주세요.</div>`;
    return;
  }

  projectMenuList.innerHTML = filtered.map(([inst, items])=>{
    const open = query ? true : !!(current && current.instructor===inst);
    return `
      <div class="instGroup ${open?'open':''}" data-inst="${esc(inst)}">
        <div class="instRow">
          <div class="instMeta">
            <div class="instName">${esc(inst)}</div>
            <div class="instCount">${fmtInt(items.length)}기수</div>
          </div>
          <button class="arrowBtn" type="button">⌄</button>
        </div>
        <div class="cohortList">
          ${items.map(p=>`<button class="cohortBtn ${current&&current.id===p.id?'active':''}" type="button" data-proj-id="${esc(p.id)}"><span>${esc(p.cohort)}</span><small>${esc(p.instructor)}</small></button>`).join('')}
        </div>
      </div>`;
  }).join('');

  projectMenuList.querySelectorAll('.instRow').forEach(row=>{
    row.addEventListener('click', (e)=>{
      if(e.target.closest('.cohortBtn')) return;
      row.parentElement.classList.toggle('open');
    });
  });
  projectMenuList.querySelectorAll('.cohortBtn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      setCurrent(btn.dataset.projId || '');
      closeProjectMenu();
    });
  });
}
function openProjectMenu(){
  if(!projectMenuPanel) return;
  renderProjectMenu();
  projectMenuPanel.classList.add('open');
  setTimeout(()=>{ try{ projectMenuSearch?.focus(); }catch(_){} }, 0);
}
function closeProjectMenu(){
  if(!projectMenuPanel) return;
  projectMenuPanel.classList.remove('open');
}
function toggleProjectMenu(){
  if(!projectMenuPanel) return;
  if(projectMenuPanel.classList.contains('open')) closeProjectMenu();
  else openProjectMenu();
}
function refreshProjectSelect(){
  const ps=listProjects().sort((a,b)=>projLabel(a).localeCompare(projLabel(b)));
  projSelect.innerHTML = ps.map(p=>`<option value="${esc(p.id)}">${esc(projLabel(p))}</option>`).join('');
  if(state.projects[state.currentProjectId]) projSelect.value=state.currentProjectId;
  else if(ps[0]) setCurrent(ps[0].id);
  renderProjectMenu();
}
function refreshHeaderBadges(){
  const p=getProj();
  if(!p){
    curProjLabel.textContent = isLoggedIn() ? '프로젝트 없음' : '로그인 필요';
    curInstructor.textContent = '-';
    curCohort.textContent = '-';
    return;
  }
  curProjLabel.textContent = projLabel(p);
  curInstructor.textContent = p.instructor;
  curCohort.textContent = p.cohort;
}
function uniqueOwnedMedias(p){
  const set=new Set(p.ownedEntries.map(e=>(e.media||'').trim()).filter(Boolean));
  return [...set].sort((a,b)=>a.localeCompare(b));
}
function renderOwned(){
  const p=getProj();
  if(!p){
    ownedTbody.innerHTML = `
      <tr><td class="sticky" colspan="3" style="text-align:center;color:#64748b;padding:24px 10px">
        ${isLoggedIn() ? '프로젝트를 먼저 선택해줘.' : '로그인 후 데이터를 불러와줘.'}
      </td></tr>
    `;
    renderOwnedCalendar();
    return;
  }

  const cur=ownedFilter.value || 'all';
  const opts=['all', ...uniqueOwnedMedias(p)];
  ownedFilter.innerHTML = opts.map(v=>`<option value="${esc(v)}">${esc(v==='all'?'전체':v)}</option>`).join('');
  if(opts.includes(cur)) ownedFilter.value=cur;

  const f=ownedFilter.value || 'all';
  const selectedDates = Array.isArray(state.ownedSelectedDates) ? state.ownedSelectedDates : [];
  const rows=[...p.ownedEntries]
    .filter(e=>e.date && (e.media||'').trim()!=='')
    .filter(e=> f==='all' ? true : (e.media||'').trim()===f)
    .filter(e=> selectedDates.length ? selectedDates.includes(e.date) : true)
    .sort((a,b)=> (a.date===b.date ? (a.media||'').localeCompare(b.media||'') : a.date.localeCompare(b.date)));

  renderOwnedCalendar();
  ownedTbody.innerHTML = rows.length ? rows.map(r=>`
    <tr>
      <td class="sticky">${r.date}</td>
      <td>${esc((r.media||'').trim())}</td>
      <td class="num">${fmtInt(r.addDb)}</td>
    </tr>
  `).join('') : `
    <tr><td class="sticky" colspan="3" style="text-align:center;color:#64748b;padding:24px 10px">${selectedDates.length ? '선택한 날짜에 데이터가 없습니다.' : '등록된 온드DB가 없습니다.'}</td></tr>
  `;
}function renderAds(){
  const p=getProj();
  if(!p){
    kpiAvgCpc.textContent = '₩0';
    kpiAvgCpa.textContent = '₩0';
    kpiCvr.textContent = '0.00%';
    kpiAdSpend.textContent = '₩0';
    adsTbody.innerHTML = `
      <tr><td class="sticky" colspan="8" style="text-align:center;color:#64748b;padding:24px 10px">
        ${isLoggedIn() ? '프로젝트를 먼저 선택해줘.' : '로그인 후 데이터를 불러와줘.'}
      </td></tr>
    `;
    renderAdsCalendar();
    return;
  }

  const f=adsFilter.value || 'all';
  const selectedDates = Array.isArray(state.adsSelectedDates) ? state.adsSelectedDates : [];
  const rows=[...p.adsEntries]
    .filter(e=>e.date && e.platform)
    .filter(e=> f==='all' ? true : e.platform===f)
    .filter(e=> selectedDates.length ? selectedDates.includes(e.date) : true)
    .sort((a,b)=> (a.date===b.date ? a.platform.localeCompare(b.platform) : a.date.localeCompare(b.date)));

  const m=computeAdAverages(p, f);
  kpiAvgCpc.textContent = fmtWon(m.avgCpc);
  kpiAvgCpa.textContent = fmtWon(m.avgCpa);
  kpiCvr.textContent    = fmtRate(m.cvr);
  kpiAdSpend.textContent= fmtWon(m.spend);

  renderAdsCalendar();
  adsTbody.innerHTML = rows.length ? rows.map(r=>{
    const cpc = (r.clicks>0) ? (r.spend/r.clicks) : null;
    const cpa = (r.realDb>0) ? (r.spend/r.realDb) : null;
    const cvr = (r.clicks>0) ? (r.realDb/r.clicks) : null;
    return `
      <tr>
        <td class="sticky">${r.date}</td>
        <td>${r.platform==='meta'?'메타':'구글'}</td>
        <td class="num">${fmtWon(r.spend)}</td>
        <td class="num">${fmtInt(r.clicks)}</td>
        <td class="num">${fmtInt(r.realDb)}</td>
        <td class="num">${cpc===null?'':fmtWon(cpc)}</td>
        <td class="num">${cpa===null?'':fmtWon(cpa)}</td>
        <td class="center mono">${cvr===null?'':fmtRate(cvr)}</td>
      </tr>
    `;
  }).join('') : `
    <tr><td class="sticky" colspan="8" style="text-align:center;color:#64748b;padding:24px 10px">${selectedDates.length ? '선택한 날짜에 데이터가 없습니다.' : '등록된 광고DB가 없습니다.'}</td></tr>
  `;
}function escapeHtml(s){ return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function escapeAttr(s){ return String(s??'').replaceAll('"','&quot;'); }
function buildMonthCells(ym){
  const [y,m]=ym.split('-').map(Number);
  const firstDow = new Date(y,m-1,1).getDay();
  const days = getDaysInMonth(ym);
  const prevYm = addMonths(ym,-1);
  const prevDays = getDaysInMonth(prevYm);
  const cells=[];
  for(let i=firstDow-1;i>=0;i--){ cells.push(`${prevYm}-${String(prevDays-i).padStart(2,'0')}`); }
  for(let d=1; d<=days; d++){ cells.push(`${ym}-${String(d).padStart(2,'0')}`); }
  while(cells.length % 7 !== 0){ const nextIndex = cells.length - (firstDow + days) + 1; const nextYm = addMonths(ym,1); cells.push(`${nextYm}-${String(nextIndex).padStart(2,'0')}`); }
  return cells;
}
function renderOwnedCalendar(){
  const p=getProj();
  if(!ownedCalendar) return;
  if(!p){ ownedMonthLabel.innerHTML='<b>-</b>'; ownedCalendar.innerHTML=''; return; }
  const ym = state.ownedCalendarYm || ymFromDate();
  ownedMonthLabel.innerHTML = `<b>${ym.replace('-', '년 ')}월</b>`;
  const selected = Array.isArray(state.ownedSelectedDates) ? state.ownedSelectedDates : [];
  const filter = ownedFilter.value || 'all';
  const dow = ['일','월','화','수','목','금','토'].map(x=>`<div class="calDow">${x}</div>`).join('');
  const cells = buildMonthCells(ym).map(iso=>{
    const muted = !iso.startsWith(ym);
    const isToday = iso===toISODate(new Date());
    const isSelected = selected.includes(iso);
    const day = Number(iso.slice(8,10));
    const items = p.ownedEntries.filter(e=>e.date===iso && (filter==='all' || (e.media||'').trim()===filter));
    const total = items.reduce((a,b)=>a+Number(b.addDb||0),0);
    const itemHtml = items.slice(0,4).map(e=>`<div class="calItem blue"><span class="name">${esc((e.media||'').trim()||'-')}</span><span class="value">+${fmtInt(e.addDb)}</span></div>`).join('');
    const more = items.length>4 ? `<div class="calItem gray"><span class="name">외 ${fmtInt(items.length-4)}건</span><span class="value">${fmtInt(total)}</span></div>` : '';
    return `<div class="calCell ${muted?'muted':''} ${isToday?'today':''} ${isSelected?'selected':''}" data-owned-date="${escapeAttr(iso)}">
      <div class="calDate"><b>${day}</b>${total?`<span class="badge"><b>${fmtInt(total)} DB</b></span>`:''}</div>
      <div class="calItems">${itemHtml || '<div class="small">등록 없음</div>'}${more}</div>
      <div class="calSummary">${items.length ? `${fmtInt(items.length)}건` : ''}</div>
    </div>`;
  }).join('');
  ownedCalendar.innerHTML = `<div class="calendarGrid">${dow}${cells}</div>`;
  ownedCalendar.querySelectorAll('[data-owned-date]').forEach(el=>el.addEventListener('click', ()=>{
    const iso = el.dataset.ownedDate;
    state.ownedSelectedDates = toggleDateSelection(state.ownedSelectedDates, iso);
    ownedDate.value = iso;
    if(!ownedMedia.value && filter!=='all') ownedMedia.value = filter;
    saveState();
    renderOwned();
  }));
}
function renderAdsCalendar(){
  const p=getProj();
  if(!adsCalendar) return;
  if(!p){ adsMonthLabel.innerHTML='<b>-</b>'; adsCalendar.innerHTML=''; return; }
  const ym = state.adsCalendarYm || ymFromDate();
  adsMonthLabel.innerHTML = `<b>${ym.replace('-', '년 ')}월</b>`;
  const selected = Array.isArray(state.adsSelectedDates) ? state.adsSelectedDates : [];
  const filter = adsFilter.value || 'all';
  const dow = ['일','월','화','수','목','금','토'].map(x=>`<div class="calDow">${x}</div>`).join('');
  const cells = buildMonthCells(ym).map(iso=>{
    const muted = !iso.startsWith(ym);
    const isToday = iso===toISODate(new Date());
    const isSelected = selected.includes(iso);
    const day = Number(iso.slice(8,10));
    const items = p.adsEntries.filter(e=>e.date===iso && (filter==='all' || e.platform===filter));
    const spend = items.reduce((a,b)=>a+Number(b.spend||0),0);
    const realDb = items.reduce((a,b)=>a+Number(b.realDb||0),0);
    const clicks = items.reduce((a,b)=>a+Number(b.clicks||0),0);
    const itemHtml = items.map(e=>`<div class="calItem ${e.platform==='meta'?'red':'blue'}"><span class="name">${e.platform==='meta'?'메타':'구글'}</span><span class="value">${fmtInt(e.realDb)}건</span></div>`).join('');
    return `<div class="calCell ${muted?'muted':''} ${isToday?'today':''} ${isSelected?'selected':''}" data-ads-date="${escapeAttr(iso)}">
      <div class="calDate"><b>${day}</b>${realDb?`<span class="badge"><b>${fmtInt(realDb)} DB</b></span>`:''}</div>
      <div class="calItems">${itemHtml || '<div class="small">등록 없음</div>'}</div>
      <div class="calSummary">${items.length ? `예산 ${fmtWon(spend)} · 클릭 ${fmtInt(clicks)}` : ''}</div>
    </div>`;
  }).join('');
  adsCalendar.innerHTML = `<div class="calendarGrid">${dow}${cells}</div>`;
  adsCalendar.querySelectorAll('[data-ads-date]').forEach(el=>el.addEventListener('click', ()=>{
    const iso = el.dataset.adsDate;
    state.adsSelectedDates = toggleDateSelection(state.adsSelectedDates, iso);
    adsDate.value = iso;
    saveState();
    renderAds();
  }));
}

function renderMain(){
  const p=getProj();
  if(!p){
    statDates.textContent='0';
    kpiTotalDb.textContent='0';
    kpiPaidDb.textContent='0';
    kpiOwnedDb.textContent='0';
    kpiExpectedRev.textContent='₩0';
    mainTbody.innerHTML = `
      <tr>
        <td class="sticky" colspan="9" style="text-align:center;color:#64748b;padding:24px 10px">
          ${isLoggedIn() ? '프로젝트를 먼저 만들어줘.' : '로그인 후 데이터를 불러와줘.'}
        </td>
      </tr>
    `;
    requestAnimationFrame(()=>{
      drawDbChart(chartDb, []);
      drawDailySpendChart(chartDailySpend, [], 0);
    });
    return;
  }

  const {rows,last}=buildMainRows(p);
  statDates.textContent=rows.length;

  if(!last){
    kpiTotalDb.textContent='0';
    kpiPaidDb.textContent='0';
    kpiOwnedDb.textContent='0';
    kpiExpectedRev.textContent='₩0';
  }else{
    kpiTotalDb.textContent=fmtInt(last.recruitDb);
    kpiPaidDb.textContent=fmtInt(last.paidCum);
    kpiOwnedDb.textContent=fmtInt(last.ownedCum);
    kpiExpectedRev.textContent=fmtWon(last.expectedRev);
  }

  mainTbody.innerHTML = rows.length ? rows.map((r)=>`
    <tr>
      <td class="sticky">${r.date}</td>
      <td class="num">${fmtInt(r.ownedCum)}</td>
      <td class="num">${fmtInt(r.paidCum)}</td>
      <td class="num">${fmtInt(r.recruitDb)}</td>
      <td class="num">${fmtWon(r.dailyBudget)}</td>
      <td class="num">${fmtWon(r.spendDay)}</td>
      <td class="num">${fmtWon(r.spendCum)}</td>
      <td class="center mono">${r.spendRate===null?'':fmtRate(r.spendRate)}</td>
      <td class="num">${fmtWon(r.expectedRev)}</td>
    </tr>
  `).join('') : `
    <tr>
      <td class="sticky" colspan="9" style="text-align:center;color:#64748b;padding:24px 10px">데이터가 없습니다.</td>
    </tr>
  `;

  requestAnimationFrame(()=>{
    drawDbChart(chartDb, rows);
    drawDailySpendChart(chartDailySpend, rows, Number(p.cfg.dailyBudget||0));
  });
}
function refreshSettingsUI(){
  const p=getProj();
  if(!p){
    cfgDailyBudget.value = '';
    cfgInstructorRate.value = '';
    cfgAdShareCost.value = '';
    cfgValuePerDb.value = '';
    actualRevenue.value = '';
    prevDb.value = '';
    prevSpend.value = '';
    prevRevenue.value = '';
    prevProjSelect.innerHTML = '<option value="">(선택)</option>';
    prevLinkInfo.textContent = '현재: 이전기수 미연결';
    revenueCompareBox.textContent = isLoggedIn()
      ? '프로젝트를 생성하면 실매출/DB당가치/예상매출 비교가 여기 표시됨'
      : '로그인 후 프로젝트를 불러오면 실매출/DB당가치/예상매출 비교가 여기 표시됨';
    return;
  }

  cfgDailyBudget.value = p.cfg.dailyBudget ?? 0;
  cfgInstructorRate.value = fmtPercentValue(p.settlement?.instructorRate ?? 0);
  cfgAdShareCost.value = fmtPercentValue(p.settlement?.adShareRate ?? 0);
  rangeStart.value = p.cfg.rangeStart ?? '';
  rangeEnd.value   = p.cfg.rangeEnd ?? '';
  actualRevenue.value = p.actualRevenue ?? 0;

  const { last } = buildMainRows(p);
  const recruitFinal = last ? Number(last.recruitDb||0) : 0;
  const valuePerDbAuto = getValuePerDbAuto(p, recruitFinal);
  cfgValuePerDb.value = Math.round(valuePerDbAuto || 0);

  const sameInstructorProjects = listProjects()
    .filter(x=>x.id!==p.id && String(x.instructor||'').trim()===String(p.instructor||'').trim())
    .sort((a,b)=>projLabel(a).localeCompare(projLabel(b)));
  prevProjSelect.innerHTML = [`<option value="">(선택)</option>`].concat(
    sameInstructorProjects.map(x=>`<option value="${esc(x.id)}">${esc(projLabel(x))}</option>`)
  ).join('');

  if((p.prevLink?.mode || 'none') === 'none' && !isAutoPrevOptOut(p.id) && !hasPrevManualNumbers(p)){
    const autoCandidate = findAutoPrevProjectCandidate(p, listProjects());
    if(autoCandidate){
      p.prevLink = { mode:'linked', prevProjectId:autoCandidate.id, manual:{db:0,spend:0,revenue:0} };
    }
  }

  const mode=p.prevLink?.mode || 'none';
  const linkedId=p.prevLink?.prevProjectId || '';
  const manual=p.prevLink?.manual || {db:0,spend:0,revenue:0};

  prevDb.value = manual.db ?? 0;
  prevSpend.value = manual.spend ?? 0;
  prevRevenue.value = manual.revenue ?? 0;

  const prevValuePerDbFinal = getPrevValuePerDbForProject(p);

  if(mode==='linked' && linkedId && state.projects[linkedId]){
    prevProjSelect.value = linkedId;
    prevLinkInfo.textContent = `현재: 이전기수 연결됨 → ${projLabel(state.projects[linkedId])} (이전 DB당가치=${fmtWon(prevValuePerDbFinal)})`;
  }else if(mode==='manual'){
    prevProjSelect.value = '';
    prevLinkInfo.textContent = `현재: 이전기수 수동값 사용중 (이전 DB당가치=${fmtWon(prevValuePerDbFinal)})`;
  }else{
    prevProjSelect.value = '';
    prevLinkInfo.textContent = `현재: 이전기수 미연결 (예상매출=0으로 계산)`;
  }

  const expected = prevValuePerDbFinal * recruitFinal;

  const instructorSettle = (Number(p.actualRevenue||0) * Number(p.settlement?.instructorRate||0) / 100);
  const totalAdSpend = (p.adsEntries||[]).reduce((a,b)=>a+Number(b.spend||0),0);
  const adShareAmount = totalAdSpend * Number(p.settlement?.adShareRate||0) / 100;
  revenueCompareBox.innerHTML =
    `<div class="revMainCard">` +
      `<div class="revMainTop">` +
        `<div>` +
          `<div class="revMainLabel">현재 실매출</div>` +
          `<div class="revMainValue">${fmtWon(p.actualRevenue||0)}</div>` +
        `</div>` +
        `<span class="revPill">모집DB ${fmtInt(recruitFinal)}</span>` +
      `</div>` +
      `<div class="revMainMeta">` +
        `<span class="revPill">현재 DB당 가치 ${fmtWon(valuePerDbAuto)}</span>` +
        `<span class="revPill">이전기수 DB당 가치 ${fmtWon(prevValuePerDbFinal)}</span>` +
        `<span class="revPill">예상매출 ${fmtWon(expected)}</span>` +
      `</div>` +
    `</div>` +
    `<div class="revMiniGrid">` +
      `<div class="revMiniCard">` +
        `<div class="revMiniLabel">강사 정산 예상액</div>` +
        `<div class="revMiniValue">${fmtWon(instructorSettle)}</div>` +
        `<div class="revMiniMeta">정산비율 ${fmtRate(Number(p.settlement?.instructorRate||0)/100)}</div>` +
      `</div>` +
      `<div class="revMiniCard">` +
        `<div class="revMiniLabel">광고 분담 예상액</div>` +
        `<div class="revMiniValue">${fmtWon(adShareAmount)}</div>` +
        `<div class="revMiniMeta">분담비율 ${fmtRate(Number(p.settlement?.adShareRate||0)/100)}</div>` +
      `</div>` +
      `<div class="revMiniCard">` +
        `<div class="revMiniLabel">총 광고비 기준</div>` +
        `<div class="revMiniValue">${fmtWon(totalAdSpend)}</div>` +
        `<div class="revMiniMeta">광고DB 누적 기준입니다.</div>` +
      `</div>` +
      `<div class="revMiniCard">` +
        `<div class="revMiniLabel">현 모집DB 기준 예상매출</div>` +
        `<div class="revMiniValue">${fmtWon(expected)}</div>` +
        `<div class="revMiniMeta">이전 DB당 가치 × 현 모집DB</div>` +
      `</div>` +
    `</div>`;
}
function renderAll(){
  updateAuthUi();

  if(!hasProject()){
    resetUiForNoProject();
    return;
  }

  refreshProjectSelect();
  refreshHeaderBadges();
  renderMain();
  renderOwned();
  renderAds();

  const cmpVisible = $('view-compare').style.display !== 'none';
  if(cmpVisible) renderCompare();
  else renderCompareGraph();

  refreshSettingsUI();
}

/** =========================
 *  CSV 강사/기수 자동정리
 *  ========================= */
