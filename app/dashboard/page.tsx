import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/api/auth/signin');

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      businessProfile: {
        include: {
          _count: {
            select: { subscribers: { where: { status: 'ACTIVE' } } }
          },
          newsletterJobs: {
            where: { status: 'APPROVED', scheduledAt: { gte: new Date() } },
            orderBy: { scheduledAt: 'asc' },
            take: 1,
          }
        }
      },
      individualProfile: {
        include: {
          briefings: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      },
    },
  });

  if (!user || (!user.businessProfile && !user.individualProfile)) {
    redirect('/get-started');
  }

  const newslettersSentThisMonth = user.businessProfile
    ? await prisma.newsletterJob.count({
        where: {
          businessProfileId: user.businessProfile.id,
          status: 'SENT',
          sentAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })
    : 0;

  const nextNewsletter = user.businessProfile?.newsletterJobs[0];
  const lastBriefing = user.individualProfile?.briefings[0];

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Dashboard Overview</h1>

      <div className={user.businessProfile && user.individualProfile ? "grid grid-cols-1 md:grid-cols-2 gap-8" : "space-y-8"}>
        {user.businessProfile && (
          <div className="bg-white shadow rounded-lg p-6 border border-gray-100">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Business Newsletter Summary</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-indigo-50 p-4 rounded-md">
                <p className="text-sm text-indigo-600 font-medium">Sent This Month</p>
                <p className="text-2xl font-bold text-indigo-900">{newslettersSentThisMonth}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-md">
                <p className="text-sm text-green-600 font-medium">Active Subscribers</p>
                <p className="text-2xl font-bold text-green-900">{user.businessProfile._count.subscribers}</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-1">Next Scheduled Send</p>
              <p className="text-md font-medium text-gray-900">
                {nextNewsletter ? nextNewsletter.scheduledAt?.toLocaleString() : 'None scheduled'}
              </p>
            </div>

            <Link
              href="/dashboard/newsletters"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Generate newsletter now
            </Link>
          </div>
        )}

        {user.individualProfile && (
          <div className="bg-white shadow rounded-lg p-6 border border-gray-100">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Personal Briefing Summary</h2>
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-1">Last Briefing Sent</p>
              {lastBriefing ? (
                <div>
                  <p className="text-md font-medium text-gray-900 truncate">{lastBriefing.subject}</p>
                  <p className="text-xs text-gray-400">{lastBriefing.sentAt?.toLocaleString() || lastBriefing.createdAt.toLocaleString()}</p>
                </div>
              ) : (
                <p className="text-md font-medium text-gray-900">None sent yet</p>
              )}
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-1">Delivery Frequency</p>
              <p className="text-md font-medium text-gray-900 capitalize">
                {user.individualProfile.deliveryFrequency} at {user.individualProfile.deliveryTime} UTC
              </p>
            </div>

            <Link
              href="/dashboard/briefings"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Go to briefings
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
