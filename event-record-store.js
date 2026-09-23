/* Demo persistence; production must replace localStorage with a rawId-keyed API. */
window.EventRecordStore = (() => {
  const storageKey = 'itsm-raw-actions-v1';
  const fields = ['status','stage','actionOwner','actionType','actionContent','plannedDate','completedDate','approvalRequestedAt','actionSavedAt'];
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { saved = {}; }
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
  for (const row of window.EVENT_SEARCH_ROWS) {
    const patch = saved[row.rawId];
    if (patch && typeof patch === 'object') for (const field of fields) if (typeof patch[field] === 'string') row[field] = patch[field];
  }
  function save(rows, values) {
    const next = {...saved};
    for (const row of rows) next[row.rawId] = Object.fromEntries(fields.map(k => [k, values[k] ?? row[k] ?? '']));
    localStorage.setItem(storageKey, JSON.stringify(next));
    saved = next;
    for (const row of rows) Object.assign(row, next[row.rawId]);
    document.dispatchEvent(new CustomEvent('event-records-updated'));
  }
  return {save};
})();
