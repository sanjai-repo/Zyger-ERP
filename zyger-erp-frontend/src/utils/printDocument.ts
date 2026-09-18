function authHeaders(): HeadersInit {
  const token = localStorage.getItem('zyger-access-token') || sessionStorage.getItem('zyger-access-token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function filenameFromDisposition(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return match ? decodeURIComponent(match[1]) : fallback;
}

// Sales Invoice and all Delivery Challans print as 3 labelled copies
// (ORIGINAL / DUPLICATE / TRIPLICATE) in a single PDF via ?copies=3.
const COPIES_PATH = /\/(sales-invoice|sales-dc|delivery-challan)\//;

function withCopies(url: string): string {
  if (!COPIES_PATH.test(url)) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}copies=3`;
}

export function printDocument(url: string, mode: 'print' | 'download' = 'print') {
  const targetUrl = mode === 'print' ? withCopies(url) : url;
  fetch(targetUrl, { headers: authHeaders() })
    .then((res) => {
      if (!res.ok) throw new Error(`Print/download failed (${res.status})`);
      return res.blob().then((blob) => ({ blob, disposition: res.headers.get('content-disposition') }));
    })
    .then(({ blob, disposition }) => {
      const blobUrl = URL.createObjectURL(blob);

      if (mode === 'download') {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filenameFromDisposition(disposition, 'document.pdf');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        return;
      }

      const win = window.open(blobUrl);
      if (win) {
        win.onload = () => {
          win.print();
        };
      }
    })
    .catch((err) => {
      console.error('printDocument failed:', err);
      window.alert('Could not open the document for print/download. Please try again.');
    });
}
