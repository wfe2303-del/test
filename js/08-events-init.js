/** =========================
 *  Tabs
 *  ========================= */
document.querySelectorAll('.tab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    const tab=btn.dataset.tab;
    ['main','owned','ads','compare','settings'].forEach(t=>{
      $('view-'+t).style.display = (t===tab)?'grid':'none';
    });
    if(tab==='compare') setTimeout(()=>{ renderCompare(); }, 30);
    if(tab==='settings') setTimeout(()=>refreshSettingsUI(), 30);
    if(tab==='main') setTimeout(()=>renderMain(), 30);
  });
});

function switchTab(tab){
  const target = document.querySelector(`.tab[data-tab="${tab}"]`);
  if(target) target.click();
}
function openMetaBatchUpload(){
  pendingUpload='project_meta_batch';
  fileInput.multiple = false;
  fileInput.value='';
  fileInput.click();
}

/** =========================
 *  General events
 *  ========================= */
projSelect.addEventListener('change', ()=> setCurrent(projSelect.value));
if(btnProjectMenu) btnProjectMenu.addEventListener('click', (e)=>{ e.stopPropagation(); toggleProjectMenu(); });
if(btnProjectMenuClose) btnProjectMenuClose.addEventListener('click', (e)=>{ e.stopPropagation(); closeProjectMenu(); });
if(projectMenuSearch) projectMenuSearch.addEventListener('input', ()=> renderProjectMenu());
document.addEventListener('click', (e)=>{
  if(!projectMenuPanel || !projectMenuPanel.classList.contains('open')) return;
  if(e.target.closest('#projectMenuPanel') || e.target.closest('#btnProjectMenu')) return;
  closeProjectMenu();
});
btnNewProj.addEventListener('click', createProject);
btnDupProj.addEventListener('click', duplicateProject);
btnRenameProj?.addEventListener('click', renameProject);
btnDelProj.addEventListener('click', deleteProject);
btnImportProjectMetaBatch?.addEventListener('click', openMetaBatchUpload);
btnQuickMetaBatch?.addEventListener('click', openMetaBatchUpload);
btnMobileMetaBatch?.addEventListener('click', openMetaBatchUpload);
btnMobileMenu?.addEventListener('click', ()=> toggleProjectMenu());
btnMobileSettings?.addEventListener('click', ()=> switchTab('settings'));

btnRecalc.addEventListener('click', ()=> renderAll());

btnReset.addEventListener('click', async ()=>{
  if(!isLoggedIn()) return alert('로그인 후 사용할 수 있어');
  if(!confirm('정말 전체 초기화할까? (모든 프로젝트/데이터 삭제)')) return;
  try{
    await clearAllDataOnDb();
    renderAll();
  }catch(err){
    console.error(err);
    alert(err?.message || '전체 초기화 실패');
  }
});

btnSaveRange.addEventListener('click', async ()=>{
  const p=getProj();
  if(!p) return alert('프로젝트를 먼저 선택해줘');

  p.cfg.rangeStart=(rangeStart.value||'').trim();
  p.cfg.rangeEnd=(rangeEnd.value||'').trim();

  try{
    await updateProjectMetaOnDb(p);
    saveState();
    renderAll();
    showToast('범위 저장 완료');
  }catch(err){
    console.error(err);
    alert(err?.message || '범위 저장 실패');
  }
});

// owned
btnAddOwned.addEventListener('click', async ()=> upsertOwned(ownedDate.value, ownedMedia.value, ownedAddDb.value));
btnDelOwned.addEventListener('click', async ()=> deleteOwned(ownedDate.value, ownedMedia.value));
ownedFilter.addEventListener('change', ()=> renderOwned());
ownedDate.addEventListener('change', ()=> renderOwnedCalendar());
btnOwnedClearSelection?.addEventListener('click', ()=>{ state.ownedSelectedDates = []; saveState(); renderOwned(); });
btnOwnedPrevMonth.addEventListener('click', ()=>{ state.ownedCalendarYm = addMonths(state.ownedCalendarYm || ymFromDate(), -1); renderOwnedCalendar(); });
btnOwnedNextMonth.addEventListener('click', ()=>{ state.ownedCalendarYm = addMonths(state.ownedCalendarYm || ymFromDate(), 1); renderOwnedCalendar(); });

// ads
btnAddAds.addEventListener('click', async ()=> upsertAds(adsDate.value, adsPlatform.value, adsSpend.value, adsClicks.value, adsRealDb.value));
btnDelAds.addEventListener('click', async ()=> deleteAds(adsDate.value, adsPlatform.value));
adsFilter.addEventListener('change', ()=> renderAds());
adsDate.addEventListener('change', ()=> renderAdsCalendar());
btnAdsClearSelection?.addEventListener('click', ()=>{ state.adsSelectedDates = []; saveState(); renderAds(); });
btnAdsPrevMonth.addEventListener('click', ()=>{ state.adsCalendarYm = addMonths(state.adsCalendarYm || ymFromDate(), -1); renderAdsCalendar(); });
btnAdsNextMonth.addEventListener('click', ()=>{ state.adsCalendarYm = addMonths(state.adsCalendarYm || ymFromDate(), 1); renderAdsCalendar(); });

// settings
btnSaveCfg.addEventListener('click', async ()=>{
  const p=getProj();
  if(!p) return alert('프로젝트를 먼저 선택해줘');

  p.cfg.dailyBudget=Number(cfgDailyBudget.value||0);
  p.settlement = {
    instructorRate:Number(cfgInstructorRate.value||0),
    adShareRate:Number(cfgAdShareCost.value||0)
  };
  setExtraCfg(p.id, p.settlement);
  try{
    await updateProjectMetaOnDb(p);
    renderAll();
    showToast('설정 저장 완료', '정산비율/광고 분담비율까지 저장했어.');
  }catch(err){
    console.error(err);
    alert(err?.message || '설정 저장 실패');
  }
});
btnSaveActualRevenue.addEventListener('click', async ()=>{
  const p=getProj();
  if(!p) return alert('프로젝트를 먼저 선택해줘');

  p.actualRevenue = Number(actualRevenue.value||0);
  try{
    await updateProjectMetaOnDb(p);
    renderAll();
    showToast('실매출 저장 완료');
  }catch(err){
    console.error(err);
    alert(err?.message || '실매출 저장 실패');
  }
});
btnLinkPrev.addEventListener('click', async ()=>{
  const p=getProj();
  if(!p) return alert('프로젝트를 먼저 선택해줘');

  const id=(prevProjSelect.value||'').trim();
  if(!id) return alert('이전기수 프로젝트를 선택해줘');

  p.prevLink = { mode:'linked', prevProjectId:id, manual:{db:0,spend:0,revenue:0} };

  try{
    await updateProjectMetaOnDb(p);
    renderAll();
    showToast('이전기수 연결 완료');
  }catch(err){
    console.error(err);
    alert(err?.message || '이전기수 연결 실패');
  }
});
btnUnlinkPrev.addEventListener('click', async ()=>{
  const p=getProj();
  if(!p) return alert('프로젝트를 먼저 선택해줘');

  p.prevLink = { mode:'none', prevProjectId:'', manual:{db:0,spend:0,revenue:0} };
  try{
    await updateProjectMetaOnDb(p);
    renderAll();
  }catch(err){
    console.error(err);
    alert(err?.message || '이전기수 해제 실패');
  }
});
btnSavePrevManual.addEventListener('click', async ()=>{
  const p=getProj();
  if(!p) return alert('프로젝트를 먼저 선택해줘');

  p.prevLink = {
    mode:'manual',
    prevProjectId:'',
    manual:{
      db:Number(prevDb.value||0),
      spend:Number(prevSpend.value||0),
      revenue:Number(prevRevenue.value||0)
    }
  };

  try{
    await updateProjectMetaOnDb(p);
    renderAll();
    showToast('이전기수 수동값 저장 완료');
  }catch(err){
    console.error(err);
    alert(err?.message || '이전기수 수동값 저장 실패');
  }
});

/** =========================
 *  Upload routing
 *  ========================= */
let pendingUpload=null;
btnOwnedXlsx.addEventListener('click', ()=>{ pendingUpload='owned_xlsx'; fileInput.multiple = false; fileInput.value=''; fileInput.click(); });
btnOwnedCsv.addEventListener('click', ()=>{ pendingUpload='owned_csv'; fileInput.multiple = false; fileInput.value=''; fileInput.click(); });
btnImportProjCsv?.addEventListener('click', ()=>{ pendingUpload='project_sheet'; fileInput.multiple = false; fileInput.value=''; fileInput.click(); });
btnImportProjBatch?.addEventListener('click', ()=>{ pendingUpload='project_batch_files'; fileInput.multiple = true; fileInput.value=''; fileInput.click(); });
btnImportProjZip?.addEventListener('click', (e)=>{
  e.preventDefault();
  e.stopPropagation();
  if(!zipFileInput){
    pendingUpload='project_zip';
    fileInput.multiple = false;
    fileInput.value='';
    fileInput.click();
    return;
  }
  zipFileInput.value='';
  zipFileInput.click();
});
btnMetaCsv.addEventListener('click', ()=>{ pendingUpload='ads_meta'; fileInput.multiple = false; fileInput.value=''; fileInput.click(); });
btnGoogleCsv.addEventListener('click', ()=>{ pendingUpload='ads_google'; fileInput.multiple = false; fileInput.value=''; fileInput.click(); });

fileInput.addEventListener('change', async ()=>{
  const files = Array.from(fileInput.files || []);
  const f = files[0];
  if(!f) return;
  const name=(f.name||'').toLowerCase();

  try{
    const loadingMap = {
      ads_meta:['메타 광고DB 업로드 중','CSV/엑셀을 읽어서 메타 광고DB에 반영하고 있어.'],
      ads_google:['구글 광고DB 업로드 중','CSV/엑셀을 읽어서 구글 광고DB에 반영하고 있어.'],
      owned_xlsx:['온드DB 업로드 중','엑셀을 읽어서 온드DB를 반영하고 있어.'],
      owned_csv:['온드DB 업로드 중','CSV를 읽어서 온드DB를 반영하고 있어.'],
      project_sheet:['프로젝트 정리표 업로드 중','강사/아이템/기수 데이터를 읽어서 프로젝트를 반영하고 있어.'],
      project_batch_files:['날짜/광고DB 파일 일괄반영 중','파일명으로 프로젝트를 찾고 헤더 기준으로 값을 밀어넣고 있어.'],
      project_meta_batch:['추가입력값 일괄업로드 중','프로젝트명/실매출/일예산 같은 설정값을 한 번에 반영하고 있어.'],
      project_zip:['ZIP 광고DB 분석 중','ZIP 파일 안의 구글/메타 파일을 분석하고 있어.']
    };
    const loadingInfo = loadingMap[pendingUpload] || ['업로드 중','파일을 처리하고 있어. 잠시만 기다려줘.'];
    showLoading(loadingInfo[0], loadingInfo[1]);
    if(pendingUpload==='ads_meta' || pendingUpload==='ads_google'){
      const platform = pendingUpload==='ads_meta'?'meta':'google';
      if(name.endsWith('.xlsx') || name.endsWith('.xls')){
        await importAdsXlsxForPlatform(f, platform);
        return;
      }
      const text=await f.text();
      await importAdsCsvForPlatform(text, platform);
      return;
    }

    if(pendingUpload==='owned_xlsx'){
      if(!(name.endsWith('.xlsx') || name.endsWith('.xls'))){
        alert('온드 엑셀은 .xlsx/.xls만 지원');
        return;
      }
      await importOwnedXlsx(f);
      return;
    }

    if(pendingUpload==='owned_csv'){
      const text=await f.text();
      await importOwnedCsv(text);
      return;
    }

    if(pendingUpload==='project_sheet'){
      if(name.endsWith('.xlsx') || name.endsWith('.xls')){
        await importProjectWorkbook(f);
        return;
      }
      const text=await f.text();
      await importProjectCsv(text);
      return;
    }

    if(pendingUpload==='project_batch_files'){
      await importProjectBatchFiles(files);
      return;
    }

    if(pendingUpload==='project_meta_batch'){
      await importProjectMetaBatchFile(f);
      return;
    }

    if(pendingUpload==='project_zip'){
      if(!name.endsWith('.zip')){
        alert('ZIP 일괄등록은 .zip 파일만 지원');
        return;
      }
      await importProjectsFromZip(f);
      return;
    }
  } finally {
    hideLoading();
    pendingUpload=null;
    fileInput.multiple = false;
    fileInput.value='';
  }
});

zipFileInput?.addEventListener('change', async (e)=>{
  const f = e.target?.files?.[0];
  try{
    if(!f) return;
    showLoading('ZIP 광고DB 분석 중', 'ZIP 안의 구글/메타 파일을 읽어서 미리보기를 만들고 있어.');
    const name = String(f.name || '').toLowerCase();
    if(!name.endsWith('.zip')){
      alert('ZIP 일괄등록은 .zip 파일만 지원');
      return;
    }
    showToast('ZIP 광고DB 분석 중', `${f.name} 파일을 읽는 중이야. 잠시만.`);
    await importProjectsFromZip(f);
  }catch(err){
    console.error(err);
    alert(err?.message || 'ZIP 광고DB 미리보기 생성 실패');
  }finally{
    hideLoading();
    if(zipFileInput) zipFileInput.value='';
  }
});


btnZipPreviewClose?.addEventListener('click', closeZipPreview);
btnZipPreviewCancel?.addEventListener('click', closeZipPreview);
btnZipPreviewApply?.addEventListener('click', async ()=>{
  try{
    btnZipPreviewApply.disabled = true;
    showLoading('광고DB 반영 중', '프로젝트를 만들고 ZIP 안의 구글/메타 광고DB를 서버에 저장하고 있어.');
    await applyZipAdsPreview(getZipDuplicateMode());
  }catch(err){
    console.error(err);
    alert((err?.message || 'ZIP 광고DB 반영 실패') + (err?.details ? `\n\n상세: ${err.details}` : '') + (err?.hint ? `\n힌트: ${err.hint}` : ''));
  }finally{
    hideLoading();
    btnZipPreviewApply.disabled = false;
  }
});
zipPreviewModal?.addEventListener('click', (e)=>{ if(e.target === zipPreviewModal) closeZipPreview(); });
document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape' && zipPreviewModal?.classList.contains('open')) closeZipPreview(); });

/** =========================
 *  Compare events
 *  ========================= */
btnApplyCompare.addEventListener('click', ()=>{
  state.compare.metric = cmpMetric.value;
  saveState();
  renderCompareGraph();
});

/** =========================
 *  Compare tooltip
 *  ========================= */
chartCompare.addEventListener('mousemove', (ev)=>{
  const rect=chartCompare.getBoundingClientRect();
  const mx=ev.clientX-rect.left;
  const my=ev.clientY-rect.top;

  let hit=-1;
  for(let i=0;i<compareHover.items.length;i++){
    const it=compareHover.items[i];
    if(mx>=it.x && mx<=it.x+it.w && my>=it.y && my<=it.y+it.h){ hit=i; break; }
  }
  if(hit>=0){
    const it=compareHover.items[hit];
    showTip(ev.clientX, ev.clientY, it.tooltipLines, it.color);
  }else hideTip();
});
chartCompare.addEventListener('mouseleave', hideTip);

/** =========================
 *  Main chart tooltip
 *  ========================= */
function nearestPoint(points, mx, my, radius=10){
  let best=null, bestD=Infinity;
  const r2=radius*radius;
  for(const p of points){
    const dx=mx-p.x, dy=my-p.y;
    const d=dx*dx+dy*dy;
    if(d<=r2 && d<bestD){ best=p; bestD=d; }
  }
  return best;
}
chartDailySpend.addEventListener('mousemove', (ev)=>{
  const rect=chartDailySpend.getBoundingClientRect();
  const mx=ev.clientX-rect.left;
  const my=ev.clientY-rect.top;
  const p=nearestPoint(mainHover.spendPoints, mx, my, 12);
  if(p){
    showTip(ev.clientX, ev.clientY, [`${p.date}`, `사용예산: ${fmtWon(p.spend)}`], 'rgba(37,99,235,.95)');
  }else hideTip();
});
chartDailySpend.addEventListener('mouseleave', hideTip);

chartDb.addEventListener('mousemove', (ev)=>{
  const rect=chartDb.getBoundingClientRect();
  const mx=ev.clientX-rect.left;

  if(!mainHover.dbPoints.length){ hideTip(); return; }
  let best=mainHover.dbPoints[0], bestDx=Infinity;
  for(const pt of mainHover.dbPoints){
    const dx=Math.abs(mx-pt.x);
    if(dx<bestDx){ best=pt; bestDx=dx; }
  }
  if(bestDx<=14){
    showTip(ev.clientX, ev.clientY, [
      `${best.date}`,
      `Owned: ${fmtInt(best.owned)}`,
      `Paid: ${fmtInt(best.paid)}`,
      `모집DB: ${fmtInt(best.recruit)}`
    ], 'rgba(15,23,42,.9)');
  }else hideTip();
});
chartDb.addEventListener('mouseleave', hideTip);

window.addEventListener('resize', ()=>{
  const mainVisible = $('view-main').style.display !== 'none';
  const cmpVisible  = $('view-compare').style.display !== 'none';
  if(mainVisible) renderMain();
  if(cmpVisible) renderCompare();
});
window.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape') closeProjectMenu();
});

/** =========================
 *  Login events
 *  ========================= */
btnLogin.addEventListener('click', async ()=>{
  loginMsg.textContent = '';
  try{
    await loginWithIdPassword(loginId.value, loginPw.value);
    loginPw.value = '';
    updateAuthUi();
    await loadStateFromDb();
    if(Object.keys(state.projects).length > 0){
      ensureCompareIds();
    }
    renderAll();
  }catch(err){
    console.error(err);
    loginMsg.textContent = err?.message || '로그인 실패';
  }
});

loginPw.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter') btnLogin.click();
});

btnLogout.addEventListener('click', async ()=>{
  try{
    await logout();
    state.projects = {};
    state.currentProjectId = '';
    state.compare = defaultCompare('');
    saveState();
    renderAll();
  }catch(err){
    console.error(err);
    alert(err?.message || '로그아웃 실패');
  }
});

/** =========================
 *  init
 *  ========================= */
(async function init(){
  try{
    const today=toISODate(new Date());
    ownedDate.value=today;
    adsDate.value=today;

    await ensureAuth();
    updateAuthUi();

    if(isLoggedIn()){
      await loadStateFromDb();
      if(Object.keys(state.projects).length > 0){
        ensureCompareIds();
      }
    }
    renderAll();
  }catch(err){
    console.error(err);
    alert('초기 로딩 실패: Supabase URL / anon key / Email 로그인 / RLS 설정을 확인해줘');
  }
})();
