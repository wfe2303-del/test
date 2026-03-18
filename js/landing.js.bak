
const SUPABASE_URL = 'https://eaukbojyuygwhkaxdvnx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhdWtib2p5dXlnd2hrYXhkdm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTk0OTMsImV4cCI6MjA4ODc3NTQ5M30.0IAiljx47666xWxJq5N_kDmjPUpESmibPqEjDtb2TRc';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LOGIN_ID_MAP = {
  classaround: 'classaround@gmail.com',
  test: 'test@gmail.com'
};

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
const landingInstructorGrid = $('landingInstructorGrid');
const landingInstructorCount = $('landingInstructorCount');
const landingProjectCount = $('landingProjectCount');

let authSession = null;
let projectRows = [];

function esc(s){
  return String(s)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'","&#039;");
}
function fmtInt(n){
  const x = Number(n);
  return Number.isFinite(x) ? Math.round(x).toLocaleString('ko-KR') : '0';
}
function getLoginEmailFromId(id){
  return LOGIN_ID_MAP[String(id || '').trim().toLowerCase()] || '';
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
async function loadProjects(){
  if(!isLoggedIn()) return [];
  const { data, error } = await sb.from('projects').select('id,instructor,cohort,created_at').order('instructor', { ascending:true }).order('cohort', { ascending:true });
  if(error) throw error;
  projectRows = Array.isArray(data) ? data : [];
  renderInstructorGrid();
  return projectRows;
}
function buildInstructorGroups(){
  const map = new Map();
  for(const row of projectRows){
    const instructor = String(row.instructor || '').trim();
    if(!instructor) continue;
    if(!map.has(instructor)) map.set(instructor, []);
    map.get(instructor).push(row);
  }
  const search = String(landingInstructorSearch.value || '').trim().toLowerCase();
  const list = [...map.entries()].map(([name, items])=>({ name, items }));
  const filtered = search ? list.filter(x=>x.name.toLowerCase().includes(search)) : list;
  filtered.sort((a,b)=>a.name.localeCompare(b.name, 'ko'));
  return filtered;
}
function renderInstructorGrid(){
  const groups = buildInstructorGroups();
  landingInstructorCount.textContent = fmtInt(groups.length);
  landingProjectCount.textContent = fmtInt(projectRows.length);

  if(!groups.length){
    landingInstructorGrid.innerHTML = '<div class="landingEmpty">표시할 강사가 없어. 검색어를 지우거나 프로젝트를 먼저 등록해줘.</div>';
    return;
  }

  landingInstructorGrid.innerHTML = groups.map(({name, items})=>{
    const cohorts = items.map(x=>String(x.cohort || '').trim()).filter(Boolean);
    const preview = cohorts.slice(0, 4).map(c=>`<span class="landingMiniChip">${esc(c)}</span>`).join('');
    const more = cohorts.length > 4 ? `<span class="landingMiniChip">+${fmtInt(cohorts.length - 4)}</span>` : '';
    return `
      <button type="button" class="landingInstructorCard" data-inst="${esc(name)}">
        <div class="landingCardTop">
          <div>
            <div class="landingCardName">${esc(name)}</div>
            <div class="landingMuted">등록 기수 ${fmtInt(items.length)}개</div>
          </div>
          <div class="landingArrow">↗</div>
        </div>
        <div class="landingMiniChipWrap">${preview}${more}</div>
      </button>
    `;
  }).join('');

  landingInstructorGrid.querySelectorAll('[data-inst]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const inst = btn.dataset.inst || '';
      const url = `./instructor.html?instructor=${encodeURIComponent(inst)}`;
      window.open(url, '_blank');
    });
  });
}

landingLoginBtn.addEventListener('click', async ()=>{
  landingLoginMsg.textContent = '';
  try{
    await loginWithIdPassword(landingLoginId.value, landingLoginPw.value);
    landingLoginPw.value = '';
    updateAuthUi();
    await loadProjects();
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
    updateAuthUi();
    renderInstructorGrid();
  }catch(err){
    console.error(err);
    alert(err?.message || '로그아웃 실패');
  }
});
landingInstructorSearch.addEventListener('input', renderInstructorGrid);

(async function init(){
  try{
    await ensureAuth();
    updateAuthUi();
    if(isLoggedIn()){
      await loadProjects();
    }
  }catch(err){
    console.error(err);
    alert('초기 로딩 실패: Supabase 연결 상태를 확인해줘.');
  }
})();
