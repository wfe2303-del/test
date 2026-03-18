const SUPABASE_URL = 'https://eaukbojyuygwhkaxdvnx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6ImVhdWtib2p5dXlnd2hrYXhkdm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTk0OTMsImV4cCI6MjA4ODc3NTQ5M30.0IAiljx47666xWxJq5N_kDmjPUpESmibPqEjDtb2TRc';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LOGIN_ID_MAP = {
  classaround: 'classaround@gmail.com',
  test: 'test@gmail.com'
};

const CATEGORY_CONFIG = [
  { id: 'real-estate', label: '부동산' },
  { id: 'content', label: '콘텐츠' },
  { id: 'ecommerce', label: '이커머스' },
  { id: 'marketing', label: '마케팅' }
];

const CATEGORY_RULES = {
  'real-estate': [
    '부동산', '경매', '에어비엔비', '에어비앤비', '호스텔', '숙박', '얼죽집', '33m²', '33m2', '카페창업'
  ],
  'ecommerce': [
    '쿠팡', '로켓그로스', '로켓배송', '스마트스토어', '상세페이지', '해외구매대행', '공동구매', '이커머스',
    '커머스', '쇼핑', '의류', '건기식', '코스트코리셀', '트렌드커머스', '농수산물', '농축수산물', '올웨이즈',
    '토스', '굿즈', '화장품창업', '폰창업'
  ],
  'marketing': [
    '마케팅', '병원마케팅', '제휴마케팅', '애드센스', '사업개발', '영업왕', 'ai로고디자인', 'chatgpt', 'ai부트캠프',
    'ai사주', '타로', '주식', '코인', '소개부업', '네이버카페'
  ],
  'content': [
    '쇼츠', '숏폼', '롱폼', '유튜브', '블로그', '인스타', '인스타툰', '이모티콘', '콘텐츠', '틱톡', '영화쇼츠',
    '시니어쇼츠', '홈페이지', '워드프레스', 'ppt', '미리캔버스', 'ai콘텐츠', 'ai유튜브', 'ai크리에이터', 'ai숏폼',
    'ai숏폼대행'
  ]
};

const SCOPE_CONFIG = [
  { id: 'all', label: '전체 랭킹' },
  { id: 'category', label: '카테고리별 랭킹' }
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
  searchSidebar: $('sidebarInstructorSearch'),
  instructorCount: $('landingInstructorCount'),
  projectCount: $('landingProjectCount'),
  heroSelectedInstructor: $('heroSelectedInstructor'),
  heroSelectedItem: $('heroSelectedItem'),
  sidebarNav: $('sidebarCategoryNav'),
  sidebarCategoryTabs: $('sidebarCategoryTabs'),
  statsGrid: $('landingStatsGrid'),
  spotlight: $('landingSpotlight'),
  rankingWrap: $('landingRankingTableWrap'),
  spotlightOpenBtn: $('spotlightOpenBtn'),
  sortMetric: $('landingSortMetric'),
  sortOrder: $('landingSortOrder'),
  scopeTabs: $('landingScopeTabs'),
  categoryTabs: $('landingCategoryTabs')
};

let authSession = null;
let projectRows = [];
let entityStats = [];
let selectedEntityKey = '';
let selectedCategoryId = CATEGORY_CONFIG[0].id;
let rankingScope = 'all';
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
function fmtWonCompact(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '₩0';
  const abs = Math.abs(x);
  if (abs >= 1e12) return `₩${(x / 1e12).toFixed(abs >= 1e13 ? 0 : 1)}조`;
  if (abs >= 1e8) return `₩${(x / 1e8).toFixed(abs >= 1e9 ? 0 : 1)}억`;
  if (abs >= 1e4) return `₩${(x / 1e4).toFixed(abs >= 1e5 ? 0 : 1)}만`;
  return fmtWon(x);
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
function normalizeText(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '');
}
function detectCategoryId(item) {
  const normalized = normalizeText(item);
  if (!normalized) return 'content';
  for (const keyword of CATEGORY_RULES['real-estate']) {
    if (normalized.includes(normalizeText(keyword))) return 'real-estate';
  }
  for (const keyword of CATEGORY_RULES['ecommerce']) {
    if (normalized.includes(normalizeText(keyword))) return 'ecommerce';
  }
  for (const keyword of CATEGORY_RULES['marketing']) {
    if (normalized.includes(normalizeText(keyword))) return 'marketing';
  }
  for (const keyword of CATEGORY_RULES['content']) {
    if (normalized.includes(normalizeText(keyword))) return 'content';
  }
  return 'content';
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
  ensureSelectionVisible();
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
        categoryId: detectCategoryId(item),
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
}
function getSidebarSearchKeyword() {
  return String(els.searchSidebar?.value || '').trim().toLowerCase();
}
function getSidebarEntities() {
  const keyword = getSidebarSearchKeyword();
  let list = entityStats.filter((item) => item.categoryId === selectedCategoryId);
  if (keyword) {
    list = list.filter((item) => [item.instructor, item.item, ...(item.cohorts || [])].join(' ').toLowerCase().includes(keyword));
  }
  return list;
}
function getScopeEntities() {
  return rankingScope === 'category'
    ? entityStats.filter((item) => item.categoryId === selectedCategoryId)
    : entityStats.slice();
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
function getSortedScopeEntities() {
  return getScopeEntities().slice().sort((a, b) => compareEntity(a, b));
}
function ensureSelectionVisible() {
  const scoped = getScopeEntities();
  const inScope = scoped.find((item) => item.key === selectedEntityKey);
  if (inScope) return;
  const sidebarFirst = getSidebarEntities().slice().sort(sortByName)[0];
  selectedEntityKey = sidebarFirst?.key || scoped[0]?.key || entityStats[0]?.key || '';
}
function getSelectedEntity() {
  const scoped = getScopeEntities();
  return scoped.find((item) => item.key === selectedEntityKey)
    || entityStats.find((item) => item.key === selectedEntityKey)
    || scoped[0]
    || entityStats[0]
    || null;
}
function sortByName(a, b) {
  const byInstructor = String(a.instructor).localeCompare(String(b.instructor), 'ko');
  if (byInstructor !== 0) return byInstructor;
  return String(a.item).localeCompare(String(b.item), 'ko');
}
function getCategoryLabel(id) {
  return CATEGORY_CONFIG.find((item) => item.id === id)?.label || id;
}
function renderSidebarCategories() {
  if (!els.sidebarCategoryTabs) return;
  els.sidebarCategoryTabs.innerHTML = CATEGORY_CONFIG.map((category) => {
    const count = entityStats.filter((item) => item.categoryId === category.id).length;
    return `
      <button type="button" class="portalSidebarCategoryButton ${selectedCategoryId === category.id ? 'is-active' : ''}" data-category-id="${esc(category.id)}">
        <span>${esc(category.label)}</span>
        <b>${fmtInt(count)}</b>
      </button>
    `;
  }).join('');
  els.sidebarCategoryTabs.querySelectorAll('[data-category-id]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedCategoryId = button.dataset.categoryId || CATEGORY_CONFIG[0].id;
      if (rankingScope === 'category') ensureSelectionVisible();
      renderAll();
    });
  });
}
function renderSidebar() {
  if (!els.sidebarNav) return;
  const filtered = getSidebarEntities().slice().sort(sortByName);
  const rows = filtered.map((item) => `
    <button type="button" class="portalInstructorNavButton portalInstructorNavButtonLight ${selectedEntityKey === item.key ? 'is-active' : ''}" data-entity-key="${esc(item.key)}">
      <span class="portalInstructorNavMain">
        <strong>${esc(item.instructor)}</strong>
        <span>${esc(item.item)} · ${fmtInt(item.projectCount)}기수</span>
      </span>
      <span class="portalInstructorNavMetric">${esc(fmtRoas(item.roas))}</span>
    </button>
  `).join('');
  els.sidebarNav.innerHTML = rows || '<div class="portalEmptyState sidebarEmptyState">검색 결과가 없어.</div>';
  els.sidebarNav.querySelectorAll('[data-entity-key]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedEntityKey = button.dataset.entityKey || '';
      renderAll();
    });
  });
}
function renderScopeTabs() {
  if (els.scopeTabs) {
    els.scopeTabs.innerHTML = SCOPE_CONFIG.map((scope) => `
      <button type="button" class="portalSegmentedButton ${rankingScope === scope.id ? 'is-active' : ''}" data-scope-id="${esc(scope.id)}">${esc(scope.label)}</button>
    `).join('');
    els.scopeTabs.querySelectorAll('[data-scope-id]').forEach((button) => {
      button.addEventListener('click', () => {
        rankingScope = button.dataset.scopeId || 'all';
        ensureSelectionVisible();
        renderAll();
      });
    });
  }
  if (els.categoryTabs) {
    els.categoryTabs.innerHTML = CATEGORY_CONFIG.map((category) => `
      <button type="button" class="portalCategoryPill ${selectedCategoryId === category.id ? 'is-active' : ''}" data-category-id="${esc(category.id)}">${esc(category.label)}</button>
    `).join('');
    els.categoryTabs.querySelectorAll('[data-category-id]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedCategoryId = button.dataset.categoryId || CATEGORY_CONFIG[0].id;
        if (rankingScope === 'category') ensureSelectionVisible();
        renderAll();
      });
    });
  }
}
function renderStats() {
  if (!els.statsGrid) return;
  const scoped = getScopeEntities();
  const totalProjects = scoped.reduce((sum, item) => sum + Number(item.projectCount || 0), 0);
  const totalSpend = scoped.reduce((sum, item) => sum + Number(item.spend || 0), 0);
  const totalRevenue = scoped.reduce((sum, item) => sum + Number(item.revenue || 0), 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const best = getSortedScopeEntities()[0] || null;
  if (els.instructorCount) els.instructorCount.textContent = fmtInt(scoped.length);
  if (els.projectCount) els.projectCount.textContent = fmtInt(totalProjects);
  const scopeSub = rankingScope === 'all' ? '전체 카테고리 합산' : `${getCategoryLabel(selectedCategoryId)} 기준`;
  const cards = [
    { label: rankingScope === 'all' ? '항목' : '카테고리 항목', value: `${fmtInt(scoped.length)}개`, sub: scopeSub },
    { label: '프로젝트', value: `${fmtInt(totalProjects)}개`, sub: '등록 기수 합산' },
    { label: '광고비', value: fmtWon(totalSpend), sub: '일예산 합산', emph: true },
    { label: '실매출', value: fmtWon(totalRevenue), sub: '강사·아이템 합산', emph: true },
    { label: '평균 ROAS', value: fmtRoas(avgRoas), sub: best ? `현재 1위 ${best.instructor} · ${best.item}` : '표시할 항목 없음', roas: true }
  ];
  els.statsGrid.innerHTML = cards.map((card) => `
    <article class="portalStatCard slimStatCard ${card.emph ? 'statCardEmphasis' : ''} ${card.roas ? 'statCardRoas' : ''}">
      <div class="portalStatLabel">${esc(card.label)}</div>
      <div class="portalStatValue" title="${esc(card.value)}">${esc(card.value)}</div>
      <div class="portalStatSub">${esc(card.sub)}</div>
    </article>
  `).join('');
}
function renderSpotlight() {
  if (!els.spotlight) return;
  const selected = getSelectedEntity();
  if (els.heroSelectedInstructor) els.heroSelectedInstructor.textContent = selected?.instructor || '-';
  if (els.heroSelectedItem) els.heroSelectedItem.textContent = selected?.item || '-';
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
    <div class="portalMetricGrid compactMetricGrid spotlightMetricGrid">
      <div class="portalMetricCard"><span>총 광고비</span><b title="${esc(fmtWon(selected.spend))}">${esc(fmtWonCompact(selected.spend))}</b></div>
      <div class="portalMetricCard"><span>총 실매출</span><b title="${esc(fmtWon(selected.revenue))}">${esc(fmtWonCompact(selected.revenue))}</b></div>
      <div class="portalMetricCard"><span>카테고리</span><b>${esc(getCategoryLabel(selected.categoryId))}</b></div>
      <div class="portalMetricCard"><span>기수 수</span><b>${fmtInt(selected.projectCount)}개</b></div>
    </div>
    <div class="portalChipList compactChipList">
      ${recentCohorts.length ? recentCohorts.map((cohort) => `<span class="portalChip" title="${esc(cohort)}">${esc(cohort)}</span>`).join('') : '<span class="portalChip">등록된 기수 없음</span>'}
    </div>
  `;
}
function getSortLabel() {
  const metricMap = { roas: 'ROAS', spend: '광고비', revenue: '실매출', projects: '프로젝트 수', name: '가나다순' };
  const orderMap = { asc: '오름차순', desc: '내림차순' };
  return `${metricMap[rankingSortMetric] || 'ROAS'} ${orderMap[rankingSortOrder] || '내림차순'}`;
}
function renderRankingTable() {
  if (!els.rankingWrap) return;
  const filtered = getSortedScopeEntities();
  const scopeLabel = rankingScope === 'all' ? '전체 카테고리 합산' : `${getCategoryLabel(selectedCategoryId)} 기준`;
  const rows = filtered.map((item, index) => `
    <tr class="${selectedEntityKey === item.key ? 'is-active' : ''}" data-rank-key="${esc(item.key)}">
      <td class="center"><span class="portalRankBadge ${index < 3 ? 'top3' : ''}">${index + 1}</span></td>
      <td class="comboEntityCell">
        <div class="comboEntityName">${esc(item.instructor)}</div>
        <div class="comboEntitySub" title="${esc(item.item)}">${esc(item.item)}</div>
      </td>
      <td class="center cellProjects">${fmtInt(item.projectCount)}개</td>
      <td class="num spendCell">${fmtWon(item.spend)}</td>
      <td class="num revenueCell">${fmtWon(item.revenue)}</td>
      <td class="center roasCell"><span class="portalRoasValue emphasisRoas">${esc(fmtRoas(item.roas))}</span></td>
      <td class="center"><button type="button" class="portalRowAction" data-open-inst="${esc(item.instructor)}" data-open-item="${esc(item.item)}">열기</button></td>
    </tr>
  `).join('');
  els.rankingWrap.innerHTML = `
    <div class="portalRankingHint compactHint">
      <span>정렬: ${esc(getSortLabel())}</span>
      <span>${esc(scopeLabel)} · 광고비 기준: 일예산 합산</span>
    </div>
    <div class="portalRankingTableWrap">
      <table class="portalRankingTable compactTable entityTable emphasisTable rankingCompactTable">
        <thead>
          <tr>
            <th class="center" style="width:56px">순위</th>
            <th style="width:180px">강사 / 아이템</th>
            <th class="center" style="width:72px">기수</th>
            <th style="width:180px">광고비</th>
            <th style="width:192px">실매출</th>
            <th class="center" style="width:100px">ROAS</th>
            <th class="center" style="width:78px">상세</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="7"><div class="portalEmptyState">표시할 항목이 없어.</div></td></tr>'}
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
  ensureSelectionVisible();
  renderSidebarCategories();
  renderScopeTabs();
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
  els.searchSidebar?.addEventListener('input', () => renderSidebar());
  els.sortMetric?.addEventListener('change', () => {
    rankingSortMetric = els.sortMetric.value || 'roas';
    if (rankingSortMetric === 'name') rankingSortOrder = 'asc';
    if (els.sortOrder) els.sortOrder.value = rankingSortOrder;
    renderRankingTable();
  });
  els.sortOrder?.addEventListener('change', () => {
    rankingSortOrder = els.sortOrder.value || 'desc';
    renderRankingTable();
  });
  els.spotlightOpenBtn?.addEventListener('click', () => {
    const selected = getSelectedEntity();
    openInstructorPage(selected?.instructor || '', selected?.item || '');
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
