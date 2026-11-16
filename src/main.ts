import 'flatpickr/dist/flatpickr.min.css'
import './style.css'
import {
  CARD_H,
  CARD_W,
  defaultData,
  downloadCanvas,
  loadInvitationAssets,
  renderInvitation,
  waitForFonts,
  type InvitationData,
} from './invitation'
import {
  bindPartyDateTimePicker,
  formatRuDateTime,
  readPickerIso,
} from './dateTime'
import { bindRuPhoneMask, formatRuPhone } from './phoneMask'
import { DEFAULT_VENUE_ID, VENUES, type VenueId } from './venues'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('#app not found')

const initial = defaultData()

app.innerHTML = `
  <div class="page">
    <header class="hero">
      <h1>Создайте приглашение на праздник</h1>
      <p>
        Введите имя гостя, дату, телефон и имя для связи,
        после скачайте готовую картинку и отправьте в мессенджер другу.
      </p>
    </header>

    <div class="layout">
      <section class="panel">
        <h2>Данные приглашения</h2>
        <form class="form" id="invite-form">
          <div class="field">
            <label for="guestName">Имя гостя</label>
            <input id="guestName" name="guestName" type="text" maxlength="40"
              placeholder="Например: Дорогой Друг, Маша, Саша"
              value="${escapeAttr(initial.guestName)}" autocomplete="off" />
          </div>

          <div class="field">
            <label for="dateTime">Дата и время</label>
            <input id="dateTime" name="dateTime" type="text"
              class="datetime-input" placeholder="Выберите дату и время" readonly />
            <p class="hint">Выберите дату и время в одном окне</p>
          </div>

          <div class="field">
            <label for="venueId">Адрес центра</label>
            <select id="venueId" name="venueId" class="venue-select">
              ${VENUES.map(
                (v) =>
                  `<option value="${v.id}"${v.id === DEFAULT_VENUE_ID ? ' selected' : ''}>${escapeAttr(v.label)}</option>`,
              ).join('')}
            </select>
          </div>

          <div class="field">
            <label for="contactPhone">Телефон для связи</label>
            <input id="contactPhone" name="contactPhone" type="tel"
              value="${escapeAttr(formatRuPhone(initial.contactPhone))}"
              autocomplete="tel" inputmode="tel" maxlength="18"
              placeholder="+7 (___) ___-__-__" />
          </div>

          <div class="field">
            <label for="contactName">Имя для связи</label>
            <input id="contactName" name="contactName" type="text" maxlength="24"
              placeholder="Например: Булат, Мама Юля"
              value="${escapeAttr(initial.contactName)}" autocomplete="name" />
          </div>

          <div class="actions">
            <button type="button" class="btn-primary" id="download-btn">
              Сохранить
            </button>
          </div>
          <p class="status" id="status" aria-live="polite"></p>
        </form>
      </section>

      <section class="panel preview-panel">
        <div class="preview-wrap">
          <canvas id="preview" width="${CARD_W}" height="${CARD_H}"></canvas>
        </div>
      </section>
    </div>

    <p class="footer-note">
      Оригинальный макет · генерация в браузере · без внешних шаблонов
    </p>
  </div>
`

function escapeAttr(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

const dateTimeInput = document.querySelector('#dateTime') as HTMLInputElement
const phoneInput = document.querySelector('#contactPhone') as HTMLInputElement
const venueSelect = document.querySelector('#venueId') as HTMLSelectElement

function readForm(): InvitationData {
  return {
    guestName: (document.querySelector('#guestName') as HTMLInputElement).value,
    dateTime: formatRuDateTime(readPickerIso(dateTimeInput)),
    contactPhone: phoneInput.value,
    contactName: (document.querySelector('#contactName') as HTMLInputElement).value,
    venueId: venueSelect.value as VenueId,
  }
}

function setStatus(message: string, isError = false): void {
  const el = document.querySelector('#status') as HTMLParagraphElement
  if (!el) return
  el.textContent = message
  el.classList.toggle('error', isError)
}

const canvas = document.querySelector('#preview') as HTMLCanvasElement
const downloadBtn = document.querySelector('#download-btn') as HTMLButtonElement

let ready = false
let renderTimer = 0

function refresh(): void {
  if (!ready) return
  renderInvitation(canvas, readForm())
}

function scheduleRefresh(): void {
  window.clearTimeout(renderTimer)
  renderTimer = window.setTimeout(refresh, 60)
}

async function init(): Promise<void> {
  downloadBtn.disabled = true
  setStatus('Загрузка макета…')
  try {
    await Promise.all([waitForFonts(), loadInvitationAssets()])
    ready = true
    refresh()
    downloadBtn.disabled = false
    setStatus('')
  } catch (error) {
    console.error(error)
    setStatus('Не удалось загрузить макет', true)
  }
}

bindPartyDateTimePicker(dateTimeInput, scheduleRefresh)
bindRuPhoneMask(phoneInput, scheduleRefresh)

venueSelect.addEventListener('change', scheduleRefresh)

for (const selector of ['#guestName', '#contactName']) {
  const input = document.querySelector(selector) as HTMLInputElement
  input.addEventListener('input', scheduleRefresh)
}

downloadBtn.addEventListener('click', () => {
  refresh()
  const guest = readForm().guestName.trim() || 'gost'
  const safe =
    guest
      .replace(/[^\p{L}\p{N}\-_ ]/gu, '')
      .trim()
      .replace(/\s+/g, '-') || 'priglashenie'
  downloadCanvas(canvas, `priglashenie-${safe}.png`)
  setStatus('Готово — файл скачан')
})

void init()
