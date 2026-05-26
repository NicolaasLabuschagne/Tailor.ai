import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const businessProfile = await prisma.businessProfile.findFirst({
      where: { user: { email: session.user.email } }
    });

    if (!businessProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const [totalSent, totalSubscribers, approvalCount, rejectedCount] = await Promise.all([
      prisma.newsletterJob.count({ where: { businessProfileId: businessProfile.id, status: 'SENT' } }),
      prisma.subscriber.count({ where: { businessProfileId: businessProfile.id, status: 'ACTIVE' } }),
      prisma.newsletterJob.count({ where: { businessProfileId: businessProfile.id, status: 'SENT' } }), // Simplified
      prisma.newsletterJob.count({ where: { businessProfileId: businessProfile.id, status: 'REJECTED' } }),
    ]);

    // Mocking some time-series data based on real counts for the charts
    const chartData = [
      { name: 'Mon', sent: Math.floor(totalSent * 0.1), opens: Math.floor(totalSent * 0.05) },
      { name: 'Tue', sent: Math.floor(totalSent * 0.15), opens: Math.floor(totalSent * 0.08) },
      { name: 'Wed', sent: Math.floor(totalSent * 0.2), opens: Math.floor(totalSent * 0.12) },
      { name: 'Thu', sent: Math.floor(totalSent * 0.25), opens: Math.floor(totalSent * 0.15) },
      { name: 'Fri', sent: Math.floor(totalSent * 0.3), opens: Math.floor(totalSent * 0.2) },
    ];

    const approvalRate = totalSent + rejectedCount > 0
      ? Math.round((totalSent / (totalSent + rejectedCount)) * 100)
      : 100;

    return NextResponse.json({
      stats: [
        { label: 'Total Sent', value: totalSent },
        { label: 'Active Subscribers', value: totalSubscribers },
        { label: 'Approval Rate', value: `${approvalRate}%` },
        { label: 'Rejected', value: rejectedCount }
      ],
      chartData
    });
  } catch (error) {
    console.error('Analytics failed:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
