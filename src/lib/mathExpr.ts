/**
 * 일반 계산기 수식 계산 — eval 없이 재귀하강 파서로 직접 계산한다(입력이 코드로 실행되지 않음).
 * - 우선순위: 괄호 → 함수·√ → 거듭제곱(^, 오른쪽 결합) → 단항 −/+ → × ÷ → + −
 *   (-2^2 = -4, 2^3^2 = 512, 2^-1 = 0.5)
 * - 퍼센트: 단독이면 /100(50% = 0.5), 곱셈·나눗셈 피연산자도 /100(200*10% = 20),
 *   덧셈·뺄셈의 오른쪽 피연산자는 왼쪽 값의 비율(200+10% = 220, 200-10% = 180)
 * - 결과는 유효숫자 12자리로 정리해 0.1+0.2 = 0.3 처럼 보이게 한다.
 */

export class MathError extends Error {}

type Node =
  | { t: 'num'; v: number }
  | { t: 'neg'; a: Node }
  | { t: 'pct'; a: Node }
  | { t: 'bin'; op: '+' | '-' | '*' | '/' | '^'; a: Node; b: Node }
  | { t: 'fn'; name: 'sqrt' | 'abs'; a: Node }

type Tok = { k: 'num'; v: number; c?: true } | { k: 'op'; v: string } | { k: 'id'; v: string }

const MAX_LEN = 200

function tokenize(src: string, ans: number): Tok[] {
  const s = src
    .replace(/,/g, '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–]/g, '-')
  if (s.length > MAX_LEN) throw new MathError(`식이 너무 깁니다(최대 ${MAX_LEN}자).`)
  const toks: Tok[] = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (c === ' ' || c === '\t') {
      i++
    } else if (/[0-9.]/.test(c)) {
      const m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i))
      if (!m) throw new MathError('숫자 형식이 올바르지 않습니다.')
      toks.push({ k: 'num', v: Number(m[0]) })
      i += m[0].length
      if (s[i] === '.') throw new MathError('숫자 형식이 올바르지 않습니다.')
    } else if ('+-*/^%()'.includes(c)) {
      toks.push({ k: 'op', v: c })
      i++
    } else if (c === '√') {
      toks.push({ k: 'id', v: 'sqrt' })
      i++
    } else if (c === 'π') {
      toks.push({ k: 'num', v: Math.PI, c: true })
      i++
    } else if (/[a-zA-Z가-힣]/.test(c)) {
      const m = /^[a-zA-Z가-힣]+/.exec(s.slice(i))!
      const w = m[0].toLowerCase()
      i += m[0].length
      if (w === 'pi') toks.push({ k: 'num', v: Math.PI, c: true })
      else if (w === 'e') toks.push({ k: 'num', v: Math.E, c: true })
      else if (w === 'ans') toks.push({ k: 'num', v: ans, c: true })
      else if (w === 'sqrt' || w === 'abs') toks.push({ k: 'id', v: w })
      else throw new MathError(`알 수 없는 문자: ${m[0]}`)
    } else {
      throw new MathError(`사용할 수 없는 문자: ${c}`)
    }
  }
  return toks
}

function parse(toks: Tok[]): Node {
  let p = 0
  const isOp = (v: string) => toks[p]?.k === 'op' && toks[p].v === v
  // 암묵적 곱셈은 ( 함수 상수(π e Ans) 앞에서만 — 일반 숫자끼리(2 3)는 오류
  const startsImplicit = () => {
    const t = toks[p]
    return !!t && (t.k === 'id' || (t.k === 'op' && t.v === '(') || (t.k === 'num' && !!t.c))
  }

  function expr(): Node {
    let a = term()
    while (isOp('+') || isOp('-')) {
      const op = (toks[p++] as { v: '+' | '-' }).v
      a = { t: 'bin', op, a, b: term() }
    }
    return a
  }
  function term(): Node {
    let a = unary()
    for (;;) {
      if (isOp('*') || isOp('/')) {
        const op = (toks[p++] as { v: '*' | '/' }).v
        a = { t: 'bin', op, a, b: unary() }
      } else if (startsImplicit()) {
        // 암묵적 곱셈: 2(3+4), 2π, 3sqrt(4)
        a = { t: 'bin', op: '*', a, b: unary() }
      } else break
    }
    return a
  }
  function unary(): Node {
    if (isOp('-')) {
      p++
      return { t: 'neg', a: unary() }
    }
    if (isOp('+')) {
      p++
      return unary()
    }
    return power()
  }
  function power(): Node {
    const base = postfix()
    if (isOp('^')) {
      p++
      return { t: 'bin', op: '^', a: base, b: unary() } // 오른쪽 결합, 지수에 단항 − 허용
    }
    return base
  }
  function postfix(): Node {
    let a = primary()
    while (isOp('%')) {
      p++
      a = { t: 'pct', a }
    }
    return a
  }
  function primary(): Node {
    const t = toks[p]
    if (!t) throw new MathError('식이 완성되지 않았습니다.')
    if (t.k === 'num') {
      p++
      return { t: 'num', v: t.v }
    }
    if (t.k === 'id') {
      p++
      const name = t.v as 'sqrt' | 'abs'
      if (isOp('(')) {
        p++
        const a = expr()
        if (!isOp(')')) throw new MathError('괄호가 닫히지 않았습니다.')
        p++
        return { t: 'fn', name, a }
      }
      return { t: 'fn', name, a: power() } // √9, √(2+7)
    }
    if (t.v === '(') {
      p++
      const a = expr()
      if (!isOp(')')) throw new MathError('괄호가 닫히지 않았습니다.')
      p++
      return a
    }
    throw new MathError(t.v === ')' ? '여는 괄호 없이 닫는 괄호가 있습니다.' : '연산자 위치가 올바르지 않습니다.')
  }

  const tree = expr()
  if (p < toks.length) {
    throw new MathError(isOp(')') ? '여는 괄호 없이 닫는 괄호가 있습니다.' : '식을 해석할 수 없습니다.')
  }
  return tree
}

function ev(n: Node): number {
  switch (n.t) {
    case 'num':
      return n.v
    case 'neg':
      return -ev(n.a)
    case 'pct':
      return ev(n.a) / 100
    case 'fn': {
      const x = ev(n.a)
      if (n.name === 'abs') return Math.abs(x)
      if (x < 0) throw new MathError('음수의 제곱근은 계산할 수 없습니다.')
      return Math.sqrt(x)
    }
    case 'bin': {
      const a = ev(n.a)
      if ((n.op === '+' || n.op === '-') && n.b.t === 'pct') {
        const r = (a * ev(n.b.a)) / 100 // 200+10% → 200 + 20
        return n.op === '+' ? a + r : a - r
      }
      const b = ev(n.b)
      if (n.op === '+') return a + b
      if (n.op === '-') return a - b
      if (n.op === '*') return a * b
      if (n.op === '/') {
        if (b === 0) throw new MathError('0으로 나눌 수 없습니다.')
        return a / b
      }
      if (a < 0 && !Number.isInteger(b)) throw new MathError('음수의 소수 거듭제곱은 계산할 수 없습니다.')
      if (a === 0 && b < 0) throw new MathError('0의 음수 거듭제곱은 계산할 수 없습니다.')
      return Math.pow(a, b)
    }
  }
}

/** 12자리 유효숫자로 정리(0.1+0.2 → 0.3) */
const tidy = (x: number) => (x === 0 ? 0 : Number(x.toPrecision(12)))

/** 수식을 계산한다. 실패하면 MathError(한국어 메시지)를 던진다. */
export function evaluate(expression: string, ans = 0): number {
  if (expression.trim() === '') throw new MathError('식을 입력하세요.')
  const x = ev(parse(tokenize(expression, ans)))
  if (!Number.isFinite(x)) throw new MathError('결과가 너무 크거나 계산할 수 없습니다.')
  return tidy(x)
}

/** 화면 표시용: 정수부 3자리 콤마, 매우 크거나 작은 수는 지수 표기 */
export function formatResult(x: number): string {
  if (x === 0) return '0'
  const a = Math.abs(x)
  if (a >= 1e15 || a < 1e-9) return x.toExponential().replace('e+', 'e')
  const [int, frac] = String(tidy(x)).split('.')
  const sign = int.startsWith('-') ? '-' : ''
  const digits = int.replace('-', '').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return sign + digits + (frac ? `.${frac}` : '')
}
