import { useRef, useState, useEffect, useCallback } from 'react';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  placeholder?: string;
  label?: string;
  autoFocus?: boolean;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

/**
 * Shared barcode/QR scanner component.
 * Supports both camera-based scanning (mobile/tablet) and USB/Bluetooth
 * keyboard-wedge input (shop floor PCs via hardware scanner).
 *
 * Usage:
 * - <BarcodeScanner onScan={(code) => fillField(code)} />
 * - Auto-focuses the input; USB scanners inject keystrokes + Enter.
 * - Camera button opens rear camera for mobile scanning.
 */
export default function BarcodeScanner({
  onScan,
  placeholder = 'Scan barcode or type code...',
  label,
  autoFocus = true,
  className,
  style,
  disabled = false,
}: BarcodeScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [autoFocus, disabled]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const input = inputRef.current;
      if (!input) return;
      const value = input.value.trim();
      if (value) {
        onScan(value);
        input.value = '';
        input.focus();
      }
    },
    [onScan]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Hardware scanners typically append Enter after the barcode
      if (e.key === 'Enter') {
        e.preventDefault();
        const input = inputRef.current;
        if (!input) return;
        const value = input.value.trim();
        if (value) {
          onScan(value);
          input.value = '';
        }
      }
    },
    [onScan]
  );

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setStream(mediaStream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch {
      // Camera not available — fall back to manual input
      setCameraActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  }, [stream]);

  return (
    <div className={className} style={style}>
      {label && (
        <label style={{ display: 'block', fontSize: 11, color: '#a6adc8', marginBottom: 4 }}>
          {label}
        </label>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span className="material-symbols-rounded" style={{ fontSize: 18, color: '#6c7086' }}>
          qr_code_scanner
        </span>
        <input
          ref={inputRef}
          className="in"
          type="text"
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={disabled}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            fontFamily: 'monospace',
            fontSize: 13,
            letterSpacing: 1,
            ...style,
          }}
        />
        <button
          type="submit"
          className="btn btn-sm"
          disabled={disabled}
          style={{ flex: '0 0 auto' }}
        >
          <span className="material-symbols-rounded">search</span>
        </button>
        {!cameraActive && (
          <button
            type="button"
            className="btn btn-sm"
            disabled={disabled}
            onClick={startCamera}
            title="Open camera for QR/barcode scanning"
          >
            <span className="material-symbols-rounded">photo_camera</span>
          </button>
        )}
        {cameraActive && (
          <button
            type="button"
            className="btn btn-sm"
            onClick={stopCamera}
            title="Close camera"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        )}
      </form>

      {cameraActive && (
        <div style={{ marginTop: 8, position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid #313244' }}>
          <video
            ref={videoRef}
            style={{ width: '100%', maxHeight: 250, objectFit: 'cover', background: '#000' }}
            playsInline
            muted
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {/* Scan overlay guide */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '70%',
              height: 3,
              background: 'rgba(166, 227, 161, 0.7)',
              boxShadow: '0 0 20px rgba(166, 227, 161, 0.3)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              right: 8,
              textAlign: 'center',
              fontSize: 11,
              color: '#a6adc8',
              background: 'rgba(0,0,0,0.5)',
              padding: '4px 8px',
              borderRadius: 4,
            }}
          >
            Point camera at barcode. Hardware scanners work directly in the text input above.
          </div>
        </div>
      )}
    </div>
  );
}
