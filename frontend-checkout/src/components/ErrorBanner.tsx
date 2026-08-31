export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-3 mb-4" role="alert">
      {message}
    </div>
  );
}
