// 실행: npx tsx scripts/check-ui.mjs (tsx는 classic JSX라 React 전역 필요)
import assert from 'node:assert'
import React, { createElement as h } from 'react'
import { renderToStaticMarkup as r } from 'react-dom/server'
globalThis.React = React
const { Field, Row, Card, Result } = await import('../src/components/ui.tsx')
const f = r(h(Field, { label: 'a', value: 1, onChange() {} }))
assert(f.includes('border-b-2') && !/rounded|shadow/.test(f))
assert(r(h(Row, { label: 'a', value: '1' })).includes('tabular-nums'))
assert(!r(h(Card, { title: 't' }, 'x')).includes('shadow'))
assert(r(h(Result, { label: 'a', value: '1' })).includes('border-double'))
console.log('PASS')
