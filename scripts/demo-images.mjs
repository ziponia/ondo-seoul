// 데모 상품·기획전 이미지(SVG 자리표시)를 만든다 — `node scripts/demo-images.mjs`
// 사진 대신 색 면 + 옷 실루엣이다. 실제 상점에 연결하면 쓰이지 않는다.
import { mkdirSync, writeFileSync } from "node:fs";

const SHAPES = {
  coat: "M150 70 L200 60 L250 70 L300 110 L285 330 L250 330 L250 400 L150 400 L150 330 L115 330 L100 110 Z",
  padding:
    "M140 90 L200 75 L260 90 L305 130 L290 290 L110 290 L95 130 Z M110 170 H290 M110 230 H290",
  knit: "M140 90 L200 80 L260 90 L310 140 L285 170 L265 155 L265 320 L135 320 L135 155 L115 170 L90 140 Z",
  shirt:
    "M145 85 L200 100 L255 85 L305 135 L280 165 L262 150 L262 330 L138 330 L138 150 L120 165 L95 135 Z",
  hood: "M150 100 Q200 40 250 100 L305 140 L280 170 L262 155 L262 320 L138 320 L138 155 L120 170 L95 140 Z",
  pants: "M140 80 H260 L275 400 H215 L200 170 L185 400 H125 Z",
  dress: "M165 70 H235 L250 150 L300 400 H100 L150 150 Z",
  bag: "M120 170 H280 L295 340 H105 Z M160 170 Q200 80 240 170",
  shoes: "M90 270 Q150 230 210 250 L300 270 Q320 300 300 310 H95 Q80 295 90 270 Z",
  muffler: "M150 60 H210 V300 L240 400 H190 L170 320 H150 Z",
  cap: "M110 230 Q200 120 290 230 Z M260 225 Q320 235 330 255 H250 Z",
  wallet: "M110 160 H290 V300 H110 Z M110 200 H290",
};

const PRODUCTS = {
  "coat-charcoal": ["#2A2826", "coat"],
  "padding-navy": ["#3B3F45", "padding"],
  "coat-camel": ["#BFAF9A", "coat"],
  "knit-ivory": ["#E9E4DC", "knit"],
  "denim-blue": ["#C9D2DC", "pants"],
  "bag-brown": ["#5B4A3C", "bag"],
  "slacks-greige": ["#B9B4AC", "pants"],
  "loafer-tan": ["#A9825A", "shoes"],
  "hood-oat": ["#D9D4CC", "hood"],
  "muffler-oat": ["#E4DAC9", "muffler"],
  "shirt-blue": ["#DCE1E6", "shirt"],
  "dress-brown": ["#8E7A66", "dress"],
  "cap-khaki": ["#4A5240", "cap"],
  "liner-olive": ["#5E6A5A", "padding"],
  "coat-grey": ["#C9C2B6", "coat"],
  "wallet-brown": ["#6B4A34", "wallet"],
};

const COLLECTIONS = {
  "col-winter-outer": "#2A2826",
  "col-knit-week": "#E9E4DC",
  "col-denim-guide": "#C9D2DC",
  "col-office-edit": "#B9B4AC",
  "col-editor-pick": "#4A5240",
};

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function product(tone, shape) {
  const ink = luminance(tone) > 0.5 ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.10)";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="800" height="1000"><title>데모 상품 이미지</title><rect width="400" height="500" fill="${tone}"/><path d="${SHAPES[shape]}" transform="translate(0 30)" fill="${ink}" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/></svg>\n`;
}

function collection(tone) {
  const ink = luminance(tone) > 0.5 ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000"><title>데모 기획전 이미지</title><rect width="1600" height="1000" fill="${tone}"/><circle cx="1180" cy="420" r="320" fill="${ink}"/><rect x="980" y="560" width="420" height="300" fill="${ink}"/></svg>\n`;
}

mkdirSync("public/demo/products", { recursive: true });
mkdirSync("public/demo/collections", { recursive: true });
for (const [name, [tone, shape]] of Object.entries(PRODUCTS)) {
  writeFileSync(`public/demo/products/${name}.svg`, product(tone, shape));
}
for (const [name, tone] of Object.entries(COLLECTIONS)) {
  writeFileSync(`public/demo/collections/${name}.svg`, collection(tone));
}
