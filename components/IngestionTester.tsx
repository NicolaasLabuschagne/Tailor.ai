'use client';

import React, { useState } from 'react';

export default function IngestionTester() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testIngestion = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/debug/test-ingestion');
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: 'Failed to connect to API' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 pt-8 border-t border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Ingestion Diagnostics</h3>
      <p className="text-sm text-gray-500 mb-4">Test your current keywords against our news sources to see what would be included in your next newsletter.</p>

      <button
        onClick={testIngestion}
        disabled={loading}
        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        {loading ? 'Testing sources...' : 'Test my news sources'}
      </button>

      {result && !result.error && (
        <div className="mt-6 space-y-4">
           {result.articlesFound >= 3 ? (
             <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700 font-bold">Found {result.articlesFound} articles. Your keywords are working.</p>
             </div>
           ) : result.articlesFound > 0 ? (
             <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-700 font-bold">Only found {result.articlesFound} articles. Consider broadening your keywords.</p>
             </div>
           ) : (
             <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700 font-bold">No articles found. Try adding more keywords or check your API keys are set correctly.</p>
                <div className="mt-2">
                  <p className="text-xs text-red-600 font-medium uppercase tracking-wider">Searched Keywords:</p>
                  <p className="text-sm text-red-800 italic">{result.expandedKeywords.join(', ')}</p>
                </div>
             </div>
           )}

           {result.topArticles.length > 0 && (
             <div className="bg-white border rounded-md overflow-hidden">
                <ul className="divide-y divide-gray-200">
                  {result.topArticles.map((a: any, i: number) => (
                    <li key={i} className="p-3 text-sm">
                      <span className="font-medium text-gray-900">{a.title}</span>
                      <div className="flex space-x-2 mt-1">
                        <span className="text-xs text-gray-400">{a.source}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-400">{new Date(a.publishedAt).toLocaleDateString()}</span>
                      </div>
                    </li>
                  ))}
                </ul>
             </div>
           )}
        </div>
      )}

      {result?.error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md text-sm">
          {result.error}
        </div>
      )}
    </div>
  );
}
