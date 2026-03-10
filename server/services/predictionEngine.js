const db = require('../db/database');

function calculateSpoilageIndex(data) {
  if (!data || data.length === 0) return 0;

  const tempDeviations = data.map(d => {
    if (d.temperature > 8) return (d.temperature - 8) * 3;
    if (d.temperature < 2) return (2 - d.temperature) * 4;
    return 0;
  });

  const humidityDeviations = data.map(d => {
    if (d.humidity > 60) return (d.humidity - 60) * 0.5;
    if (d.humidity < 20) return (20 - d.humidity) * 0.3;
    return 0;
  });

  const avgTempDev = tempDeviations.reduce((a, b) => a + b, 0) / tempDeviations.length;
  const avgHumDev = humidityDeviations.reduce((a, b) => a + b, 0) / humidityDeviations.length;
  const excursionCount = tempDeviations.filter(d => d > 0).length;
  const excursionRatio = excursionCount / data.length;

  // Weighted spoilage index
  let index = avgTempDev * 4 + avgHumDev * 2 + excursionRatio * 30;

  // Duration factor — longer excursions are worse
  let consecutiveExcursion = 0;
  let maxConsecutive = 0;
  data.forEach(d => {
    if (d.temperature > 8 || d.temperature < 2) {
      consecutiveExcursion++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveExcursion);
    } else {
      consecutiveExcursion = 0;
    }
  });
  index += maxConsecutive * 2;

  return Math.round(Math.min(100, Math.max(0, index)) * 10) / 10;
}

function calculateRiskScore(data) {
  if (!data || data.length === 0) return 0;

  const latest = data[data.length - 1];
  const temps = data.map(d => d.temperature);
  const mean = temps.reduce((a, b) => a + b, 0) / temps.length;
  const variance = temps.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / temps.length;
  const stdDev = Math.sqrt(variance);

  let score = 0;

  // Current temperature deviation
  if (latest.temperature > 8) score += Math.min(40, (latest.temperature - 8) * 8);
  else if (latest.temperature < 2) score += Math.min(40, (2 - latest.temperature) * 10);

  // Volatility
  score += Math.min(20, stdDev * 8);

  // Z-score of latest reading
  const zScore = stdDev > 0 ? Math.abs((latest.temperature - mean) / stdDev) : 0;
  if (zScore > 2) score += Math.min(15, (zScore - 2) * 5);

  // Humidity risk
  if (latest.humidity > 60) score += Math.min(10, (latest.humidity - 60) * 0.5);
  if (latest.humidity < 20) score += Math.min(10, (20 - latest.humidity) * 0.5);

  // Door activity risk
  const doorEvents = data.filter(d => d.doorStatus === 1).length;
  const doorRatio = doorEvents / data.length;
  score += Math.min(10, doorRatio * 50);

  // Battery risk
  if (latest.batteryLevel < 30) score += 5;
  if (latest.batteryLevel < 15) score += 10;

  return Math.round(Math.min(100, Math.max(0, score)) * 10) / 10;
}

function generateForecast(data) {
  if (!data || data.length < 6) return [];

  const temps = data.slice(-24).map(d => d.temperature);
  const n = temps.length;

  // Simple linear regression
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += temps[i];
    sumXY += i * temps[i];
    sumX2 += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Generate 12-hour forecast (12 points, hourly)
  const forecast = [];
  for (let h = 1; h <= 12; h++) {
    const futureIdx = n + h * 2; // roughly 2 data points per hour assuming 30min intervals adjust
    const predicted = intercept + slope * futureIdx;
    // Add realistic noise
    const noise = (Math.random() - 0.5) * 0.6;
    const val = Math.round((predicted + noise) * 100) / 100;
    forecast.push({
      hour: h,
      temperature: val,
      upperBound: Math.round((val + 1.5) * 100) / 100,
      lowerBound: Math.round((val - 1.5) * 100) / 100
    });
  }

  return forecast;
}

module.exports = { calculateSpoilageIndex, calculateRiskScore, generateForecast };
