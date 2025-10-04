import React from "react";
import { QRCodeCanvas } from "qrcode.react";

interface QRGeneratorProps {
  data: string;
  size?: number;
}

const QRGenerator: React.FC<QRGeneratorProps> = ({ data, size = 200 }) => {
  return (
    <div>
      {data && (
        <QRCodeCanvas 
          value={data} 
          size={size}
          level="H"
        />
      )}
    </div>
  );
};

export default QRGenerator;