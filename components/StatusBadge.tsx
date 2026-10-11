export default function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-700',
    GENERATING: 'bg-blue-100 text-blue-800',
    AWAITING_APPROVAL: 'bg-amber-100 text-amber-800',
    APPROVED: 'bg-sky-100 text-sky-800',
    SENT: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
    READY: 'bg-green-100 text-green-800',
  };

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}
