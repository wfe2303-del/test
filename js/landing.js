const SUPABASE_URL = 'https://eaukbojyuygwhkaxdvnx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhdWtib2p5dXlnd2hrYXhkdm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTk0OTMsImV4cCI6MjA4ODc3NTQ5M30.0IAiljx47666xWxJq5N_kDmjPUpESmibPqEjDtb2TRc';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LOGIN_ID_MAP = {
  classaround: 'classaround@gmail.com',
  test: 'test@gmail.com'
};

const CATEGORY_CONFIG = [
  { id: 'side-job', label: '부업' }
];

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
  categorySummary: $('landingCategorySummary'),
  rankingWrap: $('landingRankingTableWrap'),
  spotlightOpenBtn: $('spotlightOpenBtn'),
  sidebarRootToggle: $('sidebarRootToggle'),
  sidebarSearchWrap: $('sidebarSearchWrap')
};

let authSession = null;
let projectRows = [];
let instructorStats = [];
let selectedInstructor = '';
let selectedCategoryId = CATEGORY_CONFIG[0].id;
let categoryOpen = true;

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
  return {
    item,
    cohortText,
    cohortNo: numberMatch ? Number(numberMatch[1]) : NaN
  };
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

  instructorStats = [...map.values()]
    .map((item) => {
      const topItem = [...item.itemCountMap.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), 'ko'))[0]?.[0] || '기타';
      return {
        ...item,
        topItem,
        roas: item.spend > 0 ? item.revenue / item.spend : 0
      };
    })
    .sort((a, b) => (b.roas - a.roas) || (b.revenue - a.revenue) || String(a.name).localeCompare(String(b.name), 'ko'));

  if (!selectedInstructor && instructorStats.length) selectedInstructor = instructorStats[0].name;
  if (selectedInstructor && !instructorStats.find((row) => row.name === selectedInstructor)) {
    selectedInstructor = instructorStats[0]?.name || '';
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
function getSelectedInstructorStat() {
  const filtered = getFilteredInstructorStats();
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
  const best = filtered[0] || null;

  if (els.instructorCount) els.instructorCount.textContent = fmtInt(filtered.length);
  if (els.projectCount) els.projectCount.textContent = fmtInt(totalProjects);
  if (els.categoryCount) els.categoryCount.textContent = fmtInt(CATEGORY_CONFIG.length);

  const cards = [
    { label: '등록 강사', value: `${fmtInt(filtered.length)}명`, sub: '현재 카테고리 기준' },
    { label: '등록 프로젝트', value: `${fmtInt(totalProjects)}개`, sub: '강사별 전체 기수 합산' },
    { label: '총 광고비', value: fmtWon(totalSpend), sub: '일예산 합산 기준' },
    { label: '총 실매출', value: fmtWon(totalRevenue), sub: '실매출 합산' },
    { label: '1위 강사', value: best?.name || '-', sub: best ? `ROAS ${fmtRoas(best.roas)}` : '선택 가능한 강사 없음' }
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
  const recentCohorts = [...selected.cohorts].filter(Boolean).sort((a, b) => String(b).localeCompare(String(a), 'ko')).slice(0, 6);

  els.spotlight.innerHTML = `
    <div class="portalSpotlightHead">
      <div>
        <div class="portalSpotlightName">${esc(selected.name)}</div>
        <div class="portalSpotlightSub">대표 아이템 ${esc(selected.topItem)} · 등록 기수 ${fmtInt(selected.projectCount)}개 · 최근 등록일 ${esc(fmtDate(selected.latestCreatedAt))}</div>
      </div>
      <div class="portalRoasPill">ROAS ${esc(fmtRoas(selected.roas))}</div>
    </div>

    <div class="portalMetricGrid">
      <div class="portalMetricCard"><span>총 광고비</span><b>${fmtWon(selected.spend)}</b></div>
      <div class="portalMetricCard"><span>총 실매출</span><b>${fmtWon(selected.revenue)}</b></div>
      <div class="portalMetricCard"><span>대표 아이템</span><b>${esc(selected.topItem)}</b></div>
      <div class="portalMetricCard"><span>기수 수</span><b>${fmtInt(selected.projectCount)}개</b></div>
    </div>

    <div class="portalChipList">
      ${recentCohorts.length ? recentCohorts.map((cohort) => `<span class="portalChip">${esc(cohort)}</span>`).join('') : '<span class="portalChip">등록된 기수가 없어</span>'}
    </div>
  `;
}

function renderCategorySummary() {
  if (!els.categorySummary) return;
  const filtered = getFilteredInstructorStats();
  const totalSpend = filtered.reduce((sum, item) => sum + Number(item.spend || 0), 0);
  const totalRevenue = filtered.reduce((sum, item) => sum + Number(item.revenue || 0), 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const topItems = filtered.slice(0, 3);

  els.categorySummary.innerHTML = `
    <div class="portalCategoryGrid">
      <div class="portalMiniSummary"><span>카테고리</span><b>부업</b></div>
      <div class="portalMiniSummary"><span>강사 수</span><b>${fmtInt(filtered.length)}명</b></div>
      <div class="portalMiniSummary"><span>총 광고비</span><b>${fmtWon(totalSpend)}</b></div>
      <div class="portalMiniSummary"><span>평균 ROAS</span><b>${fmtRoas(avgRoas)}</b></div>
    </div>
    <div class="portalMiniSummaryList">
      ${topItems.length ? topItems.map((item, index) => `
        <button type="button" class="portalTopListItem" data-top-inst="${esc(item.name)}">
          <span class="portalTopListRank">${index + 1}</span>
          <span>
            <span class="portalTopListName">${esc(item.name)}</span>
            <span class="portalTopListMeta">${esc(item.topItem)}</span>
          </span>
          <span class="portalTopListMeta">${esc(fmtRoas(item.roas))}</span>
        </button>
      `).join('') : '<div class="portalEmptyState" style="min-height:120px">표시할 강사가 없어.</div>'}
    </div>
  `;

  els.categorySummary.querySelectorAll('[data-top-inst]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedInstructor = button.dataset.topInst || '';
      renderAll();
    });
  });
}

function renderRankingTable() {
  if (!els.rankingWrap) return;
  const filtered = getFilteredInstructorStats();
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
    <div class="portalRankingHint">
      <span>기본 정렬: ROAS 높은 순</span>
      <span>광고비 기준: 일예산 합산</span>
    </div>
    <div class="portalRankingTableWrap">
      <table class="portalRankingTable">
        <thead>
          <tr>
            <th class="center" style="width:72px">순위</th>
            <th>강사</th>
            <th style="width:180px">광고비</th>
            <th style="width:180px">실매출</th>
            <th class="center" style="width:120px">ROAS</th>
            <th class="center" style="width:100px">상세</th>
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
  renderCategorySummary();
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
    if (isLoggedIn()) await loadDashboardData();
  } catch (err) {
    console.error(err);
    if (els.loginMsg) els.loginMsg.textContent = '초기 로딩 실패. Supabase 연결 상태를 확인해줘.';
  }
})();
