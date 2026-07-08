export interface SimpleDcfInputs {
  latestFcf: number;
  growthRate: number;
  discountRate?: number;
  terminalGrowthRate?: number;
  years?: number;
}

export interface SimpleDcfResult {
  presentValue: number;
  assumptions: string;
}

/**
 * A deliberately simple, illustrative DCF — not a substitute for a rigorous valuation model.
 * Growth rate is clamped to a sane range since it's derived from just a few years of
 * historical data and can otherwise extrapolate wildly.
 */
export function computeSimpleDcf(inputs: SimpleDcfInputs): SimpleDcfResult {
  const {
    latestFcf,
    growthRate,
    discountRate = 0.1,
    terminalGrowthRate = 0.03,
    years = 5,
  } = inputs;

  const clampedGrowth = Math.max(Math.min(growthRate, 0.4), -0.2);

  const projectedCashFlows: number[] = [];
  let cf = latestFcf;
  for (let i = 0; i < years; i++) {
    cf = cf * (1 + clampedGrowth);
    projectedCashFlows.push(cf);
  }

  const terminalValue =
    (projectedCashFlows[years - 1] * (1 + terminalGrowthRate)) / (discountRate - terminalGrowthRate);

  let presentValue = 0;
  projectedCashFlows.forEach((flow, i) => {
    presentValue += flow / Math.pow(1 + discountRate, i + 1);
  });
  presentValue += terminalValue / Math.pow(1 + discountRate, years);

  return {
    presentValue,
    assumptions: `Simplified illustrative DCF: ${(clampedGrowth * 100).toFixed(
      1
    )}% projected annual growth for ${years} years, ${(discountRate * 100).toFixed(
      0
    )}% discount rate, ${(terminalGrowthRate * 100).toFixed(
      0
    )}% terminal growth, based on the latest available annual net income as a cash-flow proxy. This is a rough sanity-check estimate, not a substitute for a professional valuation model.`,
  };
}
