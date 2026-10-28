"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import ConcernDetailView from '@/components/concerns/ConcernDetailView';

export default function ConcernPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id || '';

  return (
    <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
      <Header />
      <div className="p-4 pt-3 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          <ConcernDetailView key={id} id={id} />
        </div>
      </div>
    </main>
  );
}
