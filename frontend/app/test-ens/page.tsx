// app/test-ens/page.tsx
import TestENSReader from '@/components/TestENSReader'

export default function TestENSPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">🧪 Test ENS Reader</h1>
        <p className="text-slate-400 mb-8">
          Test if ENS text records are readable for your auction subdomains.
        </p>
        
        <TestENSReader />
      </div>
    </div>
  )
}