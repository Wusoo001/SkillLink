// src/utils/helpers.js
export const isUserActive = (lastActive) => {
  if (!lastActive) return false;
  const now = new Date();
  const diff = (now - new Date(lastActive)) / 1000 / 60; // minutes
  return diff < 5;
};