/**
 * Skeleton for the property page. Also gives the route its Suspense boundary, so
 * listings that weren't prerendered (e.g. added from admin later) render on demand.
 */
export default function Loading() {
  return (
    <div className="pt-16 lg:pt-[72px]" aria-busy="true" aria-label="Loading property">
      <div className="container-app animate-pulse">
        <div className="my-3 h-4 w-56 rounded bg-subtle" />
        <div className="grid gap-6 pb-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_460px]">
          <div className="flex flex-col gap-3 lg:flex-row-reverse">
            <div className="aspect-[4/3] flex-1 rounded-[24px] bg-subtle sm:aspect-[3/2] lg:aspect-auto lg:h-[min(540px,calc(100dvh-240px))]" />
            <div className="flex gap-2 lg:w-[84px] lg:flex-col">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="aspect-[4/3] w-20 rounded-xl bg-subtle lg:w-full" />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <div className="h-5 w-16 rounded-full bg-subtle" />
              <div className="h-5 w-20 rounded-full bg-subtle" />
            </div>
            <div className="h-9 w-4/5 rounded-xl bg-subtle" />
            <div className="h-4 w-48 rounded bg-subtle" />
            <div className="h-20 rounded-2xl bg-subtle" />
            <div className="h-32 rounded-2xl bg-subtle" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-11 rounded-full bg-subtle" />
              <div className="h-11 rounded-full bg-subtle" />
              <div className="col-span-2 h-11 rounded-full bg-subtle" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
