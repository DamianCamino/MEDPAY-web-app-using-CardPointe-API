export function SuccessScreen({ detail }: { detail: string }) {
  return (
    <div className="text-center py-10">
      <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 text-2xl flex items-center justify-center mx-auto mb-4">
        ✓
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Payment Successful</h2>
      <p className="text-sm text-gray-500">{detail}</p>
    </div>
  );
}
