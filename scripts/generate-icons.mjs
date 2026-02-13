import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '../public');

function createIconSvg(size) {
  const padding = Math.round(size * 0.12);
  const cornerRadius = Math.round(size * 0.15);
  const camperBodyY = Math.round(size * 0.35);
  const camperHeight = Math.round(size * 0.32);
  const camperWidth = Math.round(size * 0.62);
  const camperX = Math.round((size - camperWidth) / 2);
  const cabinWidth = Math.round(size * 0.18);
  const cabinX = camperX + camperWidth;
  const cabinTopY = Math.round(size * 0.42);
  const wheelRadius = Math.round(size * 0.055);
  const wheelY = camperBodyY + camperHeight;
  const wheel1X = camperX + Math.round(camperWidth * 0.22);
  const wheel2X = camperX + camperWidth - Math.round(camperWidth * 0.08);
  const windowSize = Math.round(size * 0.09);
  const windowGap = Math.round(size * 0.04);
  const windowY = camperBodyY + Math.round(camperHeight * 0.18);
  const windowStartX = camperX + Math.round(size * 0.06);
  const roofRackY = camperBodyY - Math.round(size * 0.03);
  const roofRackHeight = Math.round(size * 0.03);
  const checkX = Math.round(size * 0.5);
  const checkY = Math.round(size * 0.78);
  const checkSize = Math.round(size * 0.09);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${cornerRadius}" fill="#1a5c2a"/>

  <!-- Roof rack -->
  <rect x="${camperX + Math.round(size * 0.05)}" y="${roofRackY}" width="${camperWidth - Math.round(size * 0.1)}" height="${roofRackHeight}" rx="${Math.round(size * 0.01)}" fill="#ffffff" opacity="0.6"/>

  <!-- Camper body -->
  <rect x="${camperX}" y="${camperBodyY}" width="${camperWidth}" height="${camperHeight}" rx="${Math.round(size * 0.025)}" fill="#ffffff"/>

  <!-- Cabin -->
  <path d="M${cabinX} ${camperBodyY + camperHeight} L${cabinX} ${cabinTopY} Q${cabinX + cabinWidth} ${cabinTopY - Math.round(size * 0.02)} ${cabinX + cabinWidth} ${cabinTopY + Math.round(size * 0.06)} L${cabinX + cabinWidth} ${camperBodyY + camperHeight} Z" fill="#e8e8e8"/>

  <!-- Cabin windshield -->
  <path d="M${cabinX + Math.round(size * 0.02)} ${cabinTopY + Math.round(size * 0.03)} Q${cabinX + cabinWidth - Math.round(size * 0.02)} ${cabinTopY + Math.round(size * 0.01)} ${cabinX + cabinWidth - Math.round(size * 0.02)} ${cabinTopY + Math.round(size * 0.08)} L${cabinX + cabinWidth - Math.round(size * 0.02)} ${camperBodyY + camperHeight - Math.round(size * 0.06)} L${cabinX + Math.round(size * 0.02)} ${camperBodyY + camperHeight - Math.round(size * 0.06)} Z" fill="#87CEEB" opacity="0.7"/>

  <!-- Windows -->
  <rect x="${windowStartX}" y="${windowY}" width="${windowSize}" height="${windowSize}" rx="${Math.round(size * 0.01)}" fill="#87CEEB" opacity="0.8"/>
  <rect x="${windowStartX + windowSize + windowGap}" y="${windowY}" width="${windowSize}" height="${windowSize}" rx="${Math.round(size * 0.01)}" fill="#87CEEB" opacity="0.8"/>
  <rect x="${windowStartX + 2 * (windowSize + windowGap)}" y="${windowY}" width="${windowSize}" height="${windowSize}" rx="${Math.round(size * 0.01)}" fill="#87CEEB" opacity="0.8"/>

  <!-- Door -->
  <rect x="${windowStartX + Math.round(size * 0.01)}" y="${windowY + windowSize + Math.round(size * 0.03)}" width="${Math.round(size * 0.12)}" height="${Math.round(size * 0.1)}" rx="${Math.round(size * 0.01)}" fill="#e0e0e0"/>

  <!-- Undercarriage -->
  <rect x="${camperX - Math.round(size * 0.01)}" y="${wheelY}" width="${camperWidth + cabinWidth + Math.round(size * 0.02)}" height="${Math.round(size * 0.025)}" rx="${Math.round(size * 0.01)}" fill="#333333"/>

  <!-- Wheels -->
  <circle cx="${wheel1X}" cy="${wheelY + Math.round(size * 0.025)}" r="${wheelRadius}" fill="#333333"/>
  <circle cx="${wheel1X}" cy="${wheelY + Math.round(size * 0.025)}" r="${Math.round(wheelRadius * 0.5)}" fill="#666666"/>
  <circle cx="${wheel2X}" cy="${wheelY + Math.round(size * 0.025)}" r="${wheelRadius}" fill="#333333"/>
  <circle cx="${wheel2X}" cy="${wheelY + Math.round(size * 0.025)}" r="${Math.round(wheelRadius * 0.5)}" fill="#666666"/>

  <!-- Checkmark circle -->
  <circle cx="${checkX}" cy="${checkY}" r="${Math.round(checkSize * 1.3)}" fill="#ffffff" opacity="0.95"/>
  <circle cx="${checkX}" cy="${checkY}" r="${Math.round(checkSize * 1.1)}" fill="#22c55e"/>
  <polyline points="${checkX - Math.round(checkSize * 0.5)},${checkY} ${checkX - Math.round(checkSize * 0.1)},${checkY + Math.round(checkSize * 0.4)} ${checkX + Math.round(checkSize * 0.55)},${checkY - Math.round(checkSize * 0.35)}" fill="none" stroke="#ffffff" stroke-width="${Math.round(size * 0.018)}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

const sizes = [192, 512];

for (const size of sizes) {
  const svg = createIconSvg(size);

  // Save SVG
  const svgBuffer = Buffer.from(svg);

  // Convert to PNG
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(resolve(publicDir, `icon-${size}.png`));

  console.log(`✅ Generated icon-${size}.png`);
}

// Also create a 180x180 apple touch icon
const appleSvg = createIconSvg(180);
await sharp(Buffer.from(appleSvg))
  .resize(180, 180)
  .png()
  .toFile(resolve(publicDir, 'apple-touch-icon.png'));

console.log('✅ Generated apple-touch-icon.png');
console.log('Done!');
