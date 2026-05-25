'use client';

import React, { useState } from 'react';

export default function OnboardingForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    businessName: '',
    industry: '',
    targetAudience: '',
    brandVoice: '',
    tone: '',
    primaryCTA: '',
    productsServices: '',
    currentOffers: '',
    websiteUrl: '',
    keywords: '',
    categories: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Re-structure data for API if needed, keywords string to array
    const payload = {
       ...formData,
       keywords: formData.keywords.split(',').map(k => k.trim()),
       categories: formData.categories.split(',').map(c => c.trim()).filter(Boolean)
    };

    const response = await fetch('/api/business-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      window.location.href = '/dashboard';
    } else {
      const error = await response.json();
      alert('Failed to save profile: ' + (error.error || 'Unknown error'));
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-6">Business Onboarding - Step {step} of 3</h2>

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Business Name</label>
              <input type="text" name="businessName" value={formData.businessName} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Industry</label>
              <input type="text" name="industry" value={formData.industry} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Website URL</label>
              <input type="url" name="websiteUrl" value={formData.websiteUrl} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
            </div>
            <button type="button" onClick={nextStep} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">Next</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Target Audience</label>
              <input type="text" name="targetAudience" value={formData.targetAudience} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Brand Voice</label>
              <input type="text" name="brandVoice" value={formData.brandVoice} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tone</label>
              <input type="text" name="tone" value={formData.tone} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
            </div>
            <div className="flex space-x-2">
              <button type="button" onClick={prevStep} className="bg-gray-300 px-4 py-2 rounded-md hover:bg-gray-400">Back</button>
              <button type="button" onClick={nextStep} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Products & Services</label>
              <textarea name="productsServices" value={formData.productsServices} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Current Offers</label>
              <textarea name="currentOffers" value={formData.currentOffers} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Primary CTA</label>
              <input type="text" name="primaryCTA" value={formData.primaryCTA} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">News Keywords (comma separated)</label>
              <input type="text" name="keywords" value={formData.keywords} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
            </div>
            <div className="flex space-x-2">
              <button type="button" onClick={prevStep} className="bg-gray-300 px-4 py-2 rounded-md hover:bg-gray-400">Back</button>
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">Complete Onboarding</button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
