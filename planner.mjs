export function plan({monthly, coupon, threshold, maxCash, maxMonths, expires, today}) {
  const expired = Boolean(expires && expires < today);
  const rows = Array.from({length:maxMonths}, (_,i) => {
    const months=i+1, total=monthly*months;
    const eligible=!expired && total>=threshold;
    const used=eligible?Math.min(total,coupon):0;
    return {months,total,eligible,used,cash:total-used,left:coupon-used};
  });
  const recommended=rows.filter(r=>r.eligible && r.cash<=maxCash && r.used>0)
    .sort((a,b)=>b.used-a.used || a.cash-b.cash || a.months-b.months)[0] || null;
  return {rows,recommended,expired};
}
export function addMonths(dateText,months) {
  const [y,m,d]=dateText.split('-').map(Number);
  const date=new Date(Date.UTC(y,m-1+months,1));
  const end=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
  date.setUTCDate(Math.min(d,end));
  return date.toISOString().slice(0,10);
}
