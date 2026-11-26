import { getVenue, type Venue, type VenueId } from './venues'

export type InvitationData = {
  guestName: string
  dateTime: string
  contactPhone: string
  contactName: string
  venueId: VenueId
}

/**
 * A5 portrait @ 300 dpi
 * 148 × 210 mm → 1748 × 2480 px
 */
export const CARD_W = 1748
export const CARD_H = 2480

const EDGE_X = 80
const EDGE_TOP = 24
const EDGE_BOTTOM = 24
const FOOTER_H = 220

const PALETTE = {
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.94)',
  soft: 'rgba(255,255,255,0.82)',
  gold: '#f0b400',
  line: 'rgba(255,255,255,0.55)',
}

/** Montserrat Black — только «ПРИГЛАШЕНИЕ» */
const FONT_TITLE = '"Montserrat Black", sans-serif'
/** Прежние шрифты для остального текста */
const FONT_BRAND = 'Unbounded, sans-serif'
const FONT_BODY = 'Manrope, sans-serif'

type Assets = {
  bg: HTMLImageElement
  logo: HTMLImageElement
  icons: HTMLImageElement
  cta: HTMLImageElement
}

let assets: Assets | null = null

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image()
  img.src = src
  await img.decode()
  return img
}

export async function loadInvitationAssets(): Promise<void> {
  if (assets) return
  const bust = '?v=37'
  const base = import.meta.env.BASE_URL
  const [bg, logo, icons, cta] = await Promise.all([
    loadImage(`${base}bg.png${bust}`),
    loadImage(`${base}logo-use.png${bust}`),
    loadImage(`${base}icons-use.png${bust}`),
    loadImage(`${base}cta-use.png${bust}`),
  ])
  assets = { bg, logo, icons, cta }
}

export async function waitForFonts(): Promise<void> {
  if (!document.fonts) return
  await Promise.all([
    document.fonts.load(`900 160px ${FONT_TITLE}`),
    document.fonts.load(`800 120px ${FONT_BRAND}`),
    document.fonts.load(`700 90px ${FONT_BODY}`),
    document.fonts.load(`600 56px ${FONT_BODY}`),
    document.fonts.load(`500 40px ${FONT_BODY}`),
  ])
  await document.fonts.ready
}

function fitSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  preferred: number,
  min: number,
  fontFamily: string,
  weight: number,
): number {
  let size = preferred
  ctx.font = `${weight} ${size}px ${fontFamily}`
  while (size > min && ctx.measureText(text).width > maxWidth) {
    size -= 1
    ctx.font = `${weight} ${size}px ${fontFamily}`
  }
  return size
}

function drawCoverBackground(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number): void {
  const scale = Math.max(w / img.width, h / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
}

function containedSize(
  img: HTMLImageElement,
  maxW: number,
  maxH: number,
): { w: number; h: number } {
  const scale = Math.min(maxW / img.width, maxH / img.height)
  return { w: img.width * scale, h: img.height * scale }
}

function drawContained(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  maxW: number,
  maxH: number,
): void {
  const { w: dw, h: dh } = containedSize(img, maxW, maxH)
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh)
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  w: number,
  venue: Venue,
  lineY: number,
  left = EDGE_X,
): void {
  const right = w - EDGE_X

  ctx.strokeStyle = PALETTE.line
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(left, lineY)
  ctx.lineTo(right, lineY)
  ctx.stroke()

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = PALETTE.text
  ctx.font = `700 40px ${FONT_BRAND}`
  const brand = 'LASERLAND '
  ctx.fillText(brand, left, lineY + 62)
  const brandW = ctx.measureText(brand).width
  ctx.font = `800 40px ${FONT_BRAND}`
  ctx.fillText('КАЗАНЬ', left + brandW, lineY + 62)

  const addrMaxW = w * 0.54
  ctx.fillStyle = PALETTE.soft
  let addrY = lineY + 110
  for (const line of venue.addressLines) {
    const size = fitSize(ctx, line, addrMaxW, 28, 18, FONT_BODY, 500)
    ctx.font = `500 ${size}px ${FONT_BODY}`
    ctx.fillText(line, left, addrY)
    addrY += size + 10
  }

  ctx.fillStyle = PALETTE.text
  ctx.font = `600 30px ${FONT_BODY}`
  const phoneY = Math.max(addrY + 16, lineY + 186)
  ctx.fillText(venue.phone, left, phoneY)

  ctx.textAlign = 'right'
  const drawSocialBadge = (cx: number, cy: number, drawGlyph: () => void) => {
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.beginPath()
    ctx.arc(cx, cy, 17, 0, Math.PI * 2)
    ctx.fill()
    drawGlyph()
  }

  const row = (handle: string, yy: number, drawGlyph: (cx: number, cy: number) => void) => {
    ctx.font = `600 26px ${FONT_BODY}`
    const tw = ctx.measureText(handle).width
    const cx = right - tw - 42
    const cy = yy - 8
    drawSocialBadge(cx, cy, () => drawGlyph(cx, cy))
    ctx.textAlign = 'right'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = PALETTE.soft
    ctx.font = `600 26px ${FONT_BODY}`
    ctx.fillText(handle, right, yy)
  }

  row(venue.vk, lineY + 62, (cx, cy) => {
    ctx.fillStyle = '#10243f'
    ctx.font = `800 13px ${FONT_BODY}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('VK', cx, cy)
  })

  row(venue.instagram, lineY + 116, (cx, cy) => {
    // Classic Instagram camera pictogram
    ctx.strokeStyle = '#10243f'
    ctx.fillStyle = '#10243f'
    ctx.lineWidth = 1.8
    ctx.lineJoin = 'round'
    const s = 11
    roundRectPath(ctx, cx - s, cy - s, s * 2, s * 2, 3.2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx, cy, 4.2, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx + 5.2, cy - 5.2, 1.35, 0, Math.PI * 2)
    ctx.fill()
  })

  ctx.fillStyle = PALETTE.text
  ctx.font = `700 26px ${FONT_BODY}`
  ctx.fillText(venue.site, right, phoneY)
}

export function renderInvitation(canvas: HTMLCanvasElement, data: InvitationData): void {
  if (!assets) return

  const w = CARD_W
  const h = CARD_H
  canvas.width = w
  canvas.height = h

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const guest = data.guestName.trim() || 'Дорогой Друг'
  const when = data.dateTime.trim() || '25 октября в 17:00'
  const phone = data.contactPhone.trim() || '+7 (___) ___-__-__'
  const host = data.contactName.trim() || 'Имя'
  const venue = getVenue(data.venueId)
  const contentW = w - EDGE_X * 2

  drawCoverBackground(ctx, assets.bg, w, h)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  /*
   * Fill A5 with large blocks (fractions of page height).
   * No tiny type + huge empty air.
   */
  const footerLineY = h - EDGE_BOTTOM - FOOTER_H
  const contact = `По всем вопросам звоните: ${phone} — ${host}`
  const contactSize = fitSize(ctx, contact, contentW, 42, 24, FONT_BODY, 500)
  // Two contact-lines above the footer separator
  const contactY = footerLineY - 18 - contactSize / 2 - contactSize * 2

  // Aggressive fill of A5 — large blocks, tight gaps
  const top = EDGE_TOP
  const bottom = contactY - contactSize / 2 - 16
  const span = bottom - top
  const g = span * 0.008 // ~tight gap

  const adventure = 'В LaserLand нас ждет космическое приключение,'
  const adventureSize = fitSize(ctx, adventure, contentW, Math.round(span * 0.024), 30, FONT_BODY, 500)

  const titleWord = 'ПРИГЛАШЕНИЕ'
  const titleSize = fitSize(ctx, titleWord, contentW, Math.round(span * 0.072), 90, FONT_TITLE, 900)
  // Logo width = visual span from «Л» to «Ш» in ПРИГЛАШЕНИЕ
  ctx.font = `900 ${titleSize}px ${FONT_TITLE}`
  const lToShWidth =
    ctx.measureText('ПРИГЛАШ').width - ctx.measureText('ПРИГ').width
  const logoW = Math.max(80, lToShWidth * 0.95)
  const logoScale = logoW / assets.logo.width
  const logoH = assets.logo.height * logoScale
  // Top padding before logo = one adventure line
  const logoY = top + adventureSize + logoH / 2

  const titleY = logoY + logoH / 2 + g * 1.4 + titleSize / 2

  const invite = 'Приглашаю тебя на свой День рождения, который состоится'
  const inviteSize = fitSize(ctx, invite, contentW, Math.round(span * 0.024), 30, FONT_BODY, 600)
  // Same gap (≈ invite font size) under title and under guest name
  const textGap = inviteSize

  const guestSize = fitSize(ctx, guest, contentW, Math.round(span * 0.042 * 1.6), 62, FONT_BODY, 700)
  const guestY = titleY + titleSize / 2 + textGap + guestSize / 2

  const dateSize = fitSize(ctx, when, contentW, Math.round(span * 0.034), 40, FONT_BODY, 700)
  ctx.font = `700 ${dateSize}px ${FONT_BODY}`
  const dateW = ctx.measureText(when).width
  const dateOnOwnLine = dateW <= contentW
  const inviteY = guestY + guestSize / 2 + textGap + inviteSize / 2
  const dateY = dateOnOwnLine ? inviteY + inviteSize / 2 + g + dateSize / 2 : inviteY
  const afterDate = (dateOnOwnLine ? dateY : inviteY) + dateSize / 2

  // Gap after date/time = two date font sizes
  const adventureY = afterDate + dateSize * 2 + adventureSize / 2

  // Same size as adventure line
  const moreSize = adventureSize
  const iconsMaxH = span * 0.235
  const iconsDrawn = containedSize(assets.icons, contentW, iconsMaxH)
  // Pin icons top edge right under the adventure line (real drawn height)
  const iconsGap = Math.max(6, Math.round(adventureSize * 0.25))
  const iconsTop = adventureY + adventureSize / 2 + iconsGap
  const iconsY = iconsTop + iconsDrawn.h / 2
  // Left edge of «Лазерные бои» (content, not transparent pad in the strip)
  const iconsScale = iconsDrawn.w / assets.icons.width
  const iconsPadL = 49 // transparent left pad in icons-use.png
  const iconsContentLeft = w / 2 - iconsDrawn.w / 2 + iconsPadL * iconsScale
  const moreY = iconsTop + iconsDrawn.h + g * 1.2 + moreSize / 2

  // CTA fills remaining — stays large
  const ctaTop = moreY + moreSize / 24 + g * 1.5
  const ctaBottom = contactY - contactSize / 2 - 20
  const ctaSlotH = Math.max(span * 0.16, ctaBottom - ctaTop)
  const ctaH = ctaSlotH * 0.9
  const ctaW = Math.min(1555, contentW) * 0.9
  const ctaY = (ctaTop + ctaBottom) / 2

  drawContained(ctx, assets.logo, w / 2, logoY, logoW, logoH)

  ctx.fillStyle = PALETTE.gold
  ctx.font = `900 ${titleSize}px ${FONT_TITLE}`
  ctx.fillText(titleWord, w / 2, titleY)

  ctx.fillStyle = PALETTE.text
  ctx.font = `700 ${guestSize}px ${FONT_BODY}`
  ctx.fillText(guest, w / 2, guestY)

  ctx.fillStyle = PALETTE.muted
  if (dateOnOwnLine) {
    ctx.textAlign = 'center'
    ctx.font = `600 ${inviteSize}px ${FONT_BODY}`
    ctx.fillText(invite, w / 2, inviteY)
    ctx.fillStyle = PALETTE.text
    ctx.font = `700 ${dateSize}px ${FONT_BODY}`
    ctx.fillText(when, w / 2, dateY)
  } else {
    ctx.font = `600 ${inviteSize}px ${FONT_BODY}`
    const inviteW = ctx.measureText(invite).width
    ctx.textAlign = 'left'
    const blockW = inviteW + 18 + dateW
    const startX = Math.max(EDGE_X, (w - blockW) / 2)
    ctx.fillText(invite, startX, inviteY)
    ctx.fillStyle = PALETTE.text
    ctx.font = `700 ${dateSize}px ${FONT_BODY}`
    ctx.fillText(when, startX + inviteW + 18, inviteY)
  }

  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.font = `500 ${adventureSize}px ${FONT_BODY}`
  ctx.fillText(adventure, iconsContentLeft, adventureY)

  drawContained(ctx, assets.icons, w / 2, iconsY, contentW, iconsMaxH)

  ctx.fillStyle = PALETTE.muted
  ctx.font = `500 ${moreSize}px ${FONT_BODY}`
  ctx.fillText('и многое другое!', iconsContentLeft, moreY)
  ctx.textAlign = 'center'

  drawContained(ctx, assets.cta, w / 2, ctaY, ctaW, ctaH)

  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.font = `500 ${contactSize}px ${FONT_BODY}`
  ctx.fillText(contact, w / 2, contactY)

  drawFooter(ctx, w, venue, footerLineY, iconsContentLeft)
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement('a')
  link.download = filename
  link.href = canvas.toDataURL('image/png')
  link.click()
}

export function defaultData(): InvitationData {
  return {
    guestName: '',
    dateTime: '25 октября в 17:00',
    contactPhone: '',
    contactName: '',
    venueId: 'yamasheva',
  }
}
