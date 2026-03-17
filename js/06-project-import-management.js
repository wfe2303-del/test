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
    alert('A열 강사명 / B열 아이템 / D열 기수 형식으로 인식된 데이터가 없어');
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


async function importProjectsFromZip(file){
  const payload = await buildZipAdsPreview(file);
  if(!payload.items.length){
    const extra = payload.unmatchedSamples?.length ? `
예시: ${payload.unmatchedSamples.join(', ')}` : '';
    alert('ZIP 안에서 광고DB로 반영할 파일을 찾지 못했어. 파일명은 "번호_강사명_아이템_기수_구글/메타.csv" 형식이어야 해.' + extra);
    return;
  }
  renderZipPreviewModal(payload);
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
    toast('변경된 내용이 없어');
    return;
  }

  const dup = Object.values(state.projects).find(x => x.id!==p.id && String(x.instructor||'').trim()===nextInstructor && String(x.cohort||'').trim()===nextCohort);
  if(dup){
    return alert(`같은 프로젝트명이 이미 있어.\n- ${projLabel(dup)}`);
  }

  try{
    p.instructor = nextInstructor;
    p.cohort = nextCohort;
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
    setExtraCfg(newProj.id, newProj.settlement);

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
