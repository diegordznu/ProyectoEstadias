// Aplica el tema guardado antes del primer pintado para evitar un destello
// del color equivocado. Debe coincidir con el valor usado en useTheme.ts.
// Va en un archivo aparte (no en línea en index.html) para que la
// Content-Security-Policy pueda prohibir todo script en línea.
try {
  var guardado = localStorage.getItem('grupoarmas-theme')
  var tema =
    guardado === 'light' || guardado === 'dark'
      ? guardado
      : window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark'
  document.documentElement.dataset.theme = tema
} catch (error) {
  document.documentElement.dataset.theme = 'dark'
}
