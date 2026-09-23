/* Event records stay individual; only the overview aggregates them. */
(() => {
  const root = document.querySelector('#event-search');
  const panel = root.querySelector('.event-result-panel');
  const table = panel.querySelector('table');
  const toolbar = panel.querySelector('.event-result-toolbar');
  const form = document.querySelector('#event-search-form');
  let activeBucket = null, activeGroup = null, filtered = [];
  const today = () => new Intl.DateTimeFormat('sv-SE', {timeZone: 'Asia/Seoul'}).format(new Date());
  const day = row => String(row.occurredAt || '').slice(0, 10);
  const el = (tag, text, cls) => { const n = document.createElement(tag); n.textContent = text; if (cls) n.className = cls; return n; };
  const button = (text, action, cls = 'explorer-button') => { const n = el('button', text, cls); n.type = 'button'; n.addEventListener('click', action); return n; };
  const groupBy = (rows, key) => { const map = new Map(); rows.forEach(r => { const k = key(r); if (!map.has(k)) map.set(k, []); map.get(k).push(r); }); return [...map.values()]; };
  const buckets = rows => groupBy(rows, r => JSON.stringify([day(r), r.transactionCode, r.errorCode]));
  const crumb = el('nav', '', 'explorer-crumb'); crumb.setAttribute('aria-label', '이벤트 탐색 경로');
  const identity = el('section', '', 'explorer-identity');
  identity.setAttribute('aria-label', '선택한 이벤트 식별 정보');
  identity.hidden = true;
  const summary = el('div', '', 'explorer-summary'); summary.setAttribute('aria-live', 'polite');
  panel.prepend(crumb, identity, summary);
  const listTitle = el('h2', '이벤트 목록', 'explorer-list-title');
  toolbar.prepend(listTitle);
  table.className = 'explorer-table';
  const approval = toolbar.querySelector('[data-event-approval-button]');
  const selectionCount = el('span', '선택 0건', 'explorer-selection');
  const selectAll = document.createElement('input'); selectAll.type = 'checkbox'; selectAll.setAttribute('aria-label','현재 목록 전체 선택');
  const selectLabel = el('label', '', 'explorer-select-all'); selectLabel.append(selectAll, el('span','전체 선택'));
  toolbar.prepend(selectLabel, selectionCount);
  function updateSelection() {
    const boxes = [...eventResultBody.querySelectorAll('input[data-event-row-select]:not(:disabled)')];
    selectionCount.textContent = `선택 ${selectedEventRows.size}건`;
    approval.textContent = `선택 ${selectedEventRows.size}건 결재요청`;
    approval.disabled = selectedEventRows.size === 0;
    selectAll.checked = boxes.length > 0 && boxes.every(b => b.checked);
    selectAll.indeterminate = boxes.some(b => b.checked) && !selectAll.checked;
    selectAll.disabled = boxes.length === 0;
  }
  eventResultBody.addEventListener('change', updateSelection);
  selectAll.addEventListener('change', () => {
    const checked = selectAll.checked;
    eventResultBody.querySelectorAll('input[data-event-row-select]:not(:disabled)').forEach(box => { box.checked = checked; box.dispatchEvent(new Event('change', {bubbles:true})); });
    updateSelection();
  });
  const exportButton = toolbar.querySelector('button');
  let displayed = [];
  exportButton.addEventListener('click', () => {
    const cols = ['occurredAt','transactionCode','errorCode','globalId','errorMessage','sourceLocation'];
    const quote = v => '"' + String(v ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"','""') + '"';
    const csv = '\uFEFF' + [cols, ...displayed.map(r => cols.map(k => r[k]))].map(r => r.map(quote).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8'}));
    const a = document.createElement('a'); a.href = url; a.download = '이벤트-목록.csv'; a.click(); URL.revokeObjectURL(url);
  });
  exportButton.textContent = 'CSV 다운로드';
  function selectionControl(records, labelText) {
    const label = el('label', '', 'select-control');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'row-select';
    checkbox.dataset.eventRowSelect = 'true';
    checkbox.setAttribute('aria-label', labelText);
    checkbox.disabled = records.some(record => record.cell !== currentUserProfile.cell);
    if (checkbox.disabled) label.title = '같은 셀의 이벤트만 선택할 수 있습니다.';
    label.addEventListener('click', event => event.stopPropagation());
    checkbox.addEventListener('change', () => {
      records.forEach(record => {
        if (checkbox.checked) selectedEventRows.add(String(record.no));
        else selectedEventRows.delete(String(record.no));
      });
      checkbox.closest('tr')?.classList.toggle('is-selected', checkbox.checked);
    });
    label.append(checkbox);
    return label;
  }
  const rawGridColumns = ['선택','발생일시','진행상태','조치내용','조치담당자','호스트명','에러 상세 메시지 (원본)','소스 발생 위치','글로벌ID'];
  const actionText = r => !r.actionContent || r.actionContent === '입력값 검증 로직 보완 후 재현 테스트를 완료했습니다.' ? '-' : r.actionContent;
  const actionOwnerText = r => r.actionOwner ? r.actionOwner.replace(/^\d+\s*\(([^)]+)\)$/, '$1') : '-';
  function statusBadges(records, showCount = false) {
    const wrap = el('div', '', 'explorer-statuses');
    const states = [['미조치','pending'],['조치중','working'],['결재요청','approval'],['조치완료','complete']];
    states.forEach(([label, style]) => {
      const count = records.filter(record => record.status === label).length;
      if (!count) return;
      const badge = el('span', '', `explorer-status is-${style}`);
      badge.append(el('span', label));
      if (showCount) badge.append(el('span', `${count}건`, 'explorer-status-count'));
      wrap.append(badge);
    });
    return wrap;
  }
  function rawGridValues(r, selection) {
    return [selection, r.occurredAt, statusBadges([r]), actionText(r), actionOwnerText(r), r.hostName, r.errorDetailMessage || r.errorMessage, r.sourceLocation, r.globalId];
  }
  function resetPath() { activeBucket = null; activeGroup = null; }
  function heading(labels) { table.dataset.mode = labels[0] === '발생일자' ? 'overview' : labels[0] === '선택' ? 'events' : 'groups'; const tr = document.createElement('tr'); ['순번', ...labels].forEach(s => { const th = el('th', s); th.scope = 'col'; tr.append(th); }); table.tHead.replaceChildren(tr); eventResultBody.replaceChildren(); }
  function row(values, action, label) {
    const tr = document.createElement('tr');
    values = [String(eventResultBody.rows.length + 1), ...values];
    values.forEach(v => { const td = document.createElement('td'); if (v instanceof Node) td.append(v); else { td.textContent = v || '—'; td.title = v || ''; } tr.append(td); });
    if (action) { tr.className = 'is-clickable'; tr.tabIndex = 0; tr.setAttribute('aria-label', label); tr.addEventListener('click', e => { if (!e.target.closest('input, label, button')) action(); }); tr.addEventListener('keydown', e => { if (e.target === tr && ['Enter',' '].includes(e.key)) { e.preventDefault(); action(); } }); }
    eventResultBody.append(tr);
  }
  function render(focus = false) {
    selectedEventRows.clear();
    crumb.replaceChildren(button('이벤트 목록', () => { resetPath(); render(true); }));
    crumb.hidden = !activeBucket;
    summary.hidden = !activeBucket;
    listTitle.hidden = Boolean(activeBucket);
    let rows = filtered;
    identity.replaceChildren();
    identity.hidden = !activeBucket;
    if (activeBucket) {
      const selected = activeBucket[0];
      const transaction = el('div', '', 'explorer-identity-transaction');
      transaction.append(el('span', '거래코드', 'explorer-identity-label'), el('strong', selected.transactionCode, 'explorer-identity-code'), el('span', selected.transactionName, 'explorer-identity-name'));
      const error = el('div', '', 'explorer-identity-error');
      error.append(el('span', '에러코드', 'explorer-identity-label'), el('strong', selected.errorCode, 'explorer-identity-code'), el('span', selected.errorMessage, 'explorer-identity-name'));
      const date = el('div', '', 'explorer-identity-date');
      date.append(el('span', '발생일자', 'explorer-identity-label'), el('strong', day(selected)), el('span', day(selected) === today() ? '당일 · 수집 중' : '이전 일자', day(selected) === today() ? 'explorer-badge live' : 'explorer-badge'));
      identity.append(transaction, error, date);
    }
    let leaf = false;
    if (activeBucket) {
      rows = activeBucket;
      crumb.append(el('span','/'), button(`${day(rows[0])} · ${rows[0].transactionCode} · ${rows[0].errorCode}`, () => { activeGroup = null; render(true); }));
      const isToday = day(rows[0]) === today();
      const ready = !isToday && rows.every(r => r.batchGroupId);
      if (activeGroup) { rows = activeGroup; crumb.append(el('span','/'), el('strong', '오류 그룹의 개별 이벤트')); }
      leaf = isToday || !ready || !!activeGroup;
      if (!leaf) {
        const groups = groupBy(rows, r => r.batchGroupId);
        summary.textContent = `오류 그룹 ${groups.length}개 · 이벤트 ${rows.length}건 · 대표 원본 기준`;
        const groupColumns = rawGridColumns.map(label => label === '글로벌ID' ? '대표 GUID' : label === '발생일시' ? '발생일자' : label);
        groupColumns.splice(1, 0, '중복건수');
        heading(groupColumns);
        table.dataset.mode = 'group-records';
        groups.forEach((g,i) => {
          const representative = [...g].sort((a,b) => a.occurredAt.localeCompare(b.occurredAt))[0];
          const values = rawGridValues(representative, selectionControl(g, `오류 그룹 ${i+1} 원본 ${g.length}건 선택`));
          values[1] = day(representative);
          values[2] = statusBadges(g, true);
          values[3] = new Set(g.map(actionText)).size === 1 ? actionText(g[0]) : '-';
          values[4] = [...new Set(g.map(actionOwnerText).filter(name => name !== '-'))].join(', ') || '-';
          values[5] = [...new Set(g.map(r => r.hostName))].join(', ');
          const count = el('div', '', 'explorer-group-count');
          const view = button('보기', () => { activeGroup = g; render(true); });
          view.setAttribute('aria-label', `오류 그룹 ${i+1} 원본 ${g.length}건 보기`);
          count.append(el('strong', `${g.length}건`), view);
          values.splice(1, 0, count);
          row(values, () => { activeGroup = g; render(true); }, `오류 그룹 ${i+1}, ${g.length}건 보기`);
        });
      } else {
        summary.textContent = `${isToday ? '당일 이벤트' : ready ? '동일 오류 이벤트' : '분류 대기'} · ${rows.length}건`;
        heading(rawGridColumns);
        rows.forEach(r => {
          const container = selectionControl([r], `${r.no}번 이벤트 선택`);
          row(rawGridValues(r, container), () => openEventDetailModal(r), `${r.no}번 이벤트 상세 열기`);
        });
      }
    } else {
      const grouped = buckets(rows).sort((a,b) => day(b[0]).localeCompare(day(a[0])));
      summary.textContent = '';
      heading(['발생일자','데이터 구분','거래코드 / 거래명','에러코드','중복건수','오류 분류','에러메시지']);
      grouped.forEach(g => {
        const r = g[0], live = day(r) === today(), ready = !live && g.every(x => x.batchGroupId);
        const badge = el('span', live ? '당일 · 수집 중' : '이전 일자', `explorer-badge ${live ? 'live' : ''}`);
        const transaction = el('div', '', 'explorer-transaction'); transaction.append(el('strong',r.transactionCode),el('small',r.transactionName));
        row([day(r),badge,transaction,r.errorCode,el('strong',`${g.length}건`),live ? '미분류' : ready ? `${groupBy(g,x=>x.batchGroupId).length}개 그룹` : '분류 대기',r.errorMessage], () => { activeBucket = g; render(true); }, `${day(r)} ${r.transactionCode} ${r.errorCode} ${g.length}건 열기`);
      });
    }
    displayed = rows;
    eventRows = window.EVENT_SEARCH_ROWS || [];
    approval.hidden = !activeBucket; selectLabel.hidden = !activeBucket; selectionCount.hidden = !activeBucket; updateSelection();
    if (!rows.length) { const tr = document.createElement('tr'); const td = el('td','조회 조건에 맞는 이벤트가 없습니다. 조건을 변경하거나 초기화해주세요.'); td.colSpan = table.tHead.rows[0].cells.length; tr.append(td); eventResultBody.append(tr); }
    if (focus) { const focusTarget = activeBucket ? summary : listTitle; focusTarget.tabIndex = -1; focusTarget.focus(); }
  }
  renderEventResultRows = function(rows) {
    const q = new FormData(form);
    const match = (v, query) => !query || query === '전체' || String(v || '').toLowerCase().includes(String(query).toLowerCase());
    filtered = rows.filter(r => ['errorType','actionType','status','department','owner','serviceName'].every(k => match(r[k], q.get(k))) && (!q.get('startDate') || day(r) >= q.get('startDate')) && (!q.get('endDate') || day(r) <= q.get('endDate')));
    resetPath(); render();
  };
  form.addEventListener('reset', () => { setTimeout(refreshEventSearchResults, 0); });
  document.addEventListener('event-records-updated', () => { render(); renderStatusBoardRows(window.ERROR_BOARD_ROWS || []); });
  refreshEventSearchResults();
})();
