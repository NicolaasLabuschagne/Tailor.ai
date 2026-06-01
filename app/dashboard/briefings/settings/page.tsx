import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { AVAILABLE_TOPICS } from '@/lib/topics';

export default async function BriefingSettings() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/api/auth/signin');

  const profile = await prisma.individualProfile.findFirst({
    where: { user: { email: session.user.email } },
    include: { topics: true }
  });

  if (!profile) redirect('/onboard/individual');

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Briefing Settings</h1>

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Delivery Preference</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Frequency</label>
            <p className="mt-1 text-md text-gray-900 capitalize font-medium">{profile.deliveryFrequency}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Time (UTC)</label>
            <p className="mt-1 text-md text-gray-900 font-medium">{profile.deliveryTime}</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Your Topics</h2>
        <div className="flex flex-wrap gap-2">
          {profile.topics.map(topic => (
            <span key={topic.id} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-4 py-2 rounded-full text-sm font-medium">
              {topic.label}
            </span>
          ))}
        </div>
        <div className="mt-6 pt-6 border-t border-gray-100">
           <p className="text-sm text-gray-500 italic">Editing topics coming soon in the next version.</p>
        </div>
      </div>
    </div>
  );
}
