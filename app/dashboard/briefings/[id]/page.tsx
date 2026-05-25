import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';

export default async function BriefingPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/api/auth/signin');

  const briefing = await prisma.briefing.findUnique({
    where: { id: params.id },
    include: {
      profile: {
        include: { user: true }
      }
    }
  });

  if (!briefing || briefing.profile.user.email !== session.user.email) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/dashboard/briefings" className="text-indigo-600 hover:text-indigo-500 text-sm font-medium flex items-center">
          &larr; Back to all briefings
        </Link>
        <div className="flex space-x-2">
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

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h1 className="text-xl font-bold text-gray-900">{briefing.subject || 'Preview'}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {briefing.sentAt ? `Sent on ${new Date(briefing.sentAt).toLocaleString()}` : `Scheduled for ${new Date(briefing.scheduledAt).toLocaleString()}`}
          </p>
        </div>

        <div className="p-0 h-[800px]">
          {briefing.htmlContent ? (
            <iframe
              srcDoc={briefing.htmlContent}
              className="w-full h-full border-none"
              title="Briefing Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 italic">
              Briefing content is being generated or is not yet available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
