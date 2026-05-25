import OnboardingForm from '@/components/OnboardingForm';

export default function OnboardPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Welcome to Tailor</h1>
        <p className="mt-2 text-gray-600">Let's set up your business profile to start generating newsletters.</p>
      </div>
      <OnboardingForm />
    </div>
  );
}
