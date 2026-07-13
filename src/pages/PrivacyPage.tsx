import { pageContent } from '../lib/pageContent'

export default function PrivacyPage() {
  const paras: string[] = pageContent.privacy.intro

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">개인정보처리방침</h1>
      {paras.map((p, i) => (
        <p key={i} className="mt-4 text-sm leading-relaxed text-slate-600">
          {p}
        </p>
      ))}
    </div>
  )
}
