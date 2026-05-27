import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import TemplateCustomizer from '@/components/TemplateCustomizer';
import Link from 'next/link';

export default async function TemplateSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/auth/signin');

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      businessProfile: {
        include: { template: true }
      }
    }
  });

  if (!user?.businessProfile) redirect('/onboard');

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/dashboard/settings" className="text-indigo-600 hover:text-indigo-500 text-sm font-medium flex items-center">
          &larr; Back to Settings
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Newsletter Design</h1>
      <TemplateCustomizer initialTemplate={user.businessProfile.template} />
    </div>
  );
}
