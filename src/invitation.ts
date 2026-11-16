import { getVenue, type Venue, type VenueId } from './venues'

export type InvitationData = {
  guestName: string
  dateTime: string
  contactPhone: string
  contactName: string
  venueId: VenueId
}

/** Output size — tall card for messengers */
export const CARD_W = 1080
export const CARD_H = 1680

/** Horizontal inset from canvas edges */
const EDGE_X = 130
/** Top / bottom breathing room */
const EDGE_TOP = 56
const EDGE_BOTTOM = 48

const PALETTE = {
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.94)',
  soft: 'rgba(255,255,255,0.80)',
  gold: '#f0b400',
  line: 'rgba(255,255,255,0.55)',
}

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
  const bust = '?v=9'
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
    document.fonts.load('800 120px Unbounded'),
    document.fonts.load('700 72px Manrope'),
    document.fonts.load('600 44px Manrope'),
    document.fonts.load('500 34px Manrope'),
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

function drawContained(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  maxW: number,
  maxH: number,
): { w: number; h: number } {
  const scale = Math.min(maxW / img.width, maxH / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh)
  return { w: dw, h: dh }
}

function drawFooter(ctx: CanvasRenderingContext2D, w: number, venue: Venue, lineY: number): void {
  const left = EDGE_X
  const right = w - EDGE_X

  ctx.strokeStyle = PALETTE.line
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(left, lineY)
  ctx.lineTo(right, lineY)
  ctx.stroke()

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = PALETTE.text
  ctx.font = '700 30px Unbounded, sans-serif'
  const brand = 'LASERLAND '
  ctx.fillText(brand, left, lineY + 50)
  const brandW = ctx.measureText(brand).width
  ctx.font = '800 30px Unbounded, sans-serif'
  ctx.fillText('КАЗАНЬ', left + brandW, lineY + 50)

  const addrMaxW = w * 0.52
  ctx.fillStyle = PALETTE.soft
  ctx.font = '500 20px Manrope, sans-serif'
  let addrY = lineY + 88
  for (const line of venue.addressLines) {
    const size = fitSize(ctx, line, addrMaxW, 20, 14, 'Manrope, sans-serif', 500)
    ctx.font = `500 ${size}px Manrope, sans-serif`
    ctx.fillText(line, left, addrY)
    addrY += size + 8
  }

  ctx.fillStyle = PALETTE.text
  ctx.font = '600 22px Manrope, sans-serif'
  ctx.fillText(venue.phone, left, Math.max(addrY + 10, lineY + 148))

  ctx.textAlign = 'right'
  const row = (icon: string, handle: string, yy: number) => {
    ctx.font = '600 20px Manrope, sans-serif'
    const tw = ctx.measureText(handle).width
    const cx = right - tw - 34
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.beginPath()
    ctx.arc(cx, yy - 6, 13, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#10243f'
    ctx.font = '800 11px Manrope, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(icon, cx, yy - 6)
    ctx.textAlign = 'right'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = PALETTE.soft
    ctx.font = '600 20px Manrope, sans-serif'
    ctx.fillText(handle, right, yy)
  }

  row('VK', venue.vk, lineY + 50)
  row('IG', venue.instagram, lineY + 94)

  ctx.fillStyle = PALETTE.text
  ctx.font = '700 20px Manrope, sans-serif'
  ctx.fillText(venue.site, right, lineY + 148)
}

export function renderInvitation(canvas: HTMLCanvasElement, data: InvitationData): void {
  if (!assets) return

  const w = CARD_W
  const h = CARD_H
  canvas.width = w
  canvas.height = h

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const guest = data.guestName.trim() || 'Дорогой Друг'
  const when = data.dateTime.trim() || '25 октября в 17:00'
  const phone = data.contactPhone.trim() || '+7 (950) 166-05-10'
  const host = data.contactName.trim() || 'Юля'
  const venue = getVenue(data.venueId)

  drawCoverBackground(ctx, assets.bg, w, h)

  const contentW = w - EDGE_X * 2

  // Bottom band: footer flush to bottom, contact above it
  const footerBottom = h - EDGE_BOTTOM
  const footerLineY = footerBottom - 168
  const contactY = footerLineY - 44

  drawFooter(ctx, w, venue, footerLineY)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const contact = `По всем вопросам звоните: ${phone} — ${host}`
  ctx.fillStyle = 'rgba(255,255,255,0.88)'
  const contactSize = fitSize(ctx, contact, contentW, 28, 16, 'Manrope, sans-serif', 500)
  ctx.font = `500 ${contactSize}px Manrope, sans-serif`
  ctx.fillText(contact, w / 2, contactY)

  // Top content
  drawContained(ctx, assets.logo, w / 2, EDGE_TOP + 110, Math.min(640, contentW), 230)

  ctx.fillStyle = PALETTE.gold
  const title = 'ПРИГЛАШЕНИЕ'
  const titleSize = fitSize(ctx, title, contentW, 100, 64, 'Unbounded, sans-serif', 800)
  ctx.font = `800 ${titleSize}px Unbounded, sans-serif`
  ctx.fillText(title, w / 2, 340)

  ctx.fillStyle = PALETTE.text
  const guestSize = fitSize(ctx, guest, contentW, 68, 36, 'Manrope, sans-serif', 700)
  ctx.font = `700 ${guestSize}px Manrope, sans-serif`
  ctx.fillText(guest, w / 2, 445)

  const invite = 'Приглашаю тебя на свой День рождения, который состоится'
  ctx.fillStyle = PALETTE.muted
  const inviteSize = fitSize(ctx, invite, contentW, 36, 22, 'Manrope, sans-serif', 600)
  ctx.font = `600 ${inviteSize}px Manrope, sans-serif`
  const inviteW = ctx.measureText(invite).width
  const dateSize = fitSize(ctx, when, contentW, 52, 30, 'Manrope, sans-serif', 700)
  ctx.font = `700 ${dateSize}px Manrope, sans-serif`
  const dateW = ctx.measureText(when).width

  let afterDateY = 590
  if (dateW <= contentW) {
    ctx.font = `600 ${inviteSize}px Manrope, sans-serif`
    ctx.fillText(invite, w / 2, 520)
    ctx.fillStyle = PALETTE.text
    ctx.font = `700 ${dateSize}px Manrope, sans-serif`
    ctx.fillText(when, w / 2, 590)
    afterDateY = 590
  } else {
    ctx.font = `600 ${inviteSize}px Manrope, sans-serif`
    ctx.textAlign = 'left'
    const blockW = inviteW + 14 + dateW
    const startX = Math.max(EDGE_X, (w - blockW) / 2)
    ctx.fillText(invite, startX, 555)
    ctx.fillStyle = PALETTE.text
    ctx.font = `700 ${dateSize}px Manrope, sans-serif`
    ctx.fillText(when, startX + inviteW + 14, 555)
    ctx.textAlign = 'center'
    afterDateY = 555
  }

  const iconsY = afterDateY + 220
  drawContained(ctx, assets.icons, w / 2, iconsY, contentW, 240)

  // Adventure line — lighter weight, tucked just above the icons
  const adventure = 'В LaserLand нас ждет космическое приключение,'
  const adventureY = iconsY - 118
  ctx.fillStyle = 'rgba(255,255,255,0.88)'
  const adventureSize = fitSize(ctx, adventure, contentW, 30, 20, 'Manrope, sans-serif', 500)
  ctx.font = `500 ${adventureSize}px Manrope, sans-serif`
  ctx.fillText(adventure, w / 2, adventureY)

  ctx.fillStyle = PALETTE.muted
  ctx.font = '600 34px Manrope, sans-serif'
  const moreY = iconsY + 150
  ctx.fillText('и многое другое!', w / 2, moreY)

  // CTA sits tightly under "и многое другое", above contact
  const ctaTop = moreY + 40
  const ctaBottom = contactY - 30
  const ctaY = (ctaTop + ctaBottom) / 2
  const ctaMaxH = Math.max(220, ctaBottom - ctaTop)
  drawContained(ctx, assets.cta, w / 2, ctaY, Math.min(920, contentW), Math.min(300, ctaMaxH))
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement('a')
  link.download = filename
  link.href = canvas.toDataURL('image/png')
  link.click()
}

export function defaultData(): InvitationData {
  return {
    guestName: 'Дорогой Друг',
    dateTime: '25 октября в 17:00',
    contactPhone: '+7 (950) 166-05-10',
    contactName: 'Юля',
    venueId: 'yamasheva',
  }
}
