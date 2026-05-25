import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/api/auth/signin');

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      businessProfile: {
        include: { newsSource: true }
      }
    }
  });

  if (!user?.businessProfile) redirect('/onboard');

  const profile = user.businessProfile;

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Settings</h1>

      <div className="space-y-8">
        <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Business Profile</h2>
            <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Business Name</label>
                <p className="mt-1 text-md text-gray-900">{profile.businessName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Industry</label>
                <p className="mt-1 text-md text-gray-900">{profile.industry}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">News Keywords</h2>
            <div className="flex flex-wrap gap-2">
              {profile.newsSource?.keywords.map((kw, i) => (
                <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                  {kw}
                  <button className="ml-2 text-indigo-400 hover:text-indigo-600">&times;</button>
                </span>
              ))}
              <button className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">
                + Add Keyword
              </button>
            </div>
          </div>

          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Notifications</h2>
            <div className="flex items-center">
              <input
                id="approval-emails"
                type="checkbox"
                defaultChecked={user.approvalEmailNotifications}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
              <label htmlFor="approval-emails" className="ml-2 block text-sm text-gray-900">
                Email me when a newsletter is ready for approval
              </label>
            </div>
          </div>

          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 text-red-600">Danger Zone</h2>
            <p className="text-sm text-gray-500 mb-4">Permanently delete your account and all associated data.</p>
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
