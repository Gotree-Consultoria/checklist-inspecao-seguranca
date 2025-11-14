export function onlyDigits(v: string) { return (v||'').replace(/\D+/g,''); }

export function formatCNPJ(v: string) {
  const d = onlyDigits(v).slice(0,14);
  if (!d) return '';
  let out = d;
  if (d.length > 2) out = d.slice(0,2)+'.'+d.slice(2);
  if (d.length > 5) out = out.slice(0,6)+'.'+out.slice(6);
  if (d.length > 8) out = out.slice(0,10)+'/'+out.slice(10);
  if (d.length > 12) out = out.slice(0,15)+'-'+out.slice(15);
  return out;
}

export function validateCNPJ(cnpj: string) {
  const str = onlyDigits(cnpj);
  if (str.length !== 14) return false;
  if (/^(\d)\1+$/.test(str)) return false;
  const calc = (base: string) => {
    const factor = base.length === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    const sum = base.split('').reduce((acc, cur, idx) => acc + parseInt(cur,10)*factor[idx], 0);
    const mod = sum % 11;
    return (mod < 2) ? 0 : 11 - mod;
  };
  const d1 = calc(str.slice(0,12));
  const d2 = calc(str.slice(0,12)+d1);
  return str.endsWith(String(d1)+String(d2));
}
