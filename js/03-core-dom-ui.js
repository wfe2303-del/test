/** =========================
 *  DOM
 *  ========================= */
const $ = (id)=>document.getElementById(id);

const curProjLabel = $('curProjLabel');
const statDates = $('statDates');
const authStatus = $('authStatus');
const btnLogout = $('btnLogout');
const btnReset = $('btnReset');
const btnRecalc = $('btnRecalc');

const projSelect = $('projSelect');
const btnProjectMenu = $('btnProjectMenu');
const btnProjectMenuClose = $('btnProjectMenuClose');
const btnImportProjCsv = $('btnImportProjCsv');
const projectMenuPanel = $('projectMenuPanel');
const projectMenuSearch = $('projectMenuSearch');
const recentInstructorChips = $('recentInstructorChips');
const projectMenuMeta = $('projectMenuMeta');
const projectMenuList = $('projectMenuList');
const btnImportProjZip = $('btnImportProjZip');
const btnImportProjBatch = $('btnImportProjBatch');
const btnImportProjectMetaBatchMenu = $('btnImportProjectMetaBatchMenu');
const btnNewProj = $('btnNewProj');
const btnDupProj = $('btnDupProj');
const btnRenameProj = $('btnRenameProj');
const btnDelProj = $('btnDelProj');
const curInstructor = $('curInstructor');
const curCohort = $('curCohort');

const rangeStart = $('rangeStart');
const rangeEnd = $('rangeEnd');
const btnSaveRange = $('btnSaveRange');

const kpiTotalDb = $('kpiTotalDb');
const kpiPaidDb = $('kpiPaidDb');
const kpiOwnedDb = $('kpiOwnedDb');
const kpiExpectedRev = $('kpiExpectedRev');
const mainTbody = $('mainTbody');

const ownedFilter = $('ownedFilter');
const btnOwnedXlsx = $('btnOwnedXlsx');
const btnOwnedCsv = $('btnOwnedCsv');
const ownedDate = $('ownedDate');
const ownedMedia = $('ownedMedia');
const ownedAddDb = $('ownedAddDb');
const btnAddOwned = $('btnAddOwned');
const btnDelOwned = $('btnDelOwned');
const ownedTbody = $('ownedTbody');
const ownedCalendar = $('ownedCalendar');
const ownedMonthLabel = $('ownedMonthLabel');
const btnOwnedClearSelection = $('btnOwnedClearSelection');
const btnOwnedPrevMonth = $('btnOwnedPrevMonth');
const btnOwnedNextMonth = $('btnOwnedNextMonth');

const btnMetaCsv = $('btnMetaCsv');
const btnGoogleCsv = $('btnGoogleCsv');
const adsFilter = $('adsFilter');
const adsDate = $('adsDate');
const adsPlatform = $('adsPlatform');
const adsSpend = $('adsSpend');
const adsClicks = $('adsClicks');
const adsRealDb = $('adsRealDb');
const btnAddAds = $('btnAddAds');
const btnDelAds = $('btnDelAds');
const adsTbody = $('adsTbody');
const adsCalendar = $('adsCalendar');
const adsMonthLabel = $('adsMonthLabel');
const btnAdsClearSelection = $('btnAdsClearSelection');
const btnAdsPrevMonth = $('btnAdsPrevMonth');
const btnAdsNextMonth = $('btnAdsNextMonth');
const kpiAvgCpc = $('kpiAvgCpc');
const kpiAvgCpa = $('kpiAvgCpa');
const kpiCvr = $('kpiCvr');
const kpiAdSpend = $('kpiAdSpend');

const cmpVsTbody = $('cmpVsTbody');
const cmpMetricPicker = $('cmpMetricPicker');
const cmpSummaryBadges = $('cmpSummaryBadges');
const cmpLeftInstructorSearch = $('cmpLeftInstructorSearch');
const cmpLeftInstructor = $('cmpLeftInstructor');
const cmpLeftProject = $('cmpLeftProject');
const cmpRightInstructor = $('cmpRightInstructor');
const cmpRightProject = $('cmpRightProject');
const cmpLeftTitle = $('cmpLeftTitle');
const cmpRightTitle = $('cmpRightTitle');

const cmpMetric = $('cmpMetric');
const btnApplyCompare = $('btnApplyCompare');
const cmpGraphTitle = $('cmpGraphTitle');
const cmpGraphSub = $('cmpGraphSub');
const chartCompare = $('chartCompare');

const cfgDailyBudget = $('cfgDailyBudget');
const cfgInstructorRate = $('cfgInstructorRate');
const cfgAdShareCost = $('cfgAdShareCost');
const cfgValuePerDb = $('cfgValuePerDb');
const btnSaveCfg = $('btnSaveCfg');
const prevProjSelect = $('prevProjSelect');
const btnLinkPrev = $('btnLinkPrev');
const btnUnlinkPrev = $('btnUnlinkPrev');
const btnOpenPrevManual = $('btnOpenPrevManual');
const prevDb = $('prevDb');
const prevSpend = $('prevSpend');
const prevRevenue = $('prevRevenue');
const btnSavePrevManual = $('btnSavePrevManual');
const btnPrevManualClose = $('btnPrevManualClose');
const btnPrevManualCancel = $('btnPrevManualCancel');
const prevManualModal = $('prevManualModal');
const prevLinkInfo = $('prevLinkInfo');
const actualRevenue = $('actualRevenue');
const btnSaveActualRevenue = $('btnSaveActualRevenue');
const revenueCompareBox = $('revenueCompareBox');
const btnImportProjectMetaBatch = $('btnImportProjectMetaBatch');
const btnQuickMetaBatch = $('btnQuickMetaBatch');
const btnMobileMenu = $('btnMobileMenu');
const btnMobileMetaBatch = $('btnMobileMetaBatch');
const btnMobileSettings = $('btnMobileSettings');

const loginOverlay = $('loginOverlay');
const loginId = $('loginId');
const loginPw = $('loginPw');
const btnLogin = $('btnLogin');
const loginMsg = $('loginMsg');

const instructorHero = $('instructorHero');
const pageInstructorTitle = $('pageInstructorTitle');
const pageInstructorSub = $('pageInstructorSub');
const instructorHeroStats = $('instructorHeroStats');
const instructorCohortChips = $('instructorCohortChips');
const nextCalcBaseLabel = $('nextCalcBaseLabel');
const nextCalcNextLabel = $('nextCalcNextLabel');
const nextCalcExtraSpend = $('nextCalcExtraSpend');
const nextCalcSummary = $('nextCalcSummary');
const nextCalcProjectedRevenue = $('nextCalcProjectedRevenue');
const nextCalcProjectedSub = $('nextCalcProjectedSub');
const nextCalcAddedDb = $('nextCalcAddedDb');
const nextCalcCpa = $('nextCalcCpa');
const nextCalcValuePerDb = $('nextCalcValuePerDb');
const btnOpenCompareTab = $('btnOpenCompareTab');

const fileInput = $('fileInput');
const zipFileInput = $('zipFileInput');
const zipPreviewModal = $('zipPreviewModal');
const loadingOverlay = $('loadingOverlay');
const loadingTitleEl = $('loadingTitle');
const loadingSubEl = $('loadingSub');
const loadingProgressWrap = $('loadingProgressWrap');
const loadingProgressBar = $('loadingProgressBar');
const loadingProgressText = $('loadingProgressText');

function updateLoadingProgress(percent=null, text=''){
  if(!loadingProgressWrap || !loadingProgressBar || !loadingProgressText) return;
  if(percent === null || percent === undefined || Number.isNaN(Number(percent))){
    loadingProgressWrap.style.display = 'none';
    loadingProgressBar.style.width = '0%';
    loadingProgressText.textContent = '';
    return;
  }
  const safe = Math.max(0, Math.min(100, Math.round(Number(percent))));
  loadingProgressWrap.style.display = '';
  loadingProgressBar.style.width = `${safe}%`;
  loadingProgressText.textContent = text || `${safe}%`;
}
function showLoading(title='로딩 중', sub='파일을 읽고 데이터를 반영하고 있어. 잠시만 기다려줘.') {
  if(loadingTitleEl) loadingTitleEl.textContent = title;
  if(loadingSubEl) loadingSubEl.textContent = sub;
  updateLoadingProgress(null, '');
  if(loadingOverlay){
    loadingOverlay.classList.add('open');
    loadingOverlay.setAttribute('aria-hidden','false');
  }
  document.body.style.overflow = 'hidden';
}
function hideLoading(){
  updateLoadingProgress(null, '');
  if(loadingOverlay){
    loadingOverlay.classList.remove('open');
    loadingOverlay.setAttribute('aria-hidden','true');
  }
  if(!zipPreviewModal?.classList.contains('open')) document.body.style.overflow = '';
}
const btnZipPreviewClose = $('btnZipPreviewClose');
const btnZipPreviewCancel = $('btnZipPreviewCancel');
const btnZipPreviewApply = $('btnZipPreviewApply');
const zipPreviewStats = $('zipPreviewStats');
const zipPreviewErrors = $('zipPreviewErrors');
const zipPreviewTbody = $('zipPreviewTbody');
const zipPreviewFootHint = $('zipPreviewFootHint');
const tip = $('tooltip');
const toast = $('toast');
const chartDb = $('chartDb');
const chartDailySpend = $('chartDailySpend');

/** =========================
 *  Tooltip
 *  ========================= */
function showTip(x,y,lines,color){
  tip.style.display='block';
  tip.style.left = x+'px';
  tip.style.top  = y+'px';
  tip.innerHTML = lines.map((t,i)=>{
    if(i===0) return `<span style="color:${color};font-weight:900">${esc(t)}</span>`;
    return `<b>${esc(t)}</b>`;
  }).join('<br/>');
}
function hideTip(){ tip.style.display='none'; }
let toastTimer=null;
function showToast(title, msg=''){
  if(!toast) return;
  toast.querySelector('.ttl').textContent = title || '';
  toast.querySelector('.msg').textContent = msg || '';
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toast.classList.remove('show'), 2200);
}

/** =========================
 *  Projects
 *  ========================= */
function rawProjects(){ return Object.values(state.projects || {}); }
function listProjects(){
  const all = rawProjects();
  const inst = getPageInstructorFilter ? getPageInstructorFilter() : '';
  const item = getPageItemFilter ? getPageItemFilter() : '';
  if(!inst) return all;
  return all.filter(p => {
    const instOk = String(p?.instructor || '').trim() === inst;
    if(!instOk) return false;
    if(!item) return true;
    const parsed = splitProjectCohortLabel ? splitProjectCohortLabel(p?.cohort) : { item: '' };
    return String(parsed?.item || '').trim() === item;
  });
}
function getProj(){
  const p = state.projects[state.currentProjectId];
  const scoped = listProjects();
  if(!p) return scoped[0] || null;
  if(!scoped.some(x => x.id === p.id)) return scoped[0] || null;
  return p;
}

function normalizeProjectKeyPart(v){ return String(v || '').replace(/\s+/g,'').trim().toLowerCase(); }
function makeProjectKey(instructor, cohort){ return `${normalizeProjectKeyPart(instructor)}||${normalizeProjectKeyPart(cohort)}`; }
function parseZipProjectFilename(base){
  const rawBase = String(base || '').split('/').pop() || '';
  if(!rawBase || /^파일목록_매니페스트/i.test(rawBase)) return null;
  const extMatch = rawBase.match(/\.([^.]+)$/);
  const ext = (extMatch?.[1] || '').toLowerCase();
  if(ext !== 'csv') return null;
  const stem = rawBase.replace(/\.[^.]+$/,'');
  let parts = stem.split('_').map(v=>String(v || '').trim()).filter(Boolean);
  if(!parts.length) return null;
  if(/^\d+$/.test(parts[0])) parts = parts.slice(1);
  if(parts.length < 4) return null;
  const media = String(parts[parts.length-1] || '').trim();
  const cohort = String(parts[parts.length-2] || '').trim();
  const instructor = String(parts[0] || '').trim();
  const item = parts.slice(1, -2).join('_').trim();
  if(!/^(구글|메타|google|meta)$/i.test(media)) return null;
  if(!/^\d+기$/.test(cohort)) return null;
  if(!instructor || !item) return null;
  return { instructor, item, cohort, media, ext, base: rawBase, cohortLabel:`${item}/${cohort}` };
}
function closeZipPreview(){
  if(!zipPreviewModal) return;
  zipPreviewModal.classList.remove('open');
  zipPreviewModal.setAttribute('aria-hidden','true');
  document.body.style.overflow = '';
}
function openZipPreview(){
  if(!zipPreviewModal) return;
  zipPreviewModal.classList.add('open');
  zipPreviewModal.setAttribute('aria-hidden','false');
  document.body.style.overflow = 'hidden';
}
function getZipDuplicateMode(){
  return document.querySelector('input[name="zipDupMode"]:checked')?.value || 'skip';
}
let pendingZipPreview = null;
function renderZipPreviewModal(payload){
  pendingZipPreview = payload;
  const stats = [
    { k:'인식 파일', v: fmtInt(payload.scannedFiles), s:'ZIP 안에서 패턴 인식된 파일 수' },
    { k:'기존 매칭 프로젝트', v: fmtInt(payload.matchedProjectCount || 0), s:'현재 등록된 프로젝트와 바로 연결된 개수' },
    { k:'자동 생성 예정', v: fmtInt(payload.missingProjectCount || 0), s:'프로젝트가 없으면 강사/아이템/기수 기준으로 새로 생성' },
    { k:'반영 후보 행', v: fmtInt(payload.totalRows || 0), s:'날짜+매체 기준 광고DB 업서트 후보 수' },
    { k:'기존 충돌 행', v: fmtInt(payload.duplicateRowCount || 0), s:'이미 같은 날짜·매체가 있는 광고DB 수' },
  ];
  zipPreviewStats.innerHTML = stats.map(x=>`<div class="previewStat"><div class="k">${escapeHtml(x.k)}</div><div class="v">${escapeHtml(x.v)}</div><div class="s">${escapeHtml(x.s)}</div></div>`).join('');
  const extra = [];
  if(payload.missingProjectSamples?.length){
    extra.push(`<b>프로젝트 미일치 예시</b><div style="margin-top:6px">${payload.missingProjectSamples.map(x=>escapeHtml(x)).join('<br/>')}</div>`);
  }
  if(payload.unmatchedSamples?.length){
    extra.push(`<b>형식 미인식 파일 예시</b><div style="margin-top:6px">${payload.unmatchedSamples.map(x=>escapeHtml(x)).join('<br/>')}</div>`);
  }
  if(extra.length){
    zipPreviewErrors.style.display = '';
    zipPreviewErrors.innerHTML = extra.join('<div style="height:10px"></div>');
  }else{
    zipPreviewErrors.style.display = 'none';
    zipPreviewErrors.innerHTML = '';
  }
  const rows = payload.items.slice(0, 160).map(item=>{
    const statusCls = item.missingProject ? 'new' : (item.duplicateRows > 0 ? 'dup' : 'new');
    const statusTxt = item.missingProject ? '자동 생성 후 반영' : (item.duplicateRows > 0 ? '중복 있음' : '신규 반영');
    return `<tr>
      <td><span class="previewStatus ${statusCls}">${statusTxt}</span></td>
      <td>${escapeHtml(item.instructor)}</td>
      <td>${escapeHtml(item.cohortLabel)}</td>
      <td>${fmtInt(item.fileCount || 0)}개</td>
      <td>${item.missingProject ? `<span class="small">자동 생성 예정</span><div class="small" style="margin-top:4px">${escapeHtml(item.instructor)} / ${escapeHtml(item.cohortLabel)}</div>` : escapeHtml(item.projectLabel || '')}<div class="small" style="margin-top:4px">후보 ${fmtInt(item.rowCount || 0)}행 · 충돌 ${fmtInt(item.duplicateRows || 0)}행</div></td>
    </tr>`;
  }).join('');
  zipPreviewTbody.innerHTML = rows || `<tr><td colspan="5" class="menuEmpty">인식된 광고DB 후보가 없어</td></tr>`;
  zipPreviewFootHint.textContent = payload.items.length > 160
    ? `미리보기는 160개만 표시 · 전체 ${fmtInt(payload.items.length)}개 후보`
    : `총 ${fmtInt(payload.items.length)}개 후보 · 기존 프로젝트 반영 ${fmtInt((payload.items||[]).filter(x=>!x.missingProject).length)}개 · 자동 생성 후 반영 ${fmtInt(payload.missingProjectCount || 0)}개`;
  openZipPreview();
}
function collectAdsAggRowsFromMatrix(rows, platform){
  const agg = new Map();
  for(const r of rows){
    const date = normalizeDateFromAny(r?.[1]);
    if(!date) continue;
    const realDb = parseNumberRounded(r?.[2]);
    const spend = parseNumberRounded(r?.[5]);
    const clicks = parseNumberRounded(r?.[8]);
    const cur = agg.get(date) || { spend:0, clicks:0, realDb:0 };
    cur.spend += spend;
    cur.clicks += clicks;
    cur.realDb += realDb;
    agg.set(date, cur);
  }
  return Array.from(agg.entries()).map(([date,v])=>({
    date,
    platform,
    spend:Number(v.spend || 0),
    clicks:Number(v.clicks || 0),
    realDb:Number(v.realDb || 0)
  }));
}
async function readZipAdsRows(entry, ext, platform){
  if(ext !== 'csv') return [];
  const text = await entry.async('string');
  return collectAdsAggRowsFromMatrix(parseCSV(text), platform);
}
async function buildZipAdsPreview(file, onProgress){
  if(typeof JSZip === 'undefined') throw new Error('ZIP 라이브러리 로드 실패(CDN 차단 가능). 잠시 후 다시 시도하거나 압축을 풀어서 사용해줘.');
  onProgress?.({ percent:2, text:'ZIP 파일을 여는 중...' });
  const ab = await file.arrayBuffer();
  onProgress?.({ percent:8, text:'압축 목록을 읽는 중...' });
  const zip = await JSZip.loadAsync(ab);
  const existingMap = new Map(listProjects().map(p => [makeProjectKey(p.instructor, p.cohort), p]));
  const grouped = new Map();
  const unmatched = [];
  const missingProjectSamples = [];
  let scannedFiles = 0;
  const zipEntries = Object.entries(zip.files).filter(([entryName, entry]) => !entry.dir && String(entryName || '').split('/').pop());
  const totalEntryCount = zipEntries.length || 1;

  for(let entryIndex=0; entryIndex<zipEntries.length; entryIndex++){
    const [entryName, entry] = zipEntries[entryIndex];
    const base = String(entryName).split('/').pop();
    onProgress?.({
      percent: 10 + Math.round((entryIndex / totalEntryCount) * 82),
      text: `ZIP 읽는 중 ${entryIndex+1}/${totalEntryCount} · ${base || '파일'}`
    });
    if(!base) continue;
    const parsed = parseZipProjectFilename(base);
    if(!parsed){
      if(!/^__macosx/i.test(entryName) && !/^파일목록_매니페스트/i.test(base) && unmatched.length < 12) unmatched.push(base);
      continue;
    }
    scannedFiles++;
    const projectKey = makeProjectKey(parsed.instructor, parsed.cohortLabel);
    const project = existingMap.get(projectKey) || null;
    const itemKey = projectKey;
    if(!grouped.has(itemKey)) grouped.set(itemKey, {
      key:itemKey,
      instructor:parsed.instructor,
      cohortLabel:parsed.cohortLabel,
      project,
      projectLabel: project ? `${project.instructor} / ${project.cohort}` : '',
      missingProject: !project,
      fileCount:0,
      rowsMap:new Map(),
      duplicateRows:0,
      files:[]
    });
    const bucket = grouped.get(itemKey);
    bucket.fileCount += 1;
    bucket.files.push(parsed.base);
    if(!project && missingProjectSamples.length < 12){
      const label = `${parsed.instructor} / ${parsed.cohortLabel}`;
      if(!missingProjectSamples.includes(label)) missingProjectSamples.push(label);
    }
    const adRows = await readZipAdsRows(entry, parsed.ext, /메타|meta/i.test(parsed.media) ? 'meta' : 'google');
    for(const r of adRows){
      const rowKey = `${r.date}||${r.platform}`;
      const cur = bucket.rowsMap.get(rowKey) || { ...r };
      if(bucket.rowsMap.has(rowKey)){
        cur.spend += Number(r.spend || 0);
        cur.clicks += Number(r.clicks || 0);
        cur.realDb += Number(r.realDb || 0);
      }
      bucket.rowsMap.set(rowKey, cur);
    }
  }

  onProgress?.({ percent:94, text:'프로젝트별로 묶고 중복을 계산하는 중...' });
  const items = Array.from(grouped.values()).map(item=>{
    const rows = Array.from(item.rowsMap.values()).sort((a,b)=> `${a.date} ${a.platform}`.localeCompare(`${b.date} ${b.platform}`,'ko'));
    let duplicateRows = 0;
    if(item.project){
      const existing = new Set((item.project.adsEntries || []).map(x=>`${x.date}||${x.platform}`));
      duplicateRows = rows.filter(r=>existing.has(`${r.date}||${r.platform}`)).length;
    }
    return {
      instructor:item.instructor,
      cohortLabel:item.cohortLabel,
      project:item.project,
      projectLabel:item.projectLabel,
      missingProject:item.missingProject,
      fileCount:item.fileCount,
      rowCount:rows.length,
      duplicateRows,
      rows,
      files:item.files,
      key:item.key
    };
  }).sort((a,b)=>`${a.instructor} ${a.cohortLabel}`.localeCompare(`${b.instructor} ${b.cohortLabel}`,'ko'));

  onProgress?.({ percent:100, text:`분석 완료 · 인식 파일 ${fmtInt(scannedFiles)}개` });
  return {
    scannedFiles,
    items,
    totalRows: items.reduce((a,b)=>a + Number(b.rowCount || 0), 0),
    duplicateRowCount: items.reduce((a,b)=>a + Number(b.duplicateRows || 0), 0),
    matchedProjectCount: items.filter(x=>!x.missingProject).length,
    missingProjectCount: items.filter(x=>x.missingProject).length,
    missingProjectSamples,
    unmatchedSamples: unmatched,
  };
}
async function applyZipAdsPreview(mode='skip', onProgress){
  const payload = pendingZipPreview;
  if(!payload || !Array.isArray(payload.items) || !payload.items.length){
    closeZipPreview();
    return;
  }
  await ensureAuth();
  requireLogin();
  let imported = 0, updated = 0, skipped = 0, createdProjects = 0, emptySkipped = 0;
  let lastId = state.currentProjectId || '';
  const touchedProjectIds = new Set();

  const totalItems = payload.items.length || 1;
  for(let itemIndex=0; itemIndex<payload.items.length; itemIndex++){
    const item = payload.items[itemIndex];
    onProgress?.({
      percent: 6 + Math.round((itemIndex / totalItems) * 88),
      text: `서버 반영 중 ${itemIndex+1}/${totalItems} · ${item.instructor} / ${item.cohortLabel}`
    });
    const normalizedRows = Array.isArray(item.rows)
      ? item.rows.filter(r => r && r.date && (r.platform==='google' || r.platform==='meta'))
      : [];

    if(!normalizedRows.length){
      emptySkipped++;
      continue;
    }

    let targetProject = item.project || null;
    if(!targetProject){
      targetProject = await createProjectOnDb(item.instructor, item.cohortLabel, true);
      item.project = targetProject;
      item.projectLabel = targetProject ? `${targetProject.instructor} / ${targetProject.cohort}` : '';
      item.missingProject = !targetProject;
      if(targetProject) createdProjects++;
    }
    if(!targetProject) continue;

    const existing = new Set((targetProject.adsEntries || []).map(x=>`${x.date}||${x.platform}`));
    const rowsToWrite = [];
    for(const r of normalizedRows){
      const key = `${r.date}||${r.platform}`;
      if(existing.has(key)){
        if(mode === 'update'){
          rowsToWrite.push(r);
          updated++;
        }else{
          skipped++;
        }
      }else{
        rowsToWrite.push(r);
        imported++;
      }
    }
    if(rowsToWrite.length){
      await bulkUpsertAdsOnDb(targetProject.id, rowsToWrite);
      touchedProjectIds.add(targetProject.id);
      lastId = targetProject.id || lastId;
    }
  }

  if(touchedProjectIds.size){
    await loadStateFromDb();
  }

  if(state.currentProjectId && state.projects[state.currentProjectId]){
    // keep current project selection after ZIP import
  }else if(lastId && state.projects[lastId]){
    state.currentProjectId = lastId;
  }
  onProgress?.({ percent:100, text:'저장 완료 · 화면을 갱신하는 중...' });
  saveState();
  renderAll();
  closeZipPreview();
  closeProjectMenu();
  showToast('ZIP 광고DB 반영 완료', `인식 파일 ${fmtInt(payload.scannedFiles)}개 · 프로젝트 생성 ${fmtInt(createdProjects)}건 · 신규 ${fmtInt(imported)}행 · 업데이트 ${fmtInt(updated)}행 · 건너뜀 ${fmtInt(skipped)}행${emptySkipped ? ` · 데이터없음 ${fmtInt(emptySkipped)}건` : ''}`);
}
function projLabel(p){ return `${p.instructor} / ${p.cohort}`; }
function hasProject(){ return !!getProj(); }


function setCurrent(id){
  state.currentProjectId=id;
  if(!state.compare) state.compare = defaultCompare(id);
  if(id){
    if(!state.projects[state.compare.leftId]) state.compare.leftId = id;
    state.compare.rightId = id;
    const p = state.projects[id];
    if(p?.instructor) pushRecentInstructor(p.instructor);
  }
  saveState();
  renderAll();
}
