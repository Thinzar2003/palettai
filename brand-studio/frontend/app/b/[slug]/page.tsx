"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import BrandReveal from "@/components/BrandReveal";
import Spinner from "@/components/Spinner";
import { api } from "@/lib/api";
import type { PublicBrand } from "@/lib/types";

/** Public, read-only brand page that owners can share with clients. */
export default function PublicBrandPage() {
  const { slug } = useParams<{ slug: string }>();
  const [brand, setBrand] = useState<PublicBrand | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.publicBrand(slug).then(setBrand).catch((e) => setError(e.message));
  }, [slug]);

  if (error) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <p className="text-5xl">🔒</p>
        <p className="mt-4 text-lg">{error}</p>
        <Link href="/" className="mt-4 inline-block text-studio-accent underline">
          Go to BrandStudio
        </Link>
      </div>
    );
  }
  if (!brand) return <Spinner label="Loading brand…" />;

  return (
    <>
      <p className="mx-auto mb-8 max-w-5xl text-xs uppercase tracking-[0.25em] text-black/40">Brand guidelines</p>
      <BrandReveal kit={brand.kit} />
      <div className="mx-auto max-w-5xl rounded-3xl bg-studio-ink p-8 text-center text-white">
        <p className="font-display text-2xl font-bold">Made with BrandStudio</p>
        <p className="mt-1 text-white/60">Create a brand like this for your business, free.</p>
        <Link href="/register" className="mt-5 inline-block rounded-full bg-studio-accent px-6 py-3 font-semibold">
          Create my brand ✨
        </Link>
      </div>
    </>
  );
}
