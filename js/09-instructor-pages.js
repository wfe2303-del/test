
(function(){
  function sortProjectsForInstructor(list){
    return (Array.isArray(list) ? list.slice() : []).sort((a,b)=>{
      const na = getProjectCohortNo(a);
      const nb = getProjectCohortNo(b);
      if(Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
      return String(a.cohort || '').localeCompare(String(b.cohort || ''), 'ko');
    });
  }

  function ensureInstructorScopedCurrentProject(){
    const inst = getPageInstructorFilter ? getPageInstructorFilter() : '';
    if(!inst) return;
    const scoped = sortProjectsForInstructor(listProjects());
    if(!scoped.length){
      state.currentProjectId = '';
      return;
    }
    const current = state.projects[state.currentProjectId];
    if(!current || String(current.instructor || '').trim() !== inst){
      state.currentProjectId = scoped[0].id;
    }
    if(!state.compare) state.compare = defaultCompare(state.currentProjectId);
    state.compare.rightId = state.currentProjectId;
    const leftExists = state.projects[state.compare.leftId] && String(state.projects[state.compare.leftId].instructor || '').trim() === inst;
    if(!leftExists || state.compare.leftId === state.compare.rightId){
      const fallback = scoped.find(p=>p.id !== state.currentProjectId) || scoped[0];
      state.compare.leftId = fallback ? fallback.id : '';
    }
    saveState();
  }

  function getNextCohortLabel(project){
    if(!project) return '-';
    const parsed = splitProjectCohortLabel(project.cohort);
    const nextNo = Number.isFinite(parsed.cohortNo) ? parsed.cohortNo + 1 : null;
    if(nextNo){
      return parsed.item ? `${parsed.item}/${nextNo}기` : `${nextNo}기`;
    }
    return parsed.item ? `${parsed.item}/다음기수` : '다음기수';
  }

  function setText(idOrEl, value){
    const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
    if(el) el.textContent = value;
  }
  function setHtml(idOrEl, value){
    const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
    if(el) el.innerHTML = value;
  }

  function openCalcModal(){
    const modal = document.getElementById('nextCalcModal');
    if(!modal) return;
    modal.hidden = false;
    document.body.classList.add('body-lock');
    const input = document.getElementById('nextCalcExtraSpend');
    if(input) setTimeout(()=> input.focus(), 20);
  }

  function closeCalcModal(){
    const modal = document.getElementById('nextCalcModal');
    if(!modal) return;
    modal.hidden = true;
    document.body.classList.remove('body-lock');
  }

  function bindCalcModal(){
    const openBtn = document.getElementById('btnOpenCalcModal');
    const closeBtn = document.getElementById('btnCloseCalcModal');
    const modal = document.getElementById('nextCalcModal');
    if(openBtn && !openBtn.dataset.bound){
      openBtn.dataset.bound = '1';
      openBtn.addEventListener('click', openCalcModal);
    }
    if(closeBtn && !closeBtn.dataset.bound){
      closeBtn.dataset.bound = '1';
      closeBtn.addEventListener('click', closeCalcModal);
    }
    if(modal && !modal.dataset.bound){
      modal.dataset.bound = '1';
      modal.addEventListener('click', (e)=>{
        if(e.target === modal) closeCalcModal();
      });
    }
    if(!document.body.dataset.calcEscBound){
      document.body.dataset.calcEscBound = '1';
      document.addEventListener('keydown', (e)=>{
        if(e.key === 'Escape') closeCalcModal();
      });
    }
  }

  function renderInstructorHero(){
    const instructorHero = document.getElementById('instructorHero');
    const pageInstructorTitle = document.getElementById('pageInstructorTitle');
    const pageInstructorSub = document.getElementById('pageInstructorSub');
    const instructorHeroStats = document.getElementById('instructorHeroStats');
    const instructorCohortChips = document.getElementById('instructorCohortChips');
    const nextCalcExtraSpend = document.getElementById('nextCalcExtraSpend');
    bindCalcModal();

    if(!instructorHero) return;
    const inst = getPageInstructorFilter ? getPageInstructorFilter() : '';
    const itemFilter = getPageItemFilter ? getPageItemFilter() : '';
    if(!inst){
      instructorHero.style.display = 'none';
      return;
    }

    ensureInstructorScopedCurrentProject();
    const scoped = sortProjectsForInstructor(listProjects());
    instructorHero.style.display = '';
    const scopeTitle = itemFilter ? `${inst} · ${itemFilter}` : inst;
    pageInstructorTitle.textContent = `${scopeTitle} 페이지`;
    document.title = `${scopeTitle} · 강사별 DB보고서`;
    pageInstructorSub.textContent = scoped.length
      ? `등록 기수 ${fmtInt(scoped.length)}개 · 기수를 누르면 현재 프로젝트가 바로 바뀌어.`
      : '아직 등록된 기수가 없어.';

    if(!scoped.length){
      instructorHeroStats.innerHTML = '<span class="badge">등록된 기수가 없어.</span>';
      instructorCohortChips.innerHTML = '';
      ['previewCalcBaseLabel','nextCalcBaseLabel','previewCalcNextLabel','nextCalcNextLabel'].forEach(id=> setHtml(id,'<b>-</b>'));
      ['previewCalcRevenue','nextCalcProjectedRevenue'].forEach(id=> setText(id,'₩0'));
      ['previewCalcCpa','nextCalcCpa','previewCalcValuePerDb','nextCalcValuePerDb'].forEach(id=> setText(id,'₩0'));
      setText('nextCalcProjectedSub','광고비 증액을 입력하면 예상 매출이 계산돼.');
      setText('nextCalcAddedDb','0');
      setText('nextCalcSummary','기수를 등록하면 자동으로 현재 기수 기준값을 잡아 계산해줘.');
      return;
    }

    const totalActual = scoped.reduce((s,p)=> s + Number(p.actualRevenue || 0), 0);
    const totalSpend = scoped.reduce((s,p)=> s + Number(computeAdAverages(p, 'all').spend || 0), 0);
    const avgValue = scoped.reduce((s,p)=>{
      const snap = getFinalSnapshot(p);
      return s + Number(snap.valuePerDb || 0);
    }, 0) / Math.max(scoped.length, 1);

    instructorHeroStats.innerHTML = [
      `<span class="badge"><b>등록 기수</b> ${fmtInt(scoped.length)}개</span>`,
      `<span class="badge"><b>누적 실매출</b> ${fmtWon(totalActual)}</span>`,
      `<span class="badge"><b>누적 광고비</b> ${fmtWon(totalSpend)}</span>`,
      `<span class="badge"><b>평균 DB당 가치</b> ${fmtWon(avgValue)}</span>`
    ].join('');

    const current = getProj() || scoped[0];
    instructorCohortChips.innerHTML = scoped.map(p=>{
      const active = current && current.id === p.id ? 'active' : '';
      return `<button type="button" class="cohortMiniBtn ${active}" data-proj-id="${esc(p.id)}">${esc(p.cohort)}</button>`;
    }).join('');

    instructorCohortChips.querySelectorAll('[data-proj-id]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        setCurrent(btn.dataset.projId || '');
      });
    });

    const baseLabelHtml = `<b>${esc(current.cohort || '-')}</b>`;
    const nextLabelHtml = `<b>${esc(getNextCohortLabel(current))}</b>`;
    ['previewCalcBaseLabel','nextCalcBaseLabel'].forEach(id=> setHtml(id, baseLabelHtml));
    ['previewCalcNextLabel','nextCalcNextLabel'].forEach(id=> setHtml(id, nextLabelHtml));

    const snap = getFinalSnapshot(current);
    const extraSpend = Math.max(0, Number(nextCalcExtraSpend?.value || 0));
    const fallbackCpa = (snap.spend > 0 && snap.paidDb > 0) ? (snap.spend / snap.paidDb) : 0;
    const avgCpa = Number(snap.avgCpa || 0) > 0 ? Number(snap.avgCpa || 0) : fallbackCpa;
    const valuePerDb = Number(snap.valuePerDb || 0);
    const baseRecruitDb = Number(snap.recruitDb || 0);
    const addPaidDb = avgCpa > 0 ? (extraSpend / avgCpa) : 0;
    const baseExpected = valuePerDb * baseRecruitDb;
    const nextExpected = valuePerDb * (baseRecruitDb + addPaidDb);

    setText('nextCalcAddedDb', fmtInt(addPaidDb));
    const cpaText = avgCpa > 0 ? fmtWon(avgCpa) : '데이터 없음';
    const valueText = valuePerDb > 0 ? fmtWon(valuePerDb) : '데이터 없음';
    ['previewCalcCpa','nextCalcCpa'].forEach(id=> setText(id, cpaText));
    ['previewCalcValuePerDb','nextCalcValuePerDb'].forEach(id=> setText(id, valueText));

    if(valuePerDb <= 0){
      ['previewCalcRevenue','nextCalcProjectedRevenue'].forEach(id=> setText(id,'계산 불가'));
      setText('nextCalcProjectedSub','실매출 또는 모집DB가 없어서 DB당 가치를 계산할 수 없어.');
      setText('nextCalcSummary','현재 기수에 실매출과 모집DB를 먼저 넣어주면 광고비 증액 예상 매출을 계산해줘.');
      return;
    }

    const nextExpectedText = fmtWon(nextExpected);
    ['previewCalcRevenue','nextCalcProjectedRevenue'].forEach(id=> setText(id,nextExpectedText));
    setText('nextCalcProjectedSub', `${fmtWon(extraSpend)} 증액 시 ${fmtInt(addPaidDb)}건의 추가 Paid DB를 가정해 계산했어.`);
    setText('nextCalcSummary', `현재 예상매출 ${fmtWon(baseExpected)} → 다음 기수 예상매출 ${fmtWon(nextExpected)} · 기준 CPA ${fmtWon(avgCpa)} · DB당 가치 ${fmtWon(valuePerDb)}`);
  }

  document.addEventListener('input', (e)=>{
    if(e.target && e.target.id === 'nextCalcExtraSpend') renderInstructorHero();
  });

  const btnOpenCompareTab = document.getElementById('btnOpenCompareTab');
  if(btnOpenCompareTab){
    btnOpenCompareTab.addEventListener('click', ()=> switchTab('compare'));
  }

  const baseRenderAll = window.renderAll;
  if(typeof baseRenderAll === 'function'){
    window.renderAll = function(){
      ensureInstructorScopedCurrentProject();
      baseRenderAll();
      renderInstructorHero();
    };
  }

  window.renderInstructorHero = renderInstructorHero;
  setTimeout(()=>{
    try{
      ensureInstructorScopedCurrentProject();
      if(typeof window.renderAll === 'function') window.renderAll();
      else renderInstructorHero();
    }catch(err){
      console.error(err);
    }
  }, 0);
})();
