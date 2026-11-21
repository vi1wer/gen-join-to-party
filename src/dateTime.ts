import flatpickr from 'flatpickr'
import { Russian } from 'flatpickr/dist/l10n/ru'
import type { Instance as FlatpickrInstance } from 'flatpickr/dist/types/instance'

const MONTHS_RU = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
] as const

const HOURS = Array.from({ length: 13 }, (_, i) => 9 + i) // 9..21
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5) // 0,5,..55

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function toDateTimeLocalValue(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

/** Default: today at 17:00 (tomorrow if already after 21:00). */
export function defaultPartyDate(): Date {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0, 0)
  if (now.getHours() > 21 || (now.getHours() === 21 && now.getMinutes() > 0)) {
    d.setDate(d.getDate() + 1)
  }
  return d
}

export function defaultDateTimeLocalValue(): string {
  return toDateTimeLocalValue(defaultPartyDate())
}

function clampPartyDate(date: Date): Date {
  const next = new Date(date.getTime())
  let h = next.getHours()
  let m = Math.round(next.getMinutes() / 5) * 5
  if (m >= 60) {
    h += 1
    m = 0
  }

  if (h < 9) {
    h = 9
    m = 0
  } else if (h > 21 || (h === 21 && m > 0)) {
    h = 21
    m = 0
  }

  // At 21:00 only :00 is allowed
  if (h === 21) m = 0

  next.setHours(h, m, 0, 0)
  return next
}

/** Invitation line: «25 октября в 17:00» */
export function formatRuDate(date: Date): string {
  const d = clampPartyDate(date)
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()]} в ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function formatRuDateTime(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return 'выберите дату и время'
  return formatRuDate(d)
}

function syncInputDisplay(input: HTMLInputElement, date: Date): void {
  const clamped = clampPartyDate(date)
  input.value = `${pad2(clamped.getDate())}.${pad2(clamped.getMonth() + 1)}.${clamped.getFullYear()} ${pad2(clamped.getHours())}:${pad2(clamped.getMinutes())}`
  input.dataset.iso = toDateTimeLocalValue(clamped)
}

function minuteOptionsForHour(hour: number): number[] {
  return hour === 21 ? [0] : MINUTES
}

function buildTimeSide(hour: number, minute: number): HTMLDivElement {
  const wrap = document.createElement('div')
  wrap.className = 'fp-time-side'
  const minutes = minuteOptionsForHour(hour)
  const safeMinute = minutes.includes(minute) ? minute : 0

  wrap.innerHTML = `
    <div class="fp-time-cols">
      <div class="fp-time-col">
        <span class="fp-time-side-label"></span>
        <div class="fp-time-slots fp-hour-slots" role="listbox" aria-label="Часы">
          ${HOURS.map(
            (h) =>
              `<button type="button" class="fp-time-slot${h === hour ? ' is-active' : ''}" data-hour="${h}" role="option" aria-selected="${h === hour}">${pad2(h)}</button>`,
          ).join('')}
        </div>
      </div>
      <div class="fp-time-col">
        <span class="fp-time-side-label"></span>
        <div class="fp-time-slots fp-minute-slots" role="listbox" aria-label="Минуты">
          ${minutes
            .map(
              (m) =>
                `<button type="button" class="fp-time-slot${m === safeMinute ? ' is-active' : ''}" data-minute="${m}" role="option" aria-selected="${m === safeMinute}">${pad2(m)}</button>`,
            )
            .join('')}
        </div>
      </div>
    </div>
  `
  return wrap
}

function renderMinuteSlots(side: HTMLElement, hour: number, minute: number): void {
  const box = side.querySelector('.fp-minute-slots')
  if (!box) return
  const minutes = minuteOptionsForHour(hour)
  const safeMinute = minutes.includes(minute) ? minute : 0
  box.innerHTML = minutes
    .map(
      (m) =>
        `<button type="button" class="fp-time-slot${m === safeMinute ? ' is-active' : ''}" data-minute="${m}" role="option" aria-selected="${m === safeMinute}">${pad2(m)}</button>`,
    )
    .join('')
}

function setActiveHour(side: HTMLElement, hour: number): void {
  side.querySelectorAll<HTMLButtonElement>('[data-hour]').forEach((btn) => {
    const active = Number(btn.dataset.hour) === hour
    btn.classList.toggle('is-active', active)
    btn.setAttribute('aria-selected', active ? 'true' : 'false')
  })
  side.querySelector<HTMLButtonElement>(`[data-hour="${hour}"]`)?.scrollIntoView({
    block: 'nearest',
  })
}

function setActiveMinute(side: HTMLElement, minute: number): void {
  side.querySelectorAll<HTMLButtonElement>('[data-minute]').forEach((btn) => {
    const active = Number(btn.dataset.minute) === minute
    btn.classList.toggle('is-active', active)
    btn.setAttribute('aria-selected', active ? 'true' : 'false')
  })
  side.querySelector<HTMLButtonElement>(`[data-minute="${minute}"]`)?.scrollIntoView({
    block: 'nearest',
  })
}

export function bindPartyDateTimePicker(
  input: HTMLInputElement,
  onChange: () => void,
): FlatpickrInstance {
  let selectedHour = 17
  let selectedMinute = 0
  let sideEl: HTMLDivElement | null = null

  const commit = (instance: FlatpickrInstance, date: Date): void => {
    const next = new Date(date.getTime())
    next.setHours(selectedHour, selectedMinute, 0, 0)
    const clamped = clampPartyDate(next)
    selectedHour = clamped.getHours()
    selectedMinute = clamped.getMinutes()
    instance.setDate(clamped, false)

    if (sideEl) {
      setActiveHour(sideEl, selectedHour)
      renderMinuteSlots(sideEl, selectedHour, selectedMinute)
      setActiveMinute(sideEl, selectedMinute)
    }

    syncInputDisplay(input, clamped)
    onChange()
  }

  const fp = flatpickr(input, {
    locale: Russian,
    enableTime: false,
    closeOnSelect: false,
    dateFormat: 'd.m.Y',
    allowInput: false,
    disableMobile: true,
    defaultDate: defaultPartyDate(),
    onChange: (selectedDates, _str, instance) => {
      if (!selectedDates[0]) return
      // Date pick keeps the calendar open so the user can set time next.
      commit(instance, selectedDates[0])
    },
    onReady: (_dates, _str, instance) => {
      const current = clampPartyDate(instance.selectedDates[0] ?? defaultPartyDate())
      selectedHour = current.getHours()
      selectedMinute = current.getMinutes()
      instance.setDate(current, false)

      sideEl = buildTimeSide(selectedHour, selectedMinute)
      instance.calendarContainer.classList.add('has-side-time')
      instance.calendarContainer.appendChild(sideEl)

      sideEl.addEventListener('click', (e) => {
        const hourBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-hour]')
        const minuteBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-minute]')
        const base = instance.selectedDates[0] ?? defaultPartyDate()

        if (hourBtn) {
          selectedHour = Number(hourBtn.dataset.hour)
          if (selectedHour === 21) selectedMinute = 0
          commit(instance, base)
          // 21:00 has no minute choice — time is complete
          if (selectedHour === 21) instance.close()
          return
        }

        if (minuteBtn) {
          selectedMinute = Number(minuteBtn.dataset.minute)
          commit(instance, base)
          instance.close()
        }
      })

      syncInputDisplay(input, current)
      requestAnimationFrame(() => {
        if (!sideEl) return
        setActiveHour(sideEl, selectedHour)
        setActiveMinute(sideEl, selectedMinute)
      })
    },
    onOpen: (_dates, _str, instance) => {
      const current = clampPartyDate(instance.selectedDates[0] ?? defaultPartyDate())
      selectedHour = current.getHours()
      selectedMinute = current.getMinutes()
      if (!sideEl) return
      setActiveHour(sideEl, selectedHour)
      renderMinuteSlots(sideEl, selectedHour, selectedMinute)
      setActiveMinute(sideEl, selectedMinute)
    },
  })

  return fp
}

export function readPickerIso(input: HTMLInputElement): string {
  return input.dataset.iso || defaultDateTimeLocalValue()
}
