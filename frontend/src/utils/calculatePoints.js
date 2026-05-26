function getResult(scoreA, scoreB) {
  if (scoreA > scoreB) return "A_WIN";
  if (scoreB > scoreA) return "B_WIN";
  return "DRAW";
}

export function calculatePoints(predA, predB, actualA, actualB) {
  const predictedA = Number(predA);
  const predictedB = Number(predB);
  const actualScoreA = Number(actualA);
  const actualScoreB = Number(actualB);

  const predictedResult = getResult(predictedA, predictedB);
  const actualResult = getResult(actualScoreA, actualScoreB);

  const exactScore =
    predictedA === actualScoreA && predictedB === actualScoreB;

  const correctResult = predictedResult === actualResult;

  const predictedGoalDiff = Math.abs(predictedA - predictedB);
  const actualGoalDiff = Math.abs(actualScoreA - actualScoreB);
  const correctGoalDiff = predictedGoalDiff === actualGoalDiff;

  const exactTeamGoal =
    predictedA === actualScoreA || predictedB === actualScoreB;

  if (exactScore) return 10;

  // Correct winner + one exact team goal
  if (correctResult && exactTeamGoal && actualResult !== "DRAW") return 7;

  // Correct winner + correct goal difference
  if (correctResult && correctGoalDiff && actualResult !== "DRAW") return 6;

  // Correct draw, but not exact score
  if (actualResult === "DRAW" && predictedResult === "DRAW") return 6;

  // Correct result only
  if (correctResult) return 5;

  // Wrong result but one team goal exact
  if (!correctResult && exactTeamGoal) return 2;

  return 0;
}