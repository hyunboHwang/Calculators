// 일반 계산기 수식 파서 자체 검증: node scripts/check-mathExpr.mjs
import assert from 'node:assert/strict'
import { evaluate, formatResult, MathError } from '../src/lib/mathExpr.ts'

const ok = [
  ['1+2*3', 7], ['(1+2)*3', 9], ['2^3^2', 512], ['-2^2', -4], ['(-2)^2', 4], ['2^-1', 0.5],
  ['0.1+0.2', 0.3], ['0.3-0.1', 0.2], ['1/3*3', 1], ['10/4', 2.5], ['7-3-2', 2], ['2*3/4', 1.5],
  ['200+10%', 220], ['200-10%', 180], ['200*10%', 20], ['50%', 0.5], ['100/50%', 200], ['10%+10%', 0.11],
  ['(3+4)*2^3/5', 11.2], ['√9', 3], ['√(2+7)', 3], ['sqrt(16)+abs(-3)', 7], ['abs(-4.5)', 4.5],
  ['π', 3.14159265359], ['2π', Number((2 * Math.PI).toPrecision(12))], ['e', 2.71828182846], ['2(3+4)', 14], ['(1+2)(3+4)', 21],
  ['1,000+2,500', 3500], ['1.5e', Number((1.5 * Math.E).toPrecision(12))], ['6×7', 42], ['8÷2', 4], ['9−4', 5],
  ['  1 +  1 ', 2], ['--3', 3], ['+5', 5], ['((2))', 2], ['2^0.5', Number(Math.SQRT2.toPrecision(12))], ['0^0', 1],
  ['1000000*1000000', 1e12], ['0.000001*0.001', 1e-9], ['3%*200', 6], ['(100+50%)', 150],
]
for (const [expr, want] of ok) assert.equal(evaluate(expr), want, `${expr} → ${evaluate(expr)} (기대 ${want})`)
assert.equal(evaluate('Ans*2', 21), 42)

const bad = ['', '1/0', '1/(2-2)', '(1+2', '1+2)', '1+', '*3', '2**3', '√(-4)', '(-8)^0.5', '0^-1', 'abc', '1..2', '1.2.3', '2 3', '9^9^9', '1+@']
for (const expr of bad) assert.throws(() => evaluate(expr), MathError, `${expr} 는 오류여야 함`)
assert.throws(() => evaluate('1+'.repeat(150) + '1'), MathError)

assert.equal(formatResult(1234567.891), '1,234,567.891')
assert.equal(formatResult(-1234), '-1,234')
assert.equal(formatResult(0.5), '0.5')
assert.equal(formatResult(0), '0')
assert.equal(formatResult(1e20), '1e20')
assert.equal(formatResult(1e-12), '1e-12')
assert.equal(formatResult(evaluate('0.1+0.2')), '0.3')
console.log(`OK — 정상 ${ok.length + 1}건, 오류 ${bad.length + 1}건, 표시 형식 7건`)
