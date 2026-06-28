export default function ReplayLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header Skeleton */}
      <header className="border-b border-zinc-800 bg-zinc-900 px-6 py-3 flex items-center gap-3">
        <div className="h-5 w-24 animate-pulse rounded bg-zinc-800" />
        <span className="text-zinc-700">·</span>
        <div className="h-4 w-24 animate-pulse rounded bg-zinc-800" />
        <div className="ml-auto h-4 w-20 animate-pulse rounded bg-zinc-800" />
      </header>

      <div className="mx-auto max-w-4xl p-6">
        {/* Scrubber Skeleton */}
        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="size-9 animate-pulse rounded-full bg-blue-500/20" />
            <div className="h-5 w-32 animate-pulse rounded bg-zinc-800" />
            <div className="ml-auto h-4 w-12 animate-pulse rounded bg-zinc-800" />
          </div>
          <div className="h-2 w-full animate-pulse rounded-full bg-zinc-800" />
          <div className="relative mt-2 h-2 flex gap-1">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-2 w-1 rounded-full bg-zinc-800 animate-pulse" style={{ marginLeft: `${i * 0.8}%` }} />
            ))}
          </div>
        </div>

        {/* Event Timeline Skeleton */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="border-b border-zinc-800 px-4 py-3">
            <div className="h-4 w-32 animate-pulse rounded bg-zinc-800" />
          </div>
          <div className="divide-y divide-zinc-800">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-4">
                <div className="size-6 animate-pulse rounded-md bg-zinc-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-800/50" />
                </div>
                <div className="h-3 w-10 animate-pulse rounded bg-zinc-800" />
              </div>
            ))}
          </div>
        </div>

        {/* Share Skeleton */}
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
          <div className="h-3 w-20 animate-pulse rounded bg-zinc-800" />
          <div className="h-3 flex-1 animate-pulse rounded bg-zinc-800/50" />
          <div className="h-8 w-16 animate-pulse rounded bg-blue-500/20" />
        </div>
      </div>
    </div>
  );
}
