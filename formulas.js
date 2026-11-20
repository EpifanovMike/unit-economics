window.calculateModel = function(v) {
  // Защита от деления на ноль и NaN
  const safeDiv = (a, b) => (b === 0 || !isFinite(b)) ? 0 : a / b;
  
  // Безопасное приведение типов
  const ua = Math.max(0, Number(v.ua) || 0);
  const c1 = Math.min(100, Math.max(0, Number(v.c1) || 0));
  const avp = Math.max(0, Number(v.avp) || 0);
  const cogs_m = Math.min(100, Math.max(0, Number(v.cogs_m) || 0));
  const apc = Math.max(0, Number(v.apc) || 0);
  const lifetime = Math.max(1, Number(v.lifetime) || 1);

  // --- 1. Юнит-экономика ---
  const b = ua * (c1 / 100);
  const arppu = avp * (1 - cogs_m / 100) * apc;
  const ltv = arppu * lifetime;
  const arpu = arppu * (c1 / 100);

  // --- 2. P&L ---
  const rev = b * avp * apc;
  const cogs = rev * (cogs_m / 100);
  const gm = rev - cogs;
  
  const ac = Math.max(0, Number(v.ac) || 0);
  const sc = Math.max(0, Number(v.sc) || 0);
  const cm = gm - ac - sc;
  
  const mat_price = Math.max(0, Number(v.mat_price) || 0);
  const var_costs = mat_price * b * apc;
  const pbfc = cm - var_costs;
  
  const rent = (Number(v.area) || 0) * (Number(v.rent_price) || 0);
  const admin_cost = Math.max(0, Number(v.admin_cost) || 0);
  const ebitda = pbfc - admin_cost - rent;

  // --- 3. НАЛОГИ (2026) ---
  let vat = 0;
  let profit_tax = 0;
  let total_taxes = 0;
  const mode = v.tax_mode;

  if (mode === 'osn') {
    // ОСНО: НДС 22% с добавленной стоимости (вычет входного)
    const vatRate = 22;
    const outputVat = rev * (vatRate / (100 + vatRate));
    const inputVat = (cogs + var_costs) * (vatRate / (100 + vatRate));
    vat = Math.max(0, outputVat - inputVat);
    
    // Налог на прибыль 25%
    const taxBase = ebitda - vat; 
    profit_tax = taxBase > 0 ? taxBase * 0.25 : 0;
    
    total_taxes = vat + profit_tax;
  } 
  else if (mode === 'usn6' || mode === 'usn15' || mode === 'usn6_vat5' || mode === 'usn6_vat7') {
    // УСН
    const isVatMode = mode.includes('vat');
    const vatRate = mode === 'usn6_vat5' ? 5 : (mode === 'usn6_vat7' ? 7 : 0);
    
    if (isVatMode && vatRate > 0) {
      // НДС с оборота (без вычетов)
      vat = rev * (vatRate / (100 + vatRate));
    }
    
    // Налог УСН (6% или 15%)
    if (mode === 'usn15') {
      const usnBase = rev - cogs - ac - sc - var_costs - admin_cost - rent - vat;
      profit_tax = usnBase > 0 ? usnBase * 0.15 : 0;
    } else {
      // Для usn6 и usn6_vat5/7 налог 6% с выручки
      profit_tax = rev > 0 ? rev * 0.06 : 0;
    }
    
    total_taxes = vat + profit_tax;
  }
  else if (mode === 'psn') {
    // ПСН: фиксированная стоимость патента
    profit_tax = Math.max(0, Number(v.patent_cost) || 0);
    total_taxes = profit_tax;
  }
  else if (mode === 'npd') {
    // НПД: 6% с выручки (упрощенно)
    profit_tax = rev > 0 ? rev * 0.06 : 0;
    total_taxes = profit_tax;
  }
  else if (mode === 'ausn_d' || mode === 'ausn_dr') {
    // АУСН
    if (mode === 'ausn_dr') {
      const ausnBase = rev - cogs - ac - sc - var_costs - admin_cost - rent;
      profit_tax = ausnBase > 0 ? ausnBase * 0.20 : 0;
    } else {
      profit_tax = rev > 0 ? rev * 0.08 : 0;
    }
    total_taxes = profit_tax;
  }
  else if (mode === 'eshn') {
    // ЕСХН 6%
    const eshnBase = rev - cogs - ac - sc - var_costs - admin_cost - rent;
    profit_tax = eshnBase > 0 ? eshnBase * 0.06 : 0;
    total_taxes = profit_tax;
  }
  else {
    // Fallback (старая логика для ручных ставок)
    const vatRate = Math.max(0, Number(v.vat_rate) || 0);
    vat = (rev > 0 && vatRate > 0) ? Math.max(0, (rev - cogs - var_costs) * (vatRate / (100 + vatRate))) : 0;
    const taxRate = Math.max(0, Number(v.tax_rate) || 0);
    if (mode === 'usn6') profit_tax = rev * (taxRate / 100);
    else profit_tax = Math.max(0, (ebitda - vat)) * (taxRate / 100);
    total_taxes = vat + profit_tax;
  }

  const net = ebitda - total_taxes;

  // --- 4. Маркетинг и ROI ---
  const cpa = safeDiv(ac, ua);
  const cac = safeDiv(ac + sc, b);
  const ltv_cac = safeDiv(ltv, cac);
  const romi = ac > 0 ? ((gm - ac) / ac) * 100 : 0;
  
  const total_expenses = cogs + ac + sc + var_costs + admin_cost + rent + total_taxes;
  const roi = total_expenses > 0 ? (net / total_expenses) * 100 : 0;
  const drr = safeDiv(ac, rev) * 100;
  
  const unitMarginPerPurchase = avp * (1 - cogs_m / 100);
  const payback = (unitMarginPerPurchase > 0 && cac > 0) ? cac / unitMarginPerPurchase : 0;
  const is_unprofitable = (ua > 0 && ltv < cac) || (ua > 0 && arpu < cpa);

  // --- 5. Рентабельность и BEP ---
  const gm_pct = safeDiv(gm, rev) * 100;
  const ebitda_pct = safeDiv(ebitda, rev) * 100;
  const ros = safeDiv(net, rev) * 100;
  
  // Упрощенная маржинальность для BEP (без сложных налоговых вычетов)
  const unit_net_margin = arppu - (mat_price * apc) - (avp * apc * 0.06); 
  const total_fixed = admin_cost + rent + ac + sc;
  
  const bep_reachable = unit_net_margin > 0;
  const bep_b = bep_reachable ? Math.ceil(total_fixed / unit_net_margin) : 0;
  const bep_rev = bep_reachable ? bep_b * avp * apc : 0;
  const safety_rub = (rev > 0 && bep_reachable) ? (rev - bep_rev) : 0;
  const safety = (rev > 0 && bep_reachable) ? (safety_rub / rev) * 100 : 0;

  return {
    b, arppu, ltv, arpu,
    rev, cogs, gm, cm, var_costs, pbfc, rent, ebitda, vat, taxes: total_taxes, net,
    cpa, cac, ltv_cac, romi, roi, drr, payback, is_unprofitable,
    gm_pct, ebitda_pct, ros, bep_reachable, bep_b, bep_rev, safety_rub, safety
  };
};
