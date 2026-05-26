import { apiRequest } from "../api/api";

export async function getCurrentRound() {
  try {
    const data = await apiRequest("/settings/current-round");
    return data.currentRound || "Round 1";
  } catch {
    return "Round 1";
  }
}

export async function updateCurrentRound(currentRound) {
  const data = await apiRequest("/settings/current-round", {
    method: "PATCH",
    body: JSON.stringify({ currentRound }),
  });

  return data.currentRound;
}