import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import NewsletterDashboard from '@/components/NewsletterDashboard';

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

      <NewsletterDashboard initialJobs={businessProfile.newsletterJobs.map(j => ({
        ...j,
        createdAt: j.createdAt.toISOString()
      })) as any} />
    </div>
  );
}
