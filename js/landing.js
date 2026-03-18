const SUPABASE_URL = 'https://eaukbojyuygwhkaxdvnx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhdWtib2p5dXlnd2hrYXhkdm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTk0OTMsImV4cCI6MjA4ODc3NTQ5M30.0IAiljx47666xWxJq5N_kDmjPUpESmibPqEjDtb2TRc';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LOGIN_ID_MAP = {
  classaround: 'classaround@gmail.com',
  test: 'test@gmail.com'
};

const CATEGORY_CONFIG = [{ id: 'side-job', label: '부업' }];

const $ = (id) => document.getElementById(id);
const els = {
  loginScreen: $('landingLoginScreen'),
  app: $('landingApp'),
  authStatus: $('landingAuthStatus'),
  logoutBtn: $('landingLogout'),
  loginId: $('landingLoginId'),
  loginPw: $('landingLoginPw'),
  loginBtn: $('landingLoginBtn'),
  loginMsg: $('landingLoginMsg'),
  searchSidebar: $('sidebarInstructorSearch'),
  instructorCount: $('landingInstructorCount'),
  projectCount: $('landingProjectCount'),
  categoryCount: $('landingCategoryCount'),
  heroSelectedInstructor: $('heroSelectedInstructor'),
  heroSelectedItem: $('heroSelectedItem'),
  sidebarNav: $('sidebarCategoryNav'),
  statsGrid: $('landingStatsGrid'),
  spotlight: $('landingSpotlight'),
  rankingWrap: $('landingRankingTableWrap'),
  spotlightOpenBtn: $('spotlightOpenBtn'),
  sidebarRootToggle: $('sidebarRootToggle'),
  sidebarSearchWrap: $('sidebarSearchWrap'),
  sortMetric: $('landingSortMetric'),
  sortOrder: $('landingSortOrder')
};

let authSession = null;
let projectRows = [];
let entityStats = [];
let selectedEntityKey = '';
let selectedCategoryId = CATEGORY_CONFIG[0].id;
let categoryOpen = true;
let rankingSortMetric = 'roas';
let rankingSortOrder = 'desc';

function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
function fmtInt(n) {
  const x = Number(n);
  return Number.isFinite(x) ? Math.round(x).toLocaleString('ko-KR') : '0';
}
function fmtWon(n) {
  const x = Number(n);
  return `₩${Number.isFinite(x) ? Math.round(x).toLocaleString('ko-KR') : '0'}`;
}
function fmtRoas(n) {
  const x = Number(n);
  return Number.isFinite(x) && x > 0 ? `${x.toFixed(2)}배` : '-';
}
function fmtDate(v) {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('ko-KR');
}
function parseCohortLabel(label) {
  const raw = String(label || '').trim();
  if (!raw) return { item: '', cohortText: '', cohortNo: NaN };
  let item = '';
  let cohortText = raw;
  if (raw.includes('/')) {
    const idx = raw.lastIndexOf('/');
    item = raw.slice(0, idx).trim();
    cohortText = raw.slice(idx + 1).trim();
  } else {
    const match = raw.match(/^(.*?)(\d+\s*기.*)$/);
    if (match) {
      item = String(match[1] || '').replace(/[\/_-]+$/, '').trim();
      cohortText = String(match[2] || '').trim();
    }
  }
  const numberMatch = cohortText.match(/(\d+)/);
  return { item, cohortText, cohortNo: numberMatch ? Number(numberMatch[1]) : NaN };
}
function makeEntityKey(instructor, item) {
  return `${String(instructor || '').trim()}||${String(item || '기타').trim()}`;
}
function getLoginAlias(email) {
  const found = Object.entries(LOGIN_ID_MAP).find(([, mappedEmail]) => mappedEmail === email);
  return found?.[0] || email || '미로그인';
}
function getLoginEmailFromId(id) {
  return LOGIN_ID_MAP[String(id || '').trim().toLowerCase()] || '';
}
function openInstructorPage(instructor, item = '') {
  if (!instructor) return;
  const params = new URLSearchParams();
  params.set('instructor', instructor);
  if (item) params.set('item', item);
  window.open(`./instructor.html?${params.toString()}`, '_blank');
}
async function ensureAuth() {
  const { data: { session }, error } = await sb.auth.getSession();
  if (error) throw error;
  authSession = session || null;
  return authSession;
}
function isLoggedIn() {
  return Boolean(authSession?.user?.id);
}
async function loginWithIdPassword(id, password) {
  const key = String(id || '').trim().toLowerCase();
  const email = getLoginEmailFromId(key);
  if (!email) throw new Error('존재하지 않는 아이디야.');
  if (!password) throw new Error('비밀번호를 입력해줘.');
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (!error) {
    authSession = data.session || null;
    return data;
  }
  if (key !== 'test') throw error;
  const { data: signUpData, error: signUpError } = await sb.auth.signUp({ email, password });
  if (signUpError) {
    const msg = String(signUpError?.message || '').toLowerCase();
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) throw error;
    throw signUpError;
  }
  authSession = signUpData?.session || null;
  if (authSession) return signUpData;
  throw new Error('test 계정 생성 후 이메일 인증이 필요할 수 있어. Supabase Auth 설정을 확인해줘.');
}
async function logout() {
  const { error } = await sb.auth.signOut();
  if (error) throw error;
  authSession = null;
}
function updateAuthUi() {
  if (els.authStatus) els.authStatus.textContent = getLoginAlias(authSession?.user?.email || '');
  if (els.loginScreen) els.loginScreen.style.display = isLoggedIn() ? 'none' : '';
  if (els.app) els.app.style.display = isLoggedIn() ? '' : 'none';
}
async function loadDashboardData() {
  if (!isLoggedIn()) return;
  const { data: projects, error } = await sb
    .from('projects')
    .select('id,instructor,cohort,daily_budget,actual_revenue,created_at')
    .order('instructor', { ascending: true })
    .order('cohort', { ascending: true });
  if (error) throw error;
  projectRows = Array.isArray(projects) ? projects : [];
  buildEntityStats();
  renderAll();
}
function buildEntityStats() {
  const map = new Map();
  for (const row of projectRows) {
    const instructor = String(row.instructor || '').trim();
    if (!instructor) continue;
    const parsed = parseCohortLabel(row.cohort);
    const item = parsed.item || '기타';
    const spend = Number(row.daily_budget || 0);
    const revenue = Number(row.actual_revenue || 0);
    const createdAt = row.created_at || '';
    const key = makeEntityKey(instructor, item);
    if (!map.has(key)) {
      map.set(key, {
        key,
        instructor,
        item,
        categoryId: CATEGORY_CONFIG[0].id,
        projectCount: 0,
        spend: 0,
        revenue: 0,
        cohorts: [],
        latestCreatedAt: '',
        latestProject: null
      });
    }
    const acc = map.get(key);
    acc.projectCount += 1;
    acc.spend += spend;
    acc.revenue += revenue;
    acc.cohorts.push(String(row.cohort || '').trim());
    if (!acc.latestCreatedAt || new Date(createdAt) > new Date(acc.latestCreatedAt)) {
      acc.latestCreatedAt = createdAt;
      acc.latestProject = row;
    }
  }
  entityStats = [...map.values()].map((item) => ({
    ...item,
    roas: item.spend > 0 ? item.revenue / item.spend : 0
  }));
  const sorted = getSortedEntityStats();
  if (!selectedEntityKey && sorted.length) selectedEntityKey = sorted[0].key;
  if (selectedEntityKey && !entityStats.find((row) => row.key === selectedEntityKey)) {
    selectedEntityKey = sorted[0]?.key || '';
  }
}
function getSearchKeyword() {
  return String(els.searchSidebar?.value || '').trim().toLowerCase();
}
function getFilteredEntityStats() {
  const keyword = getSearchKeyword();
  let list = entityStats.filter((item) => item.categoryId === selectedCategoryId);
  if (keyword) {
    list = list.filter((item) => {
      const haystack = [item.instructor, item.item, ...(item.cohorts || [])].join(' ').toLowerCase();
      return haystack.includes(keyword);
    });
  }
  return list;
}
function compareEntity(a, b, metric = rankingSortMetric, order = rankingSortOrder) {
  const direction = order === 'asc' ? 1 : -1;
  let result = 0;
  if (metric === 'name') {
    result = String(`${a.instructor} ${a.item}`).localeCompare(String(`${b.instructor} ${b.item}`), 'ko');
  } else if (metric === 'spend') {
    result = Number(a.spend || 0) - Number(b.spend || 0);
  } else if (metric === 'revenue') {
    result = Number(a.revenue || 0) - Number(b.revenue || 0);
  } else if (metric === 'projects') {
    result = Number(a.projectCount || 0) - Number(b.projectCount || 0);
  } else {
    result = Number(a.roas || 0) - Number(b.roas || 0);
  }
  if (result === 0 && metric !== 'name') {
    result = String(`${a.instructor} ${a.item}`).localeCompare(String(`${b.instructor} ${b.item}`), 'ko');
  }
  return result * direction;
}
function getSortedEntityStats() {
  return getFilteredEntityStats().slice().sort((a, b) => compareEntity(a, b));
}
function getSelectedEntity() {
  const filtered = getSortedEntityStats();
  return filtered.find((item) => item.key === selectedEntityKey) || filtered[0] || entityStats.find((item) => item.key === selectedEntityKey) || null;
}
function syncHero() {
  const selected = getSelectedEntity();
  if (els.heroSelectedInstructor) els.heroSelectedInstructor.textContent = selected?.instructor || '-';
  if (els.heroSelectedItem) els.heroSelectedItem.textContent = selected?.item || '-';
}
function renderSidebar() {
  if (!els.sidebarNav) return;
  const filtered = getFilteredEntityStats().slice().sort((a, b) => {
    const byName = String(a.instructor).localeCompare(String(b.instructor), 'ko');
    if (byName !== 0) return byName;
    return String(a.item).localeCompare(String(b.item), 'ko');
  });
  const rows = filtered.map((item) => `
    <button type="button" class="portalInstructorNavButton ${selectedEntityKey === item.key ? 'is-active' : ''}" data-entity-key="${esc(item.key)}">
      <span class="portalInstructorNavMain">
        <strong>${esc(item.instructor)}</strong>
        <span>${esc(item.item)} · ${fmtInt(item.projectCount)}기수</span>
      </span>
      <span class="portalInstructorNavMetric">${esc(fmtRoas(item.roas))}</span>
    </button>
  `).join('');
  els.sidebarNav.innerHTML = categoryOpen ? (rows || '<div class="portalEmptyState" style="min-height:120px">검색 결과가 없어.</div>') : '';
  els.sidebarNav.querySelectorAll('[data-entity-key]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedEntityKey = button.dataset.entityKey || '';
      renderAll();
    });
  });
}
function renderStats() {
  if (!els.statsGrid) return;
  const filtered = getFilteredEntityStats();
  const totalProjects = filtered.reduce((sum, item) => sum + Number(item.projectCount || 0), 0);
  const totalSpend = filtered.reduce((sum, item) => sum + Number(item.spend || 0), 0);
  const totalRevenue = filtered.reduce((sum, item) => sum + Number(item.revenue || 0), 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const best = getSortedEntityStats()[0] || null;
  if (els.instructorCount) els.instructorCount.textContent = fmtInt(filtered.length);
  if (els.projectCount) els.projectCount.textContent = fmtInt(totalProjects);
  if (els.categoryCount) els.categoryCount.textContent = fmtInt(CATEGORY_CONFIG.length);
  const cards = [
    { label: '항목', value: `${fmtInt(filtered.length)}개`, sub: '강사·아이템 단위' },
    { label: '프로젝트', value: `${fmtInt(totalProjects)}개`, sub: '등록 기수 합산' },
    { label: '광고비', value: fmtWon(totalSpend), sub: '일예산 합산' },
    { label: '실매출', value: fmtWon(totalRevenue), sub: '강사·아이템 합산' },
    { label: '평균 ROAS', value: fmtRoas(avgRoas), sub: best ? `현재 1위 ${best.instructor} · ${best.item}` : '표시할 항목 없음' }
  ];
  els.statsGrid.innerHTML = cards.map((card) => `
    <article class="portalStatCard">
      <div class="portalStatLabel">${esc(card.label)}</div>
      <div class="portalStatValue">${esc(card.value)}</div>
      <div class="portalStatSub">${esc(card.sub)}</div>
    </article>
  `).join('');
}
function renderSpotlight() {
  if (!els.spotlight) return;
  const selected = getSelectedEntity();
  syncHero();
  if (!selected) {
    els.spotlight.innerHTML = '<div class="portalEmptyState">선택 가능한 항목이 없어.</div>';
    if (els.spotlightOpenBtn) els.spotlightOpenBtn.disabled = true;
    return;
  }
  if (els.spotlightOpenBtn) els.spotlightOpenBtn.disabled = false;
  const recentCohorts = [...selected.cohorts].filter(Boolean).sort((a, b) => String(b).localeCompare(String(a), 'ko')).slice(0, 4);
  els.spotlight.innerHTML = `
    <div class="portalSpotlightHead compactSpotlightHead">
      <div>
        <div class="portalSpotlightName">${esc(selected.instructor)}</div>
        <div class="portalSpotlightSub">${esc(selected.item)} · 등록 기수 ${fmtInt(selected.projectCount)}개 · 최근 ${esc(fmtDate(selected.latestCreatedAt))}</div>
      </div>
      <div class="portalRoasPill">ROAS ${esc(fmtRoas(selected.roas))}</div>
    </div>
    <div class="portalMetricGrid compactMetricGrid">
      <div class="portalMetricCard"><span>총 광고비</span><b>${fmtWon(selected.spend)}</b></div>
      <div class="portalMetricCard"><span>총 실매출</span><b>${fmtWon(selected.revenue)}</b></div>
      <div class="portalMetricCard"><span>아이템</span><b>${esc(selected.item)}</b></div>
      <div class="portalMetricCard"><span>기수 수</span><b>${fmtInt(selected.projectCount)}개</b></div>
    </div>
    <div class="portalChipList compactChipList">
      ${recentCohorts.length ? recentCohorts.map((cohort) => `<span class="portalChip">${esc(cohort)}</span>`).join('') : '<span class="portalChip">등록된 기수 없음</span>'}
    </div>
  `;
}
function getSortLabel() {
  const metricMap = {
    roas: 'ROAS',
    spend: '광고비',
    revenue: '실매출',
    projects: '기수 수',
    name: '가나다순'
  };
  const orderMap = { asc: '오름차순', desc: '내림차순' };
  return `${metricMap[rankingSortMetric] || 'ROAS'} ${orderMap[rankingSortOrder] || '내림차순'}`;
}
function renderRankingTable() {
  if (!els.rankingWrap) return;
  const filtered = getSortedEntityStats();
  const rows = filtered.map((item, index) => `
    <tr class="${selectedEntityKey === item.key ? 'is-active' : ''}" data-rank-key="${esc(item.key)}">
      <td class="center"><span class="portalRankBadge ${index < 3 ? 'top3' : ''}">${index + 1}</span></td>
      <td class="cellInstructor">${esc(item.instructor)}</td>
      <td class="cellItem">${esc(item.item)}</td>
      <td class="center">${fmtInt(item.projectCount)}개</td>
      <td class="num">${fmtWon(item.spend)}</td>
      <td class="num">${fmtWon(item.revenue)}</td>
      <td class="center"><span class="portalRoasValue">${esc(fmtRoas(item.roas))}</span></td>
      <td class="center"><button type="button" class="portalRowAction" data-open-inst="${esc(item.instructor)}" data-open-item="${esc(item.item)}">열기</button></td>
    </tr>
  `).join('');
  els.rankingWrap.innerHTML = `
    <div class="portalRankingHint compactHint">
      <span>정렬: ${esc(getSortLabel())}</span>
      <span>광고비 기준: 일예산 합산</span>
    </div>
    <div class="portalRankingTableWrap">
      <table class="portalRankingTable compactTable entityTable">
        <thead>
          <tr>
            <th class="center" style="width:60px">순위</th>
            <th style="width:110px">강사</th>
            <th>아이템</th>
            <th class="center" style="width:84px">기수</th>
            <th style="width:150px">광고비</th>
            <th style="width:160px">실매출</th>
            <th class="center" style="width:90px">ROAS</th>
            <th class="center" style="width:78px">상세</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="8"><div class="portalEmptyState">표시할 항목이 없어.</div></td></tr>'}
        </tbody>
      </table>
    </div>
  `;
  els.rankingWrap.querySelectorAll('[data-rank-key]').forEach((row) => {
    row.addEventListener('click', (event) => {
      if (event.target?.closest?.('[data-open-inst]')) return;
      selectedEntityKey = row.dataset.rankKey || '';
      renderAll();
    });
  });
  els.rankingWrap.querySelectorAll('[data-open-inst]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      openInstructorPage(button.dataset.openInst || '', button.dataset.openItem || '');
    });
  });
}
function renderAll() {
  renderSidebar();
  renderStats();
  renderSpotlight();
  renderRankingTable();
}
function wireEvents() {
  els.loginBtn?.addEventListener('click', async () => {
    if (els.loginMsg) els.loginMsg.textContent = '';
    try {
      await loginWithIdPassword(els.loginId?.value, els.loginPw?.value);
      if (els.loginPw) els.loginPw.value = '';
      updateAuthUi();
      await loadDashboardData();
    } catch (err) {
      console.error(err);
      if (els.loginMsg) els.loginMsg.textContent = err?.message || '로그인 실패';
    }
  });
  els.loginPw?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') els.loginBtn?.click();
  });
  els.logoutBtn?.addEventListener('click', async () => {
    try {
      await logout();
      projectRows = [];
      entityStats = [];
      selectedEntityKey = '';
      updateAuthUi();
    } catch (err) {
      console.error(err);
      alert(err?.message || '로그아웃 실패');
    }
  });
  els.searchSidebar?.addEventListener('input', () => renderAll());
  els.sortMetric?.addEventListener('change', () => {
    rankingSortMetric = els.sortMetric.value || 'roas';
    if (rankingSortMetric === 'name') rankingSortOrder = 'asc';
    if (els.sortOrder) els.sortOrder.value = rankingSortOrder;
    renderAll();
  });
  els.sortOrder?.addEventListener('change', () => {
    rankingSortOrder = els.sortOrder.value || 'desc';
    renderAll();
  });
  els.spotlightOpenBtn?.addEventListener('click', () => {
    const selected = getSelectedEntity();
    openInstructorPage(selected?.instructor || '', selected?.item || '');
  });
  els.sidebarRootToggle?.addEventListener('click', () => {
    categoryOpen = !categoryOpen;
    els.sidebarRootToggle.classList.toggle('is-open', categoryOpen);
    if (els.sidebarSearchWrap) els.sidebarSearchWrap.style.display = categoryOpen ? '' : 'none';
    renderSidebar();
  });
}
(async function init() {
  wireEvents();
  try {
    await ensureAuth();
    updateAuthUi();
    if (els.sortMetric) els.sortMetric.value = rankingSortMetric;
    if (els.sortOrder) els.sortOrder.value = rankingSortOrder;
    if (isLoggedIn()) await loadDashboardData();
  } catch (err) {
    console.error(err);
    if (els.loginMsg) els.loginMsg.textContent = '초기 로딩 실패. Supabase 연결 상태를 확인해줘.';
  }
})();
