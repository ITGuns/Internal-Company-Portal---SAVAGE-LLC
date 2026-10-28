"use client";

import React, { Suspense } from 'react';
import Header from '@/components/Header';
import ConcernsListView from '@/components/concerns/ConcernsListView';

export default function ConcernsPage() {
  return (
    <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
      <Header />
      <div className="p-4 pt-3 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-5xl">
          {/* useSearchParams (box, status, q in the URL) needs a Suspense boundary. */}
          <Suspense fallback={null}>
            <ConcernsListView />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
