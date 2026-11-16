/** Russian mobile mask: +7 (XXX) XXX-XX-XX */

const MAX_DIGITS = 11

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

/** Normalize to 11 digits starting with 7 when possible. */
export function normalizeRuPhoneDigits(raw: string): string {
  let digits = digitsOnly(raw)

  if (digits.startsWith('8')) {
    digits = `7${digits.slice(1)}`
  }
  if (!digits.startsWith('7') && digits.length > 0) {
    digits = `7${digits}`
  }

  return digits.slice(0, MAX_DIGITS)
}

export function formatRuPhone(raw: string): string {
  const d = normalizeRuPhoneDigits(raw)
  if (!d) return ''

  let out = '+7'
  if (d.length <= 1) return out

  out += ` (${d.slice(1, Math.min(4, d.length))}`
  if (d.length < 4) return out
  out += ')'

  if (d.length >= 5) {
    out += ` ${d.slice(4, Math.min(7, d.length))}`
  }
  if (d.length >= 8) {
    out += `-${d.slice(7, Math.min(9, d.length))}`
  }
  if (d.length >= 10) {
    out += `-${d.slice(9, Math.min(11, d.length))}`
  }

  return out
}

export function bindRuPhoneMask(input: HTMLInputElement, onChange?: () => void): void {
  input.setAttribute('inputmode', 'tel')
  input.setAttribute('autocomplete', 'tel')
  input.setAttribute('maxlength', '18')
  input.setAttribute('placeholder', '+7 (___) ___-__-__')

  const apply = (): void => {
    const formatted = formatRuPhone(input.value)
    input.value = formatted
    onChange?.()
  }

  // Format initial value
  if (input.value) {
    input.value = formatRuPhone(input.value)
  }

  input.addEventListener('input', apply)

  input.addEventListener('focus', () => {
    if (!input.value) {
      input.value = '+7 ('
    }
  })

  input.addEventListener('blur', () => {
    const d = normalizeRuPhoneDigits(input.value)
    if (d.length <= 1) {
      input.value = ''
      onChange?.()
      return
    }
    input.value = formatRuPhone(d)
    onChange?.()
  })

  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Backspace') return
    const d = normalizeRuPhoneDigits(input.value)
    // If cursor at end and value ends with formatting char, delete last digit
    if (
      input.selectionStart === input.value.length &&
      input.selectionEnd === input.value.length &&
      d.length > 1
    ) {
      e.preventDefault()
      input.value = formatRuPhone(d.slice(0, -1))
      onChange?.()
    }
  })
}
