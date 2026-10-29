// Пословное сравнение эталона и распознанного текста (LCS) для shadowing и правок письма.
export type DiffToken = { word: string; kind: "ok" | "miss" | "extra" };

const norm = (w: string) =>
  w.toLowerCase().replace(/ß/g, "ss").replace(/[^\p{L}\p{N}]/gu, "");

const words = (s: string) => s.split(/\s+/).filter((w) => norm(w));

export function wordDiff(expected: string, actual: string): { tokens: DiffToken[]; score: number } {
  const a = words(expected);
  const b = words(actual);
  const na = a.map(norm);
  const nb = b.map(norm);
  // dp[i][j] = длина LCS суффиксов a[i:], b[j:]
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      dp[i][j] = na[i] === nb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const tokens: DiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && na[i] === nb[j]) {
      tokens.push({ word: a[i], kind: "ok" });
      i++;
      j++;
    } else if (j < b.length && (i === a.length || dp[i][j + 1] >= dp[i + 1][j])) {
      tokens.push({ word: b[j++], kind: "extra" });
    } else {
      tokens.push({ word: a[i++], kind: "miss" });
    }
  }
  return { tokens, score: a.length ? dp[0][0] / a.length : 0 };
}
