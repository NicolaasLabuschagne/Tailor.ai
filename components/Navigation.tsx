import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export default async function Navigation() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      businessProfile: true,
      individualProfile: true,
    },
  });

  if (!user) return null;

  const hasBusiness = !!user.businessProfile;
  const hasIndividual = !!user.individualProfile;

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-indigo-600">
                Tailor
              </Link>
            </div>

            <div className="hidden sm:ml-6 sm:flex sm:space-x-8 items-center">
              {hasBusiness && (
                <>
                  <Link href="/dashboard" className="text-gray-900 px-3 py-2 text-sm font-medium">
                    Dashboard
                  </Link>
                  <Link href="/dashboard/newsletters" className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium">
                    Newsletters
                  </Link>
                  <Link href="/dashboard/subscribers" className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium">
                    Subscribers
                  </Link>
                  <Link href="/dashboard/design" className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium">
                    Design
                  </Link>
                  <Link href="/dashboard/analytics" className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium">
                    Analytics
                  </Link>
                  <Link href="/dashboard/settings" className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium">
                    Settings
                  </Link>
                </>
              )}

              {hasBusiness && hasIndividual && (
                <div className="h-6 w-px bg-gray-200 mx-4" />
              )}

              {hasIndividual && (
                <>
                  <Link href="/dashboard/briefings" className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium">
                    My Briefings
                  </Link>
                  <Link href="/dashboard/briefings/settings" className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium">
                    Briefing Settings
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-4">{session.user.name || session.user.email}</span>
            <Link href="/api/auth/signout" className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
              Sign out
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
