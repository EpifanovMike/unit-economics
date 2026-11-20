window.calculateModel = function(v) {
  const safeDiv = (a, b) => b === 0 ? 0 : a / b;
  const safeNum = (n) => isFinite(n) && !isNaN(n) ? n : 0;

  const ua = Math.max(0, Number(v.ua) || 0);
  const c1 = Math.min(100, Math.max(0, Number(v.c1) || 0));
  const avp = Math.max(0, Number(v.avp) || 0);
  const cogs_m = Math.min(100, Math.max(0, Number(v.cogs_m) || 0));
  const apc = Math.max(0, Number(v.apc) || 0);
  const lifetime = Math.max(1, Number(v.lifetime) || 1);

  const b = ua * (c1 / 100);
  const arppu = avp * (1 - cogs_m / 100) * apc;
  const ltv = arppu * lifetime;
  const arpu = arppu * (c1 / 100);

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

  const vatRate = Math.max(0, Number(v.vat_rate) || 0);
  const vat = (rev > 0 && vatRate > 0) ? Math.max(0, (rev - cogs - var_costs) * (vatRate / (100 + vatRate))) : 0;

  const taxRate = Math.max(0, Number(v.tax_rate) || 0);
  let profit_tax = 0;
  
  if (v.tax_mode === 'usn6') {
    profit_tax = rev > 0 ? rev * (taxRate / 100) : 0;
  } else if (v.tax_mode === 'usn15' || v.tax_mode === 'osn') {
    const profitBase = ebitda - vat;
    profit_tax = profitBase > 0 ? profitBase * (taxRate / 100) : 0;
  }

  const taxes = vat + profit_tax;
  const net = ebitda - taxes;

  const cpa = safeDiv(ac, ua);
  const cac = safeDiv(ac + sc, b);
  const ltv_cac = safeDiv(ltv, cac);
  const romi = ac > 0 ? ((gm - ac) / ac) * 100 : 0;
  const total_expenses = cogs + ac + sc + var_costs + admin_cost + rent + taxes;
  const roi = total_expenses > 0 ? (net / total_expenses) * 100 : 0;
  const drr = safeDiv(ac, rev) * 100;
  
  const unitMarginPerPurchase = avp * (1 - cogs_m / 100);
  const payback = (unitMarginPerPurchase > 0 && cac > 0) ? cac / unitMarginPerPurchase : 0;
  const is_unprofitable = (ua > 0 && ltv < cac) || (ua > 0 && arpu < cpa);

  const gm_pct = safeDiv(gm, rev) * 100;
  const ebitda_pct = safeDiv(ebitda, rev) * 100;
  const ros = safeDiv(net, rev) * 100;
  
  const effVat = vatRate > 0 ? (vatRate / (100 + vatRate)) : 0;
  const effRevTax = v.tax_mode === 'usn6' ? (taxRate / 100) : 0;
  
  const unit_net_margin = arppu - (mat_price * apc) - (avp * apc * (effRevTax + effVat));
  const total_fixed = admin_cost + rent + ac + sc;
  const bep_reachable = unit_net_margin > 0;
  const bep_b = bep_reachable ? Math.ceil(total_fixed / unit_net_margin) : 0;
  const bep_rev = bep_reachable ? bep_b * avp * apc : 0;
  const safety_rub = (rev > 0 && bep_reachable) ? (rev - bep_rev) : 0;
  const safety = (rev > 0 && bep_reachable) ? (safety_rub / rev) * 100 : 0;

  return {
    b, arppu, ltv, arpu,
    rev, cogs, gm, cm, var_costs, pbfc, rent, ebitda, vat, taxes, net,
    cpa, cac, ltv_cac, romi, roi, drr, payback, is_unprofitable,
    gm_pct, ebitda_pct, ros, bep_reachable, bep_b, bep_rev, safety_rub, safety
  };
};