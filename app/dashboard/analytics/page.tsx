'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // In a real app, fetch from /api/analytics
    // Mocking for now as per instructions
    setData({
      stats: [
        { label: 'Total Sent', value: 124 },
        { label: 'Open Rate', value: '24.5%' },
        { label: 'Click Rate', value: '3.2%' },
        { label: 'Approval Rate', value: '92%' }
      ],
      chartData: [
        { name: 'Mon', sent: 12, opens: 8 },
        { name: 'Tue', sent: 19, opens: 12 },
        { name: 'Wed', sent: 15, opens: 10 },
        { name: 'Thu', sent: 22, opens: 18 },
        { name: 'Fri', sent: 30, opens: 21 },
        { name: 'Sat', sent: 10, opens: 5 },
        { name: 'Sun', sent: 16, opens: 12 },
      ]
    });
  }, []);

  if (!data) return <div className="p-8">Loading analytics...</div>;

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Analytics Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {data.stats.map((stat: any, i: number) => (
          <div key={i} className="bg-white shadow rounded-lg p-6">
            <p className="text-sm font-medium text-gray-500 truncate">{stat.label}</p>
            <p className="mt-1 text-3xl font-semibold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Newsletter Engagement</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sent" stroke="#4f46e5" />
                <Line type="monotone" dataKey="opens" stroke="#10b981" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Subscriber Growth</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sent" fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
