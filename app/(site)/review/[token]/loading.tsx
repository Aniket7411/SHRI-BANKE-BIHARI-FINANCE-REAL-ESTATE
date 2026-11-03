/** Suspense boundary for the review page (it reads the link's token at request time). */
export default function Loading() {
  return (
    <section className="container-app flex min-h-[80dvh] items-start justify-center pt-24 pb-16 sm:pt-28" aria-busy="true">
      <div className="h-[520px] w-full max-w-lg animate-pulse rounded-[28px] bg-subtle" />
    </section>
  );
}
