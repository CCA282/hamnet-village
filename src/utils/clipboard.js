export async function clipboardCopy(text) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return true } catch { /* fall through to textarea fallback */ }
  }
  try {
    const el = document.createElement('textarea')
    el.value = text
    el.style.cssText = 'position:fixed;top:-9999px;opacity:0'
    document.body.appendChild(el)
    el.focus(); el.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(el)
    return ok
  } catch { /* clipboard unsupported, report failure below */ }
  return false
}
