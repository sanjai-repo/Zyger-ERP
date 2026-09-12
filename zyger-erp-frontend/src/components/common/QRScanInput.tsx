import { useState, useRef } from 'react';

interface QRScanInputProps {
  label?: string;
  placeholder?: string;
  onScan: (value: string) => void;
  icon?: string;
}

export default function QRScanInput({ label, placeholder = 'Scan QR or type code…', onScan, icon = 'qr_code_scanner' }: QRScanInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    onScan(v);
    setValue('');
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit();
  };

  const startCamera = async () => {
    try {
      if (!('mediaDevices' in navigator) || !navigator.mediaDevices.getUserMedia) {
        alert('Camera not available on this device.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      video.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;max-width:90vw;max-height:80vh;border-radius:12px;border:3px solid #3b82f6;';

      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9998;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;';

      const hint = document.createElement('div');
      hint.textContent = 'Point camera at QR/barcode. Press Escape to cancel.';
      hint.style.cssText = 'color:#fff;font-size:14px;z-index:10000;text-align:center;';

      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✕ Close';
      closeBtn.style.cssText = 'z-index:10000;padding:8px 20px;border-radius:8px;border:none;background:#ef4444;color:#fff;font-size:14px;cursor:pointer;';

      overlay.appendChild(hint);
      overlay.appendChild(video);
      overlay.appendChild(closeBtn);
      document.body.appendChild(overlay);

      const stop = () => {
        stream.getTracks().forEach((t) => t.stop());
        overlay.remove();
      };

      closeBtn.onclick = stop;
      document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') stop(); }, { once: true });

      // Use BarcodeDetector if available
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39'] });
        const tick = async () => {
          if (!document.body.contains(overlay)) return;
          try {
            const barcodes = await detector.detect(video);
            if (barcodes.length > 0) {
              const decoded = barcodes[0].rawValue;
              onScan(decoded);
              stop();
              return;
            }
          } catch { /* ignore detection errors */ }
          requestAnimationFrame(tick);
        };
        video.onloadeddata = () => requestAnimationFrame(tick);
      } else {
        hint.textContent = 'QR scanning via camera requires BarcodeDetector API. Type the code manually instead.';
      }
    } catch {
      alert('Could not access camera. Please enter code manually.');
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {label && <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap', fontWeight: 500 }}>{label}</span>}
      <div style={{ flex: 1, position: 'relative' }}>
        <span className="material-symbols-rounded" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#6b7280' }}>{icon}</span>
        <input
          ref={inputRef}
          className="in"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          style={{ paddingLeft: 32 }}
        />
      </div>
      {value && (
        <button onClick={submit} className="btn btn-sm btn-p">Go</button>
      )}
      <button onClick={startCamera} className="btn btn-sm" title="Scan with camera">
        <span className="material-symbols-rounded" style={{ fontSize: 18 }}>photo_camera</span>
      </button>
    </div>
  );
}
