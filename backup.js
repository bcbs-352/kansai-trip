/* Browser-only backup handling. Never writes to GitHub or a remote database. */
(function (root) {
  'use strict';
  const record = value => value && typeof value === 'object' && !Array.isArray(value);
  function validate(backup, trip) {
    if (!record(backup) || !record(backup.localNotes) || !record(backup.localChecklist) || !record(backup.localBudget)) {
      throw new Error('请选择“备份当前行程数据”导出的JSON文件');
    }
    const notes = {}, tasks = {}, costs = {};
    for (const key of ['general', ...trip.days.map(d => d.id)]) {
      const note = backup.localNotes[key];
      if (note === undefined) continue;
      if (typeof note !== 'string' || note.length > (key === 'general' ? 12000 : 6000)) throw new Error('备忘格式或长度不正确');
      notes[key] = note;
    }
    for (const t of trip.todos) if (typeof backup.localChecklist[t.id] === 'boolean') tasks[t.id] = backup.localChecklist[t.id];
    for (const c of trip.costs) if (typeof backup.localBudget[c.id] === 'boolean') costs[c.id] = backup.localBudget[c.id];
    return { notes, tasks, costs };
  }
  function mergeNotes(current, incoming) {
    const result = { ...current };
    for (const [key, text] of Object.entries(incoming)) {
      if (!text || result[key] === text || result[key]?.includes(`\n\n—— 导入备忘 ——\n${text}`)) continue;
      result[key] = result[key] ? `${result[key]}\n\n—— 导入备忘 ——\n${text}` : text;
      if (result[key].length > (key === 'general' ? 12000 : 6000)) throw new Error('合并后备忘过长，请先另存原备忘再整理');
    }
    return result;
  }
  const api = { validate, mergeNotes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KansaiBackup = api;
})(typeof window === 'undefined' ? {} : window);
