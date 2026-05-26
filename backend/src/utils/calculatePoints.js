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

  const exactTeamGoal =
    predictedA === actualScoreA || predictedB === actualScoreB;

  if (exactScore) return 10;
  if (correctResult && exactTeamGoal) return 7;
  if (correctResult) return 5;
  if (!correctResult && exactTeamGoal) return 2;

  return 0;
}