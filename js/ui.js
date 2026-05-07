(function(){
  var utils = window.KakaoCheckUtils;
  var modalState = null;

  function modalEls(){
    return {
      overlay: document.getElementById('modalOverlay'),
      title: document.getElementById('modalTitle'),
      subtitle: document.getElementById('modalSubtitle'),
      body: document.getElementById('modalBody'),
      closeBtn: document.getElementById('modalCloseBtn')
    };
  }

  function bindModalShell(){
    var els = modalEls();
    if(!els.overlay || els.overlay.dataset.bound === '1') return;
    els.overlay.dataset.bound = '1';
    els.closeBtn.addEventListener('click', closeModal);
    els.overlay.addEventListener('click', function(event){
      if(event.target === els.overlay) closeModal();
    });
    document.addEventListener('keydown', function(event){
      if(event.key === 'Escape' && modalState) closeModal();
    });
  }

  function openModal(title, subtitle){
    bindModalShell();
    var els = modalEls();
    els.title.textContent = title || '';
    els.subtitle.textContent = subtitle || '';
    els.body.innerHTML = '';
    els.overlay.classList.remove('hidden');
    els.overlay.setAttribute('aria-hidden', 'false');
  }

  function closeModal(){
    var els = modalEls();
    if(!els.overlay) return;
    els.overlay.classList.add('hidden');
    els.overlay.setAttribute('aria-hidden', 'true');
    els.body.innerHTML = '';
    modalState = null;
  }

  function getModalState(){
    return modalState;
  }

  function setAuthState(state){
    var loginScreen = document.getElementById('loginScreen');
    var appShell = document.getElementById('appShell');
    var logoutBtn = document.getElementById('logoutBtn');
    var topbarUser = document.getElementById('topbarUser');
    var isLoggedIn = !!(state && state.user && state.user.email && state.accessToken);

    if(loginScreen) loginScreen.classList.toggle('hidden', isLoggedIn);
    if(appShell) appShell.classList.toggle('hidden', !isLoggedIn);
    if(logoutBtn) logoutBtn.classList.toggle('hidden', !isLoggedIn);
    if(topbarUser){
      topbarUser.textContent = isLoggedIn ? state.user.email : '';
      topbarUser.classList.toggle('hidden', !isLoggedIn);
    }
  }

  function setLoginReady(isReady){
    var loginBtn = document.getElementById('loginBtn');
    if(!loginBtn) return;
    loginBtn.disabled = !isReady;
    loginBtn.textContent = isReady ? 'Google 계정으로 로그인' : '로그인 준비 중...';
  }

  function setTabState(message, kind){
    var tabState = document.getElementById('tabState');
    if(!tabState) return;
    tabState.className = utils.statusClass(kind || '');
    tabState.textContent = message || '';
  }

  function setAuthError(message){
    var authErr = document.getElementById('authErr');
    if(authErr) authErr.textContent = message || '';
  }

  function createPanelElement(panelId){
    var template = document.getElementById('panelTemplate');
    var node = template.content.firstElementChild.cloneNode(true);
    node.dataset.panelId = String(panelId);
    utils.qs('.panel-title', node).textContent = '탭 선택 전';
    return node;
  }

  function renderSelectedSheet(panelEl, sheetTitle){
    var node = utils.qs('.js-selected-sheet', panelEl);
    var titleNode = utils.qs('.panel-title', panelEl);
    var label = sheetTitle || '탭 미선택';
    if(node) node.textContent = label;
    if(titleNode) titleNode.textContent = sheetTitle || '탭 선택 전';
  }

  function renderFileSummary(panelEl, files){
    var summary = utils.qs('.js-file-summary', panelEl);
    if(!summary) return;
    if(!files.length){
      summary.textContent = '파일 없음';
      return;
    }
    if(files.length === 1){
      summary.textContent = files[0].name;
      return;
    }
    summary.textContent = files.length + '개 파일';
  }

  function setPanelStatus(panelEl, message, kind){
    var status = utils.qs('.js-panel-status', panelEl);
    var meta = utils.qs('.panel-meta', panelEl);
    if(!status || !meta) return;
    if(!message){
      meta.classList.add('hidden');
      status.className = 'status-pill js-panel-status';
      status.textContent = '';
      return;
    }
    meta.classList.remove('hidden');
    status.className = utils.statusClass(kind || '');
    status.textContent = message;
  }

  function setPanelError(panelEl, message){
    var errorBox = utils.qs('.js-panel-error', panelEl);
    if(errorBox) errorBox.textContent = message || '';
  }

  function renderResults(panelEl, sections, options){
    sections = sections || [];
    var renderOptions = options || {};
    var root = utils.qs('.js-panel-results', panelEl);
    if(!root) return;
    root.innerHTML = '';
    if(!sections.length && !renderOptions.paymentTrend){
      root.innerHTML = '<div class="empty-state">결과가 없습니다.</div>';
      return;
    }

    var summarySection = null;
    var listSections = [];
    sections.forEach(function(section){
      if(section.title === '로그 요약') summarySection = section;
      else listSections.push(section);
    });

    if(listSections.length){
      var buttonGrid = document.createElement('div');
      buttonGrid.className = 'result-button-grid';
      listSections.forEach(function(section){
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'result-open-btn';
        var titleWrap = document.createElement('span');
        titleWrap.textContent = section.title;
        var badge = document.createElement('span');
        badge.className = 'result-count-badge';
        badge.textContent = String(section.rows ? section.rows.length : 0);
        button.appendChild(titleWrap);
        button.appendChild(badge);
        button.addEventListener('click', function(){
          openSectionResultModal(section);
        });
        buttonGrid.appendChild(button);
      });
      root.appendChild(buttonGrid);
    }

    if(summarySection && summarySection.rows && summarySection.rows[0]){
      var summaryCard = document.createElement('div');
      summaryCard.className = 'result-summary-card';
      var title = document.createElement('h3');
      title.className = 'result-summary-title';
      title.textContent = summarySection.title;
      summaryCard.appendChild(title);
      var summaryGrid = document.createElement('div');
      summaryGrid.className = 'result-summary-grid';
      summarySection.headers.forEach(function(header, index){
        var stat = document.createElement('div');
        stat.className = 'result-stat';
        var label = document.createElement('span');
        label.className = 'result-stat-label';
        label.textContent = header;
        var value = document.createElement('strong');
        value.className = 'result-stat-value';
        value.textContent = summarySection.rows[0][index] == null ? '' : String(summarySection.rows[0][index]);
        stat.appendChild(label);
        stat.appendChild(value);
        summaryGrid.appendChild(stat);
      });
      summaryCard.appendChild(summaryGrid);
      root.appendChild(summaryCard);
    }

    if(renderOptions.paymentTrend){
      appendPaymentTrendCard(root, renderOptions.paymentTrend);
    }
  }

  function renderPaymentTrend(panelEl, model){
    var root = utils.qs('.js-panel-results', panelEl);
    if(!root) return;
    root.innerHTML = '';
    appendPaymentTrendCard(root, model);
  }

  function appendPaymentTrendCard(root, model){
    var trend = window.KakaoCheckTrend;
    var card = document.createElement('div');
    card.className = 'payment-trend-card';

    var head = document.createElement('div');
    head.className = 'payment-trend-head';
    var titleWrap = document.createElement('div');
    var title = document.createElement('h3');
    title.className = 'payment-trend-title';
    title.textContent = '결제 인원 추이';
    var subtitle = document.createElement('p');
    subtitle.className = 'payment-trend-subtitle';
    subtitle.textContent = 'H열 결제시각 기준 · ' + (model ? model.binMinutes : 15) + '분 단위 · 무료강의 19:00 시작 기준';
    titleWrap.appendChild(title);
    titleWrap.appendChild(subtitle);
    head.appendChild(titleWrap);
    card.appendChild(head);

    if(!model || !model.hasData){
      var emptyGrid = document.createElement('div');
      emptyGrid.className = 'payment-trend-stats';
      appendTrendStat(emptyGrid, '대상 행', model ? model.totalRows : 0);
      appendTrendStat(emptyGrid, 'H열 값', model ? model.rawCount : 0);
      appendTrendStat(emptyGrid, '파싱 성공', 0);
      appendTrendStat(emptyGrid, '파싱 실패', model ? model.failCount : 0);
      card.appendChild(emptyGrid);

      var empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = '결제시각으로 읽을 수 있는 값이 없습니다.';
      card.appendChild(empty);
      root.appendChild(card);
      return;
    }

    var stats = document.createElement('div');
    stats.className = 'payment-trend-stats';
    appendTrendStat(stats, 'H열 결제값', model.rawCount + '명');
    appendTrendStat(stats, '파싱 성공', model.parsedCount + '명');
    appendTrendStat(stats, '표시 구간', model.displayBins.length + '개');
    appendTrendStat(stats, '피크', model.peakCount + '명');
    appendTrendStat(stats, '첫 결제', trend.formatDateTime(model.minDate));
    appendTrendStat(stats, '마지막 결제', trend.formatDateTime(model.maxDate));
    appendTrendStat(stats, '무료강의 시작', trend.formatDateTime(model.freeLectureStart));
    appendTrendStat(stats, '유튜브 링크', model.freeLectureUrl ? '입력됨' : '미입력');
    card.appendChild(stats);

    var chartWrap = document.createElement('div');
    chartWrap.className = 'payment-trend-chart';
    chartWrap.appendChild(buildPaymentTrendSvg(model));
    card.appendChild(chartWrap);

    appendLectureComparison(card, model);

    if(model.peakLabels && model.peakLabels.length){
      var peak = document.createElement('div');
      peak.className = 'payment-trend-note';
      peak.textContent = '피크 구간: ' + model.peakLabels.slice(0, 5).join(', ') +
        (model.peakLabels.length > 5 ? ' 외 ' + (model.peakLabels.length - 5) + '개' : '');
      card.appendChild(peak);
    }

    if(model.failCount){
      var warn = document.createElement('div');
      warn.className = 'payment-trend-warning';
      warn.textContent = 'H열 날짜 파싱 실패 ' + model.failCount + '건이 있습니다. 셀 표시 형식을 확인해주세요.';
      card.appendChild(warn);
    }

    root.appendChild(card);
  }

  function appendLectureComparison(card, model){
    if(!model || !model.hasData || !model.displayBins || !model.displayBins.length) return;

    var wrap = document.createElement('div');
    wrap.className = 'lecture-comparison';
    var title = document.createElement('div');
    title.className = 'lecture-comparison-title';
    title.textContent = '무료강의 구간 비교';
    wrap.appendChild(title);

    var table = document.createElement('div');
    table.className = 'lecture-comparison-table';
    appendLectureComparisonRow(table, ['결제 구간', '결제', '무료강의 구간'], true);
    model.displayBins.forEach(function(bin){
      appendLectureComparisonRow(table, [
        bin.label,
        bin.count + '명',
        {
          text: bin.lectureSegment || '',
          href: bin.lectureUrl || ''
        }
      ]);
    });
    wrap.appendChild(table);
    card.appendChild(wrap);
  }

  function appendLectureComparisonRow(root, cells, isHead){
    var row = document.createElement('div');
    row.className = 'lecture-comparison-row' + (isHead ? ' head' : '');
    cells.forEach(function(cell){
      var item = document.createElement('div');
      item.className = 'lecture-comparison-cell';
      if(cell && typeof cell === 'object'){
        if(cell.href){
          var link = document.createElement('a');
          link.href = cell.href;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = cell.text || cell.href;
          item.appendChild(link);
        } else {
          item.textContent = cell.text || '';
        }
      } else {
        item.textContent = cell == null ? '' : String(cell);
      }
      row.appendChild(item);
    });
    root.appendChild(row);
  }

  function appendTrendStat(root, labelText, valueText){
    var item = document.createElement('div');
    item.className = 'payment-trend-stat';
    var label = document.createElement('span');
    label.className = 'payment-trend-stat-label';
    label.textContent = labelText;
    var value = document.createElement('strong');
    value.className = 'payment-trend-stat-value';
    value.textContent = valueText == null ? '' : String(valueText);
    item.appendChild(label);
    item.appendChild(value);
    root.appendChild(item);
  }

  function svgNode(name){
    return document.createElementNS('http://www.w3.org/2000/svg', name);
  }

  function setSvgAttrs(node, attrs){
    Object.keys(attrs).forEach(function(key){
      node.setAttribute(key, attrs[key]);
    });
    return node;
  }

  function buildPaymentTrendSvg(model){
    var bins = model.displayBins || [];
    var width = 760;
    var height = 280;
    var left = 42;
    var right = 14;
    var top = 18;
    var bottom = 46;
    var plotWidth = width - left - right;
    var plotHeight = height - top - bottom;
    var axisBottom = top + plotHeight;
    var maxCount = bins.reduce(function(max, bin){ return Math.max(max, bin.count); }, 1);
    var svg = setSvgAttrs(svgNode('svg'), {
      class: 'payment-trend-svg',
      viewBox: '0 0 ' + width + ' ' + height,
      role: 'img',
      'aria-label': '결제 인원 추이 차트'
    });

    for(var g = 0; g <= 4; g += 1){
      var ratio = g / 4;
      var y = axisBottom - (ratio * plotHeight);
      svg.appendChild(setSvgAttrs(svgNode('line'), {
        x1: left,
        y1: y,
        x2: width - right,
        y2: y,
        class: 'payment-trend-gridline'
      }));
      var label = setSvgAttrs(svgNode('text'), {
        x: left - 8,
        y: y + 4,
        class: 'payment-trend-y-label',
        'text-anchor': 'end'
      });
      label.textContent = String(Math.round(maxCount * ratio));
      svg.appendChild(label);
    }

    svg.appendChild(setSvgAttrs(svgNode('line'), {
      x1: left,
      y1: axisBottom,
      x2: width - right,
      y2: axisBottom,
      class: 'payment-trend-axis'
    }));

    if(!bins.length) return svg;

    var slot = plotWidth / bins.length;
    var barWidth = Math.max(2, Math.min(24, slot * 0.62));
    var linePoints = [];

    bins.forEach(function(bin, index){
      var centerX = left + (index * slot) + (slot / 2);
      var barHeight = maxCount ? (bin.count / maxCount) * plotHeight : 0;
      var x = centerX - (barWidth / 2);
      var y = axisBottom - barHeight;
      var rect = setSvgAttrs(svgNode('rect'), {
        x: x,
        y: y,
        width: barWidth,
        height: Math.max(1, barHeight),
        rx: 3,
        class: 'payment-trend-bar'
      });
      var rectTitle = svgNode('title');
      rectTitle.textContent = bin.fullLabel + ' · ' + bin.count + '명' +
        (bin.lectureSegment ? ' · 무료강의 ' + bin.lectureSegment : '');
      rect.appendChild(rectTitle);
      svg.appendChild(rect);
      linePoints.push([centerX, y]);
    });

    if(linePoints.length === 1){
      svg.appendChild(setSvgAttrs(svgNode('circle'), {
        cx: linePoints[0][0],
        cy: linePoints[0][1],
        r: 4,
        class: 'payment-trend-line-dot'
      }));
    } else {
      var path = linePoints.map(function(point, index){
        return (index === 0 ? 'M' : 'L') + point[0].toFixed(2) + ' ' + point[1].toFixed(2);
      }).join(' ');
      svg.appendChild(setSvgAttrs(svgNode('path'), {
        d: path,
        class: 'payment-trend-line'
      }));
      if(linePoints.length <= 80){
        linePoints.forEach(function(point){
          svg.appendChild(setSvgAttrs(svgNode('circle'), {
            cx: point[0],
            cy: point[1],
            r: 2.6,
            class: 'payment-trend-line-dot'
          }));
        });
      }
    }

    var tickStep = Math.max(1, Math.ceil(bins.length / 6));
    bins.forEach(function(bin, index){
      if(index % tickStep !== 0 && index !== bins.length - 1) return;
      var x = left + (index * slot) + (slot / 2);
      var text = setSvgAttrs(svgNode('text'), {
        x: x,
        y: height - 18,
        class: 'payment-trend-x-label',
        'text-anchor': 'middle'
      });
      text.textContent = bin.label;
      svg.appendChild(text);
    });

    return svg;
  }

  function openSectionResultModal(section){
    openModal(section.title, (section.rows && section.rows.length ? section.rows.length + '건' : '데이터 없음'));
    modalState = { type: 'result-section', title: section.title };
    var els = modalEls();

    if(section.groups && section.groups.length){
      renderGroupedSectionModal(els.body, section);
      return;
    }

    if(!section.rows || !section.rows.length){
      var empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = '데이터 없음';
      els.body.appendChild(empty);
      return;
    }

    els.body.appendChild(buildTableWrap(section.headers || [], section.rows || []));
  }

  function renderGroupedSectionModal(root, section){
    var groups = section.groups || [];
    var activeKey = groups[0] ? groups[0].key : '';
    var filterRow = document.createElement('div');
    filterRow.className = 'result-filter-row';
    var content = document.createElement('div');

    function draw(){
      filterRow.innerHTML = '';
      content.innerHTML = '';
      groups.forEach(function(group){
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'result-filter-btn' + (group.key === activeKey ? ' active' : '');
        btn.textContent = group.label + ' ' + (group.rows ? group.rows.length : 0);
        btn.addEventListener('click', function(){
          activeKey = group.key;
          draw();
        });
        filterRow.appendChild(btn);
      });

      var current = groups.find(function(group){ return group.key === activeKey; }) || groups[0];
      if(!current || !current.rows || !current.rows.length){
        var empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = '데이터 없음';
        content.appendChild(empty);
        return;
      }
      content.appendChild(buildTableWrap(section.headers || [], current.rows || []));
    }

    root.appendChild(filterRow);
    root.appendChild(content);
    draw();
  }

  function buildTableWrap(headers, rows){
    var wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    var table = document.createElement('table');
    var thead = document.createElement('thead');
    var headerRow = document.createElement('tr');
    (headers || []).forEach(function(header){
      var th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    var tbody = document.createElement('tbody');
    (rows || []).forEach(function(row){
      var tr = document.createElement('tr');
      row.forEach(function(cell){
        var td = document.createElement('td');
        td.textContent = cell == null ? '' : String(cell);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  function openSheetPickerModal(options){
    openModal(options.title || '탭 선택', options.subtitle || '');
    modalState = { type: 'sheet-picker', panelId: options.panelId };
    var els = modalEls();
    var search = document.createElement('input');
    search.className = 'input modal-search';
    search.type = 'text';
    search.placeholder = '탭 이름 검색';
    search.value = options.initialQuery || '';
    var list = document.createElement('div');
    list.className = 'modal-list';

    function renderList(){
      var query = String(search.value || '').trim().toLowerCase();
      list.innerHTML = '';
      var filtered = (options.titles || []).filter(function(title){
        return !query || title.toLowerCase().indexOf(query) >= 0;
      });
      if(!filtered.length){
        var empty = document.createElement('div');
        empty.className = 'file-empty';
        empty.textContent = '검색 결과가 없습니다.';
        list.appendChild(empty);
        return;
      }
      filtered.forEach(function(titleText){
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'modal-list-btn' + (titleText === options.selectedTitle ? ' active' : '');
        btn.textContent = titleText;
        btn.addEventListener('click', function(){
          options.onSelect(titleText);
          closeModal();
        });
        list.appendChild(btn);
      });
    }

    search.addEventListener('input', renderList);
    els.body.appendChild(search);
    els.body.appendChild(list);
    renderList();
  }

  function openFileManagerModal(options){
    openModal(options.title || '로그 파일 관리', options.subtitle || '');
    modalState = { type: 'file-manager', panelId: options.panelId };
    var els = modalEls();
    var actions = document.createElement('div');
    actions.className = 'file-manager-actions';

    var addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-primary';
    addBtn.textContent = '파일 추가';
    addBtn.addEventListener('click', function(){ options.onAddRequest(); });
    actions.appendChild(addBtn);

    var clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'btn';
    clearBtn.textContent = '전체 비우기';
    clearBtn.addEventListener('click', function(){
      options.onClearAll();
      openFileManagerModal(options.getFreshOptions());
    });
    actions.appendChild(clearBtn);

    els.body.appendChild(actions);
    var list = document.createElement('div');
    list.className = 'modal-list';

    if(!options.files || !options.files.length){
      var empty = document.createElement('div');
      empty.className = 'file-empty';
      empty.textContent = '추가된 로그 파일이 없습니다.';
      list.appendChild(empty);
    } else {
      options.files.forEach(function(file, index){
        var item = document.createElement('div');
        item.className = 'file-item';
        var main = document.createElement('div');
        main.className = 'file-item-main';
        var fileName = document.createElement('div');
        fileName.className = 'file-name';
        fileName.textContent = file.name;
        var meta = document.createElement('div');
        meta.className = 'file-meta';
        meta.textContent = formatBytes(file.size) + ' · ' + new Date(file.lastModified || Date.now()).toLocaleString();
        main.appendChild(fileName);
        main.appendChild(meta);
        item.appendChild(main);
        var removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn btn-danger';
        removeBtn.textContent = '삭제';
        removeBtn.addEventListener('click', function(){
          options.onRemoveIndex(index);
          openFileManagerModal(options.getFreshOptions());
        });
        item.appendChild(removeBtn);
        list.appendChild(item);
      });
    }
    els.body.appendChild(list);
  }

  function formatBytes(bytes){
    if(!bytes) return '0 B';
    var units = ['B','KB','MB','GB'];
    var value = bytes;
    var unitIndex = 0;
    while(value >= 1024 && unitIndex < units.length - 1){
      value /= 1024;
      unitIndex += 1;
    }
    return (unitIndex === 0 ? value : value.toFixed(1)) + ' ' + units[unitIndex];
  }

  window.KakaoCheckUI = {
    closeModal: closeModal,
    getModalState: getModalState,
    setAuthState: setAuthState,
    setLoginReady: setLoginReady,
    setTabState: setTabState,
    setAuthError: setAuthError,
    createPanelElement: createPanelElement,
    renderSelectedSheet: renderSelectedSheet,
    renderFileSummary: renderFileSummary,
    setPanelStatus: setPanelStatus,
    setPanelError: setPanelError,
    renderResults: renderResults,
    renderPaymentTrend: renderPaymentTrend,
    openSheetPickerModal: openSheetPickerModal,
    openFileManagerModal: openFileManagerModal
  };
})();
