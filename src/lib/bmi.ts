/**
 * BMI(체질량지수) 및 표준체중 계산 — 대한비만학회 기준(아시아·태평양 기준) 체중 구간
 */

export interface BmiInput {
  heightCm: number
  weightKg: number
}

export function calcBmi(i: BmiInput) {
  const heightM = i.heightCm / 100
  const raw = heightM > 0 && i.weightKg > 0 ? i.weightKg / (heightM * heightM) : NaN
  // 표시값(소수 첫째 자리)과 분류 기준값을 동일하게 — 반올림한 BMI로 분류
  const bmi = Math.round(raw * 10) / 10
  const standardWeight = heightM * heightM * 22

  const category = !Number.isFinite(bmi)
    ? '입력값을 확인하세요'
    : bmi < 18.5
      ? '저체중'
      : bmi < 23
        ? '정상'
        : bmi < 25
          ? '비만 전단계(과체중)'
          : bmi < 30
            ? '1단계 비만'
            : bmi < 35
              ? '2단계 비만'
              : '3단계 비만(고도비만)'

  return {
    bmi,
    standardWeight: Math.round(standardWeight * 10) / 10,
    category,
    diffFromStandard: Math.round((i.weightKg - standardWeight) * 10) / 10,
  }
}
