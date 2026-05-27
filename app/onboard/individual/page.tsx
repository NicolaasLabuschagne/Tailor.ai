'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AVAILABLE_TOPICS } from '@/lib/topics';
import { useSession } from 'next-auth/react';

export default function IndividualOnboarding() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    deliveryFrequency: 'daily',
    deliveryTime: '07:00',
    selectedTopics: [] as string[],
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin?callbackUrl=/onboard/individual');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!session) {
    return null;
  }

  const toggleTopic = (slug: string) => {
    setFormData(prev => ({
      ...prev,
      selectedTopics: prev.selectedTopics.includes(slug)
        ? prev.selectedTopics.filter(t => t !== slug)
        : [...prev.selectedTopics, slug]
    }));
  };

  const handleNext = () => {
    if (step === 1 && !formData.displayName) {
      setError('Display name is required');
      return;
    }
    if (step === 2 && formData.selectedTopics.length < 2) {
      setError('Select at least 2 topics');
      return;
    }
    setError('');
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/individual-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push('/dashboard/briefings');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create profile');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {s}
              </div>
              {s < 3 && <div className={`w-20 h-1 ${step > s ? 'bg-indigo-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">{error}</div>}

      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Personalize Your Briefing</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700">How should we address you?</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={e => setFormData({ ...formData, displayName: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="e.g. Alex"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Delivery Frequency</label>
            <select
              value={formData.deliveryFrequency}
              onChange={e => {
                console.log("Setting frequency to:", e.target.value);
                setFormData({ ...formData, deliveryFrequency: e.target.value });
              }}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly (Mondays)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Delivery Time (UTC)</label>
            <input
              type="time"
              value={formData.deliveryTime}
              onChange={e => setFormData({ ...formData, deliveryTime: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <button onClick={handleNext} className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700">
            Next: Choose Topics
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Choose Your Topics</h2>
          <p className="text-gray-500">Select at least 2 topics you want to stay informed about.</p>
          <div className="grid grid-cols-2 gap-4">
            {AVAILABLE_TOPICS.map(topic => (
              <div
                key={topic.slug}
                onClick={() => toggleTopic(topic.slug)}
                className={`cursor-pointer p-4 border rounded-lg transition-colors ${formData.selectedTopics.includes(topic.slug) ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
              >
                <div className="font-medium">{topic.label}</div>
              </div>
            ))}
          </div>
          <div className="flex space-x-4">
            <button onClick={() => setStep(1)} className="flex-1 border border-gray-300 py-2 rounded-md hover:bg-gray-50">Back</button>
            <button onClick={handleNext} className="flex-1 bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700">Next: Review</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Confirm Your Setup</h2>
          <div className="bg-gray-50 p-6 rounded-lg space-y-4">
            <div>
              <span className="text-gray-500 block text-sm">Name</span>
              <span className="font-medium">{formData.displayName}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-sm">Frequency</span>
              <span className="font-medium capitalize">{formData.deliveryFrequency} at {formData.deliveryTime} UTC</span>
            </div>
            <div>
              <span className="text-gray-500 block text-sm">Selected Topics</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.selectedTopics.map(slug => {
                  const topic = AVAILABLE_TOPICS.find(t => t.slug === slug);
                  return (
                    <span key={slug} className="bg-white border border-gray-200 px-3 py-1 rounded-full text-sm">
                      {topic?.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex space-x-4">
            <button onClick={() => setStep(2)} className="flex-1 border border-gray-300 py-2 rounded-md hover:bg-gray-50">Back</button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Setting up...' : 'Generate my first briefing'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
