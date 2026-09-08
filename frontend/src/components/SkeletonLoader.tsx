export function SkeletonLoader() {
  return (
    <div className="animate-pulse flex items-center gap-2">
      <div className="w-6 h-6 bg-gray-700 rounded-full"></div>
      <div className="text-sm text-gray-400">Computing...</div>
    </div>
  );
}
