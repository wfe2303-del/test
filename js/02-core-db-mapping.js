function loginIdLabelFromSession(){
  const email = authSession?.user?.email || '';
  if(email === 'classaround@gmail.com') return 'classaround';
  return email || '';
}

async function fetchAllRows(table, orderCol, ascending=true, pageSize=1000){
  await ensureAuth();
  requireLogin();

  const all = [];
  let from = 0;

  while(true){
    const to = from + pageSize - 1;
    const { data, error } = await sb
      .from(table)
      .select('*')
      .order(orderCol, { ascending })
      .range(from, to);

    if(error) throw error;

    const rows = Array.isArray(data) ? data : [];
    all.push(...rows);
    if(rows.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

function groupRowsByProjectId(rows){
  const map = new Map();
  for(const row of (rows || [])){
    const key = row.project_id;
    if(!key) continue;
    if(!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

async function fetchProjectExtraCfgRows(){
  await ensureAuth();
  requireLogin();
  try{
    const { data, error } = await sb
      .from('project_extra_configs')
      .select('project_id,instructor_rate,ad_share_rate,auto_prev_opt_out')
      .eq('owner_id', ownerId());
    if(error) throw error;
    return { available:true, rows:Array.isArray(data) ? data : [] };
  }catch(err){
    const msg = String(err?.message || '').toLowerCase();
    if(msg.includes('project_extra_configs') || msg.includes('relation') || msg.includes('schema cache')){
      return { available:false, rows:[] };
    }
    throw err;
  }
}

async function upsertProjectExtraCfgOnDb(project){
  await ensureAuth();
  requireLogin();
  const extra = getExtraCfg(project?.id);
  try{
    const { error } = await sb
      .from('project_extra_configs')
      .upsert({
        project_id: project.id,
        owner_id: ownerId(),
        instructor_rate: Number(extra.instructorRate || 0),
        ad_share_rate: Number(extra.adShareRate || 0),
        auto_prev_opt_out: !!extra.autoPrevOptOut
      }, { onConflict:'project_id' });
    if(error) throw error;
    return true;
  }catch(err){
    const msg = String(err?.message || '').toLowerCase();
    if(msg.includes('project_extra_configs') || msg.includes('relation') || msg.includes('schema cache')) return false;
    throw err;
  }
}

async function deleteProjectExtraCfgOnDb(projectId){
  await ensureAuth();
  requireLogin();
  try{
    const { error } = await sb
      .from('project_extra_configs')
      .delete()
      .eq('project_id', projectId)
      .eq('owner_id', ownerId());
    if(error) throw error;
    return true;
  }catch(err){
    const msg = String(err?.message || '').toLowerCase();
    if(msg.includes('project_extra_configs') || msg.includes('relation') || msg.includes('schema cache')) return false;
    throw err;
  }
}

/** =========================
 *  DB 매핑
 *  ========================= */
function mapProjectRowToState(projectRow, ownedRows, adsRows, serverExtraCfg){
  return {
    id: projectRow.id,
    instructor: projectRow.instructor,
    cohort: projectRow.cohort,
    ownedEntries: (ownedRows || [])
      .map(x => ({
        date: x.entry_date,
        media: x.media,
        addDb: Number(x.add_db || 0)
      })),
    adsEntries: (adsRows || [])
      .map(x => ({
        date: x.entry_date,
        platform: x.platform,
        spend: Number(x.spend || 0),
        clicks: Number(x.clicks || 0),
        realDb: Number(x.real_db || 0)
      })),
    cfg: {
      dailyBudget: Number(projectRow.daily_budget || 0),
      rangeStart: projectRow.range_start || '',
      rangeEnd: projectRow.range_end || ''
    },
    actualRevenue: Number(projectRow.actual_revenue || 0),
    prevLink: {
      mode: projectRow.prev_link_mode || 'none',
      prevProjectId: projectRow.prev_project_id || '',
      manual: {
        db: Number(projectRow.prev_manual_db || 0),
        spend: Number(projectRow.prev_manual_spend || 0),
        revenue: Number(projectRow.prev_manual_revenue || 0)
      }
    },
    settlement: (()=>{ const localExtra = getExtraCfg(projectRow.id); const extra = serverExtraCfg || localExtra || {}; if(serverExtraCfg){ setExtraCfg(projectRow.id, { instructorRate:Number(extra.instructor_rate || 0), adShareRate:Number(extra.ad_share_rate || 0), autoPrevOptOut:!!extra.auto_prev_opt_out }); } return {
      instructorRate: Number((serverExtraCfg ? extra.instructor_rate : extra.instructorRate) || 0),
      adShareRate: Number((serverExtraCfg ? extra.ad_share_rate : extra.adShareRate) || 0)
    }; })()
  };
}

async function maybeAutoLinkPrevProject(project, { persist=false, force=false } = {}){
  const p = project || null;
  if(!p) return false;

  if(!force){
    const mode = p.prevLink?.mode || 'none';
    if(mode === 'linked' || mode === 'manual') return false;
    if(isAutoPrevOptOut(p.id)) return false;
    if(hasPrevManualNumbers(p)) return false;
  }

  const candidate = findAutoPrevProjectCandidate(p, Object.values(state.projects || {}));
  if(!candidate) return false;
  if(p.prevLink?.mode === 'linked' && p.prevLink?.prevProjectId === candidate.id) return false;

  p.prevLink = { mode:'linked', prevProjectId:candidate.id, manual:{ db:0, spend:0, revenue:0 } };
  if(persist) await updateProjectMetaOnDb(p);
  return true;
}
async function applyAutoPrevLinksForLoadedProjects(){
  const projects = Object.values(state.projects || {}).sort((a,b)=>{
    const ai = String(a.instructor || '').localeCompare(String(b.instructor || ''), 'ko');
    if(ai !== 0) return ai;
    const ii = String(getProjectItemName(a) || '').localeCompare(String(getProjectItemName(b) || ''), 'ko');
    if(ii !== 0) return ii;
    return (getProjectCohortNo(a) || 0) - (getProjectCohortNo(b) || 0);
  });

  for(const project of projects){
    await maybeAutoLinkPrevProject(project, { persist:false });
  }
}

/** =========================
 *  DB 로드 / CRUD
 *  ========================= */
async function loadStateFromDb(){
  await ensureAuth();

  if(!isLoggedIn()){
    state.projects = {};
    state.currentProjectId = '';
    return;
  }

  const { data:projects, error:pErr } = await sb
    .from('projects')
    .select('*')
    .order('created_at', { ascending:true });

  if(pErr) throw pErr;

  const [ownedRows, adsRows, extraCfgResult] = await Promise.all([
    fetchAllRows('owned_entries', 'entry_date', true, 1000),
    fetchAllRows('ads_entries', 'entry_date', true, 1000),
    fetchProjectExtraCfgRows()
  ]);

  const ownedMap = groupRowsByProjectId(ownedRows);
  const adsMap = groupRowsByProjectId(adsRows);
  const extraCfgMap = new Map((extraCfgResult?.rows || []).map(row => [String(row.project_id || ''), row]));

  state.projects = {};

  if(!projects || projects.length===0){
    state.currentProjectId = '';
    return;
  }

  for(const row of projects){
    state.projects[row.id] = mapProjectRowToState(
      row,
      ownedMap.get(row.id) || [],
      adsMap.get(row.id) || [],
      extraCfgMap.get(String(row.id)) || null
    );
  }

  await applyAutoPrevLinksForLoadedProjects();

  const firstId = projects[0].id;
  const wantedId = state.currentProjectId;
  state.currentProjectId = state.projects[wantedId] ? wantedId : firstId;

  if(!state.compare) state.compare = defaultCompare(state.currentProjectId);
  if(!state.projects[state.compare.leftId]) state.compare.leftId = state.currentProjectId;
  if(!state.projects[state.compare.rightId]) state.compare.rightId = state.currentProjectId;

  saveState();
}
async function createProjectOnDb(instructor, cohort, silent=false){
  await ensureAuth();
  requireLogin();

  const payload = {
    owner_id: ownerId(),
    instructor,
    cohort,
    daily_budget: 0,
    range_start: null,
    range_end: null,
    actual_revenue: 0,
    prev_link_mode: 'none',
    prev_project_id: null,
    prev_manual_db: 0,
    prev_manual_spend: 0,
    prev_manual_revenue: 0
  };

  const { data, error } = await sb
    .from('projects')
    .insert(payload)
    .select()
    .single();

  if(error) throw error;

  state.projects[data.id] = mapProjectRowToState(data, [], []);
  setExtraCfg(data.id, { instructorRate:0, adShareRate:0, autoPrevOptOut:false });
  await upsertProjectExtraCfgOnDb(state.projects[data.id]);
  state.currentProjectId = data.id;

  if(!state.compare) state.compare = defaultCompare(data.id);
  state.compare.leftId = data.id;
  state.compare.rightId = data.id;

  await maybeAutoLinkPrevProject(state.projects[data.id], { persist:true });

  saveState();
  if(!silent) renderAll();
  return state.projects[data.id];
}
async function updateProjectMetaOnDb(project){
  await ensureAuth();
  requireLogin();

  const { error } = await sb
    .from('projects')
    .update({
      instructor: project.instructor,
      cohort: project.cohort,
      daily_budget: Number(project.cfg?.dailyBudget || 0),
      range_start: project.cfg?.rangeStart || null,
      range_end: project.cfg?.rangeEnd || null,
      actual_revenue: Number(project.actualRevenue || 0),
      prev_link_mode: project.prevLink?.mode || 'none',
      prev_project_id: project.prevLink?.prevProjectId || null,
      prev_manual_db: Number(project.prevLink?.manual?.db || 0),
      prev_manual_spend: Number(project.prevLink?.manual?.spend || 0),
      prev_manual_revenue: Number(project.prevLink?.manual?.revenue || 0)
    })
    .eq('id', project.id);

  if(error) throw error;
  await upsertProjectExtraCfgOnDb(project);
}
async function deleteProjectOnDb(projectId){
  await ensureAuth();
  requireLogin();

  const { error } = await sb
    .from('projects')
    .delete()
    .eq('id', projectId);

  if(error) throw error;

  await deleteProjectExtraCfgOnDb(projectId);
  delete state.projects[projectId];

  const ids = Object.keys(state.projects);
  state.currentProjectId = ids[0] || '';

  if(!state.compare) state.compare = defaultCompare(state.currentProjectId);
  if(state.currentProjectId){
    if(!state.projects[state.compare.leftId]) state.compare.leftId = state.currentProjectId;
    if(!state.projects[state.compare.rightId]) state.compare.rightId = state.currentProjectId;
  }
  saveState();
}
async function clearAllDataOnDb(){
  await ensureAuth();
  requireLogin();

  const { error } = await sb
    .from('projects')
    .delete()
    .eq('owner_id', ownerId());

  if(error) throw error;

  localStorage.removeItem(UI_LS_KEY);
  state.projects = {};
  state.currentProjectId = '';
  state.compare = defaultCompare('');
}
async function upsertOwnedOnDb(projectId, date, media, addDb){
  await ensureAuth();
  requireLogin();

  const payload = {
    owner_id: ownerId(),
    project_id: projectId,
    entry_date: date,
    media,
    add_db: Number(addDb || 0)
  };

  const { error } = await sb
    .from('owned_entries')
    .upsert(payload, { onConflict:'project_id,entry_date,media' });

  if(error) throw error;

  const p = state.projects[projectId];
  const key = `${date}||${media}`;
  const idx = p.ownedEntries.findIndex(x => `${x.date}||${(x.media||'').trim()}` === key);
  const rec = { date, media, addDb:Number(addDb || 0) };
  if(idx>=0) p.ownedEntries[idx] = rec;
  else p.ownedEntries.push(rec);
}
async function deleteOwnedOnDb(projectId, date, media){
  await ensureAuth();
  requireLogin();

  const { error } = await sb
    .from('owned_entries')
    .delete()
    .eq('project_id', projectId)
    .eq('entry_date', date)
    .eq('media', media);

  if(error) throw error;

  const p = state.projects[projectId];
  p.ownedEntries = p.ownedEntries.filter(x => !(
    x.date === date && (x.media||'').trim() === media
  ));
}
async function writeSingleAdsRow(projectId, row){
  await ensureAuth();
  requireLogin();

  const clean = {
    owner_id: ownerId(),
    project_id: projectId,
    entry_date: row.date,
    platform: row.platform,
    spend: Number(row.spend || 0),
    clicks: Number(row.clicks || 0),
    real_db: Number(row.realDb || 0)
  };

  const { data:exists, error:findErr } = await sb
    .from('ads_entries')
    .select('id')
    .eq('project_id', projectId)
    .eq('entry_date', clean.entry_date)
    .eq('platform', clean.platform)
    .limit(1);

  if(findErr) throw findErr;

  if(exists && exists.length){
    const { error:updateErr } = await sb
      .from('ads_entries')
      .update({
        owner_id: clean.owner_id,
        spend: clean.spend,
        clicks: clean.clicks,
        real_db: clean.real_db
      })
      .eq('project_id', projectId)
      .eq('entry_date', clean.entry_date)
      .eq('platform', clean.platform);
    if(updateErr) throw updateErr;
  }else{
    const { error:insertErr } = await sb
      .from('ads_entries')
      .insert(clean);
    if(insertErr) throw insertErr;
  }
}
async function upsertAdsOnDb(projectId, date, platform, spend, clicks, realDb){
  const rec = {
    date,
    platform,
    spend:Number(spend || 0),
    clicks:Number(clicks || 0),
    realDb:Number(realDb || 0)
  };
  await writeSingleAdsRow(projectId, rec);

  const p = state.projects[projectId];
  const key = `${date}||${platform}`;
  const idx = p.adsEntries.findIndex(x => `${x.date}||${x.platform}` === key);
  if(idx>=0) p.adsEntries[idx] = rec;
  else p.adsEntries.push(rec);
}
async function deleteAdsOnDb(projectId, date, platform){
  await ensureAuth();
  requireLogin();

  const { error } = await sb
    .from('ads_entries')
    .delete()
    .eq('project_id', projectId)
    .eq('entry_date', date)
    .eq('platform', platform);

  if(error) throw error;

  const p = state.projects[projectId];
  p.adsEntries = p.adsEntries.filter(x => !(x.date === date && x.platform === platform));
}
async function bulkUpsertOwnedOnDb(projectId, rows){
  if(!rows.length) return;
  await ensureAuth();
  requireLogin();

  const payload = rows.map(r => ({
    owner_id: ownerId(),
    project_id: projectId,
    entry_date: r.date,
    media: r.media,
    add_db: Number(r.addDb || 0)
  }));

  const { error } = await sb
    .from('owned_entries')
    .upsert(payload, { onConflict:'project_id,entry_date,media' });

  if(error) throw error;

  const p = state.projects[projectId];
  const m = new Map(p.ownedEntries.map(x => [`${x.date}||${(x.media||'').trim()}`, x]));
  for(const r of rows){
    m.set(`${r.date}||${(r.media||'').trim()}`, {
      date:r.date,
      media:r.media,
      addDb:Number(r.addDb || 0)
    });
  }
  p.ownedEntries = [...m.values()];
}
async function bulkUpsertAdsOnDb(projectId, rows){
  if(!rows.length) return;
  await ensureAuth();
  requireLogin();

  for(const r of rows){
    await writeSingleAdsRow(projectId, {
      date:r.date,
      platform:r.platform,
      spend:Number(r.spend || 0),
      clicks:Number(r.clicks || 0),
      realDb:Number(r.realDb || 0)
    });
  }

  const p = state.projects[projectId];
  const m = new Map(p.adsEntries.map(x => [`${x.date}||${x.platform}`, x]));
  for(const r of rows){
    m.set(`${r.date}||${r.platform}`, {
      date:r.date,
      platform:r.platform,
      spend:Number(r.spend || 0),
      clicks:Number(r.clicks || 0),
      realDb:Number(r.realDb || 0)
    });
  }
  p.adsEntries = [...m.values()];
}
