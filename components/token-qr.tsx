type TokenQrProps = {
  token?: string;
  hi?: boolean;
};

const GRID_SIZE = 29;
const QUIET_ZONE = 4;

function presentationPattern() {
  // Decorative QR-style geometry only. It intentionally carries no payload.
  let seed = 0x4d4d4954;
  const squares: string[] = [];
  const finders = [[0, 0], [GRID_SIZE - 7, 0], [0, GRID_SIZE - 7]];

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const finder = finders.find(([left, top]) =>
        x >= left - 1 && x <= left + 7 && y >= top - 1 && y <= top + 7
      );

      let filled: boolean;

      if (finder) {
        const dx = x - finder[0];
        const dy = y - finder[1];
        filled =
          dx >= 0 &&
          dx <= 6 &&
          dy >= 0 &&
          dy <= 6 &&
          (dx === 0 ||
            dx === 6 ||
            dy === 0 ||
            dy === 6 ||
            (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
      } else if (x >= 20 && x <= 24 && y >= 20 && y <= 24) {
        const dx = x - 20;
        const dy = y - 20;
        filled =
          dx === 0 ||
          dx === 4 ||
          dy === 0 ||
          dy === 4 ||
          (dx === 2 && dy === 2);
      } else if (x === 8 || y === 8) {
        // Keep QR format-information bands empty so scanners cannot treat this
        // decorative pattern as an authorization or encoded record.
        filled = false;
      } else {
        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;
        filled = (seed >>> 0) % 2 === 0;
      }

      if (filled) {
        squares.push(`M${x + QUIET_ZONE},${y + QUIET_ZONE}h1v1h-1z`);
      }
    }
  }

  return squares.join("");
}

const QR_PATH = presentationPattern();

export function TokenQr({ hi = false }: TokenQrProps) {
  const label = hi ? "टोकन QR" : "Token QR";
  const size = GRID_SIZE + QUIET_ZONE * 2;

  return (
    <figure className="token-qr">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width="148"
        height="148"
        role="img"
        aria-label={label}
        focusable="false"
        shapeRendering="crispEdges"
      >
        <rect width={size} height={size} fill="#ffffff" />
        <path d={QR_PATH} fill="#143c2b" />
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
