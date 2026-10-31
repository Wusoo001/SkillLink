export default function Loading() {
  return (
    <div className="flex items-center justify-center py-20 text-inkMuted">
      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-3" />
      Loading…
    </div>
  );
}