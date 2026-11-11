const NUM_IDS = ['ua', 'c1', 'avp', 'cogs_m', 'apc', 'lifetime', 'area', 'rent_price', 'mat_price', 'ac', 'sc', 'admin_cost', 'tax_rate'];
const DEMO_A = {
  tax_mode: 'usn6', ua: 2500, c1: 100, avp: 3500, cogs_m: 45, apc: 1, lifetime: 1,
  area: 25, rent_price: 1000, mat_price: 20, ac: 180000, sc: 0, admin_cost: 20000, tax_rate: 6
};
const DEMO_B = {
  tax_mode: 'usn6', ua: 4000, c1: 85, avp: 3900, cogs_m: 42, apc: 1.2, lifetime: 2,
  area: 25, rent_price: 1000, mat_price: 20, ac: 320000, sc: 50000, admin_cost: 35000, tax_rate: 6
};

const TIPS = {
  ua: 'User Acquisition — общее количество привлеченных посетителей или лидов за период.',
  c1: 'Конверсия из привлеченного пользователя в первую покупку.',
  avp: 'Average Purchase — средний чек одной покупки.',
  cogs_m: 'Доля прямых затрат на товар или услугу в выручке.',
  apc: 'Среднее количество покупок, которое совершает один клиент за базовый период.',
  lifetime: 'Среднее время жизни клиента в месяцах/периодах. Влияет на расчет LTV.',
  out_b: 'Количество реальных покупателей (UA × C1).',
  out_arppu: 'Валовая прибыль с одного платящего клиента за период.',
  out_ltv: 'Lifetime Value — совокупная валовая прибыль от клиента за всё время жизни.',
  out_arpu: 'Средняя валовая прибыль на каждого привлеченного юзера.',
  area: 'Арендуемая площадь помещения в м².',
  rent_price: 'Ставка аренды за 1 м² в месяц.',
  mat_price: 'Расходники и упаковка на одну покупку.',
  out_rev: 'Общий доход от продаж (Покупатели × Средний чек × Кол-во покупок).',
  out_cogs: 'Прямая себестоимость проданных товаров.',
  out_gm: 'Валовая прибыль (Выручка - COGS).',
  ac: 'Расходы на маркетинг и рекламу.',
  sc: 'Коммерческие расходы (комиссии, бонусы отдела продаж).',
  out_cm: 'Маржинальная прибыль (GM - AC - SC).',
  out_var: 'Суммарные расходы на расходники и упаковку.',
  out_pbfc: 'Прибыль до вычета постоянных расходов и налогов.',
  admin_cost: 'Постоянные расходы на административный персонал.',
  tax_rate: 'Ставка налога для выбранного режима (УСН 6%, УСН 15% или налог на прибыль 25% на ОСН).',
  out_rent: 'Стоимость аренды (Площадь × Ставка).',
  out_taxes: 'Сумма налогов по выбранному режиму.',
  out_net: 'Итоговая чистая прибыль после всех расходов и налогов.',
  out_cpa: 'Стоимость привлечения одного лида/посетителя (AC / UA).',
  out_cac: 'Стоимость привлечения реального покупателя ((AC + SC) / Покупатели).',
  out_ltv_cac: 'Отношение LTV к CAC. Норма — от 3 и выше.',
  out_romi: 'Окупаемость маркетинга (((GM - AC) / AC) × 100%).',
  out_drr: 'Доля рекламных расходов в выручке ((AC / Выручка) × 100%).',
  out_payback: 'Количество покупок для окупаемости привлечения клиента.',
  out_gm_pct: 'Валовая рентабельность (GM / Выручка).',
  out_ros: 'Чистая рентабельность (Чистая прибыль / Выручка).',
  out_bep_b: 'Точка безубыточности: минимум покупателей для выхода в ноль.',
  out_bep_rev: 'Порог рентабельности в рублях.',
  out_safety: 'Запас прочности: на сколько % может упасть выручка до появления убытка.'
};

let activePlan = 'A';
let plansData = { A: { ...DEMO_A }, B: { ...DEMO_B } };

const fmtCur = n => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(n) + ' ₽';
const fmtNum = n => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(n);
const fmtPct = n => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(n) + ' %';
const fmtDiff = (n, fmtFn) => (n > 0 ? '+' : '') + fmtFn(n);

function setTxt(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

function toggleNeg(id, isNeg) {
  const el = document.getElementById(id);
  if (!el) return;
  const row = el.closest('.highlight');
  if (row) row.classList.toggle('negative', isNeg);
  else el.classList.toggle('negative-text', isNeg);
}

function initTooltips() {
  Object.entries(TIPS).forEach(([id, text]) => {
    const label = document.getElementById(id)?.closest('.row')?.querySelector('label, .lbl');
    if (label && !label.querySelector('.tip')) {
      const badge = document.createElement('span');
      badge.className = 'tip';
      badge.innerText = '?';
      badge.setAttribute('data-tip', text);
      label.appendChild(badge);
    }
  });
}

function readForm() {
  const v = { tax_mode: document.getElementById('tax_mode').value };
  NUM_IDS.forEach(id => {
    const val = parseFloat(document.getElementById(id).value);
    v[id] = (isNaN(val) || val < 0) ? 0 : val;
  });
  return v;
}

function renderComparison(resA, resB) {
  const metrics = [
    ['Покупатели, чел.', resA.b, resB.b, fmtNum, true],
    ['Выручка (Revenue)', resA.rev, resB.rev, fmtCur, true],
    ['Маржинальная прибыль (CM)', resA.cm, resB.cm, fmtCur, true],
    ['Налоги', resA.taxes, resB.taxes, fmtCur, false],
    ['ЧИСТАЯ ПРИБЫЛЬ', resA.net, resB.net, fmtCur, true],
    ['Рентабельность (ROS)', resA.ros, resB.ros, fmtPct, true],
    ['Стоимость покупателя (CAC)', resA.cac, resB.cac, fmtCur, false],
    ['LTV / CAC', resA.ltv_cac, resB.ltv_cac, fmtNum, true],
    ['Точка безубыточности (покупателей)', resA.bep_b, resB.bep_b, fmtNum, false]
  ];

  const tbody = document.getElementById('compare_body');
  tbody.innerHTML = metrics.map(([name, valA, valB, fmt, higherIsBetter]) => {
    const diff = valB - valA;
    const isGood = higherIsBetter ? diff > 0 : diff < 0;
    const isBad = higherIsBetter ? diff < 0 : diff > 0;
    const cls = diff === 0 ? '' : (isGood ? 'positive-text' : (isBad ? 'negative-text' : ''));
    return `<tr>
      <td>${name}</td>
      <td>${fmt(valA)}</td>
      <td>${fmt(valB)}</td>
      <td class="${cls}" style="font-weight:600">${fmtDiff(diff, fmt)}</td>
    </tr>`;
  }).join('');
}

function updateUI() {
  plansData[activePlan] = readForm();
  localStorage.setItem('fin_model_plans_v1', JSON.stringify(plansData));

  const resA = window.calculateModel(plansData.A);
  const resB = window.calculateModel(plansData.B);
  const r = activePlan === 'A' ? resA : resB;

  const taxText = document.getElementById('tax_mode').selectedOptions?.text || '';
  setTxt('print_plan_label', `Сценарий: План ${activePlan} | Режим: ${taxText}`);

  setTxt('kpi_net', fmtCur(r.net));
  setTxt('kpi_ros', fmtPct(r.ros));
  setTxt('kpi_ltv_cac', fmtNum(r.ltv_cac));
  setTxt('kpi_romi', fmtPct(r.romi));
  toggleNeg('kpi_net', r.net < 0);

  setTxt('out_b', fmtNum(r.b));
  setTxt('out_arppu', fmtCur(r.arppu));
  setTxt('out_ltv', fmtCur(r.ltv));
  setTxt('out_arpu', fmtCur(r.arpu));

  setTxt('out_rev', fmtCur(r.rev));
  setTxt('out_cogs', fmtCur(r.cogs));
  setTxt('out_gm', fmtCur(r.gm));
  setTxt('out_cm', fmtCur(r.cm));
  setTxt('out_var', fmtCur(r.var_costs));
  setTxt('out_pbfc', fmtCur(r.pbfc));
  setTxt('out_rent', fmtCur(r.rent));
  setTxt('out_taxes', fmtCur(r.taxes));
  setTxt('out_net', fmtCur(r.net));

  toggleNeg('out_gm', r.gm < 0);
  toggleNeg('out_cm', r.cm < 0);
  toggleNeg('out_pbfc', r.pbfc < 0);
  toggleNeg('out_net', r.net < 0);

  setTxt('out_cpa', fmtCur(r.cpa));
  setTxt('out_cac', fmtCur(r.cac));
  setTxt('out_ltv_cac', fmtNum(r.ltv_cac));
  setTxt('out_romi', fmtPct(r.romi));
  setTxt('out_drr', fmtPct(r.drr));
  setTxt('out_payback', fmtNum(r.payback));
  document.getElementById('alert_box').style.display = r.is_unprofitable ? 'block' : 'none';

  setTxt('out_gm_pct', fmtPct(r.gm_pct));
  setTxt('out_ros', fmtPct(r.ros));
  setTxt('out_bep_b', r.bep_reachable ? fmtNum(r.bep_b) : 'Недостижима');
  setTxt('out_bep_rev', r.bep_reachable ? fmtCur(r.bep_rev) : '—');
  setTxt('out_safety', r.bep_reachable ? fmtPct(r.safety) : '0 %');

  renderComparison(resA, resB);
}

function loadPlanToForm(planKey) {
  activePlan = planKey;
  document.querySelectorAll('.plan-tabs .tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.plan === planKey);
  });
  const data = plansData[planKey];
  document.getElementById('tax_mode').value = data.tax_mode || 'usn6';
  NUM_IDS.forEach(id => {
    document.getElementById(id).value = data[id] !== undefined ? data[id] : 0;
  });
  updateUI();
}

document.addEventListener('DOMContentLoaded', () => {
  initTooltips();
  const saved = JSON.parse(localStorage.getItem('fin_model_plans_v1') || 'null');
  if (saved && saved.A && saved.B) plansData = saved;
  loadPlanToForm('A');

  NUM_IDS.forEach(id => document.getElementById(id).addEventListener('input', updateUI));

  document.getElementById('tax_mode').addEventListener('change', (e) => {
    const rates = { usn6: 6, usn15: 15, osn: 25 };
    document.getElementById('tax_rate').value = rates[e.target.value] ?? 6;
    updateUI();
  });

  document.querySelectorAll('.plan-tabs .tab').forEach(btn => {
    btn.addEventListener('click', () => loadPlanToForm(btn.dataset.plan));
  });

  document.getElementById('btn-copy-ab').addEventListener('click', () => {
    plansData.B = { ...plansData.A };
    loadPlanToForm('B');
  });

  document.getElementById('btn-demo').addEventListener('click', () => {
    plansData[activePlan] = activePlan === 'A' ? { ...DEMO_A } : { ...DEMO_B };
    loadPlanToForm(activePlan);
  });

  document.getElementById('btn-clear').addEventListener('click', () => {
    const empty = { tax_mode: document.getElementById('tax_mode').value };
    NUM_IDS.forEach(id => empty[id] = 0);
    plansData[activePlan] = empty;
    loadPlanToForm(activePlan);
  });

  document.getElementById('btn-pdf').addEventListener('click', () => window.print());

  document.getElementById('btn-export').addEventListener('click', () => {
    const rows = [['Показатель', 'План А', 'План Б', 'Разница (Б - А)']];
    document.querySelectorAll('#compare_body tr').forEach(tr => {
      const cells = Array.from(tr.querySelectorAll('td')).map(td => td.innerText);
      rows.push(cells);
    });
    const csv = '\uFEFF' + rows.map(r => r.join(';')).join('\n');
    const a = document.createElement('a');
a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
a.download = 'unit_economics_plan_A_vs_B.csv';
a.click();
});
});