(async function bootstrap(){
  const root = document.getElementById('app-root');
  const bootMsg = document.getElementById('boot-message');

  async function loadHtml(path){
    const res = await fetch(path, { cache: 'no-store' });
    if(!res.ok) throw new Error(`HTML 로드 실패: ${path}`);
    return await res.text();
  }

  function loadScript(path){
    return new Promise((resolve, reject)=>{
      const script = document.createElement('script');
      script.src = path;
      script.defer = false;
      script.onload = ()=> resolve();
      script.onerror = ()=> reject(new Error(`스크립트 로드 실패: ${path}`));
      document.body.appendChild(script);
    });
  }

  try{
    root.innerHTML = await loadHtml('./views/app-shell.html');
    const scripts = [
      './js/01-core-utils-state-auth.js',
      './js/02-core-db-mapping.js',
      './js/03-core-dom-ui.js',
      './js/04-data.js',
      './js/05-render-shell.js',
      './js/06-project-import-management.js',
      './js/07-charts-compare.js',
      './js/08-events-init.js',
      './js/09-instructor-pages.js'
    ];
    for(const src of scripts){
      await loadScript(src);
    }
    if(bootMsg) bootMsg.remove();
  }catch(err){
    console.error(err);
    if(bootMsg){
      bootMsg.innerHTML = `
        <div style="max-width:720px;margin:40px auto;padding:20px;border:1px solid #fecaca;background:#fff1f2;color:#881337;border-radius:16px;line-height:1.6;">
          <div style="font-weight:800;font-size:18px;margin-bottom:8px;">앱 로딩 실패</div>
          <div>${String(err?.message || err)}</div>
          <div style="margin-top:8px;font-size:13px;color:#9f1239;">GitHub/Vercel에 업로드할 때 views, js, styles 폴더가 함께 올라갔는지 확인해줘.</div>
        </div>`;
    }
  }
})();
