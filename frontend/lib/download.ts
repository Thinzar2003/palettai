/** Small browser helpers for exporting brand assets. */

export function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function downloadText(text: string, filename: string, type = "text/plain") {
  downloadBlob(new Blob([text], { type }), filename);
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

/** Rasterise an SVG string to a PNG of `size` × `size` pixels. */
export async function svgToPng(svg: string, size = 1024, background?: string): Promise<Blob> {
  const sized = svg.replace("<svg", `<svg width="${size}" height="${size}"`);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sized)}`;
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not render the SVG"));
    img.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.drawImage(img, 0, 0, size, size);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG export failed"))), "image/png"),
  );
}

const escapeXml = (s: string) =>
  s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);

/** Horizontal logo lockup: icon + brand name, as a standalone SVG file. */
export function lockupSvg(iconSvg: string, name: string, font: string, color: string): string {
  const fontSize = 64;
  const width = Math.round(190 + name.length * fontSize * 0.6);
  const icon = iconSvg.replace("<svg", '<svg x="20" y="20" width="120" height="120"');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 160" width="${width}" height="160">` +
    icon +
    `<text x="164" y="102" font-family="'${escapeXml(font)}', sans-serif" font-size="${fontSize}" ` +
    `font-weight="700" fill="${escapeXml(color)}">${escapeXml(name)}</text></svg>`
  );
}

export function slugFile(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "brand";
}
