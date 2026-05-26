function getResult(scoreA, scoreB) {
  if (scoreA > scoreB) return "A_WIN";
  if (scoreB > scoreA) return "B_WIN";
  return "DRAW";
}

export function calculatePoints(predA, predB, actualA, actualB) {
  const predictedResult = getResult(predA, predB);
  const actualResult = getResult(actualA, actualB);

  const exactScore = predA === actualA && predB === actualB;
  const correctResult = predictedResult === actualResult;

  const predictedGoalDiff = Math.abs(predA - predB);
  const actualGoalDiff = Math.abs(actualA - actualB);
  const correctGoalDiff = predictedGoalDiff === actualGoalDiff;

  const exactTeamGoal = predA === actualA || predB === actualB;

  if (exactScore) return 10;

  if (correctResult && exactTeamGoal && actualResult !== "DRAW") return 7;

  if (correctResult && correctGoalDiff && actualResult !== "DRAW") return 6;

  if (actualResult === "DRAW" && predictedResult === "DRAW") return 6;

  if (correctResult) return 5;

  if (!correctResult && exactTeamGoal) return 2;

  return 0;
}