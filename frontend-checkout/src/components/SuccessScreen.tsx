export function SuccessScreen({ detail }: { detail: string }) {
  return (
    <div className="text-center py-10">
      <div className="w-16 h-16 rounded-full bg-green-50 border border-green-100 text-green-500 text-3xl flex items-center justify-center mx-auto mb-5 shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Payment Successful</h2>
      <p className="text-sm text-gray-400 max-w-xs mx-auto">{detail}</p>
    </div>
  );
}
