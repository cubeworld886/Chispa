# Chispa — vista previa de Lavender (rama de ensayo)

Esta rama **no es producción**. Es una prueba interactiva de la narración
en primera persona que utiliza el **motor canónico** de Lavender existente en
`lavender-runtime/dist/`.

## Acceso

- **Laboratorio ligero para iPhone:** `narrative-lab.html?previewNarrative=1`.
  Monta el motor `LavenderSvgEngine` con `ChispaLavenderHost` y abre la
  narración sin exigir que se reproduzca antes la escena cósmica.
- **Chispa original con secuencia completa:** `index.html?previewNarrative=1`.
  La narración solo comienza después del estado cósmico `idle`, con el
  renderizador original y las animaciones que ya están en el repositorio.
- **Sin el parámetro:** las visitas a `index.html` no activan la
  narración de prueba.

Para abrir estas páginas desde un dispositivo sin un servidor propio,
se puede usar el proxy de desarrollo externo `raw.githack.com`,
que sirve archivos públicos de GitHub con el tipo MIME adecuado.
No es una URL privada ni tiene garantía de disponibilidad.

## Controles de la prueba

- Escuchar con la voz de síntesis del navegador (no es voz final).
- Leer en silencio.
- Avanzar y retroceder entre seis fragmentos.
- Pausar, reanudar, cerrar y reabrir la narración.

## Límites deliberados

- Los textos son un ensayo reducido; **el monólogo personal completo
  NO está publicado** en esta rama.
- No hay integración de ElevenLabs ni de pistas de voz final.
- Los movimientos usan `setState('lament')`, `lookDown`,
  `lookAtWorldPoint`, respiración y expresiones del motor existente,
  sin geometría ni ilustraciones sustitutivas.
- Todavía es necesario validar la reproducción real en Safari iOS y
  comprobar audio, rendimiento, carga y accesibilidad.
- Se requiere revisión y autorización explícita antes de fusionar en `main`.

## Archivos modificados

- `narrative-lab.html`: laboratorio independiente con Lavender canónica.
- `cosmic/narrative-preview.js`: capítulos, estados y controles.
- `cosmic/narrative-preview.css`: interfaz adaptativa.
- `cosmic/cosmic-event.js`: aviso opcional al entrar en estado `idle`.
- `index.html`: carga condicional de la experiencia de prueba
  controlada por el parámetro `previewNarrative=1`.

Para probar localmente, servir la raíz del repositorio mediante un
servidor estático, por ejemplo `python3 -m http.server 8080`, y abrir
`http://localhost:8080/narrative-lab.html?previewNarrative=1`.
