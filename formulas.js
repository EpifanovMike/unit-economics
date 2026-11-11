window.calculateModel = function(v) {
  const b = v.ua * (v.c1 / 100);
  const arppu = v.avp * (1 - v.cogs_m / 100) * v.apc;
  const ltv = arppu * Math.max(1, v.lifetime);
  const arpu = arppu * (v.c1 / 100);

  const rev = b * v.avp * v.apc;
  const cogs = rev * (v.cogs_m / 100);
  const gm = rev - cogs;
  const cm = gm - v.ac - v.sc;
  const var_costs = v.mat_price * b * v.apc;
  const pbfc = cm - var_costs;
  const rent = v.area * v.rent_price;
  const ebitda = pbfc - v.admin_cost - rent;

  let taxes = 0;
  if (v.tax_mode === 'usn6') {
    taxes = rev > 0 ? rev * (v.tax_rate / 100) : 0;
  } else if (v.tax_mode === 'usn15') {
    taxes = ebitda > 0 ? ebitda * (v.tax_rate / 100) : 0;
  } else if (v.tax_mode === 'osn') {
    const vat = rev > 0 ? Math.max(0, (rev - cogs - var_costs) * (22 / 122)) : 0;
    const profitBase = ebitda - vat;
    const profitTax = profitBase > 0 ? profitBase * (v.tax_rate / 100) : 0;
    taxes = vat + profitTax;
  }
  const net = ebitda - taxes;

  const cpa = v.ua > 0 ? v.ac / v.ua : 0;
  const cac = b > 0 ? (v.ac + v.sc) / b : 0;
  const ltv_cac = cac > 0 ? ltv / cac : 0;
  const romi = v.ac > 0 ? ((gm - v.ac) / v.ac) * 100 : 0;
  const total_expenses = cogs + v.ac + v.sc + var_costs + v.admin_cost + rent + taxes;
  const roi = total_expenses > 0 ? (net / total_expenses) * 100 : 0;
  const drr = rev > 0 ? (v.ac / rev) * 100 : 0;
  const unitMarginPerPurchase = v.avp * (1 - v.cogs_m / 100);
  const payback = (unitMarginPerPurchase > 0 && cac > 0) ? cac / unitMarginPerPurchase : 0;
  const is_unprofitable = (v.ua > 0 && ltv < cac) || (v.ua > 0 && arpu < cpa);

  const gm_pct = rev > 0 ? (gm / rev) * 100 : 0;
  const ebitda_pct = rev > 0 ? (ebitda / rev) * 100 : 0;
  const ros = rev > 0 ? (net / rev) * 100 : 0;
  const effRevTax = v.tax_mode === 'usn6' ? (v.tax_rate / 100) : (v.tax_mode === 'osn' ? (22 / 122) : 0);
  const unit_net_margin = arppu - (v.mat_price * v.apc) - (v.avp * v.apc * effRevTax);
  const total_fixed = v.admin_cost + rent + v.ac + v.sc;
  const bep_reachable = unit_net_margin > 0;
  const bep_b = bep_reachable ? Math.ceil(total_fixed / unit_net_margin) : 0;
  const bep_rev = bep_reachable ? bep_b * v.avp * v.apc : 0;
  const safety_rub = (rev > 0 && bep_reachable) ? (rev - bep_rev) : 0;
  const safety = (rev > 0 && bep_reachable) ? (safety_rub / rev) * 100 : 0;

  return {
    b, arppu, ltv, arpu,
    rev, cogs, gm, cm, var_costs, pbfc, rent, ebitda, taxes, net,
    cpa, cac, ltv_cac, romi, roi, drr, payback, is_unprofitable,
    gm_pct, ebitda_pct, ros, bep_reachable, bep_b, bep_rev, safety_rub, safety
  };
};
