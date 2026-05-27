import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function BriefingsDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/api/auth/signin');

  const profile = await prisma.individualProfile.findFirst({
    where: { user: { email: session.user.email } },
    include: {
      briefings: {
        orderBy: { createdAt: 'desc' },
      }
    }
  });

  if (!profile) redirect('/onboard/individual');

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-500 text-sm font-medium flex items-center">
          &larr; Back to Dashboard
        </Link>
      </div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">My Personal Briefings</h1>
        <div className="text-sm text-gray-500">
          Scheduled: {profile.deliveryFrequency} at {profile.deliveryTime} UTC
        </div>
      </div>

      {profile.briefings.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <p className="text-gray-500 mb-4">No briefings generated yet.</p>
          <p className="text-sm text-gray-400">Your first briefing will appear here soon.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {profile.briefings.map((briefing) => (
              <li key={briefing.id}>
                <Link href={`/dashboard/briefings/${briefing.id}`} className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {briefing.subject || 'Generating Briefing...'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {briefing.sentAt ? `Sent ${new Date(briefing.sentAt).toLocaleString()}` : `Scheduled for ${new Date(briefing.scheduledAt).toLocaleString()}`}
                      </p>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        briefing.status === 'SENT' ? 'bg-green-100 text-green-800' :
                        briefing.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        briefing.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {briefing.status}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
