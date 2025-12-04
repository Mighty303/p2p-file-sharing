// NetworkDiagnostics.tsx
import { useEffect, useState } from 'react';

export function NetworkDiagnostics() {
  const [hasIPv6, setHasIPv6] = useState<boolean | null>(null);
  const [localAddresses, setLocalAddresses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkIPv6 = async () => {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
          ]
        });
        const addresses: string[] = [];
        let foundIPv6 = false;
        
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const candidate = event.candidate.candidate;
            // Extract IP address from candidate string
            const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+|[0-9a-f:]+)/i);
            if (ipMatch && ipMatch[1]) {
              const ip = ipMatch[1];
              // Check if it's IPv6 (contains colons but not IPv4-mapped)
              if (ip.includes(':') && !ip.includes('.')) {
                foundIPv6 = true;
                addresses.push(ip);
              } else if (!ip.includes(':')) {
                addresses.push(ip);
              }
            }
          }
        };
        
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') {
            setHasIPv6(foundIPv6);
            setLocalAddresses([...new Set(addresses)]);
            setIsLoading(false);
            pc.close();
          }
        };
        
        pc.createDataChannel('test');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        // Fallback timeout
        setTimeout(() => {
          if (pc.iceGatheringState !== 'complete') {
            setHasIPv6(foundIPv6);
            setLocalAddresses([...new Set(addresses)]);
            setIsLoading(false);
            pc.close();
          }
        }, 3000);
      } catch (err) {
        console.error('IPv6 check failed:', err);
        setIsLoading(false);
      }
    };
    
    checkIPv6();
  }, []);

  return (
    <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4 text-sm">
      <h3 className="font-semibold text-slate-300 mb-2">🌐 Network Diagnostics</h3>
      <div className="space-y-2 text-slate-400">
        <div className="flex items-center gap-2">
          <span>IPv6 Support:</span>
          {isLoading ? (
            <span className="text-yellow-400">🔍 Detecting...</span>
          ) : hasIPv6 ? (
            <span className="text-green-400">✅ Available (Preferred)</span>
          ) : (
            <span className="text-orange-400">⚠️ Not detected (Using IPv4)</span>
          )}
        </div>
        
        {localAddresses.length > 0 && (
          <div>
            <div className="mb-1">Detected addresses:</div>
            <ul className="ml-4 space-y-1">
              {localAddresses.map((addr, i) => {
                const isIPv6 = addr.includes(':');
                return (
                  <li 
                    key={i} 
                    className={`font-mono text-xs flex items-center gap-2 ${
                      isIPv6 ? 'text-green-400' : 'text-blue-400'
                    }`}
                  >
                    <span className="inline-block w-12">
                      {isIPv6 ? 'IPv6' : 'IPv4'}
                    </span>
                    <span className="truncate" title={addr}>
                      {addr.length > 35 ? addr.substring(0, 35) + '...' : addr}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        
        {!isLoading && localAddresses.length === 0 && (
          <div className="text-slate-500 text-xs">
            No local addresses detected
          </div>
        )}
      </div>
    </div>
  );
}