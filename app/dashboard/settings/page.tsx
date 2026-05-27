import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import SettingsForm from '@/components/SettingsForm';
import Link from 'next/link';
import IngestionTester from '@/components/IngestionTester';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/auth/signin');

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      businessProfile: true
    }
  });

  if (!user?.businessProfile) redirect('/onboard');

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Settings</h1>

      <div className="space-y-8">
        <div className="bg-indigo-600 rounded-lg p-6 text-white flex justify-between items-center shadow-lg">
           <div>
             <h2 className="text-xl font-bold">Newsletter Design</h2>
             <p className="text-indigo-100 text-sm">Customize colors, fonts, and logos for your automated newsletters.</p>
           </div>
           <Link href="/dashboard/design" className="bg-white text-indigo-600 px-4 py-2 rounded-md font-medium hover:bg-indigo-50">
             Customize Design &rarr;
           </Link>
        </div>

        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Business Profile</h2>
          <SettingsForm initialProfile={user.businessProfile as any} />
          <IngestionTester />
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 text-red-600">Danger Zone</h2>
          <p className="text-sm text-gray-500 mb-4">Permanently delete your account and all associated data.</p>
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
