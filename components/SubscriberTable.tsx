'use strict';

import React from 'react';

interface Subscriber {
  id: string;
  email: string;
  firstName: string | null;
  status: string;
  subscribedAt: string | Date;
  tags: string[];
}

export default function SubscriberTable({ subscribers }: { subscribers: Subscriber[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead>
          <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
            <th className="py-3 px-6 text-left">Email</th>
            <th className="py-3 px-6 text-left">Name</th>
            <th className="py-3 px-6 text-center">Status</th>
            <th className="py-3 px-6 text-center">Date Joined</th>
            <th className="py-3 px-6 text-center">Tags</th>
          </tr>
        </thead>
        <tbody className="text-gray-600 text-sm font-light">
          {subscribers.map((s) => (
            <tr key={s.id} className="border-b border-gray-200 hover:bg-gray-100">
              <td className="py-3 px-6 text-left whitespace-nowrap">{s.email}</td>
              <td className="py-3 px-6 text-left">{s.firstName || '-'}</td>
              <td className="py-3 px-6 text-center">
                <span className={`py-1 px-3 rounded-full text-xs ${s.status === 'ACTIVE' ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'}`}>
                  {s.status}
                </span>
              </td>
              <td className="py-3 px-6 text-center">{new Date(s.subscribedAt).toLocaleDateString()}</td>
              <td className="py-3 px-6 text-center">
                {s.tags.map(t => <span key={t} className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded mr-1">{t}</span>)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
