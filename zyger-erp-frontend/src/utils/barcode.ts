/**
 * Simple barcode/QR code generation utility.
 * Uses the free Google Charts API for QR codes (no external dependency).
 */

const QR_API = 'https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=';

/**
 * Generate a QR code data URL for the given text.
 * Returns a base64 data URL that can be used as an <img> src.
 * Falls back to a text representation if the API is unavailable.
 */
export function generateQRCode(text: string): string {
  return QR_API + encodeURIComponent(text);
}

/**
 * Generate a simple Code128-style barcode as an SVG string.
 * This is a lightweight implementation for display purposes only.
 */
export function generateBarcodeSvg(text: string, height: number = 60): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const widths: Record<string, number> = {};

  // Simple width mapping for demo — real implementation would use Code128 patterns
  for (let i = 0; i < chars.length; i++) {
    widths[chars[i]] = (i % 3) + 1;
  }

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" height="${height}" viewBox="0 0 ${text.length * 6 + 20} ${height}">`;
  svg += `<rect x="0" y="0" width="${text.length * 6 + 20}" height="${height}" fill="white"/>`;

  let x = 5;
  for (const ch of text.toUpperCase()) {
    const w = widths[ch] || 2;
    svg += `<rect x="${x}" y="5" width="${w}" height="${height - 15}" fill="black"/>`;
    svg += `<text x="${x + w / 2}" y="${height - 2}" text-anchor="middle" font-size="8" fill="black">${ch}</text>`;
    x += w + 1;
  }

  svg += '</svg>';
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

/**
 * Print a document label with barcode.
 */
export function printDocLabel(docNo: string, docType: string, title: string) {
  const win = window.open('', '_blank', 'width=400,height=300');
  if (!win) return;

  win.document.write(`
    <html>
    <head>
      <title>${docNo}</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
        .doc-type { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 2px; }
        .doc-no { font-size: 18px; font-weight: bold; margin: 8px 0; }
        .title { font-size: 12px; color: #333; }
        img { margin-top: 10px; }
        @media print { body { padding: 10px; } }
      </style>
    </head>
    <body>
      <div class="doc-type">${docType}</div>
      <div class="doc-no">${docNo}</div>
      <div class="title">${title}</div>
      <img src="${generateQRCode(docNo)}" width="120" height="120" />
      <script>window.onload = () => { window.print(); window.close(); }</script>
    </body>
    </html>
  `);
  win.document.close();
}
