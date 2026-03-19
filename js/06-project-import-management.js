function normalizeQuarterKey(v){
  return String(v ?? '').replace(/\s+/g,' ').trim();
}
function parseInstructorItemFromB(raw){
  const s = String(raw ?? '').trim();
  if(!s) return null;
  const cleaned = s.replace(/\s*\/\s*\d+기\s*$/,'').trim();
  let instructor='', item='';
  if(cleaned.includes('_')){
    const parts = cleaned.split('_').map(x=>x.trim()).filter(Boolean);
    instructor = parts.shift() || '';
    item = parts.join(' ').trim();
  }else{
    const parts = cleaned.split(/\s+/).filter(Boolean);
    instructor = parts.shift() || '';
    item = parts.join(' ').trim();
  }
  instructor = instructor.trim();
  item = item.trim();
  if(!instructor || !item) return null;
  return { instructor, item };
}
function buildProjectsFromQuarterCsvRows(rows){
  if(!rows || !rows.length) return [];
  const quarterOrder = [];
  const quarterSeen = new Set();
  const comboQuarterSeen = new Set();
  const comboCount = new Map();
  const out = [];

  for(let i=0;i<rows.length;i++) {
    const row = rows[i] || [];
    const quarter = normalizeQuarterKey(row[0]);
    const rawB = String(row[1] ?? '').trim();
    const parsed = parseInstructorItemFromB(rawB);
    if(!quarter || !parsed) continue;
    if(!/분기/.test(quarter)) continue;
    if(!rawB.includes('_')) continue;

    const lowerB = rawB.toLowerCase();
    if(i===0 && (lowerB.includes('강사') || lowerB.includes('아이템') || lowerB.includes('캠페인'))) {
      continue;
    }

    if(!quarterSeen.has(quarter)){
      quarterSeen.add(quarter);
      quarterOrder.push(quarter);
    }

    const comboKey = `${parsed.instructor}||${parsed.item}`;
    const comboQuarterKey = `${comboKey}||${quarter}`;
    if(comboQuarterSeen.has(comboQuarterKey)) continue;
    comboQuarterSeen.add(comboQuarterKey);

    const nextNo = (comboCount.get(comboKey) || 0) + 1;
    comboCount.set(comboKey, nextNo);

    out.push({
      quarter,
      quarterIndex: quarterOrder.indexOf(quarter),
      instructor: parsed.instructor,
      item: parsed.item,
      cohortNo: nextNo,
      cohortLabel: `${parsed.item}/${nextNo}기`
    });
  }

  out.sort((a,b)=>{
    if(a.quarterIndex !== b.quarterIndex) return a.quarterIndex - b.quarterIndex;
    const ai = `${a.instructor} ${a.item}`.localeCompare(`${b.instructor} ${b.item}`, 'ko');
    if(ai !== 0) return ai;
    return a.cohortNo - b.cohortNo;
  });

  return out;
}
function buildProjectsFromInstructorCohortRows(rows){
  if(!rows || !rows.length) return [];
  const seen = new Set();
  const out = [];

  for(let i=0;i<rows.length;i++){
    const row = rows[i] || [];
    const instructor = String(row[0] ?? '').trim();
    const item = String(row[1] ?? '').trim();
    const cohort = String(row[3] ?? '').trim();

    if(!instructor && !item && !cohort) continue;
    if(i===0 && ((instructor.includes('강사') && item.includes('아이템')) || cohort.includes('기수'))) continue;
    if(!instructor || !item || !cohort) continue;

    const cohortLabel = `${item}/${cohort}`;
    const key = `${instructor}||${cohortLabel}`;
    if(seen.has(key)) continue;
    seen.add(key);

    out.push({ instructor, item, cohort, cohortLabel });
  }

  out.sort((a,b)=>{
    const ai = a.instructor.localeCompare(b.instructor, 'ko');
    if(ai !== 0) return ai;
    const ii = a.item.localeCompare(b.item, 'ko');
    if(ii !== 0) return ii;
    const an = parseInt(String(a.cohort).replace(/\D+/g,''),10) || 0;
    const bn = parseInt(String(b.cohort).replace(/\D+/g,''),10) || 0;
    return an - bn;
  });

  return out;
}
async function createProjectsFromStructuredRows(rows, doneTitle='강사별 기수정리 완료'){
  await ensureAuth();
  requireLogin();

  const projectsToCreate = buildProjectsFromInstructorCohortRows(rows);
  if(!projectsToCreate.length){
    alert('A열 강사명 / B열 아이템 / D열 기수 형식으로 인식된 데이터가 없습니다.');
    return;
  }

  const existing = new Set(listProjects().map(p => `${(p.instructor||'').trim()}||${(p.cohort||'').trim()}`));
  let created = 0, skipped = 0;
  let lastId = '';

  for(const item of projectsToCreate){
    const key = `${item.instructor}||${item.cohortLabel}`;
    if(existing.has(key)){
      skipped++;
      continue;
    }
    const np = await createProjectOnDb(item.instructor, item.cohortLabel, true);
    existing.add(key);
    created++;
    lastId = np?.id || lastId;
  }

  if(lastId && state.projects[lastId]) state.currentProjectId = lastId;
  saveState();
  renderAll();
  closeProjectMenu();
  showToast(doneTitle, `생성 ${fmtInt(created)}건 · 중복 건너뜀 ${fmtInt(skipped)}건`);
}
async function importProjectCsv(text){
  const rows = parseCSV(text);
  if(rows.length < 1) {
    alert('CSV가 비어있어');
    return;
  }
  await createProjectsFromStructuredRows(rows, '강사별 기수정리 완료');
}
async function importProjectWorkbook(file){
  if(typeof XLSX === 'undefined'){
    alert('XLSX 로드 실패(CDN 차단 가능). CSV로 업로드해줘.');
    return;
  }
  const ab = await file.arrayBuffer();
  const wb = XLSX.read(ab, { type:'array', cellDates:true });
  const targetName = wb.SheetNames.find(n => String(n).trim() === '강사별_기수정리') || wb.SheetNames[0];
  const ws = wb.Sheets[targetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header:1, raw:true, defval:'' });
  if(rows.length < 1){
    alert('엑셀 시트가 비어있어');
    return;
  }
  await createProjectsFromStructuredRows(rows, '강사별 기수정리 업로드 완료');
}


async function importProjectsFromZip(file, onProgress){
  const payload = await buildZipAdsPreview(file, onProgress);
  if(!payload.items.length){
    const extra = payload.unmatchedSamples?.length ? `
예시: ${payload.unmatchedSamples.join(', ')}` : '';
    alert('ZIP 내부에서 광고DB로 반영할 파일을 찾지 못했습니다. 파일명은 "번호_강사명_아이템_기수_구글/메타.csv" 형식이어야 합니다. (ZIP 내부는 CSV만 지원합니다.)' + extra);
    return;
  }
  renderZipPreviewModal(payload);
}

const PROJECT_BATCH_TYPE_TOKENS = new Set([
  '프로젝트','설정','요약','summary','import','매출','광고db','광고','온드db','온드','data','업로드'
]);
const PROJECT_BATCH_HEADER_ALIASES = {
  actualRevenue: ['실매출','매출','매출액','최종매출','결제매출','actualrevenue','revenue'],
  dailyBudget: ['일예산','일별예산','예산','dailybudget','budget'],
  prevDb: ['이전db','이전기수db','이전모집db','prevdb'],
  prevRevenue: ['이전매출','이전기수매출','이전기수실매출','이전기수revenue','prevrevenue'],
  prevSpend: ['이전광고비','이전기수광고비','prevspend'],
  instructorRate: ['강사정산비율','정산비율','강사비율','instructorrate'],
  adShareRate: ['광고분담비율','광고비분담비율','광고분담','adsharerate'],
  date: ['일자','날짜','date','entrydate','신청일'],
  media: ['온드매체','온드매체명','매체','미디어','ownedmedia'],
  addDb: ['추가db','온드db','owneddb','추가디비'],
  platform: ['플랫폼','광고매체','매체구분','platform'],
  spend: ['광고비','spend'],
  clicks: ['클릭','클릭수','clicks'],
  realDb: ['실db','광고db','paiddb','전환db','realdb','리드수'],
  metaSpend: ['메타광고비','meta광고비','metaspent','metaspend'],
  metaClicks: ['메타클릭','meta클릭','metaclicks'],
  metaRealDb: ['메타실db','메타광고db','메타전환db','metarealdb'],
  googleSpend: ['구글광고비','google광고비','googlespend'],
  googleClicks: ['구글클릭','google클릭','googleclicks'],
  googleRealDb: ['구글실db','구글광고db','구글전환db','googlerealdb']
};
function normalizeBatchKey(v){
  return String(v ?? '').replace(/\s+/g,'').replace(/[()\[\]{}\-_/]/g,'').toLowerCase();
}
function hasMeaningfulValue(v){
  return !(v === null || v === undefined || String(v).trim() === '');
}
function parseProjectBatchFilename(base){
  const rawBase = String(base || '').split('/').pop() || '';
  if(!rawBase) return null;
  const extMatch = rawBase.match(/\.([^.]+)$/);
  const ext = (extMatch?.[1] || '').toLowerCase();
  if(!['csv','xlsx','xls','tsv'].includes(ext)) return null;
  const stem = rawBase.replace(/\.[^.]+$/,'');
  let parts = stem.split('_').map(v=>String(v || '').trim()).filter(Boolean);
  if(!parts.length) return null;
  if(/^\d+$/.test(parts[0])) parts = parts.slice(1);
  if(parts.length < 3) return null;
  const lastNorm = normalizeBatchKey(parts[parts.length-1]);
  if(PROJECT_BATCH_TYPE_TOKENS.has(lastNorm)) parts = parts.slice(0,-1);
  let cohortIdx = -1;
  for(let i=parts.length-1;i>=0;i--){
    if(/^\d+기$/.test(String(parts[i] || '').trim())){ cohortIdx = i; break; }
  }
  if(cohortIdx < 1) return null;
  const instructor = String(parts[0] || '').trim();
  const cohort = String(parts[cohortIdx] || '').trim();
  const item = parts.slice(1, cohortIdx).join('_').trim();
  if(!instructor || !item || !cohort) return null;
  return { instructor, item, cohort, cohortLabel:`${item}/${cohort}`, ext, base: rawBase };
}
function readProjectBatchMatrixFromRows(rows){
  const dataRows = Array.isArray(rows) ? rows : [];
  const headerIndex = dataRows.findIndex(r => Array.isArray(r) && r.some(v => String(v ?? '').trim() !== ''));
  if(headerIndex < 0) return { headers:[], rows:[] };
  const headers = (dataRows[headerIndex] || []).map(v => String(v ?? '').trim());
  const body = dataRows.slice(headerIndex + 1).filter(r => Array.isArray(r) && r.some(v => String(v ?? '').trim() !== ''));
  return { headers, rows: body };
}
function getHeaderIndexMap(headers){
  const normalized = headers.map(normalizeBatchKey);
  const out = {};
  for(const [key, aliases] of Object.entries(PROJECT_BATCH_HEADER_ALIASES)){
    out[key] = normalized.findIndex(v => aliases.includes(v));
  }
  return out;
}
function cellValue(row, idx){
  return idx >= 0 ? row[idx] : '';
}
function normalizePlatformValue(v){
  const raw = String(v || '').trim();
  const s = normalizeBatchKey(v);
  if(!s) return '';
  if(s.includes('meta') || s.includes('메타') || s.includes('facebook') || s.includes('페북') || s.includes('fb')) return 'meta';
  if(s.includes('google') || s.includes('구글') || s.includes('gdn') || s.includes('youtube') || s.includes('유튜브')) return 'google';
  if(raw === 'm') return 'meta';
  if(raw === 'g') return 'google';
  return '';
}
function aggregateProjectBatchRows(rows){
  const adsMap = new Map();
  const ownedMap = new Map();
  for(const row of rows || []){
    if(row?.date && row?.platform){
      const key = `${row.date}||${row.platform}`;
      const cur = adsMap.get(key) || { date:row.date, platform:row.platform, spend:0, clicks:0, realDb:0 };
      cur.spend += Number(row.spend || 0);
      cur.clicks += Number(row.clicks || 0);
      cur.realDb += Number(row.realDb || 0);
      adsMap.set(key, cur);
    }
  }
  for(const row of rows || []){
    if(row?.date && row?.media){
      const media = String(row.media || '').trim();
      if(!media) continue;
      const key = `${row.date}||${media}`;
      const cur = ownedMap.get(key) || { date:row.date, media, addDb:0 };
      cur.addDb += Number(row.addDb || 0);
      ownedMap.set(key, cur);
    }
  }
  return {
    adsRows: Array.from(adsMap.values()).sort((a,b)=> `${a.date} ${a.platform}`.localeCompare(`${b.date} ${b.platform}`,'ko')),
    ownedRows: Array.from(ownedMap.values()).sort((a,b)=> `${a.date} ${a.media}`.localeCompare(`${b.date} ${b.media}`,'ko'))
  };
}
function extractProjectBatchPayload(rows){
  const matrix = readProjectBatchMatrixFromRows(rows);
  const headers = matrix.headers;
  const dataRows = matrix.rows;
  if(!headers.length || !dataRows.length){
    return { recognized:false, reason:'헤더 또는 데이터 행이 없습니다' };
  }
  const idx = getHeaderIndexMap(headers);
  let revenueSum = 0, revenueCount = 0;
  let dailyBudgetValue, prevDbValue, prevRevenueValue, prevSpendValue, instructorRateValue, adShareRateValue;
  const adsRaw = [];
  const ownedRaw = [];

  for(const row of dataRows){
    const revenueCell = cellValue(row, idx.actualRevenue);
    if(hasMeaningfulValue(revenueCell)){
      revenueSum += parseNumberRounded(revenueCell);
      revenueCount += 1;
    }
    const budgetCell = cellValue(row, idx.dailyBudget);
    if(hasMeaningfulValue(budgetCell)) dailyBudgetValue = parseNumberRounded(budgetCell);
    const prevDbCell = cellValue(row, idx.prevDb);
    if(hasMeaningfulValue(prevDbCell)) prevDbValue = parseNumberRounded(prevDbCell);
    const prevRevenueCell = cellValue(row, idx.prevRevenue);
    if(hasMeaningfulValue(prevRevenueCell)) prevRevenueValue = parseNumberRounded(prevRevenueCell);
    const prevSpendCell = cellValue(row, idx.prevSpend);
    if(hasMeaningfulValue(prevSpendCell)) prevSpendValue = parseNumberRounded(prevSpendCell);
    const instructorRateCell = cellValue(row, idx.instructorRate);
    if(hasMeaningfulValue(instructorRateCell)) instructorRateValue = parseNumberLoose(instructorRateCell);
    const adShareRateCell = cellValue(row, idx.adShareRate);
    if(hasMeaningfulValue(adShareRateCell)) adShareRateValue = parseNumberLoose(adShareRateCell);

    const date = normalizeDateFromAny(cellValue(row, idx.date));
    if(!date) continue;

    const media = String(cellValue(row, idx.media) || '').trim();
    const addDbCell = cellValue(row, idx.addDb);
    if(media && hasMeaningfulValue(addDbCell)){
      ownedRaw.push({ date, media, addDb: parseNumberRounded(addDbCell) });
    }

    const platform = normalizePlatformValue(cellValue(row, idx.platform));
    const spendCell = cellValue(row, idx.spend);
    const clicksCell = cellValue(row, idx.clicks);
    const realDbCell = cellValue(row, idx.realDb);
    if(platform && (hasMeaningfulValue(spendCell) || hasMeaningfulValue(clicksCell) || hasMeaningfulValue(realDbCell))){
      adsRaw.push({
        date,
        platform,
        spend: parseNumberRounded(spendCell),
        clicks: parseNumberRounded(clicksCell),
        realDb: parseNumberRounded(realDbCell)
      });
    }

    const metaSpendCell = cellValue(row, idx.metaSpend);
    const metaClicksCell = cellValue(row, idx.metaClicks);
    const metaRealDbCell = cellValue(row, idx.metaRealDb);
    if(hasMeaningfulValue(metaSpendCell) || hasMeaningfulValue(metaClicksCell) || hasMeaningfulValue(metaRealDbCell)){
      adsRaw.push({
        date,
        platform:'meta',
        spend: parseNumberRounded(metaSpendCell),
        clicks: parseNumberRounded(metaClicksCell),
        realDb: parseNumberRounded(metaRealDbCell)
      });
    }

    const googleSpendCell = cellValue(row, idx.googleSpend);
    const googleClicksCell = cellValue(row, idx.googleClicks);
    const googleRealDbCell = cellValue(row, idx.googleRealDb);
    if(hasMeaningfulValue(googleSpendCell) || hasMeaningfulValue(googleClicksCell) || hasMeaningfulValue(googleRealDbCell)){
      adsRaw.push({
        date,
        platform:'google',
        spend: parseNumberRounded(googleSpendCell),
        clicks: parseNumberRounded(googleClicksCell),
        realDb: parseNumberRounded(googleRealDbCell)
      });
    }
  }

  const aggregated = aggregateProjectBatchRows(adsRaw.map(x=>({ ...x })).concat([]));
  const ownedAggregated = aggregateProjectBatchRows(ownedRaw.map(x=>({ ...x })).concat([]));
  const adsRows = aggregated.adsRows;
  const ownedRows = ownedAggregated.ownedRows;

  const result = {
    headers,
    actualRevenue: revenueCount > 0 ? revenueSum : undefined,
    dailyBudget: dailyBudgetValue,
    prevDb: prevDbValue,
    prevRevenue: prevRevenueValue,
    prevSpend: prevSpendValue,
    instructorRate: instructorRateValue,
    adShareRate: adShareRateValue,
    adsRows,
    ownedRows
  };
  const recognized = [
    result.actualRevenue,
    result.dailyBudget,
    result.prevDb,
    result.prevRevenue,
    result.prevSpend,
    result.instructorRate,
    result.adShareRate
  ].some(v => v !== undefined) || adsRows.length > 0 || ownedRows.length > 0;

  return {
    recognized,
    reason: recognized ? '' : '인식 가능한 헤더가 없습니다',
    payload: result
  };
}
async function readProjectBatchRowsFromFile(file){
  const name = String(file?.name || '').toLowerCase();
  if(name.endsWith('.csv') || name.endsWith('.tsv')){
    const text = await file.text();
    return parseCSV(text);
  }
  if(name.endsWith('.xlsx') || name.endsWith('.xls')){
    if(typeof XLSX === 'undefined') throw new Error('XLSX 로드 실패(CDN 차단 가능). CSV로 업로드해줘.');
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab, { type:'array', cellDates:true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { header:1, raw:true, defval:'' });
  }
  throw new Error('지원하지 않는 파일 형식입니다. csv / xlsx / xls 형식만 지원합니다.');
}
function findProjectForBatchMeta(meta){
  const exactKey = makeProjectKey(meta.instructor, meta.cohortLabel);
  const exact = listProjects().find(p => makeProjectKey(p.instructor, p.cohort) === exactKey);
  if(exact) return exact;
  const instructorKey = normalizeProjectKeyPart(meta.instructor);
  const cohortKey = normalizeProjectKeyPart(meta.cohort);
  const itemKey = normalizeProjectKeyPart(meta.item);
  return listProjects().find(p => {
    const pInstructor = normalizeProjectKeyPart(p.instructor);
    const pCohort = normalizeProjectKeyPart(p.cohort);
    return pInstructor === instructorKey && pCohort.includes(itemKey) && pCohort.includes(cohortKey);
  }) || null;
}
async function applyProjectBatchPayloadToProject(project, parsedPayload){
  const p = project;
  let metaChanged = false;
  const payload = parsedPayload || {};

  if(payload.actualRevenue !== undefined){
    p.actualRevenue = Number(payload.actualRevenue || 0);
    metaChanged = true;
  }
  if(payload.dailyBudget !== undefined){
    p.cfg.dailyBudget = Number(payload.dailyBudget || 0);
    metaChanged = true;
  }
  if(payload.prevDb !== undefined || payload.prevRevenue !== undefined || payload.prevSpend !== undefined){
    p.prevLink = {
      mode:'manual',
      prevProjectId:'',
      manual:{
        db:Number(payload.prevDb || 0),
        spend:Number(payload.prevSpend || 0),
        revenue:Number(payload.prevRevenue || 0)
      }
    };
    metaChanged = true;
  }
  if(payload.instructorRate !== undefined || payload.adShareRate !== undefined){
    p.settlement = {
      instructorRate: normalizePercentInput(payload.instructorRate !== undefined ? payload.instructorRate : (p.settlement?.instructorRate || 0)),
      adShareRate: normalizePercentInput(payload.adShareRate !== undefined ? payload.adShareRate : (p.settlement?.adShareRate || 0))
    };
    setExtraCfg(p.id, p.settlement);
  }

  if(metaChanged) await updateProjectMetaOnDb(p);
  if(payload.ownedRows?.length) await bulkUpsertOwnedOnDb(p.id, payload.ownedRows);
  if(payload.adsRows?.length) await bulkUpsertAdsOnDb(p.id, payload.adsRows);

  return {
    adsCount: Number(payload.adsRows?.length || 0),
    ownedCount: Number(payload.ownedRows?.length || 0),
    revenueApplied: payload.actualRevenue !== undefined,
    budgetApplied: payload.dailyBudget !== undefined,
    prevApplied: payload.prevDb !== undefined || payload.prevRevenue !== undefined || payload.prevSpend !== undefined,
    settlementApplied: payload.instructorRate !== undefined || payload.adShareRate !== undefined
  };
}
function parseNumberOrNull(v){
  if(v === undefined || v === null || String(v).trim() === '') return null;
  const n = parseNumberLoose(v);
  return Number.isFinite(n) ? n : null;
}
function normalizeLooseProjectText(v){
  return String(v || '').toLowerCase().replace(/[\s_\-\/|]+/g,'').trim();
}
function parseMetaBatchHeaderName(v){
  return String(v || '').toLowerCase().replace(/\s+/g,'').replace(/[()]/g,'').trim();
}
function resolveMetaBatchColumnIndexes(headerRow){
  const headers = (headerRow || []).map(parseMetaBatchHeaderName);
  const findIdx = (aliases)=> headers.findIndex(h => aliases.includes(h));
  return {
    projectName: findIdx(['프로젝트명','프로젝트','프로젝트라벨','기수명','프로젝트이름']),
    instructor: findIdx(['강사명','강사']),
    item: findIdx(['아이템명','아이템','상품명']),
    cohort: findIdx(['기수','기수명','코호트']),
    actualRevenue: findIdx(['실매출','결제금액','매출액','최종결제매출']),
    dailyBudget: findIdx(['일예산','예산','광고일예산']),
    prevDb: findIdx(['이전db','이전모집db','이전기수db','이전db수']),
    prevSpend: findIdx(['이전광고비','이전총예산','이전기수광고비','이전예산']),
    prevRevenue: findIdx(['이전매출','이전실매출','이전기수매출']),
    instructorRate: findIdx(['강사정산비율','정산비율','강사비율']),
    adShareRate: findIdx(['광고분담비율','광고비분담비율','광고분담률'])
  };
}
function hasMetaBatchRecognizedColumns(indexes){
  return Object.values(indexes || {}).some(v => Number.isInteger(v) && v >= 0);
}
function parseMetaBatchProjectName(raw){
  const src = String(raw || '').trim();
  if(!src) return null;
  const cleaned = src.replace(/\.[^.]+$/,'').trim();
  const tokens = cleaned.split(/[ _/|-]+/).map(x=>String(x || '').trim()).filter(Boolean);
  if(tokens.length >= 3 && /^\d+기$/i.test(tokens[tokens.length - 1])){
    const cohort = tokens[tokens.length - 1];
    const instructor = tokens[0];
    const item = tokens.slice(1, -1).join(' ').trim();
    if(instructor && item){
      return { instructor, item, cohort, cohortLabel:`${item}/${cohort}` };
    }
  }
  return null;
}
function readMetaBatchRow(row, idx){
  const projectName = String(cellValue(row, idx.projectName) || '').trim();
  const instructor = String(cellValue(row, idx.instructor) || '').trim();
  const item = String(cellValue(row, idx.item) || '').trim();
  const cohort = String(cellValue(row, idx.cohort) || '').trim();
  const actualRevenue = parseNumberOrNull(cellValue(row, idx.actualRevenue));
  const dailyBudget = parseNumberOrNull(cellValue(row, idx.dailyBudget));
  const prevDb = parseNumberOrNull(cellValue(row, idx.prevDb));
  const prevSpend = parseNumberOrNull(cellValue(row, idx.prevSpend));
  const prevRevenue = parseNumberOrNull(cellValue(row, idx.prevRevenue));
  const instructorRate = parseNumberOrNull(cellValue(row, idx.instructorRate));
  const adShareRate = parseNumberOrNull(cellValue(row, idx.adShareRate));
  const parsedProjectName = parseMetaBatchProjectName(projectName);

  const hasAnyValue = [actualRevenue, dailyBudget, prevDb, prevSpend, prevRevenue, instructorRate, adShareRate].some(v => v !== null && v !== undefined);
  if(!projectName && !instructor && !item && !cohort && !hasAnyValue) return null;

  return {
    projectName,
    instructor: instructor || parsedProjectName?.instructor || '',
    item: item || parsedProjectName?.item || '',
    cohort: cohort || parsedProjectName?.cohort || '',
    actualRevenue,
    dailyBudget,
    prevDb,
    prevSpend,
    prevRevenue,
    instructorRate,
    adShareRate
  };
}
function buildMetaBatchCohortLabel(rowData){
  if(rowData.item && rowData.cohort) return `${rowData.item}/${rowData.cohort}`;
  if(rowData.projectName){
    const raw = String(rowData.projectName).trim();
    if(raw.includes('/')) return raw;
    const parsed = parseMetaBatchProjectName(raw);
    if(parsed?.cohortLabel) return parsed.cohortLabel;
  }
  if(rowData.cohort) return rowData.cohort;
  return '';
}
function findProjectForMetaBatchRow(rowData){
  const all = listProjects();
  const projectText = normalizeLooseProjectText(rowData.projectName);
  if(projectText){
    const exact = all.filter(p => {
      const cohortOnly = normalizeLooseProjectText(p.cohort);
      const full1 = normalizeLooseProjectText(`${p.instructor}_${p.cohort}`);
      const full2 = normalizeLooseProjectText(`${p.instructor}/${p.cohort}`);
      const full3 = normalizeLooseProjectText(`${p.instructor} ${p.cohort}`);
      return projectText === cohortOnly || projectText === full1 || projectText === full2 || projectText === full3;
    });
    if(exact.length === 1) return exact[0];
  }

  const instructorKey = normalizeProjectKeyPart(rowData.instructor);
  const cohortLabel = buildMetaBatchCohortLabel(rowData);
  const cohortKey = normalizeProjectKeyPart(cohortLabel);
  if(instructorKey && cohortKey){
    const exact = all.find(p => normalizeProjectKeyPart(p.instructor) === instructorKey && normalizeProjectKeyPart(p.cohort) === cohortKey);
    if(exact) return exact;
  }

  if(projectText){
    const looseCandidates = all.filter(p => normalizeLooseProjectText(`${p.instructor}${p.cohort}`).includes(projectText) || projectText.includes(normalizeLooseProjectText(`${p.instructor}${p.cohort}`)));
    if(looseCandidates.length === 1) return looseCandidates[0];
  }

  return null;
}
async function applyMetaBatchRowToProject(project, rowData){
  const p = project;
  let changed = false;

  if(rowData.actualRevenue !== null && rowData.actualRevenue !== undefined){
    p.actualRevenue = Number(rowData.actualRevenue || 0);
    changed = true;
  }
  if(rowData.dailyBudget !== null && rowData.dailyBudget !== undefined){
    p.cfg.dailyBudget = Number(rowData.dailyBudget || 0);
    changed = true;
  }
  if([rowData.prevDb, rowData.prevSpend, rowData.prevRevenue].some(v => v !== null && v !== undefined)){
    p.prevLink = {
      mode:'manual',
      prevProjectId:'',
      manual:{
        db:Number(rowData.prevDb || 0),
        spend:Number(rowData.prevSpend || 0),
        revenue:Number(rowData.prevRevenue || 0)
      }
    };
    changed = true;
  }
  if([rowData.instructorRate, rowData.adShareRate].some(v => v !== null && v !== undefined)){
    p.settlement = {
      instructorRate: normalizePercentInput(rowData.instructorRate !== null && rowData.instructorRate !== undefined ? rowData.instructorRate : (p.settlement?.instructorRate || 0)),
      adShareRate: normalizePercentInput(rowData.adShareRate !== null && rowData.adShareRate !== undefined ? rowData.adShareRate : (p.settlement?.adShareRate || 0))
    };
    setExtraCfg(p.id, p.settlement);
    changed = true;
  }

  if(changed){
    await updateProjectMetaOnDb(p);
  }
  return changed;
}
async function importProjectMetaBatchFile(file){
  await ensureAuth();
  requireLogin();

  const rows = await readProjectBatchRowsFromFile(file);
  if(!rows || rows.length < 2){
    alert('업로드 파일에 데이터가 없습니다.');
    return;
  }

  const idx = resolveMetaBatchColumnIndexes(rows[0] || []);
  if(!hasMetaBatchRecognizedColumns(idx)){
    alert('헤더를 인식하지 못했어.\n필수 예시: 프로젝트명, 실매출, 일예산, 이전DB, 이전광고비, 이전매출');
    return;
  }

  const logs = [];
  let appliedCount = 0;
  let createdCount = 0;
  let skippedCount = 0;
  let failCount = 0;
  let lastProjectId = '';

  for(let i=1;i<rows.length;i++){
    const rowData = readMetaBatchRow(rows[i], idx);
    if(!rowData) continue;

    const hasAnyValue = [rowData.actualRevenue, rowData.dailyBudget, rowData.prevDb, rowData.prevSpend, rowData.prevRevenue, rowData.instructorRate, rowData.adShareRate].some(v => v !== null && v !== undefined);
    if(!hasAnyValue){
      skippedCount++;
      logs.push(`건너뜀 · ${i+1}행 · 반영할 숫자값이 없습니다`);
      continue;
    }

    let project = findProjectForMetaBatchRow(rowData);
    if(!project){
      const instructor = rowData.instructor;
      const cohortLabel = buildMetaBatchCohortLabel(rowData);
      if(instructor && cohortLabel){
        project = await createProjectOnDb(instructor, cohortLabel, true);
        createdCount++;
      }else{
        failCount++;
        logs.push(`실패 · ${i+1}행 · 프로젝트를 찾지 못했고 자동 생성 정보도 부족해`);
        continue;
      }
    }

    try{
      const changed = await applyMetaBatchRowToProject(project, rowData);
      lastProjectId = project.id || lastProjectId;
      if(changed){
        appliedCount++;
        const parts = [];
        if(rowData.actualRevenue !== null && rowData.actualRevenue !== undefined) parts.push('실매출');
        if(rowData.dailyBudget !== null && rowData.dailyBudget !== undefined) parts.push('일예산');
        if([rowData.prevDb, rowData.prevSpend, rowData.prevRevenue].some(v => v !== null && v !== undefined)) parts.push('이전기수값');
        if([rowData.instructorRate, rowData.adShareRate].some(v => v !== null && v !== undefined)) parts.push('비율');
        logs.push(`완료 · ${i+1}행 → ${project.instructor} / ${project.cohort} · ${parts.join(', ')}`);
      }else{
        skippedCount++;
        logs.push(`건너뜀 · ${i+1}행 · 변경된 값이 없습니다`);
      }
    }catch(err){
      failCount++;
      logs.push(`실패 · ${i+1}행 · ${err?.message || '반영 실패'}`);
    }
  }

  if(lastProjectId && state.projects[lastProjectId]) state.currentProjectId = lastProjectId;
  saveState();
  renderAll();

  const previewLogs = logs.slice(0, 18).join('\n');
  alert(
    `추가입력값 일괄업로드 완료\n` +
    `- 반영 ${fmtInt(appliedCount)}행\n` +
    `- 자동 생성 ${fmtInt(createdCount)}개\n` +
    `- 건너뜀 ${fmtInt(skippedCount)}행\n` +
    `- 실패 ${fmtInt(failCount)}행\n\n` +
    previewLogs +
    (logs.length > 18 ? `\n...외 ${fmtInt(logs.length - 18)}건` : '')
  );
}

async function importProjectBatchFiles(files){
  await ensureAuth();
  requireLogin();

  const list = Array.from(files || []);
  if(!list.length){
    alert('업로드할 파일이 없습니다.');
    return;
  }

  const logs = [];
  let createdCount = 0;
  let successCount = 0;
  let failCount = 0;
  let lastProjectId = '';

  for(const file of list){
    const meta = parseProjectBatchFilename(file.name);
    if(!meta){
      failCount++;
      logs.push(`실패 · ${file.name} · 파일명에서 강사/아이템/기수를 인식하지 못했어`);
      continue;
    }

    let project = findProjectForBatchMeta(meta);
    try{
      const rows = await readProjectBatchRowsFromFile(file);
      const parsed = extractProjectBatchPayload(rows);
      if(!parsed.recognized){
        failCount++;
        logs.push(`실패 · ${file.name} · ${parsed.reason || '인식 가능한 헤더가 없습니다'}`);
        continue;
      }
      if(!project){
        project = await createProjectOnDb(meta.instructor, meta.cohortLabel, true);
        createdCount += 1;
      }
      const applied = await applyProjectBatchPayloadToProject(project, parsed.payload);
      successCount++;
      lastProjectId = project.id || lastProjectId;
      const parts = [];
      if(applied.revenueApplied) parts.push('실매출');
      if(applied.budgetApplied) parts.push('일예산');
      if(applied.prevApplied) parts.push('이전기수값');
      if(applied.settlementApplied) parts.push('정산비율');
      if(applied.adsCount) parts.push(`광고DB ${fmtInt(applied.adsCount)}행`);
      if(applied.ownedCount) parts.push(`온드DB ${fmtInt(applied.ownedCount)}행`);
      logs.push(`완료 · ${file.name} → ${project.instructor} / ${project.cohort} · ${parts.join(', ') || '반영값 없음'}`);
    }catch(err){
      failCount++;
      logs.push(`실패 · ${file.name} · ${err?.message || '반영 실패'}`);
    }
  }

  if(lastProjectId && state.projects[lastProjectId]) state.currentProjectId = lastProjectId;
  saveState();
  renderAll();
  closeProjectMenu();

  const previewLogs = logs.slice(0, 18).join('\n');
  alert(
    `프로젝트 파일 일괄반영 완료\n` +
    `- 성공 ${fmtInt(successCount)}개\n` +
    `- 실패 ${fmtInt(failCount)}개\n` +
    `- 자동 생성 ${fmtInt(createdCount)}개\n\n` +
    previewLogs +
    (logs.length > 18 ? `\n...외 ${fmtInt(logs.length - 18)}건` : '') +
    `\n\n지원 헤더 예시: 날짜, 플랫폼, 광고비, 클릭, 실DB, 온드매체, 추가DB, 실매출, 일예산, 이전DB, 이전매출`
  );
}

/** =========================
 *  Project management
 *  ========================= */
async function createProject(){
  const instructor = prompt('강사명 입력', '강사명')?.trim();
  if(!instructor) return;

  const cohort = prompt('기수/라벨 입력', 'n기')?.trim();
  if(!cohort) return;

  try{
    await createProjectOnDb(instructor, cohort);
    renderAll();
  }catch(err){
    console.error(err);
    alert(err?.message || '프로젝트 생성 실패');
  }
}
async function renameProject(){
  const p=getProj();
  if(!p) return alert('프로젝트를 먼저 선택해줘');

  const nextInstructor = prompt('변경할 강사명', p.instructor)?.trim();
  if(!nextInstructor) return;

  const nextCohort = prompt('변경할 기수/라벨', p.cohort)?.trim();
  if(!nextCohort) return;

  if(nextInstructor===p.instructor && nextCohort===p.cohort){
    toast('변경된 내용이 없습니다.');
    return;
  }

  const dup = Object.values(state.projects).find(x => x.id!==p.id && String(x.instructor||'').trim()===nextInstructor && String(x.cohort||'').trim()===nextCohort);
  if(dup){
    return alert(`동일한 프로젝트명이 이미 있습니다.\n- ${projLabel(dup)}`);
  }

  try{
    p.instructor = nextInstructor;
    p.cohort = nextCohort;
    if((p.prevLink?.mode || 'none') !== 'manual' && !isAutoPrevOptOut(p.id)){
      p.prevLink = { mode:'none', prevProjectId:'', manual:{db:0,spend:0,revenue:0} };
      await maybeAutoLinkPrevProject(p, { persist:false, force:true });
    }
    await updateProjectMetaOnDb(p);
    renderAll();
    toast('프로젝트 이름을 변경했어');
  }catch(err){
    console.error(err);
    alert(err?.message || '프로젝트 이름 변경 실패');
  }
}

async function duplicateProject(){
  const p=getProj();
  if(!p) return alert('프로젝트를 먼저 선택해줘');

  const newCohort = prompt('복제본 기수/라벨', `${p.cohort} (복제)`)?.trim();
  if(!newCohort) return;

  try{
    const np = await createProjectOnDb(p.instructor, newCohort, true);
    const newProj = state.projects[np.id];

    newProj.cfg = deepClone(p.cfg);
    newProj.actualRevenue = Number(p.actualRevenue || 0);
    newProj.prevLink = deepClone(p.prevLink);
    newProj.settlement = deepClone(p.settlement || { instructorRate:0, adShareRate:0 });
    const sourceExtra = getExtraCfg(p.id);
    setExtraCfg(newProj.id, { ...newProj.settlement, autoPrevOptOut: !!sourceExtra.autoPrevOptOut });

    if((newProj.prevLink?.mode || 'none') !== 'manual'){
      newProj.prevLink = { mode:'none', prevProjectId:'', manual:{db:0,spend:0,revenue:0} };
      await maybeAutoLinkPrevProject(newProj, { persist:false, force:true });
    }

    await updateProjectMetaOnDb(newProj);
    await bulkUpsertOwnedOnDb(newProj.id, p.ownedEntries.map(x => ({
      date:x.date,
      media:x.media,
      addDb:x.addDb
    })));
    await bulkUpsertAdsOnDb(newProj.id, p.adsEntries.map(x => ({
      date:x.date,
      platform:x.platform,
      spend:x.spend,
      clicks:x.clicks,
      realDb:x.realDb
    })));

    renderAll();
  }catch(err){
    console.error(err);
    alert(err?.message || '프로젝트 복제 실패');
  }
}
async function deleteProject(){
  const p=getProj();
  if(!p) return alert('프로젝트를 먼저 선택해줘');
  if(!confirm(`프로젝트 삭제할까?\n- ${projLabel(p)}\n(되돌릴 수 없음)`)) return;

  try{
    await deleteProjectOnDb(p.id);
    renderAll();
  }catch(err){
    console.error(err);
    alert(err?.message || '프로젝트 삭제 실패');
  }
}
