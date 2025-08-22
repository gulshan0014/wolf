'use client'

import React from 'react'
import { AlertCircle } from 'lucide-react'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-4">{error?.message || 'An unexpected error occurred.'}</p>
        <div className="flex justify-center space-x-3">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try again
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  )
}
