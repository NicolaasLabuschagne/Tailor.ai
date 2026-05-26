import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import NewsletterPreview from '@/components/NewsletterPreview';
import StatusBadge from '@/components/StatusBadge';

export default async function NewslettersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/auth/signin');

  const businessProfile = await prisma.businessProfile.findFirst({
    where: { user: { email: session.user.email } },
    include: {
      newsletterJobs: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!businessProfile) redirect('/onboard');

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Newsletters</h1>
        <form action="/api/newsletters/generate" method="POST">
           <button type="submit" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
             Generate New
           </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4 overflow-y-auto max-h-[800px]">
          {businessProfile.newsletterJobs.map((job) => (
            <div key={job.id} className="bg-white shadow rounded-lg p-4 border border-gray-200 cursor-pointer hover:border-indigo-500 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <StatusBadge status={job.status} />
                <span className="text-xs text-gray-400">{new Date(job.createdAt).toLocaleDateString()}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-900 truncate">{job.subject || 'Untitled Newsletter'}</h3>
              <p className="text-xs text-gray-500 mt-1">{job.previewText || 'No preview available'}</p>
            </div>
          ))}
          {businessProfile.newsletterJobs.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500 text-sm">No newsletters yet. Click generate to start.</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {businessProfile.newsletterJobs[0] ? (
            <NewsletterPreview job={businessProfile.newsletterJobs[0]} />
          ) : (
             <div className="bg-gray-50 rounded-lg h-[600px] flex items-center justify-center text-gray-400 border border-gray-200">
               Select a newsletter to preview
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
