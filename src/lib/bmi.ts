/**
 * BMI(체질량지수) 및 표준체중 계산 — 아시아·태평양 기준 체중 구간
 */

export interface BmiInput {
  heightCm: number
  weightKg: number
}

export function calcBmi(i: BmiInput) {
  const heightM = i.heightCm / 100
  const bmi = heightM > 0 ? i.weightKg / (heightM * heightM) : NaN
  const standardWeight = heightM * heightM * 22

  const category = !Number.isFinite(bmi)
    ? '입력값을 확인하세요'
    : bmi < 18.5
      ? '저체중'
      : bmi < 23
        ? '정상'
        : bmi < 25
          ? '과체중'
          : bmi < 30
            ? '비만'
            : '고도비만'

  return {
    bmi,
    standardWeight: Math.round(standardWeight * 10) / 10,
    category,
    diffFromStandard: Math.round((i.weightKg - standardWeight) * 10) / 10,
  }
}
