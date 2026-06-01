import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import SubscriberTable from '@/components/SubscriberTable';

export default async function SubscribersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/api/auth/signin');

  const businessProfile = await prisma.businessProfile.findFirst({
    where: { user: { email: session.user.email } },
    include: {
      subscribers: {
        orderBy: { subscribedAt: 'desc' },
      },
    },
  });

  if (!businessProfile) redirect('/onboard');

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Subscribers</h1>
        <div className="flex space-x-3">
           <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50">
             Import CSV (Upload)
           </button>
           <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
             Add Subscriber
           </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Add Subscriber</h2>
        <form className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="email" placeholder="Email" className="border border-gray-300 rounded-md p-2 text-sm" />
          <input type="text" placeholder="First Name" className="border border-gray-300 rounded-md p-2 text-sm" />
          <button type="submit" className="bg-indigo-600 text-white rounded-md p-2 text-sm font-medium">Add</button>
        </form>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <SubscriberTable subscribers={businessProfile.subscribers} />
      </div>
    </div>
  );
}
