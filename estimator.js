/**
 * Calculate the number of currently infected people for impact object.
 *
 * @param {number} reported Total number of reported cases.
 */
function calcCurrentlyInfectedForImpact(reported) {
  return Math.trunc(reported * 10);
}

/**
 * Calculate the number of currently infected people for severeImpact object.
 *
 * @param {number} reported Total number of reported cases.
 */
function calcCurrentlyInfectedForSevereImpact(reported) {
  return Math.trunc(reported * 50);
}

/**
 * Convert duration to number of days depending on type of duration.
 *
 * @param {number} duration Duration of time.
 *
 * @param {string} type Type of duration. Enum; [months|weeks|days]
 */
function durationToDays(duration, type) {
  switch (type) {
    case "months":
      return duration * 30;

    case "weeks":
      return duration * 7;

    default:
      return duration;
  }
}

/**
 * Calculate number of infected people over a period of time.
 *
 * @param {number} infected Total number of currently infected people.
 *
 * @param {number} duration Duration of time to estimate.
 *
 * @param {string} type Type of duration; days, months, years
 */
function calcInfectionsByRequestedTime(infected, duration, type) {
  const days = durationToDays(duration, type);

  return Math.trunc(infected * 2 ** Math.trunc(days / 3));
}

/**
 * Calculate number of severe positive cases that will require hospitalization to recover
 *
 * @param {number} infected Total number of currently infected people.
 */
function calcSevereCasesByRequestedTime(infected) {
  return Math.trunc(infected * 0.15);
}

/**
 * Calculate number of available beds for severe patients.
 *
 * @param {number} beds Total number of available hospital beds.
 *
 * @param {number} cases Total number of severe positive cases.
 */
function calcHospitalBedsByRequestedTime(beds, cases) {
  return Math.trunc(beds * 0.35 - cases);
}

/**
 * Calculate number of severe positive cases that will require ICU care.
 *
 * @param {number} infected Total number of infected people.
 */
function calcCasesForICUByRequestedTime(infected) {
  return Math.trunc(infected * 0.05);
}

/**
 * Calculate number of severe positive cases that will require ventilators.
 *
 * @param {number} infected Total number of infected people.
 */
function calcCasesForVentilatorsByRequestedTime(infected) {
  return Math.trunc(infected * 0.02);
}

/**
 * Calculate how much money the economy is likely to loose of a period of time.
 *
 * @param {number} infected Total number of infected people.
 *
 * @param {number} population Average daily income for population.
 *
 * @param {number} amount Average daily income amount in USD.
 *
 * @param {number} duration Duration of time for estimation.
 *
 * @param {string} type Type of duration; days, months, years
 */
function calcDollarsInFlight(infected, population, amount, duration, type) {
  const days = durationToDays(duration, type);

  return Math.trunc((infected * population * amount) / days);
}

const covid19ImpactEstimator = (data) => {
  const result = {};

  result.data = data;

  result.impact = {};

  result.severeImpact = {};

  // Get number of currently infected people.
  result.impact.currentlyInfected = calcCurrentlyInfectedForImpact(
    data.reportedCases
  );

  result.severeImpact.currentlyInfected = calcCurrentlyInfectedForSevereImpact(
    data.reportedCases
  );

  // Get number of infected people over a duration of time.
  result.impact.infectionsByRequestedTime = calcInfectionsByRequestedTime(
    result.impact.currentlyInfected,
    data.timeToElapse,
    data.periodType
  );

  result.severeImpact.infectionsByRequestedTime = calcInfectionsByRequestedTime(
    result.severeImpact.currentlyInfected,
    data.timeToElapse,
    data.periodType
  );

  // Get number of severe cases that will require hospitalization to recover.
  result.impact.severeCasesByRequestedTime = calcSevereCasesByRequestedTime(
    result.impact.infectionsByRequestedTime
  );

  result.severeImpact.severeCasesByRequestedTime = calcSevereCasesByRequestedTime(
    result.severeImpact.infectionsByRequestedTime
  );

  // Get number of available hospital beds for infected people.
  result.impact.hospitalBedsByRequestedTime = calcHospitalBedsByRequestedTime(
    data.totalHospitalBeds,
    result.impact.severeCasesByRequestedTime
  );

  result.severeImpact.hospitalBedsByRequestedTime = calcHospitalBedsByRequestedTime(
    data.totalHospitalBeds,
    result.severeImpact.severeCasesByRequestedTime
  );

  // Get number of severe positive cases that will require ICU care.
  result.impact.casesForICUByRequestedTime = calcCasesForICUByRequestedTime(
    result.impact.infectionsByRequestedTime
  );

  result.severeImpact.casesForICUByRequestedTime = calcCasesForICUByRequestedTime(
    result.severeImpact.infectionsByRequestedTime
  );

  // Get number of severe positive cases that will require ventilators
  result.impact.casesForVentilatorsByRequestedTime = calcCasesForVentilatorsByRequestedTime(
    result.impact.infectionsByRequestedTime
  );

  result.severeImpact.casesForVentilatorsByRequestedTime = calcCasesForVentilatorsByRequestedTime(
    result.severeImpact.infectionsByRequestedTime
  );

  // Get amount of money the economy is likely to lose
  result.impact.dollarsInFlight = calcDollarsInFlight(
    result.impact.infectionsByRequestedTime,
    data.region.avgDailyIncomePopulation,
    data.region.avgDailyIncomeInUSD,
    data.timeToElapse,
    data.periodType
  );

  result.severeImpact.dollarsInFlight = calcDollarsInFlight(
    result.severeImpact.infectionsByRequestedTime,
    data.region.avgDailyIncomePopulation,
    data.region.avgDailyIncomeInUSD,
    data.timeToElapse,
    data.periodType
  );

  return result;
};

module.exports = covid19ImpactEstimator;
