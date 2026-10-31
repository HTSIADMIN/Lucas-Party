import { useMemo } from "react";
import qrcode from "qrcode-generator";

/** QR code drawn as rounded SVG modules so it matches the sticker look. */
export function QrCode({ value, size = 200, className }: { value: string; size?: number; className?: string }) {
  const { count, cells } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    const dark: [number, number][] = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) dark.push([r, c]);
    return { count: n, cells: dark };
  }, [value]);
  const pad = 3;
  const total = count + pad * 2;
  return (
    <svg viewBox={`0 0 ${total} ${total}`} width={size} height={size} className={`qr ${className ?? ""}`} role="img" aria-label={`QR code for ${value}`}>
      <rect width={total} height={total} rx={3} fill="#fff" />
      {cells.map(([r, c]) => (
        <rect key={`${r}-${c}`} x={c + pad + 0.06} y={r + pad + 0.06} width={0.88} height={0.88} rx={0.28} fill="#1B1033" />
      ))}
    </svg>
  );
}
