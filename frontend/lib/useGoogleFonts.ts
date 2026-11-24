"use client";

import { useEffect } from "react";

// These families only ship a single weight; asking Google for 700 would fail the request.
const SINGLE_WEIGHT = new Set(["Pacifico", "Bebas Neue", "Archivo Black", "Righteous", "DM Serif Display"]);

/** Load Google Fonts on demand, one <link> per family so one bad family can't block the rest. */
export function useGoogleFonts(families: string[]) {
  const key = families.join("|");
  useEffect(() => {
    families.forEach((family) => {
      const id = `gf-${family.replace(/\s+/g, "-").toLowerCase()}`;
      if (document.getElementById(id)) return;
      const weights = SINGLE_WEIGHT.has(family) ? "" : ":wght@400;600;700";
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, "+")}${weights}&display=swap`;
      document.head.appendChild(link);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
