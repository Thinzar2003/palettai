"use client";

/**
 * Renders a logo symbol: the selected AI icon (sanitised SVG from the API) or,
 * if there is none, a monogram badge.
 */
export default function BrandIcon({
  svg,
  monogram,
  color,
  onColor,
  font,
  size,
}: {
  svg?: string | null;
  monogram: string;
  color: string;
  onColor: string;
  font: string;
  size: number;
}) {
  if (svg) {
    return (
      <span
        aria-hidden
        className="inline-block [&>svg]:h-full [&>svg]:w-full"
        style={{ width: size, height: size }}
        // The backend rebuilds every icon from a strict whitelist (app/svg.py) before storing it.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center rounded-full font-bold"
      style={{ width: size, height: size, background: color, color: onColor, fontSize: size * 0.4, fontFamily: `'${font}', sans-serif` }}
    >
      {monogram}
    </span>
  );
}

export function selectedIconSvg(kit: { icons?: { svg: string }[]; selected_icon?: number | null }): string | null {
  if (kit.selected_icon == null) return null;
  return kit.icons?.[kit.selected_icon]?.svg ?? null;
}
