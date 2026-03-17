/** =========================
 *  Supabase 설정
 *  ========================= */
const UI_LS_KEY = 'INDEPENDENT_REPORT_V441_UI_ONLY';
const EXTRA_CFG_LS_KEY = 'INDEPENDENT_REPORT_V441_EXTRA_CFG';

const SUPABASE_URL = 'https://eaukbojyuygwhkaxdvnx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhdWtib2p5dXlnd2hrYXhkdm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTk0OTMsImV4cCI6MjA4ODc3NTQ5M30.0IAiljx47666xWxJq5N_kDmjPUpESmibPqEjDtb2TRc';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let authSession = null;

const LOGIN_ID_MAP = {
  classaround: 'classaround@gmail.com',
  test: 'test@gmail.com'
};

/** =========================
 *  공통 유틸
 *  ========================= */
function nowId(){ return 'p_' + Math.random().toString(16).slice(2) + '_' + Date.now().toString(16); }
function esc(s){ return String(s)
  .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
  .replaceAll('"','&quot;').replaceAll("'","&#039;"); }
function fmtInt(n){ const x=Number(n); return Number.isFinite(x)? Math.round(x).toLocaleString('ko-KR') : '0'; }
function fmtWon(n){ const x=Number(n); return Number.isFinite(x)? '₩'+Math.round(x).toLocaleString('ko-KR') : '₩0'; }
function fmtRate(p){ return (Number.isFinite(p)) ? (p*100).toFixed(2)+'%' : '0.00%'; }

function toISODate(d){
  if(!d) return '';
  if(typeof d==='string') return d.slice(0,10);
  const yyyy=d.getFullYear(), mm=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}`;
}
function addDays(iso, days){
  const [y,m,d]=iso.split('-').map(Number);
  const dt=new Date(y,m-1,d);
  dt.setDate(dt.getDate()+days);
  return toISODate(dt);
}
function parseNumberLoose(v){
  const s=String(v??'').replace(/,/g,'').trim();
  if(!s) return 0;
  const n=Number(s);
  return Number.isFinite(n)?n:0;
}
function parseNumberRounded(v){
  const n=parseNumberLoose(v);
  return Number.isFinite(n) ? Math.round(n) : 0;
}
function normalizeDateFromText(s){
  const t=String(s||'').trim();
  if(!t) return '';
  const m=t.match(/^(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
  if(m){
    const yyyy=m[1], mm=String(m[2]).padStart(2,'0'), dd=String(m[3]).padStart(2,'0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const m2=t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  return '';
}
function excelDateToISO(excelSerial){
  const utc_days = Math.floor(excelSerial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  const yyyy = date_info.getUTCFullYear();
  const mm = String(date_info.getUTCMonth()+1).padStart(2,'0');
  const dd = String(date_info.getUTCDate()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}`;
}
function normalizeDateFromAny(v){
  if(v===null || v===undefined) return '';
  if(v instanceof Date) return toISODate(v);
  if(typeof v==='number') return excelDateToISO(v);
  return normalizeDateFromText(v);
}
function deepClone(v){ return JSON.parse(JSON.stringify(v)); }
function ymFromDate(iso){ return String(iso||toISODate(new Date())).slice(0,7); }
function monthStart(ym){ return `${ym}-01`; }
function addMonths(ym, delta){
  const [y,m]=String(ym||ymFromDate()).split('-').map(Number);
  const dt=new Date(y, (m-1)+delta, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
}
function getDaysInMonth(ym){ const [y,m]=ym.split('-').map(Number); return new Date(y,m,0).getDate(); }
function getExtraCfgMap(){ try{return JSON.parse(localStorage.getItem(EXTRA_CFG_LS_KEY)||'{}')}catch{return {}} }
function saveExtraCfgMap(map){ localStorage.setItem(EXTRA_CFG_LS_KEY, JSON.stringify(map||{})); }
function getExtraCfg(projectId){ const m=getExtraCfgMap(); return m[projectId] || { instructorRate:0, adShareRate:0 }; }
function setExtraCfg(projectId, cfg){ const m=getExtraCfgMap(); m[projectId] = { instructorRate:Number(cfg?.instructorRate||0), adShareRate:Number(cfg?.adShareRate ?? cfg?.adShareRate ?? 0) }; saveExtraCfgMap(m); }
function toggleDateSelection(list, iso){
  const arr = Array.isArray(list) ? [...list] : [];
  const idx = arr.indexOf(iso);
  if(idx>=0) arr.splice(idx,1); else arr.push(iso);
  arr.sort();
  return arr;
}

/** =========================
 *  상태 / UI 저장
 *  ========================= */
function defaultCompare(projectId=''){
  return {
    leftId: projectId || '',
    rightId: projectId || '',
    selectedProjectIds: projectId ? [projectId] : [],
    selectedMetricKeys: ['actualRevenue','expectedRevenue','valuePerDb','recruitDb','spend','instructorSettlement'],
    mode:'project',
    instructorFilter:'all',
    metric:'actualRevenue',
    sort:'desc'
  };
}
function getUiState(){
  try{
    return JSON.parse(localStorage.getItem(UI_LS_KEY) || '{}');
  }catch{
    return {};
  }
}
function loadState(){
  const ui = getUiState();
  return {
    projects: {},
    currentProjectId: ui.currentProjectId || '',
    compare: ui.compare || defaultCompare(ui.currentProjectId || ''),
    ownedSelectedDates: Array.isArray(ui.ownedSelectedDates) ? ui.ownedSelectedDates : [],
    adsSelectedDates: Array.isArray(ui.adsSelectedDates) ? ui.adsSelectedDates : [],
    ownedCalendarYm: ymFromDate(),
    adsCalendarYm: ymFromDate()
  };
}
function saveState(){
  const ui = {
    currentProjectId: state.currentProjectId,
    compare: state.compare
  };
  localStorage.setItem(UI_LS_KEY, JSON.stringify(ui));
}
const state = loadState();
const RECENT_INSTRUCTOR_LS_KEY = 'instructor_db_report_recent_instructors_v1';
function loadRecentInstructors(){
  try{
    const raw = JSON.parse(localStorage.getItem(RECENT_INSTRUCTOR_LS_KEY) || '[]');
    return Array.isArray(raw) ? raw.map(v=>String(v||'').trim()).filter(Boolean).slice(0,5) : [];
  }catch(_){ return []; }
}
function saveRecentInstructors(list){
  localStorage.setItem(RECENT_INSTRUCTOR_LS_KEY, JSON.stringify((Array.isArray(list)?list:[]).slice(0,5)));
}
function pushRecentInstructor(name){
  const inst = String(name || '').trim();
  if(!inst) return;
  const list = loadRecentInstructors().filter(v=>v!==inst);
  list.unshift(inst);
  saveRecentInstructors(list);
}

/** =========================
 *  인증
 *  ========================= */
async function ensureAuth(){
  const { data:{session}, error } = await sb.auth.getSession();
  if(error) throw error;
  authSession = session || null;
  return authSession;
}
function ownerId(){
  return authSession?.user?.id || '';
}
function isLoggedIn(){
  return !!authSession?.user?.id;
}
function getLoginEmailFromId(id){
  const key = String(id || '').trim().toLowerCase();
  return LOGIN_ID_MAP[key] || '';
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

  const canAutoCreate = (key === 'test');
  if(!canAutoCreate) throw error;

  const { data:signUpData, error:signUpError } = await sb.auth.signUp({ email, password });
  if(signUpError){
    const msg = String(signUpError?.message || '').toLowerCase();
    if(msg.includes('already') || msg.includes('registered') || msg.includes('exists')){
      throw error;
    }
    throw signUpError;
  }

  authSession = signUpData?.session || null;
  if(authSession) return signUpData;

  throw new Error('test 계정은 생성됐지만 이메일 인증이 필요해. Supabase Auth에서 Email 인증 설정을 확인해줘.');
}
async function logout(){
  const { error } = await sb.auth.signOut();
  if(error) throw error;
  authSession = null;
}
function requireLogin(){
  if(!isLoggedIn()){
    updateAuthUi();
    throw new Error('로그인이 필요해.');
  }
}
