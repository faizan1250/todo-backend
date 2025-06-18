// utils/timeUtils.js

function calculateElapsedSeconds(startTime, endTime = new Date()) {
  if (!startTime) return 0;
  return Math.floor((new Date(endTime) - new Date(startTime)) / 1000);
}

function capToDuration(secondsCompleted, maxDuration) {
  return Math.min(secondsCompleted, maxDuration);
}

module.exports = {
  calculateElapsedSeconds,
  capToDuration
};
