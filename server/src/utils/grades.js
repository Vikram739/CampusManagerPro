function letterGrade(percent) {
  if (percent === null || percent === undefined) return null;
  if (percent >= 90) return 'A';
  if (percent >= 80) return 'B';
  if (percent >= 70) return 'C';
  if (percent >= 60) return 'D';
  return 'F';
}

// Points-weighted percentage across graded work only
function summarize(gradedItems) {
  let earned = 0;
  let possible = 0;
  gradedItems.forEach((item) => {
    earned += Number(item.score);
    possible += Number(item.max_points);
  });
  const percent = possible > 0 ? Math.round((earned / possible) * 1000) / 10 : null;
  return { earned, possible, percent, letter: letterGrade(percent) };
}

module.exports = { letterGrade, summarize };
