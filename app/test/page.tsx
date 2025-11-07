'use client'

export default function EnvTestPage() {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6">🔍 Environment Check</h1>
        
        <div className="space-y-4">
          <div className={`p-4 rounded ${hasUrl ? 'bg-green-100' : 'bg-red-100'}`}>
            <h2 className="font-bold">NEXT_PUBLIC_SUPABASE_URL:</h2>
            {hasUrl ? (
              <>
                <p className="text-green-700">✅ Set</p>
                <code className="text-xs block mt-2 p-2 bg-white rounded">
                  {process.env.NEXT_PUBLIC_SUPABASE_URL}
                </code>
              </>
            ) : (
              <p className="text-red-700">❌ NOT SET</p>
            )}
          </div>

          <div className={`p-4 rounded ${hasKey ? 'bg-green-100' : 'bg-red-100'}`}>
            <h2 className="font-bold">NEXT_PUBLIC_SUPABASE_ANON_KEY:</h2>
            {hasKey ? (
              <>
                <p className="text-green-700">✅ Set</p>
                <code className="text-xs block mt-2 p-2 bg-white rounded break-all">
                  {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 50)}...
                </code>
              </>
            ) : (
              <p className="text-red-700">❌ NOT SET</p>
            )}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded">
            <h3 className="font-bold mb-2">📋 Expected Values:</h3>
            <ul className="text-sm space-y-1">
              <li>URL: https://tpaczpfczbznmabtcpxe.supabase.co</li>
              <li>Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</li>
            </ul>
          </div>

          {(!hasUrl || !hasKey) && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded">
              <h3 className="font-bold text-red-900 mb-2">❌ Problem gefunden!</h3>
              <p className="text-sm text-red-800">
                Environment Variables sind nicht in Vercel gesetzt oder der Build ist alt.
              </p>
              <ol className="text-sm text-red-800 mt-2 list-decimal list-inside">
                <li>Gehe zu Vercel Settings → Environment Variables</li>
                <li>Setze alle 3 Variables für ALLE Environments</li>
                <li>Redeploy über Deployments → ... → Redeploy</li>
              </ol>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <a 
            href="/"
            className="inline-block bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700"
          >
            ← Zurück zum Login
          </a>
        </div>
      </div>
    </div>
  )
}
