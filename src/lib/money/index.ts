export function fenToDisplay(fen: bigint): string {
  const negative = fen < 0n;
  const abs = negative ? -fen : fen;
  const yuan = abs / 100n;
  const cents = abs % 100n;
  const centsStr = cents.toString().padStart(2, '0');
  return `${negative ? '-' : ''}${yuan}.${centsStr}`;
}

export function displayToFen(input: string): bigint {
  const cleaned = input.replace(/[¥,\s]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    throw new Error(`Invalid money string: ${input}`);
  }
  const negative = cleaned.startsWith('-');
  const abs = negative ? cleaned.slice(1) : cleaned;
  const [whole, frac = ''] = abs.split('.');
  const fracPadded = `${frac}00`.slice(0, 3);
  // round half-away-from-zero based on the third digit
  const wholeFen = BigInt(whole) * 100n + BigInt(fracPadded.slice(0, 2));
  const rounded = Number(fracPadded.charAt(2)) >= 5 ? wholeFen + 1n : wholeFen;
  return negative ? -rounded : rounded;
}

export function formatRMB(fen: bigint): string {
  const negative = fen < 0n;
  const abs = negative ? -fen : fen;
  const yuan = abs / 100n;
  const cents = abs % 100n;
  const centsStr = cents.toString().padStart(2, '0');
  // insert thousands separators
  const yuanStr = yuan.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}¥${yuanStr}.${centsStr}`;
}
