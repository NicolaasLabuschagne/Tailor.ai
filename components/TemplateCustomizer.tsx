'use client';

import React, { useState } from 'react';

interface Template {
  primaryColor: string;
  secondaryColor: string;
  fontHeader: string;
  fontBody: string;
  logoUrl: string | null;
}

interface Props {
  initialTemplate: Template | null;
}

export default function TemplateCustomizer({ initialTemplate }: Props) {
  const [template, setTemplate] = useState<Template>(initialTemplate || {
    primaryColor: '#1a1a1a',
    secondaryColor: '#ffffff',
    fontHeader: 'Arial, sans-serif',
    fontBody: 'Georgia, Times New Roman, serif',
    logoUrl: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setTemplate({ ...template, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/newsletter-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      });
      if (res.ok) setMessage('Template saved!');
      else setMessage('Failed to save.');
    } catch (err) {
      setMessage('Error saving.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 border-b pb-4">Brand Styles</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Primary Color</label>
            <div className="mt-1 flex items-center space-x-2">
              <input type="color" name="primaryColor" value={template.primaryColor} onChange={handleChange} className="h-10 w-10 border-0 p-0" />
              <input type="text" value={template.primaryColor} readOnly className="text-xs text-gray-500 bg-gray-50 border rounded px-2 py-1" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Secondary Color</label>
            <div className="mt-1 flex items-center space-x-2">
              <input type="color" name="secondaryColor" value={template.secondaryColor} onChange={handleChange} className="h-10 w-10 border-0 p-0" />
              <input type="text" value={template.secondaryColor} readOnly className="text-xs text-gray-500 bg-gray-50 border rounded px-2 py-1" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Header Font</label>
          <select name="fontHeader" value={template.fontHeader} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2">
            <option value="Arial, sans-serif">Arial (Modern)</option>
            <option value="'Helvetica Neue', Helvetica, sans-serif">Helvetica</option>
            <option value="'Trebuchet MS', sans-serif">Trebuchet</option>
            <option value="serif">Standard Serif</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Body Font</label>
          <select name="fontBody" value={template.fontBody} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2">
            <option value="Georgia, Times New Roman, serif">Georgia (Classic)</option>
            <option value="'Times New Roman', Times, serif">Times New Roman</option>
            <option value="Arial, sans-serif">Arial</option>
            <option value="system-ui, sans-serif">System Default</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Logo URL (Optional)</label>
          <input type="text" name="logoUrl" value={template.logoUrl || ''} onChange={handleChange} placeholder="https://..." className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>

        <div className="flex items-center space-x-4 pt-4">
          <button type="submit" disabled={isSaving} className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50">
            {isSaving ? 'Saving...' : 'Save Design'}
          </button>
          {message && <span className="text-sm font-medium text-green-600">{message}</span>}
        </div>
      </form>

      <div className="bg-gray-100 rounded-lg p-8 flex flex-col items-center">
        <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 tracking-widest text-center">Live Preview</h3>
        <div style={{ backgroundColor: template.secondaryColor, fontFamily: template.fontBody, maxWidth: '400px' }} className="shadow-2xl rounded border overflow-hidden">
           <div style={{ backgroundColor: template.primaryColor }} className="p-4 text-center">
              {template.logoUrl ? <img src={template.logoUrl} className="h-8 mx-auto" /> : <div style={{ fontFamily: template.fontHeader, color: '#fff' }} className="font-bold text-lg">YOUR LOGO</div>}
           </div>
           <div className="p-6">
              <h1 style={{ fontFamily: template.fontHeader, color: template.primaryColor }} className="text-xl font-bold mb-4 line-height-tight">Sample Headline Story</h1>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">This is a preview of how your brand colors and typography will look in your newsletters. The Groq engine will use these settings to style every newsletter we generate for you.</p>
              <div style={{ backgroundColor: template.primaryColor, color: '#fff' }} className="rounded px-4 py-2 text-center text-sm font-bold inline-block">Call to Action →</div>
           </div>
        </div>
      </div>
    </div>
  );
}
