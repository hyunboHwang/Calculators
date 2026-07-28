/**
 * 자동차 취득세 추정
 * - 비영업용 승용 7%, 영업용 4%, 경차 4%
 * - 경차 감면 한도 등 세부 감면은 반영하지 않음
 */

export type VehicleType = 'nonBusiness' | 'business' | 'lightCar'

const RATES: Record<VehicleType, number> = {
  nonBusiness: 7,
  business: 4,
  lightCar: 4,
}

export interface CarAcquisitionTaxInput {
  price: number // 차량가액
  vehicleType: VehicleType
}

export function calcCarAcquisitionTax(i: CarAcquisitionTaxInput) {
  const rate = RATES[i.vehicleType]
  const tax = i.price * (rate / 100)
  return { rate, tax: Math.round(tax) }
}
