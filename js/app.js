(function(){
  var auth = window.KakaoCheckAuth;
  var sheets = window.KakaoCheckSheets;
  var parser = window.KakaoCheckParser;
  var matcher = window.KakaoCheckMatcher;
  var trend = window.KakaoCheckTrend;
  var ui = window.KakaoCheckUI;
  var utils = window.KakaoCheckUtils;

  var state = {
    nextPanelId: 1,
    sheetTitles: [],
    panels: new Map()
  };

  function bootstrap(){
    ui.setLoginReady(false);
    bindTopLevelEvents();
    auth.onChange(function(payload){
      ui.setAuthState(payload);
      ui.setAuthError('');
      if(payload && payload.accessToken){
        loadSheetTitles();
      }
    });

    auth.init().then(function(){
      ui.setLoginReady(true);
      ui.setAuthState({ accessToken: null, user: null });
      ui.setAuthError('');
    }).catch(function(error){
      ui.setLoginReady(false);
      ui.setAuthError(error.message);
    });

    addPanel();
  }

  function bindTopLevelEvents(){
    document.getElementById('loginBtn').addEventListener('click', async function(){
      try {
        ui.setAuthError('');
        ui.setLoginReady(false);
        await auth.login();
      } catch (error) {
        ui.setAuthError(error.message);
      } finally {
        ui.setLoginReady(true);
      }
    });

    document.getElementById('logoutBtn').addEventListener('click', function(){
      auth.revoke();
      ui.closeModal();
    });

    document.getElementById('refreshTabsBtn').addEventListener('click', function(){
      loadSheetTitles();
    });

    document.getElementById('addPanelBtn').addEventListener('click', function(){
      addPanel();
    });
  }

  async function loadSheetTitles(){
    try {
      state.sheetTitles = await sheets.listSheetTitles();
    } catch (error) {
      ui.setAuthError(error.message);
    }
  }

  function addPanel(){
    var panelId = state.nextPanelId;
    state.nextPanelId += 1;

    var panelEl = ui.createPanelElement(panelId);
    var panelState = {
      id: panelId,
      el: panelEl,
      files: [],
      selectedSheet: ''
    };
    state.panels.set(panelId, panelState);
    bindPanelEvents(panelState);
    ui.renderSelectedSheet(panelEl, '');
    ui.renderFileSummary(panelEl, []);
    ui.setPanelStatus(panelEl, '', '');
    document.getElementById('panelsRoot').appendChild(panelEl);
    refreshRemoveButtons();
  }

  function removePanel(panelId){
    if(state.panels.size <= 1) return;
    var panelState = state.panels.get(panelId);
    if(!panelState) return;
    panelState.el.remove();
    state.panels.delete(panelId);
    if(ui.getModalState() && ui.getModalState().panelId === panelId){
      ui.closeModal();
    }
    refreshRemoveButtons();
  }

  function refreshRemoveButtons(){
    state.panels.forEach(function(panelState){
      var btn = utils.qs('.panel-remove-btn', panelState.el);
      if(!btn) return;
      btn.disabled = state.panels.size <= 1;
    });
  }

  function bindPanelEvents(panelState){
    var el = panelState.el;
    var fileInput = utils.qs('.js-file-input', el);
    var runBtn = utils.qs('.js-run-btn', el);
    var trendBtn = utils.qs('.js-trend-btn', el);
    var demoBtn = utils.qs('.js-demo-btn', el);
    var removeBtn = utils.qs('.panel-remove-btn', el);
    var openSheetBtn = utils.qs('.js-open-sheet-modal-btn', el);
    var openFileBtn = utils.qs('.js-open-file-modal-btn', el);

    openSheetBtn.addEventListener('click', function(){
      openSheetPicker(panelState.id);
    });

    openFileBtn.addEventListener('click', function(){
      openFileManager(panelState.id);
    });

    fileInput.addEventListener('change', function(event){
      var incoming = Array.from(event.target.files || []);
      if(!incoming.length) return;
      panelState.files = appendUniqueFiles(panelState.files, incoming);
      ui.renderFileSummary(el, panelState.files);
      ui.setPanelStatus(el, panelState.files.length + '개 파일 준비', '');
      event.target.value = '';
      var modal = ui.getModalState();
      if(modal && modal.type === 'file-manager' && modal.panelId === panelState.id){
        openFileManager(panelState.id);
      }
    });

    runBtn.addEventListener('click', function(){
      runPanel(panelState.id);
    });

    trendBtn.addEventListener('click', function(){
      loadPaymentTrend(panelState.id);
    });

    demoBtn.addEventListener('click', function(){
      runDemo(panelState.id);
    });

    removeBtn.addEventListener('click', function(){
      removePanel(panelState.id);
    });
  }

  function openSheetPicker(panelId){
    var panelState = state.panels.get(panelId);
    if(!panelState) return;
    ui.openSheetPickerModal({
      panelId: panelId,
      title: panelState.selectedSheet ? panelState.selectedSheet + ' · 탭 선택' : '탭 선택',
      subtitle: '',
      titles: state.sheetTitles,
      selectedTitle: panelState.selectedSheet,
      onSelect: function(title){
        panelState.selectedSheet = title;
        ui.renderSelectedSheet(panelState.el, panelState.selectedSheet);
        ui.setPanelStatus(panelState.el, '탭 선택 완료', '');
      }
    });
  }

  function openFileManager(panelId){
    var panelState = state.panels.get(panelId);
    if(!panelState) return;
    ui.openFileManagerModal(buildFileModalOptions(panelState));
  }

  function buildFileModalOptions(panelState){
    return {
      panelId: panelState.id,
      title: panelState.selectedSheet ? panelState.selectedSheet + ' · 로그 파일 관리' : '로그 파일 관리',
      subtitle: '',
      files: panelState.files,
      onAddRequest: function(){
        var input = utils.qs('.js-file-input', panelState.el);
        if(input) input.click();
      },
      onRemoveIndex: function(index){
        panelState.files.splice(index, 1);
        ui.renderFileSummary(panelState.el, panelState.files);
        ui.setPanelStatus(panelState.el, panelState.files.length ? '파일 목록 수정됨' : '파일 비움', '');
      },
      onClearAll: function(){
        panelState.files = [];
        ui.renderFileSummary(panelState.el, panelState.files);
        ui.setPanelStatus(panelState.el, '파일 비움', '');
      },
      getFreshOptions: function(){
        return buildFileModalOptions(panelState);
      }
    };
  }

  function appendUniqueFiles(existingFiles, incomingFiles){
    var merged = existingFiles.slice();
    var seen = new Set(existingFiles.map(function(file){
      return [file.name, file.size, file.lastModified].join('::');
    }));
    incomingFiles.forEach(function(file){
      var key = [file.name, file.size, file.lastModified].join('::');
      if(seen.has(key)) return;
      seen.add(key);
      merged.push(file);
    });
    return merged;
  }

  async function runPanel(panelId){
    var panelState = state.panels.get(panelId);
    var previewOnly = utils.qs('.js-preview-only', panelState.el).checked;
    try {
      ui.setPanelError(panelState.el, '');
      ui.setPanelStatus(panelState.el, '실행 중...', 'warn');
      if(!auth.getAccessToken()) throw new Error('먼저 Google 로그인하세요.');
      if(!panelState.selectedSheet) throw new Error('탭을 먼저 선택하세요.');
      if(!panelState.files.length) throw new Error('카톡 대화로그 파일을 하나 이상 추가하세요.');

      var chatText = await parser.combineFiles(panelState.files);
      var parsed = parser.parseChatText(chatText);
      var roster = await sheets.loadRosterRows(panelState.selectedSheet);
      var result = matcher.buildResult(roster, parsed);
      var paymentTrend = trend.buildPaymentTrend(roster);

      if(!previewOnly && result.updates.length){
        await sheets.writeUpdates(result.updates);
      }

      renderRunResult(panelState, result, previewOnly, paymentTrend);
      ui.setPanelStatus(panelState.el, previewOnly ? '열람용 완료' : '체크 완료', 'ok');
    } catch (error) {
      ui.setPanelStatus(panelState.el, '실패', 'bad');
      ui.setPanelError(panelState.el, error.message || String(error));
      console.error(error);
    }
  }

  async function loadPaymentTrend(panelId){
    var panelState = state.panels.get(panelId);
    if(!panelState) return;
    try {
      ui.setPanelError(panelState.el, '');
      ui.setPanelStatus(panelState.el, '결제 추이 불러오는 중...', 'warn');
      if(!auth.getAccessToken()) throw new Error('먼저 Google 로그인하세요.');
      if(!panelState.selectedSheet) throw new Error('탭을 먼저 선택하세요.');

      var roster = await sheets.loadRosterRows(panelState.selectedSheet);
      var paymentTrend = trend.buildPaymentTrend(roster);
      ui.renderPaymentTrend(panelState.el, paymentTrend);
      ui.setPanelStatus(panelState.el, paymentTrend.hasData ? '결제 추이 완료' : '결제시각 없음', paymentTrend.hasData ? 'ok' : 'warn');
    } catch (error) {
      ui.setPanelStatus(panelState.el, '실패', 'bad');
      ui.setPanelError(panelState.el, error.message || String(error));
      console.error(error);
    }
  }

  function runDemo(panelId){
    var panelState = state.panels.get(panelId);
    var demoStart = new Date();
    demoStart.setDate(demoStart.getDate() - 1);
    demoStart.setHours(19, 30, 0, 0);
    var roster = [
      { rowNumber: 2, sheetTitle: '데모', name: '황현하', phone: '010-1234-5678', paymentTime: new Date(demoStart.getTime() + 2 * 60 * 1000), nameNormalized: utils.normalizeName('황현하') },
      { rowNumber: 3, sheetTitle: '데모', name: '김혜영', phone: '010-3456-7890', paymentTime: new Date(demoStart.getTime() + 9 * 60 * 1000), nameNormalized: utils.normalizeName('김혜영') },
      { rowNumber: 4, sheetTitle: '데모', name: '임규리', phone: '010-1717-1771', paymentTime: new Date(demoStart.getTime() + 23 * 60 * 1000), nameNormalized: utils.normalizeName('임규리') },
      { rowNumber: 5, sheetTitle: '데모', name: '김예은', phone: '010-1111-0000', paymentTime: new Date(demoStart.getTime() + 46 * 60 * 1000), nameNormalized: utils.normalizeName('김예은') },
      { rowNumber: 6, sheetTitle: '데모', name: '황현하', phone: '010-9999-9999', paymentTime: new Date(demoStart.getTime() + 48 * 60 * 1000), nameNormalized: utils.normalizeName('황현하') }
    ];
    var parsed = parser.parseChatText([
      '김예은/0000님이 입장하셨습니다',
      '황현하/5678님이 입장하셨습니다',
      '임규리 1771님이 들어왔습니다',
      '김혜영님이 입장하셨습니다',
      '진종범/2514님이 입장하셨습니다',
      '매드드라이버김지현님이 입장하셨습니다',
      '황현하/5678님이 나갔습니다',
      '황현하/5678님이 입장했습니다',
      '김혜영님이 나갔습니다'
    ].join('\n'));
    var result = matcher.buildResult(roster, parsed);
    var paymentTrend = trend.buildPaymentTrend(roster);
    ui.setPanelError(panelState.el, '');
    renderRunResult(panelState, result, true, paymentTrend);
    ui.setPanelStatus(panelState.el, '데모 완료', 'ok');
  }

  function renderRunResult(panelState, result, previewOnly, paymentTrend){
    var sections = [
      {
        title: '명단 기준 상태',
        headers: ['row', 'name', 'phone', 'status', 'matched', 'notes'],
        rows: result.report,
        groups: [
          { key: 'all', label: '전체', rows: result.report },
          { key: 'entered', label: '입장자', rows: result.reportEntered },
          { key: 'left', label: '퇴장자', rows: result.reportLeft },
          { key: 'missing', label: '미입장', rows: result.reportMissing }
        ]
      },
      {
        title: '명단 외 입장자',
        headers: ['name/last4'],
        rows: result.extra
      },
      {
        title: '퇴장자 명단(최종)',
        headers: ['name/last4'],
        rows: result.leavers
      },
      {
        title: previewOnly ? '예상 기록 대상' : '실제 기록 대상',
        headers: ['range', 'value'],
        rows: result.updates.map(function(item){
          return [item.range, item.values && item.values[0] ? item.values[0][0] : ''];
        })
      },
      {
        title: '로그 요약',
        headers: ['입장 로그 수', '퇴장 로그 수', '명단 입장자', '명단 퇴장자'],
        rows: [[result.joinedCount, result.leftCount, result.attendingCount, result.finalLeftCount]]
      }
    ];
    ui.renderResults(panelState.el, sections, { paymentTrend: paymentTrend });
  }

  document.addEventListener('DOMContentLoaded', bootstrap);
})();
