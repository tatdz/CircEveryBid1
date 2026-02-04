// app/page.tsx
'use client' // Add this to make it a Client Component

import dynamic from 'next/dynamic'

const ClientPage = dynamic(() => import('./client-page'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
})

export default function Home() {
  return <ClientPage />
}