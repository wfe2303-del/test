
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
  searchMain: $('landingInstructorSearch'),
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
let instructorStats = [];
let selectedInstructor = '';
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
function getLoginAlias(email) {
  const found = Object.entries(LOGIN_ID_MAP).find(([, mappedEmail]) => mappedEmail === email);
  return found?.[0] || email || '미로그인';
}
function getLoginEmailFromId(id) {
  return LOGIN_ID_MAP[String(id || '').trim().toLowerCase()] || '';
}
function openInstructorPage(name) {
  if (!name) return;
  const url = `./instructor.html?instructor=${encodeURIComponent(name)}`;
  window.open(url, '_blank');
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
  buildInstructorStats();
  renderAll();
}
function buildInstructorStats() {
  const map = new Map();
  for (const row of projectRows) {
    const name = String(row.instructor || '').trim();
    if (!name) continue;
    const parsed = parseCohortLabel(row.cohort);
    const item = parsed.item || '기타';
    const spend = Number(row.daily_budget || 0);
    const revenue = Number(row.actual_revenue || 0);
    const createdAt = row.created_at || '';
    if (!map.has(name)) {
      map.set(name, {
        name,
        categoryId: CATEGORY_CONFIG[0].id,
        projectCount: 0,
        spend: 0,
        revenue: 0,
        cohorts: [],
        itemCountMap: new Map(),
        latestCreatedAt: '',
        latestProject: null
      });
    }
    const acc = map.get(name);
    acc.projectCount += 1;
    acc.spend += spend;
    acc.revenue += revenue;
    acc.cohorts.push(String(row.cohort || '').trim());
    acc.itemCountMap.set(item, (acc.itemCountMap.get(item) || 0) + 1);
    if (!acc.latestCreatedAt || new Date(createdAt) > new Date(acc.latestCreatedAt)) {
      acc.latestCreatedAt = createdAt;
      acc.latestProject = row;
    }
  }
  instructorStats = [...map.values()].map((item) => {
    const topItem = [...item.itemCountMap.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), 'ko'))[0]?.[0] || '기타';
    return { ...item, topItem, roas: item.spend > 0 ? item.revenue / item.spend : 0 };
  });
  if (!selectedInstructor && instructorStats.length) selectedInstructor = getSortedInstructorStats()[0]?.name || instructorStats[0].name;
  if (selectedInstructor && !instructorStats.find((row) => row.name === selectedInstructor)) {
    selectedInstructor = getSortedInstructorStats()[0]?.name || '';
  }
}
function getCombinedSearch() {
  const side = String(els.searchSidebar?.value || '').trim();
  const main = String(els.searchMain?.value || '').trim();
  return `${side} ${main}`.trim().toLowerCase();
}
function getFilteredInstructorStats() {
  const keyword = getCombinedSearch();
  let list = instructorStats.filter((item) => item.categoryId === selectedCategoryId);
  if (keyword) {
    list = list.filter((item) => {
      const haystack = [item.name, item.topItem, ...(item.cohorts || [])].join(' ').toLowerCase();
      return haystack.includes(keyword);
    });
  }
  return list;
}
function compareInstructor(a, b, metric = rankingSortMetric, order = rankingSortOrder) {
  const direction = order === 'asc' ? 1 : -1;
  let result = 0;
  if (metric === 'name') {
    result = String(a.name).localeCompare(String(b.name), 'ko');
  } else if (metric === 'spend') {
    result = Number(a.spend || 0) - Number(b.spend || 0);
  } else if (metric === 'revenue') {
    result = Number(a.revenue || 0) - Number(b.revenue || 0);
  } else if (metric === 'projects') {
    result = Number(a.projectCount || 0) - Number(b.projectCount || 0);
  } else {
    result = Number(a.roas || 0) - Number(b.roas || 0);
  }
  if (result === 0 && metric !== 'name') result = String(a.name).localeCompare(String(b.name), 'ko');
  return result * direction;
}
function getSortedInstructorStats() {
  return getFilteredInstructorStats().slice().sort((a, b) => compareInstructor(a, b));
}
function getSelectedInstructorStat() {
  const filtered = getSortedInstructorStats();
  return filtered.find((item) => item.name === selectedInstructor) || filtered[0] || instructorStats.find((item) => item.name === selectedInstructor) || null;
}
function syncHero() {
  const selected = getSelectedInstructorStat();
  if (els.heroSelectedInstructor) els.heroSelectedInstructor.textContent = selected?.name || '-';
  if (els.heroSelectedItem) els.heroSelectedItem.textContent = selected?.topItem || '-';
}
function renderSidebar() {
  if (!els.sidebarNav) return;
  const filtered = getFilteredInstructorStats().slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'ko'));
  const selected = getSelectedInstructorStat();
  const rows = filtered.map((item) => `
    <button type="button" class="portalInstructorNavButton ${selected?.name === item.name ? 'is-active' : ''}" data-inst="${esc(item.name)}">
      <span class="portalInstructorNavMain">
        <strong>${esc(item.name)}</strong>
        <span>${esc(item.topItem)} · ${fmtInt(item.projectCount)}기수</span>
      </span>
      <span class="portalInstructorNavMetric">${esc(fmtRoas(item.roas))}</span>
    </button>
  `).join('');
  els.sidebarNav.innerHTML = categoryOpen ? (rows || '<div class="portalEmptyState" style="min-height:120px">검색 결과가 없어.</div>') : '';
  els.sidebarNav.querySelectorAll('[data-inst]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedInstructor = button.dataset.inst || '';
      renderAll();
    });
  });
}
function renderStats() {
  if (!els.statsGrid) return;
  const filtered = getFilteredInstructorStats();
  const totalProjects = filtered.reduce((sum, item) => sum + Number(item.projectCount || 0), 0);
  const totalSpend = filtered.reduce((sum, item) => sum + Number(item.spend || 0), 0);
  const totalRevenue = filtered.reduce((sum, item) => sum + Number(item.revenue || 0), 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const best = getSortedInstructorStats()[0] || null;
  if (els.instructorCount) els.instructorCount.textContent = fmtInt(filtered.length);
  if (els.projectCount) els.projectCount.textContent = fmtInt(totalProjects);
  if (els.categoryCount) els.categoryCount.textContent = fmtInt(CATEGORY_CONFIG.length);
  const cards = [
    { label: '강사', value: `${fmtInt(filtered.length)}명`, sub: '현재 카테고리' },
    { label: '프로젝트', value: `${fmtInt(totalProjects)}개`, sub: '전체 기수 합산' },
    { label: '광고비', value: fmtWon(totalSpend), sub: '일예산 합산' },
    { label: '실매출', value: fmtWon(totalRevenue), sub: '강사 전체 합산' },
    { label: '평균 ROAS', value: fmtRoas(avgRoas), sub: best ? `현재 1위 ${best.name}` : '표시할 강사 없음' }
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
  const selected = getSelectedInstructorStat();
  syncHero();
  if (!selected) {
    els.spotlight.innerHTML = '<div class="portalEmptyState">선택 가능한 강사가 없어.</div>';
    if (els.spotlightOpenBtn) els.spotlightOpenBtn.disabled = true;
    return;
  }
  if (els.spotlightOpenBtn) els.spotlightOpenBtn.disabled = false;
  const recentCohorts = [...selected.cohorts].filter(Boolean).sort((a, b) => String(b).localeCompare(String(a), 'ko')).slice(0, 4);
  els.spotlight.innerHTML = `
    <div class="portalSpotlightHead compactSpotlightHead">
      <div>
        <div class="portalSpotlightName">${esc(selected.name)}</div>
        <div class="portalSpotlightSub">대표 아이템 ${esc(selected.topItem)} · 등록 기수 ${fmtInt(selected.projectCount)}개 · 최근 ${esc(fmtDate(selected.latestCreatedAt))}</div>
      </div>
      <div class="portalRoasPill">ROAS ${esc(fmtRoas(selected.roas))}</div>
    </div>
    <div class="portalMetricGrid compactMetricGrid">
      <div class="portalMetricCard"><span>총 광고비</span><b>${fmtWon(selected.spend)}</b></div>
      <div class="portalMetricCard"><span>총 실매출</span><b>${fmtWon(selected.revenue)}</b></div>
      <div class="portalMetricCard"><span>대표 아이템</span><b>${esc(selected.topItem)}</b></div>
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
    projects: '프로젝트 수',
    name: '가나다순'
  };
  const orderMap = { asc: '오름차순', desc: '내림차순' };
  return `${metricMap[rankingSortMetric] || 'ROAS'} ${orderMap[rankingSortOrder] || '내림차순'}`;
}
function renderRankingTable() {
  if (!els.rankingWrap) return;
  const filtered = getSortedInstructorStats();
  const rows = filtered.map((item, index) => `
    <tr class="${selectedInstructor === item.name ? 'is-active' : ''}" data-rank-inst="${esc(item.name)}">
      <td class="center"><span class="portalRankBadge ${index < 3 ? 'top3' : ''}">${index + 1}</span></td>
      <td>
        <div class="portalInstructorCell">
          <strong>${esc(item.name)}</strong>
          <span>${esc(item.topItem)} · ${fmtInt(item.projectCount)}기수</span>
        </div>
      </td>
      <td class="num">${fmtWon(item.spend)}</td>
      <td class="num">${fmtWon(item.revenue)}</td>
      <td class="center"><span class="portalRoasValue">${esc(fmtRoas(item.roas))}</span></td>
      <td class="center"><button type="button" class="portalRowAction" data-open-inst="${esc(item.name)}">열기</button></td>
    </tr>
  `).join('');
  els.rankingWrap.innerHTML = `
    <div class="portalRankingHint compactHint">
      <span>정렬: ${esc(getSortLabel())}</span>
      <span>광고비 기준: 일예산 합산</span>
    </div>
    <div class="portalRankingTableWrap">
      <table class="portalRankingTable compactTable">
        <thead>
          <tr>
            <th class="center" style="width:64px">순위</th>
            <th>강사</th>
            <th style="width:160px">광고비</th>
            <th style="width:160px">실매출</th>
            <th class="center" style="width:108px">ROAS</th>
            <th class="center" style="width:92px">상세</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="6"><div class="portalEmptyState">표시할 강사가 없어.</div></td></tr>'}
        </tbody>
      </table>
    </div>
  `;
  els.rankingWrap.querySelectorAll('[data-rank-inst]').forEach((row) => {
    row.addEventListener('click', (event) => {
      if (event.target?.closest?.('[data-open-inst]')) return;
      selectedInstructor = row.dataset.rankInst || '';
      renderAll();
    });
  });
  els.rankingWrap.querySelectorAll('[data-open-inst]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      openInstructorPage(button.dataset.openInst || '');
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
      instructorStats = [];
      selectedInstructor = '';
      updateAuthUi();
    } catch (err) {
      console.error(err);
      alert(err?.message || '로그아웃 실패');
    }
  });
  const searchHandler = () => renderAll();
  els.searchMain?.addEventListener('input', searchHandler);
  els.searchSidebar?.addEventListener('input', searchHandler);
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
  els.spotlightOpenBtn?.addEventListener('click', () => openInstructorPage(selectedInstructor));
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
