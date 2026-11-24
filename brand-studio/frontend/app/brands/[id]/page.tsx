"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import BrandWorkspace from "@/components/BrandWorkspace";
import RequireAuth from "@/components/RequireAuth";
import Spinner from "@/components/Spinner";

export default function BrandPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <RequireAuth>
      <Suspense fallback={<Spinner />}>
        <BrandWorkspace key={id} id={Number(id)} />
      </Suspense>
    </RequireAuth>
  );
}
