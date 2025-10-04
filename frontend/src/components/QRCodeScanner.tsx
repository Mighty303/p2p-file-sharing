import { X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useEffect } from 'react';

interface QRCodeScannerProps {
  isScanning: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
  scannerElementId: string;
}

export function QRCodeScanner({ 
  isScanning, 
  onClose, 
  onScan,
  scannerElementId 
}: QRCodeScannerProps) {
  useEffect(() => {
    const initScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode(scannerElementId);
        
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        };
        
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            console.log('QR Code detected:', decodedText);
            onScan(decodedText);
          },
          () => {
            // Ignore scanning errors (they happen frequently while scanning)
          }
        );

        return () => {
          html5QrCode.stop().catch(console.error);
        };
      } catch (err) {
        console.error('Error starting scanner:', err);
        alert('Could not access camera. Please check permissions.');
        onClose();
      }
    };

    if (isScanning) {
      initScanner();
    }
  }, [isScanning, onScan, onClose, scannerElementId]);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Scan QR Code</h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div className="relative bg-black rounded-lg overflow-hidden mb-4">
          <div id={scannerElementId} className="w-full"></div>
        </div>
        <p className="text-sm text-slate-400 text-center">
          Position the QR code within the frame to connect
        </p>
        {isScanning && (
          <div className="mt-3 flex items-center justify-center gap-2 text-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm">Scanning...</span>
          </div>
        )}
      </div>
    </div>
  );
}
