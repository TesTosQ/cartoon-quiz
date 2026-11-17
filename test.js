const { isCorrect } = require("./match");
const Q = require("./questions");
const cases = [
  [7, "SIMPSONS", true], [7, "the simpsons", true], [7, "Simpson", true], [7, "simsons", true], [7, "homer", false], [7, "spongebob", false],
  [8, "Upin & Ipin", true], [8, "upin ipin", true], [8, "UPIN DAN IPIN", true], [8, "upinipin", true], [8, "Upin and Ipin!", true],
  [9, "powerpuff girls", true], [9, "Power Puff Girls", true], [9, "powerpuf girls", true], [9, "ppg", true],
  [3, "Totally Spies!", true], [3, "totaly spies", true], [4, "South  Park", true], [4, "southpark", true], [4, "cartman", false],
  [5, "PUCCA", true], [5, "puca", true], [5, "pika", false], [6, "bola kampung", true], [10, "Aladin", true], [1, "minion", true], [1, "", false],
  [11, "KIM POSSIBLE", true], [11, "kimpossible", true], [12, "boboi boy", true], [13, "oggy", true], [14, "Phineas & Ferb", true],
  [15, "spongebob", true], [15, "sponge bob squarepants", true], [16, "doremon", true], [17, "wonder pets", true], [17, "wonderpets", true],
  [18, "fairly odd parents", true], [18, "the fairly oddparents", true], [19, "gravity falls", true], [19, "gravity", false], [20, "barney", true], [20, "Barney and Friends", true], [20, "elmo", false],
];
let bad = 0;
for (const [n, input, want] of cases) {
  const got = isCorrect(input, Q[n - 1].answers);
  if (got !== want) { bad++; console.log("FAIL", n, JSON.stringify(input), "expected", want); }
}
console.log(bad ? `${bad} failed` : `all ${cases.length} matcher tests passed`);
process.exit(bad ? 1 : 0);
