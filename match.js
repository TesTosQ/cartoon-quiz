// Answer matching by SOUND.
// Ignores case, spacing, punctuation, "the", "&"/"and" and accents, then compares how the words sound:
//   "puca", "pucka", "pukka" == "pucca"  (same sound)      "puccu", "pacca" != "pucca"  (different sound)
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

// Turns a word into a rough "sound key". Vowels are kept, so a different vowel = a different sound.
function soundKey(s) {
  let k = compact(s);
  k = k
    .replace(/ph/g, "f")
    .replace(/ck/g, "k")
    .replace(/ch/g, "!")          // "ch" sound, protect it from the c rule
    .replace(/sh/g, "$")
    .replace(/wh/g, "w")
    .replace(/qu/g, "kw")
    .replace(/q/g, "k")
    .replace(/x/g, "ks")
    .replace(/c(?=[eiy])/g, "s")  // soft c: "cell"
    .replace(/c/g, "k")           // hard c: "cat", "pucca"
    .replace(/z/g, "s")
    .replace(/oo/g, "u")
    .replace(/ee/g, "i")
    .replace(/(.)\1+/g, "$1");    // double letters sound like one: "pucca"="puca", "totally"="totaly"
  return k;
}

function isCorrect(input, accepted) {
  const x = soundKey(input);
  if (!x) return false;
  return accepted.some((a) => soundKey(a) === x);
}
module.exports = { norm, compact, soundKey, isCorrect };
