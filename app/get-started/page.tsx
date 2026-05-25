import Link from 'next/link';

export default function GetStartedPage() {
  return (
    <div className="bg-gray-50 min-h-[calc(100vh-64px)] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-4xl">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          How would you like to use Tailor?
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          You can set up both. They use the same account.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-4xl">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 px-4 sm:px-0">
          {/* Card 1 — Tailor for Business */}
          <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mb-4 mx-auto">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Tailor for Business</h3>
              <p className="text-gray-500 text-center mb-6">
                Automated branded newsletters for your audience. Turn news into marketing.
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-gray-600">AI-written in your brand voice</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-gray-600">One-click approval and send</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-gray-600">Subscriber management included</span>
                </li>
              </ul>
            </div>
            <div className="bg-gray-50 px-6 py-4">
              <Link
                href="/onboard"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Set up my business &rarr;
              </Link>
            </div>
          </div>

          {/* Card 2 — Tailor for Individuals */}
          <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mb-4 mx-auto">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Tailor for Individuals</h3>
              <p className="text-gray-500 text-center mb-6">
                Your personal executive news briefing, delivered daily or weekly.
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-gray-600">20 topics to choose from</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-gray-600">Concise, intelligent summaries</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-gray-600">Delivered to your inbox</span>
                </li>
              </ul>
            </div>
            <div className="bg-gray-50 px-6 py-4">
              <Link
                href="/onboard/individual"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Set up my briefing &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
