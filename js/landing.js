const SUPABASE_URL = 'https://eaukbojyuygwhkaxdvnx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhdWtib2p5dXlnd2hrYXhkdm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTk0OTMsImV4cCI6MjA4ODc3NTQ5M30.0IAiljx47666xWxJq5N_kDmjPUpESmibPqEjDtb2TRc';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LOGIN_ID_MAP = {
  classaround: 'classaround@gmail.com',
  test: 'test@gmail.com'
};

const CATEGORY_CONFIG = [
  { id:'side-job', label:'부업', icon:'▣' }
];

const $ = (id)=>document.getElementById(id);
const landingAuthStatus = $('landingAuthStatus');
const landingLogout = $('landingLogout');
const landingLoginCard = $('landingLoginCard');
const landingContent = $('landingContent');
const landingLoginId = $('landingLoginId');
const landingLoginPw = $('landingLoginPw');
const landingLoginBtn = $('landingLoginBtn');
const landingLoginMsg = $('landingLoginMsg');
const landingInstructorSearch = $('landingInstructorSearch');
const sidebarInstructorSearch = $('sidebarInstructorSearch');
const landingInstructorCount = $('landingInstructorCount');
const landingProjectCount = $('landingProjectCount');
const landingCategoryCount = $('landingCategoryCount');
const sidebarCategoryNav = $('sidebarCategoryNav');
const landingStatsGrid = $('landingStatsGrid');
const landingSpotlight = $('landingSpotlight');
const landingCategorySummary = $('landingCategorySummary');
const landingRankingTableWrap = $('landingRankingTableWrap');
const spotlightOpenBtn = $('spotlightOpenBtn');

let authSession = null;
let projectRows = [];
let adsRows = [];
let instructorStats = [];
let selectedInstructor = '';
let selectedCategoryId = CATEGORY_CONFIG[0].id;
let categoryOpenMap = Object.fromEntries(CATEGORY_CONFIG.map(x=>[x.id, true]));

function esc(s){
  return String(s ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}
function fmtInt(n){
  const x = Number(n);
  return Number.isFinite(x) ? Math.round(x).toLocaleString('ko-KR') : '0';
}
function fmtWon(n){
  const x = Number(n);
  return `₩${Number.isFinite(x) ? Math.round(x).toLocaleString('ko-KR') : '0'}`;
}
function fmtRoas(n){
  const x = Number(n);
  return Number.isFinite(x) && x > 0 ? `${x.toFixed(2)}배` : '-';
}
function fmtDate(v){
  if(!v) return '-';
  const d = new Date(v);
  if(Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('ko-KR');
}
function getLoginEmailFromId(id){
  return LOGIN_ID_MAP[String(id || '').trim().toLowerCase()] || '';
}
function parseCohortLabel(label){
  const raw = String(label || '').trim();
  if(!raw) return { item:'', cohortText:'', cohortNo:NaN };
  let item = '';
  let cohortText = raw;
  if(raw.includes('/')){
    const idx = raw.lastIndexOf('/');
    item = raw.slice(0, idx).trim();
    cohortText = raw.slice(idx + 1).trim();
  }else{
    const m = raw.match(/^(.*?)(\d+\s*기.*)$/);
    if(m){
      item = String(m[1] || '').replace(/[\/_-]+$/,'').trim();
      cohortText = String(m[2] || '').trim();
    }
  }
  const numMatch = String(cohortText || '').match(/(\d+)/);
  return { item, cohortText, cohortNo:numMatch ? Number(numMatch[1]) : NaN };
}
function openInstructorPage(name){
  if(!name) return;
  const url = `./instructor.html?instructor=${encodeURIComponent(name)}`;
  window.open(url, '_blank');
}
async function ensureAuth(){
  const { data:{session}, error } = await sb.auth.getSession();
  if(error) throw error;
  authSession = session || null;
  return authSession;
}
function isLoggedIn(){
  return !!authSession?.user?.id;
}
async function loginWithIdPassword(id, password){
  const key = String(id || '').trim().toLowerCase();
  const email = getLoginEmailFromId(key);
  if(!email) throw new Error('존재하지 않는 아이디야.');
  if(!password) throw new Error('비밀번호를 입력해줘.');

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if(!error){
    authSession = data.session || null;
    return data;
  }
  if(key !== 'test') throw error;

  const { data:signUpData, error:signUpError } = await sb.auth.signUp({ email, password });
  if(signUpError){
    const msg = String(signUpError?.message || '').toLowerCase();
    if(msg.includes('already') || msg.includes('registered') || msg.includes('exists')) throw error;
    throw signUpError;
  }
  authSession = signUpData?.session || null;
  if(authSession) return signUpData;
  throw new Error('test 계정은 생성됐지만 이메일 인증이 필요할 수 있어. Supabase Auth 설정을 확인해줘.');
}
async function logout(){
  const { error } = await sb.auth.signOut();
  if(error) throw error;
  authSession = null;
}
function updateAuthUi(){
  if(isLoggedIn()){
    landingAuthStatus.textContent = authSession.user.email === 'classaround@gmail.com' ? 'classaround' : authSession.user.email;
    landingLogout.style.display = '';
    landingLoginCard.style.display = 'none';
    landingContent.style.display = '';
  }else{
    landingAuthStatus.textContent = '미로그인';
    landingLogout.style.display = 'none';
    landingLoginCard.style.display = '';
    landingContent.style.display = 'none';
  }
}
async function loadDashboardData(){
  if(!isLoggedIn()) return;
  const { data:projects, error:projErr } = await sb
    .from('projects')
    .select('id,instructor,cohort,actual_revenue,created_at')
    .order('instructor', { ascending:true })
    .order('cohort', { ascending:true });
  if(projErr) throw projErr;

  const { data:ads, error:adsErr } = await sb
    .from('ads_entries')
    .select('project_id,spend');
  if(adsErr) throw adsErr;

  projectRows = Array.isArray(projects) ? projects : [];
  adsRows = Array.isArray(ads) ? ads : [];
  buildInstructorStats();
  renderAll();
}
function buildInstructorStats(){
  const spendByProjectId = new Map();
  for(const row of adsRows){
    const key = String(row.project_id || '');
    if(!key) continue;
    spendByProjectId.set(key, (spendByProjectId.get(key) || 0) + Number(row.spend || 0));
  }

  const map = new Map();
  for(const row of projectRows){
    const name = String(row.instructor || '').trim();
    if(!name) continue;
    const parsed = parseCohortLabel(row.cohort);
    const item = parsed.item || '기타';
    const projectSpend = Number(spendByProjectId.get(String(row.id)) || 0);
    const revenue = Number(row.actual_revenue || 0);

    if(!map.has(name)){
      map.set(name, {
        name,
        categoryId:selectedCategoryId,
        projectCount:0,
        spend:0,
        revenue:0,
        cohorts:[],
        itemCountMap:new Map(),
        latestProject:null,
        latestCreatedAt:'',
      });
    }
    const itemRef = map.get(name);
    itemRef.projectCount += 1;
    itemRef.spend += projectSpend;
    itemRef.revenue += revenue;
    itemRef.cohorts.push(String(row.cohort || '').trim());
    itemRef.itemCountMap.set(item, (itemRef.itemCountMap.get(item) || 0) + 1);
    if(!itemRef.latestCreatedAt || new Date(row.created_at || 0).getTime() > new Date(itemRef.latestCreatedAt || 0).getTime()){
      itemRef.latestCreatedAt = row.created_at || '';
      itemRef.latestProject = row;
    }
  }

  instructorStats = [...map.values()].map(item => {
    const sortedItems = [...item.itemCountMap.entries()].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0],'ko'));
    const topItem = sortedItems[0]?.[0] || '기타';
    return {
      ...item,
      topItem,
      itemCount: sortedItems.length,
      roas: item.spend > 0 ? item.revenue / item.spend : 0
    };
  }).sort((a,b)=>b.roas - a.roas || b.revenue - a.revenue || a.name.localeCompare(b.name,'ko'));

  if(!selectedInstructor && instructorStats.length){
    selectedInstructor = instructorStats[0].name;
  }
  if(selectedInstructor && !instructorStats.find(x=>x.name === selectedInstructor)){
    selectedInstructor = instructorStats[0]?.name || '';
  }
}
function getCombinedSearch(){
  return `${String(sidebarInstructorSearch?.value || '').trim()} ${String(landingInstructorSearch?.value || '').trim()}`.trim().toLowerCase();
}
function getFilteredInstructorStats(){
  const search = getCombinedSearch();
  let list = instructorStats.filter(x => x.categoryId === selectedCategoryId);
  if(search){
    list = list.filter(x => {
      const hay = [x.name, x.topItem, ...(x.cohorts || [])].join(' ').toLowerCase();
      return hay.includes(search);
    });
  }
  return list;
}
function getSelectedInstructorStat(){
  const filtered = getFilteredInstructorStats();
  return filtered.find(x=>x.name === selectedInstructor) || filtered[0] || instructorStats.find(x=>x.name === selectedInstructor) || null;
}
function renderSidebar(){
  const filtered = getFilteredInstructorStats();
  const selected = getSelectedInstructorStat();
  const category = CATEGORY_CONFIG.find(x=>x.id === selectedCategoryId) || CATEGORY_CONFIG[0];
  const open = !!categoryOpenMap[category.id];
  const rows = filtered.map(item => `
    <button type="button" class="dashInstructorNavItem ${selected?.name === item.name ? 'active' : ''}" data-inst="${esc(item.name)}">
      <span class="dashInstructorNavName">${esc(item.name)}</span>
      <span class="dashInstructorNavMeta">${fmtRoas(item.roas)}</span>
    </button>
  `).join('') || '<div class="dashSidebarEmpty">검색 결과가 없어.</div>';

  sidebarCategoryNav.innerHTML = `
    <div class="dashNavGroup">
      <button type="button" class="dashCategoryBtn ${open ? 'open' : ''}" data-category-toggle="${esc(category.id)}">
        <span class="dashCategoryIcon">${esc(category.icon)}</span>
        <span class="dashCategoryLabel">${esc(category.label)}</span>
        <span class="dashCategoryCount">${fmtInt(instructorStats.length)}</span>
      </button>
      <div class="dashInstructorNavList" style="display:${open ? '' : 'none'}">${rows}</div>
    </div>
  `;

  sidebarCategoryNav.querySelector('[data-category-toggle]')?.addEventListener('click', ()=>{
    categoryOpenMap[category.id] = !categoryOpenMap[category.id];
    renderSidebar();
  });
  sidebarCategoryNav.querySelectorAll('[data-inst]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      selectedInstructor = btn.dataset.inst || '';
      renderSpotlight();
      renderRankingTable();
      renderSidebar();
    });
  });
}
function renderStats(){
  const filtered = getFilteredInstructorStats();
  const totalProjects = filtered.reduce((sum, x)=>sum + Number(x.projectCount || 0), 0);
  const totalSpend = filtered.reduce((sum, x)=>sum + Number(x.spend || 0), 0);
  const totalRevenue = filtered.reduce((sum, x)=>sum + Number(x.revenue || 0), 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  landingInstructorCount.textContent = fmtInt(filtered.length);
  landingProjectCount.textContent = fmtInt(totalProjects);
  landingCategoryCount.textContent = fmtInt(CATEGORY_CONFIG.length);

  landingStatsGrid.innerHTML = [
    {label:'등록 강사', value:`${fmtInt(filtered.length)}명`, sub:'현재 카테고리 기준'},
    {label:'등록 기수', value:`${fmtInt(totalProjects)}개`, sub:'강사별 전체 프로젝트 합산'},
    {label:'총 광고비', value:fmtWon(totalSpend), sub:'ads_entries 기준 집계'},
    {label:'총 실매출', value:fmtWon(totalRevenue), sub:'projects.actual_revenue 합산'},
    {label:'평균 ROAS', value:fmtRoas(avgRoas), sub:'총 실매출 ÷ 총 광고비'}
  ].map(card => `
    <article class="dashStatCard">
      <div class="dashStatLabel">${esc(card.label)}</div>
      <div class="dashStatValue">${esc(card.value)}</div>
      <div class="dashStatSub">${esc(card.sub)}</div>
    </article>
  `).join('');
}
function renderSpotlight(){
  const selected = getSelectedInstructorStat();
  if(!selected){
    landingSpotlight.innerHTML = '<div class="landingEmpty">선택할 강사가 없어.</div>';
    spotlightOpenBtn.disabled = true;
    return;
  }
  selectedInstructor = selected.name;
  spotlightOpenBtn.disabled = false;
  const recentCohorts = [...selected.cohorts].slice().sort((a,b)=>String(b).localeCompare(String(a),'ko')).slice(0,5);
  landingSpotlight.innerHTML = `
    <div class="dashSpotlightHead">
      <div>
        <div class="dashSpotlightName">${esc(selected.name)}</div>
        <div class="dashMuted">대표 아이템 ${esc(selected.topItem)} · 등록 기수 ${fmtInt(selected.projectCount)}개</div>
      </div>
      <div class="dashSpotlightBadge">ROAS ${fmtRoas(selected.roas)}</div>
    </div>
    <div class="dashSpotlightGrid">
      <div class="dashMiniMetric"><span>총 광고비</span><b>${fmtWon(selected.spend)}</b></div>
      <div class="dashMiniMetric"><span>총 실매출</span><b>${fmtWon(selected.revenue)}</b></div>
      <div class="dashMiniMetric"><span>대표 아이템</span><b>${esc(selected.topItem)}</b></div>
      <div class="dashMiniMetric"><span>최근 등록일</span><b>${esc(fmtDate(selected.latestCreatedAt))}</b></div>
    </div>
    <div class="dashChipRow">
      ${recentCohorts.map(c=>`<span class="landingMiniChip">${esc(c)}</span>`).join('') || '<span class="landingMiniChip">기수 없음</span>'}
    </div>
  `;
}
function renderCategorySummary(){
  const filtered = getFilteredInstructorStats();
  const totalSpend = filtered.reduce((sum, x)=>sum + Number(x.spend || 0), 0);
  const totalRevenue = filtered.reduce((sum, x)=>sum + Number(x.revenue || 0), 0);
  const top3 = filtered.slice(0,3);
  landingCategorySummary.innerHTML = `
    <div class="dashCategorySummaryGrid">
      <div class="dashMiniMetric"><span>카테고리</span><b>부업</b></div>
      <div class="dashMiniMetric"><span>강사 수</span><b>${fmtInt(filtered.length)}명</b></div>
      <div class="dashMiniMetric"><span>총 광고비</span><b>${fmtWon(totalSpend)}</b></div>
      <div class="dashMiniMetric"><span>총 실매출</span><b>${fmtWon(totalRevenue)}</b></div>
    </div>
    <div class="dashTopList">
      <div class="dashTopListTitle">상위 강사</div>
      ${top3.map((item, idx)=>`
        <button type="button" class="dashTopListItem" data-inst-open="${esc(item.name)}">
          <span class="dashTopRank">${idx + 1}</span>
          <span class="dashTopName">${esc(item.name)}</span>
          <span class="dashTopMeta">${fmtRoas(item.roas)}</span>
        </button>
      `).join('') || '<div class="dashSidebarEmpty">표시할 강사가 없어.</div>'}
    </div>
  `;
  landingCategorySummary.querySelectorAll('[data-inst-open]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      selectedInstructor = btn.dataset.instOpen || '';
      renderSpotlight();
      renderRankingTable();
      renderSidebar();
    });
  });
}
function renderRankingTable(){
  const filtered = getFilteredInstructorStats();
  const rows = filtered.map((item, idx)=>`
    <tr class="${selectedInstructor === item.name ? 'active' : ''}" data-inst-row="${esc(item.name)}">
      <td>${idx + 1}</td>
      <td class="txt-left"><div class="rankName">${esc(item.name)}</div><div class="rankSub">대표 ${esc(item.topItem)}</div></td>
      <td>${fmtInt(item.projectCount)}</td>
      <td class="num">${fmtWon(item.spend)}</td>
      <td class="num">${fmtWon(item.revenue)}</td>
      <td class="num"><b>${fmtRoas(item.roas)}</b></td>
      <td><button type="button" class="tableOpenBtn" data-open-inst="${esc(item.name)}">열기</button></td>
    </tr>
  `).join('');

  landingRankingTableWrap.innerHTML = `
    <div class="dashRankingHint">기본 정렬: ROAS 높은 순</div>
    <div class="tableScroll">
      <table class="dashRankingTable">
        <thead>
          <tr>
            <th>#</th>
            <th>강사</th>
            <th>기수 수</th>
            <th>총 광고비</th>
            <th>총 실매출</th>
            <th>ROAS</th>
            <th>상세</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="7" class="emptyCell">표시할 강사가 없어.</td></tr>'}</tbody>
      </table>
    </div>
  `;

  landingRankingTableWrap.querySelectorAll('[data-inst-row]').forEach(row=>{
    row.addEventListener('click', (e)=>{
      if(e.target?.closest?.('[data-open-inst]')) return;
      selectedInstructor = row.dataset.instRow || '';
      renderSpotlight();
      renderRankingTable();
      renderSidebar();
    });
  });
  landingRankingTableWrap.querySelectorAll('[data-open-inst]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      openInstructorPage(btn.dataset.openInst || '');
    });
  });
}
function renderAll(){
  renderSidebar();
  renderStats();
  renderSpotlight();
  renderCategorySummary();
  renderRankingTable();
}

landingLoginBtn.addEventListener('click', async ()=>{
  landingLoginMsg.textContent = '';
  try{
    await loginWithIdPassword(landingLoginId.value, landingLoginPw.value);
    landingLoginPw.value = '';
    updateAuthUi();
    await loadDashboardData();
  }catch(err){
    console.error(err);
    landingLoginMsg.textContent = err?.message || '로그인 실패';
  }
});
landingLoginPw.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter') landingLoginBtn.click();
});
landingLogout.addEventListener('click', async ()=>{
  try{
    await logout();
    projectRows = [];
    adsRows = [];
    instructorStats = [];
    updateAuthUi();
    renderAll();
  }catch(err){
    console.error(err);
    alert(err?.message || '로그아웃 실패');
  }
});
landingInstructorSearch.addEventListener('input', renderAll);
sidebarInstructorSearch.addEventListener('input', renderAll);
spotlightOpenBtn.addEventListener('click', ()=> openInstructorPage(selectedInstructor));

(async function init(){
  try{
    await ensureAuth();
    updateAuthUi();
    if(isLoggedIn()){
      await loadDashboardData();
    }
  }catch(err){
    console.error(err);
    alert('초기 로딩 실패: Supabase 연결 상태를 확인해줘.');
  }
})();
