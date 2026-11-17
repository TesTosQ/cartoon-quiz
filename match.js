// Answer matching: forgiving on case, spacing, punctuation, "the", "&"/"and", accents and small typos.
function norm(s) {
  return String(s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\b(the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const compact = (s) => norm(s).replace(/ /g, "");

function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

function isCorrect(input, accepted) {
  const x = compact(input);
  if (!x) return false;
  for (const a of accepted) {
    const y = compact(a);
    if (!y) continue;
    if (x === y) return true;
    // typo tolerance only for longer words so short answers can't be guessed by accident
    const tol = y.length >= 9 ? 2 : y.length >= 5 ? 1 : 0;
    if (tol && lev(x, y) <= tol) return true;
  }
  return false;
}
module.exports = { norm, compact, isCorrect };
