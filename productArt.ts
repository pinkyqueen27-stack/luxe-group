// 沒有設定商品圖片網址時,產生一張香檳金線條的精品示意圖(SVG data URI)。
// 這樣不需要任何外部圖檔,也不會有圖片版權或連結失效的問題。
import type { Product } from '../types';

type ArtKind = 'bottle' | 'box' | 'jar' | 'bag';

function pickKind(product: Product): ArtKind {
  const text = `${product.name}${product.unit}${product.category}`;
  if (/油|瓶|酒|液/.test(text)) return 'bottle';
  if (/蠟燭|罐|香氛/.test(text)) return 'jar';
  if (/袋|豆|包/.test(text)) return 'bag';
  return 'box';
}

function shapes(kind: ArtKind): string {
  const gold = '#c9a96e';
  switch (kind) {
    case 'bottle':
      return `<path d="M176 70h48v34c0 10 22 22 22 52v96a14 14 0 0 1-14 14h-64a14 14 0 0 1-14-14v-96c0-30 22-42 22-52z" fill="none" stroke="${gold}" stroke-width="3"/><rect x="172" y="56" width="56" height="14" rx="3" fill="none" stroke="${gold}" stroke-width="3"/><rect x="164" y="170" width="72" height="56" fill="none" stroke="${gold}" stroke-width="2"/>`;
    case 'jar':
      return `<rect x="140" y="110" width="120" height="116" rx="14" fill="none" stroke="${gold}" stroke-width="3"/><rect x="150" y="90" width="100" height="20" rx="4" fill="none" stroke="${gold}" stroke-width="3"/><path d="M200 126c-10 14 10 18 0 34 14-8 14-24 0-34z" fill="none" stroke="${gold}" stroke-width="2.5"/>`;
    case 'bag':
      return `<path d="M148 92h104l14 134a10 10 0 0 1-10 12H144a10 10 0 0 1-10-12z" fill="none" stroke="${gold}" stroke-width="3"/><path d="M148 92c0-20 104-20 104 0" fill="none" stroke="${gold}" stroke-width="3"/><circle cx="200" cy="168" r="20" fill="none" stroke="${gold}" stroke-width="2.5"/>`;
    default:
      return `<rect x="130" y="110" width="140" height="110" rx="6" fill="none" stroke="${gold}" stroke-width="3"/><rect x="122" y="92" width="156" height="26" rx="4" fill="none" stroke="${gold}" stroke-width="3"/><path d="M200 92v128M122 105h156" stroke="${gold}" stroke-width="2.5"/><path d="M200 92c-18-26-44-12-30 0m30 0c18-26 44-12 30 0" fill="none" stroke="${gold}" stroke-width="2.5"/>`;
  }
}

export function productArtDataUri(product: Product): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">` +
    `<rect width="400" height="300" fill="#f3ead8"/>` +
    `<rect x="12" y="12" width="376" height="276" fill="none" stroke="#c9a96e" stroke-width="1.5"/>` +
    `<rect x="20" y="20" width="360" height="260" fill="none" stroke="#c9a96e" stroke-width="0.6" opacity="0.6"/>` +
    shapes(pickKind(product)) +
    `<text x="200" y="268" text-anchor="middle" font-family="Georgia, serif" font-size="13" letter-spacing="6" fill="#8a7650">LUXE GROUP</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
