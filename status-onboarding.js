(() => {
  const $ = selector => document.querySelector(selector);
  const start = document.createElement('button');
  start.type = 'button'; start.className = 'toolbar-button'; start.textContent = '사용 안내'; start.id = 'status-onboarding-start';
  $('#status-board .board-actions').append(start);
  const layer = document.createElement('div'); layer.id = 'status-onboarding'; layer.hidden = true;
  layer.innerHTML = `<svg class="tour-shade" aria-hidden="true"><path fill-rule="evenodd"/></svg><section class="tour-tip" role="dialog" aria-label="오류상황판 사용 안내" aria-describedby="tour-description"><div class="tour-top"><span id="tour-progress"></span><button type="button" data-tour-exit aria-label="사용 안내 닫기">닫기</button></div><h2 id="tour-title"></h2><p id="tour-description"></p><div class="tour-bottom"><button type="button" data-tour-prev>이전</button><button type="button" data-tour-next>다음</button></div></section>`;
  document.body.append(layer);
  const tip = layer.querySelector('.tour-tip'), path = layer.querySelector('path');
  const next = layer.querySelector('[data-tour-next]'), prev = layer.querySelector('[data-tour-prev]');
  let index = -1, frame = 0, record = null, returnFocus = null;
  const field = name => $(`#action-receipt-status-${record?.no}-${name}`);
  const fieldBox = name => field(name)?.closest('.action-field');
  const steps = [
    {title:'화면 모드 선택', text:'이 버튼으로 다크모드와 라이트모드를 전환합니다. 원하는 모드를 선택한 뒤 다음을 눌러주세요.', targets:()=>[$('#status-theme-toggle')]},
    {title:'오류 목록 확인', text:'발생시간, 거래코드, 에러코드와 조치 단계를 확인하는 그리드입니다. 각 행은 하나의 원본 오류 이벤트입니다.', targets:()=>[$('#status-board table')]},
    {title:'첫 번째 오류 열기', text:'강조된 첫 번째 행을 클릭해 상세내용을 열어주세요.', targets:()=>[$('#status-board-body tr')], click:'#status-board-body tr:first-child'},
    {title:'상세내용 확인', text:'선택한 오류의 상세 메시지와 거래 정보 등을 확인할 수 있습니다. 다음 단계에서 조치내용을 입력합니다.', targets:()=>[$('#detail-body')]},
    {title:'이벤트 조치접수', text:'이벤트 조치접수 탭을 클릭해주세요.', targets:()=>[$('#detail-tab-action')], click:'#detail-tab-action'},
    {title:'조치담당자 입력', text:'검색 버튼을 눌러 조치담당자를 선택해주세요.', targets:()=>[fieldBox('owner')], valid:()=>!!field('owner')?.value.trim()},
    {title:'조치구분 선택', text:'프로그램수정, DB조치 등 해당하는 조치구분을 선택해주세요.', targets:()=>[fieldBox('type')], valid:()=>!!field('type')?.value},
    {title:'조치 예정일 입력', text:'달력 버튼을 눌러 오늘 또는 이후 날짜를 선택해주세요. 이번 안내에서는 조치완료일을 입력하지 않습니다.', targets:()=>[fieldBox('planned-date')], valid:()=>!!field('planned-date')?.value && !isPastDateValue(field('planned-date').value)},
    {title:'조치내용 입력', text:'이 오류에 대해 수행하거나 예정한 조치내용을 입력해주세요.', targets:()=>[fieldBox('comment')], valid:()=>!!field('comment')?.value.trim()},
    {title:'조치내용 저장', text:'조치내용 저장 버튼을 클릭해주세요. 입력한 내용은 선택한 원본 이벤트에 저장됩니다. 결재요청은 이번 안내에 포함하지 않습니다.', targets:()=>[...$('#detail-action-panel').querySelectorAll('.action-save-button')].filter(b=>b.textContent==='조치내용 저장'), save:true},
    {title:'조치 저장 완료', text:'원본 이벤트에 조치내용이 저장되었습니다. 오류상황판과 이벤트 조회에서 같은 조치정보를 확인할 수 있습니다.', targets:()=>[$('#event-action-empty-modal .notice-dialog')], done:true}
  ];
  function visible(node) { return node && node.getClientRects().length && !node.closest('[hidden]'); }
  function stop() {
    index = -1; cancelAnimationFrame(frame); layer.hidden = true;
    if (returnFocus?.isConnected) returnFocus.focus();
  }
  function go(value) {
    index = value;
    if (index < 3 && !$('#detail-modal').hidden) closeDetailModal();
    if (index === 3 || index === 4) setDetailTab('detail-body');
    if (index >= 5 && index < 10) setDetailTab('detail-action-panel');
    const step = steps[index];
    $('#tour-title').textContent = step.title; $('#tour-description').textContent = step.text;
    $('#tour-progress').textContent = step.done ? '안내 완료' : `${index + 1} / ${steps.length - 1}`;
    prev.hidden = index === 0 || step.done;
    next.hidden = !!step.click || !!step.save;
    next.textContent = step.done ? '마침' : '다음';
    step.targets().find(visible)?.scrollIntoView({block:index === 1 ? 'start' : 'center', inline:'nearest', behavior:'instant'});
    next.disabled = !!step.valid && !step.valid();
    tip.focus();
  }
  tip.tabIndex = -1;
  function draw() {
    if (index < 0) return;
    const step = steps[index];
    const targets = step.targets().filter(visible);
    // Keep validation messages and the date picker operable above the shade.
    const alert = $('#event-action-empty-modal .notice-dialog');
    if (visible(alert) && index !== 10) targets.push(alert);
    targets.push(...document.querySelectorAll('#detail-action-panel .action-date-popover:not([hidden])'));
    const rects = targets.map(n=>n.getBoundingClientRect()).filter(r=>r.width && r.height);
    const w = innerWidth, h = innerHeight;
    let d = `M0 0H${w}V${h}H0Z`;
    rects.forEach(r=>{const l=Math.max(0,r.left-5),t=Math.max(0,r.top-5),right=Math.min(w,r.right+5),bottom=Math.min(h,r.bottom+5);if(right>l&&bottom>t)d+=` M${l} ${t}H${right}V${bottom}H${l}Z`;});
    path.setAttribute('d',d);
    next.disabled = !!step.valid && !step.valid();
    const r = rects.length ? {left:Math.min(...rects.map(r=>r.left)),right:Math.max(...rects.map(r=>r.right)),top:Math.min(...rects.map(r=>r.top)),bottom:Math.max(...rects.map(r=>r.bottom))} : null; const tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = Math.max(12,w-tw-20), y=12;
    if (r) {
      x=Math.max(12,Math.min(w-tw-12,r.left));
      if (r.right + tw + 26 < w) { x=r.right+14; y=Math.max(12,Math.min(h-th-12,r.top)); }
      else if (r.left > tw + 26) { x=r.left-tw-14; y=Math.max(12,Math.min(h-th-12,r.top)); }
      else y = r.bottom + th + 20 < h ? r.bottom+14 : r.top-th-14 >= 12 ? r.top-th-14 : Math.max(12,h-th-12);
    }
    tip.style.left=`${x}px`; tip.style.top=`${y}px`;
    frame=requestAnimationFrame(draw);
  }
  start.addEventListener('click',()=>{
    record=(window.ERROR_BOARD_ROWS || [])[0];
    if(!record){openEventActionEmptyModal('안내할 오류 이벤트가 없습니다.');return;}
    if(record.cell!==currentUserProfile.cell || ['결재요청','조치완료'].includes(record.status)){
      openEventActionEmptyModal('첫 번째 이벤트는 현재 조치내용을 저장할 수 없습니다. 같은 셀의 미조치 또는 조치중 이벤트가 첫 행에 있는 상태에서 안내를 시작해주세요.');return;
    }
    returnFocus=document.activeElement;layer.hidden=false;go(0);cancelAnimationFrame(frame);draw();
  });
  next.addEventListener('click',()=>{if(steps[index]?.done){closeEventActionEmptyModal();stop();return;}go(index+1);});
  prev.addEventListener('click',()=>go(index-1));
  layer.querySelector('[data-tour-exit]').addEventListener('click',stop);
  document.addEventListener('click',event=>{
    if(index<0)return;
    const step=steps[index];
    if(step.click && event.target.closest(step.click) && !event.target.closest('input,label')) {
      setTimeout(()=>{if(index<0)return;if(index===2 && !$('#detail-modal').hidden)go(3);else if(index===4 && !$('#detail-action-panel').hidden)go(5);},0);
    }
  });
  document.addEventListener('event-records-updated',()=>{
    if(index===9 && record?.actionSavedAt) setTimeout(()=>{if(index===9)go(10);},0);
  });
  document.addEventListener('keydown',event=>{
    if(index<0)return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();stop();return;}
    if(index===2 && (event.key==='Enter' || event.key===' ') && event.target.matches('#status-board-body tr:first-child')) {
      setTimeout(()=>{if(index===2 && !$('#detail-modal').hidden)go(3);},0);
    }
    if(event.key==='Tab') {
      const allowed=[tip,...steps[index].targets().filter(visible),...document.querySelectorAll('#detail-action-panel .action-date-popover:not([hidden])')];
      const controls=allowed.flatMap(n=>[...(n.matches('button,input,select,textarea,[tabindex="0"]')?[n]:[]),...n.querySelectorAll('button,input,select,textarea,[tabindex="0"]')]).filter(n=>visible(n)&&!n.disabled);
      if(!controls.length)return;
      const at=controls.indexOf(document.activeElement), to=event.shiftKey?(at<=0?controls.length-1:at-1):(at+1)%controls.length;
      event.preventDefault();controls[to].focus();
    }
  },true);
})();
