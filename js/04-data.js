/** =========================
 *  CSV parser
 *  ========================= */
function parseCSV(text){
  const rows=[];
  let i=0, field='', row=[], inQuotes=false;
  while(i<text.length){
    const c=text[i];
    if(inQuotes){
      if(c==='"'){
        if(text[i+1]==='"'){ field+='"'; i+=2; continue; }
        inQuotes=false; i++; continue;
      }
      field+=c; i++; continue;
    }else{
      if(c==='"'){ inQuotes=true; i++; continue; }
      if(c===',' || c==='\t'){ row.push(field); field=''; i++; continue; }
      if(c==='\n'){
        row.push(field); field='';
        if(row.some(v=>String(v).trim()!=='')) rows.push(row);
        row=[]; i++; continue;
      }
      if(c==='\r'){ i++; continue; }
      field+=c; i++; continue;
    }
  }
  row.push(field);
  if(row.some(v=>String(v).trim()!=='')) rows.push(row);
  return rows;
}

/** =========================
 *  CRUD UI wrappers
 *  ========================= */
async function upsertOwned(date, media, addDb){
  const p=getProj();
  media=(media||'').trim();
  if(!p) return alert('로그인 후 프로젝트를 먼저 선택해줘');
  if(!date) return alert('날짜를 선택해줘');
  if(!media) return alert('매체를 입력해줘');

  try{
    await upsertOwnedOnDb(p.id, date, media, addDb);
    renderAll();
    showToast('온드DB 등록 완료', `${date} · ${media} · 추가DB ${fmtInt(addDb)}`);
  }catch(err){
    console.error(err);
    alert(err?.message || '온드DB 저장 실패');
  }
}
async function deleteOwned(date, media){
  const p=getProj();
  media=(media||'').trim();
  if(!p) return alert('로그인 후 프로젝트를 먼저 선택해줘');
  if(!date||!media) return alert('삭제할 날짜+매체를 입력해줘');

  try{
    await deleteOwnedOnDb(p.id, date, media);
    renderAll();
  }catch(err){
    console.error(err);
    alert(err?.message || '온드DB 삭제 실패');
  }
}
async function upsertAds(date, platform, spend, clicks, realDb){
  const p=getProj();
  if(!p) return alert('로그인 후 프로젝트를 먼저 선택해줘');
  if(!date) return alert('날짜를 선택해줘');

  try{
    await upsertAdsOnDb(p.id, date, platform, spend, clicks, realDb);
    renderAll();
    showToast('광고DB 등록 완료', `${date} · ${platform==='meta'?'메타':'구글'} · 전환 ${fmtInt(realDb)}`);
  }catch(err){
    console.error(err);
    alert(err?.message || '광고DB 저장 실패');
  }
}
async function deleteAds(date, platform){
  const p=getProj();
  if(!p) return alert('로그인 후 프로젝트를 먼저 선택해줘');
  if(!date||!platform) return alert('삭제할 날짜+매체를 선택해줘');

  try{
    await deleteAdsOnDb(p.id, date, platform);
    renderAll();
  }catch(err){
    console.error(err);
    alert(err?.message || '광고DB 삭제 실패');
  }
}

/** =========================
 *  Aggregation
 *  ========================= */
function groupOwnedDaily(p, mediaFilter='all'){
  const m=new Map();
  for(const e of p.ownedEntries){
    if(!e.date) continue;
    if(mediaFilter!=='all' && (e.media||'').trim()!==mediaFilter) continue;
    m.set(e.date,(m.get(e.date)||0)+Number(e.addDb||0));
  }
  return m;
}
function groupAdsDaily(p, platformFilter='all'){
  const m=new Map();
  for(const e of p.adsEntries){
    if(!e.date) continue;
    if(platformFilter!=='all' && e.platform!==platformFilter) continue;
    const cur=m.get(e.date)||{spend:0,clicks:0,realDb:0};
    cur.spend+=Number(e.spend||0);
    cur.clicks+=Number(e.clicks||0);
    cur.realDb+=Number(e.realDb||0);
    m.set(e.date,cur);
  }
  return m;
}
function allDatesFromData(p){
  const set=new Set();
  for(const e of p.ownedEntries) if(e.date) set.add(e.date);
  for(const e of p.adsEntries) if(e.date) set.add(e.date);
  return [...set].sort();
}
function buildDateAxis(p){
  const rs=(p.cfg.rangeStart||'').trim();
  const re=(p.cfg.rangeEnd||'').trim();
  if(rs && re && rs<=re){
    const out=[];
    let cur=rs;
    while(cur<=re){
      out.push(cur);
      cur=toISODate(new Date(cur+'T00:00:00'));
      cur=addDays(cur,1);
    }
    return out;
  }
  return allDatesFromData(p);
}
function computeAdAverages(p, platformFilter='all'){
  const daily=groupAdsDaily(p, platformFilter);
  let spend=0, clicks=0, conv=0;
  for(const v of daily.values()){
    spend += Number(v.spend||0);
    clicks += Number(v.clicks||0);
    conv += Number(v.realDb||0);
  }
  const avgCpc = (clicks>0) ? (spend/clicks) : 0;
  const avgCpa = (conv>0) ? (spend/conv) : 0;
  const cvr    = (clicks>0) ? (conv/clicks) : 0;
  return { spend, clicks, conv, avgCpc, avgCpa, cvr };
}

/** =========================
 *  이전기수 / 가치 계산
 *  ========================= */
function getPrevValuePerDbForProject(p){
  const mode = p.prevLink?.mode || 'none';

  if(mode==='linked'){
    const id = p.prevLink?.prevProjectId || '';
    const prev = state.projects?.[id];
    if(prev){
      const { last } = buildMainRows(prev);
      const prevRecruitFinal = last ? Number(last.recruitDb||0) : 0;
      const prevRevenueFinal = Number(prev.actualRevenue || 0);
      if(prevRecruitFinal>0 && prevRevenueFinal>0) return prevRevenueFinal / prevRecruitFinal;
      return 0;
    }
    return 0;
  }

  if(mode==='manual'){
    const db = Number(p.prevLink?.manual?.db || 0);
    const rev = Number(p.prevLink?.manual?.revenue || 0);
    if(db>0 && rev>0) return rev / db;
    return 0;
  }

  return 0;
}
function getValuePerDbAuto(p, curRecruitDb){
  const revenue = Number(p.actualRevenue || 0);
  const recruitDb = Number(curRecruitDb || 0);
  if(revenue>0 && recruitDb>0) return revenue / recruitDb;
  return 0;
}
function buildMainRows(p){
  const dates=buildDateAxis(p);
  const ownedDaily=groupOwnedDaily(p,'all');
  const adsDaily=groupAdsDaily(p,'all');

  let ownedCum=0, paidCum=0, spendCum=0;
  const dailyBudget=Number(p.cfg.dailyBudget||0);
  const prevValuePerDb = getPrevValuePerDbForProject(p);

  const rows=[];
  for(let i=0;i<dates.length;i++){
    const d=dates[i];
    const ownedDay=ownedDaily.get(d)||0;
    const ad=adsDaily.get(d)||{spend:0,clicks:0,realDb:0};

    ownedCum+=ownedDay;
    paidCum+=Number(ad.realDb||0);
    spendCum+=Number(ad.spend||0);

    const recruitDb = ownedCum + paidCum;
    const denom=dailyBudget*(i+1);
    const spendRate=denom>0?(spendCum/denom):null;
    const expectedRev = prevValuePerDb * recruitDb;

    rows.push({
      date:d,
      ownedCum, paidCum, recruitDb,
      dailyBudget,
      spendDay:Number(ad.spend||0),
      spendCum,
      spendRate,
      expectedRev
    });
  }
  return {rows, last: rows[rows.length-1] || null};
}

/** =========================
 *  Imports
 *  ========================= */
async function importAdsCsvForPlatform(csvText, platform){
  const p=getProj();
  if(!p) return alert('로그인 후 프로젝트를 먼저 선택해줘');

  const rows=parseCSV(csvText);
  if(rows.length<2){ alert('CSV가 비어있어'); return; }

  const agg=new Map();
  for(const r of rows){
    const date=normalizeDateFromText(r[1]);
    if(!date) continue;
    const realDb=parseNumberRounded(r[2]);
    const spend=parseNumberRounded(r[5]);
    const clicks=parseNumberRounded(r[8]);
    const cur=agg.get(date)||{spend:0,clicks:0,realDb:0};
    cur.spend+=spend; cur.clicks+=clicks; cur.realDb+=realDb;
    agg.set(date,cur);
  }
  if(agg.size===0){ alert('인식된 일자(B열)가 없습니다. B열 날짜 형식을 확인해 주세요.'); return; }

  try{
    const payload = [];
    for(const [date,v] of agg.entries()){
      payload.push({ date, platform, spend:v.spend, clicks:v.clicks, realDb:v.realDb });
    }
    await bulkUpsertAdsOnDb(p.id, payload);
    renderAll();
    alert(`${platform==='meta'?'메타':'구글'} 업로드 완료: ${agg.size}일 반영`);
  }catch(err){
    console.error(err);
    alert(err?.message || '광고 CSV 업로드 실패');
  }
}
async function importAdsXlsxForPlatform(file, platform){
  const p=getProj();
  if(!p) return alert('로그인 후 프로젝트를 먼저 선택해줘');

  if(typeof XLSX === 'undefined'){
    alert('XLSX 로드 실패(CDN 차단 가능). CSV로 업로드해줘.');
    return;
  }

  const ab = await file.arrayBuffer();
  const wb = XLSX.read(ab, { type:'array', cellDates:true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header:1, raw:true, defval:'' });

  const agg=new Map();
  for(const r of data){
    const date=normalizeDateFromAny(r[1]);
    if(!date) continue;
    const realDb=parseNumberRounded(r[2]);
    const spend=parseNumberRounded(r[5]);
    const clicks=parseNumberRounded(r[8]);
    const cur=agg.get(date)||{spend:0,clicks:0,realDb:0};
    cur.spend+=spend; cur.clicks+=clicks; cur.realDb+=realDb;
    agg.set(date,cur);
  }
  if(agg.size===0){ alert('인식된 일자(B열)가 없습니다. B열 날짜 형식을 확인해 주세요.'); return; }

  try{
    const payload = [];
    for(const [date,v] of agg.entries()){
      payload.push({ date, platform, spend:v.spend, clicks:v.clicks, realDb:v.realDb });
    }
    await bulkUpsertAdsOnDb(p.id, payload);
    renderAll();
    alert(`${platform==='meta'?'메타':'구글'} 엑셀 업로드 완료: ${agg.size}일 반영`);
  }catch(err){
    console.error(err);
    alert(err?.message || '광고 엑셀 업로드 실패');
  }
}

async function importOwnedXlsx(file){
  const p=getProj();
  if(!p) return alert('로그인 후 프로젝트를 먼저 선택해줘');

  if(typeof XLSX === 'undefined'){
    alert('XLSX 로드 실패(CDN 차단 가능). CSV로 업로드해줘.');
    return;
  }

  const ab = await file.arrayBuffer();
  const wb = XLSX.read(ab, { type:'array', cellDates:true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header:1, raw:true, defval:'' });

  const agg = new Map();
  for(const row of data){
    const media = String(row[3] ?? '').trim();
    const date  = normalizeDateFromAny(row[7]);
    if(!media || !date) continue;
    const k = `${date}||${media}`;
    agg.set(k, (agg.get(k)||0) + 1);
  }
  if(agg.size===0){ alert('인식된 데이터가 없습니다. D/H 위치를 확인해 주세요.'); return; }

  try{
    const payload = [];
    for(const [k,count] of agg.entries()){
      const [date, media] = k.split('||');
      payload.push({ date, media, addDb:count });
    }
    await bulkUpsertOwnedOnDb(p.id, payload);
    renderAll();
    alert(`온드 엑셀 업로드 완료: ${agg.size}개(일자×매체) 반영`);
  }catch(err){
    console.error(err);
    alert(err?.message || '온드 엑셀 업로드 실패');
  }
}
async function importOwnedCsv(csvText){
  const p=getProj();
  if(!p) return alert('로그인 후 프로젝트를 먼저 선택해줘');

  const rows=parseCSV(csvText);
  if(rows.length<2){ alert('CSV가 비어있어'); return; }

  const agg=new Map();
  for(const r of rows){
    const media = String(r[3] ?? '').trim();
    const date  = normalizeDateFromAny(r[7]);
    if(!media || !date) continue;
    const k=`${date}||${media}`;
    agg.set(k,(agg.get(k)||0)+1);
  }
  if(agg.size===0){ alert('인식된 데이터가 없습니다. D/H 컬럼을 확인해 주세요.'); return; }

  try{
    const payload = [];
    for(const [k,count] of agg.entries()){
      const [date, media]=k.split('||');
      payload.push({ date, media, addDb:count });
    }
    await bulkUpsertOwnedOnDb(p.id, payload);
    renderAll();
    alert(`온드 CSV 업로드 완료: ${agg.size}개(일자×매체) 반영`);
  }catch(err){
    console.error(err);
    alert(err?.message || '온드 CSV 업로드 실패');
  }
}
