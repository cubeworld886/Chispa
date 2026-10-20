# Chispa — vista previa narrativa de Lavender

> Implementación **solo en la rama** `lavender-narrative-preview`.
> `main` y la página publicada se mantienen sin cambios.

## Flujo de la experiencia

La página conserva la secuencia completa de Chispa: pantalla de
entrada, constelación de Lyra, fractura, explosión, fragmentos,
aparición canónica de Lavender, música `dandara-legacy.mp3` y el
estado melancólico. Una vez que la secuencia entra en `idle`
(aproximadamente 15,2 s después de pulsar **ENTRAR**), el diálogo
comienza **automáticamente**. Solo se activa con
`?previewNarrative=1`.

**Vista de prueba:** `index.html?previewNarrative=1`.
`narrative-lab.html` redirige allí para no mantener una
experiencia alternativa que no represente a Chispa.

## Cambios corregidos tras prueba en iPhone

- Las 62 burbujas usan DOM **precompuesto**: todas las palabras
  ocupan su posición final antes de comenzar la animación.
  Se revelan letras mediante opacidad, sin redistribuir
  las líneas o cambiar la altura mientras se escribe.
- Los mensajes permanecen visibles **después** de finalizar
  el tipeo según su extensión, con tiempo de lectura adicional
  de entre ~3,4 y ~10,2 s, además de las pausas entre burbujas.
- Cada burbuja adapta su ancho a la longitud del texto y su
  alto al contenido. Se mide únicamente cuando cambia el
  mensaje o el tamaño de ventana.
- En iPhone, Lavender se desplaza suavemente a la derecha
  después de la secuencia cinematográfica, dejando sitio para
  que la burbuja aparezca a su **izquierda**. En pantalla
  ancha también se prioriza el lateral izquierdo. Si no
  cabe, hay alternativas de posición que evitan recortes.
- Conservamos el `LavenderSvgEngine` original, con respiración,
  estados expresivos canónicos, transiciones, ojos, cuerpo,
  órbita, luna y estrellas. El diálogo dirige estados como
  `curious`, `thinking`, `concerned`, `relieved`,
  `attentive` y `lament`, además de miradas
  y gestos sutiles. El estado `lament` retoma la respiración
  lenta después de los gestos breves. Las direcciones del
  movimiento se coordinan con cada burbuja, no son aleatorias.
- Sin TTS ni voz artificial: las palabras aparecen solo por
  escrito, dentro de las burbujas de Lavender.

## Audio

La partitura original continúa y puede repetirse mientras
dura el monólogo. Para los sonidos se usan grabaciones
canónicas procedentes de Lyra POS:

- `lavender_hello.wav`
- `lavender_talking.wav`
- `lavender_thinking.wav`
- `lavender_yes.wav`
- `lavender_no.wav`
- `lavender_absorb.wav`
- `lavender_excited.wav`
- `lavender_laugh.wav`
- `lavender-sad.wav` (ya integrado en Chispa)

Se reproducen con un enfriamiento mínimo de 15 s,
a volúmenes moderados y con una leve reducción temporal
de la música (sin pausarla), únicamente en momentos
significativos. Se cargan de manera asíncrona después
de que termina la introducción cinematográfica.

## Pruebas

`node --test cosmic/test/narrative-preview.test.mjs`

Pruebas de regresión: no afectar el flujo habitual sin
el parámetro de prueba; arranque automático al entrar en idle;
texto sin relayout; disposición izquierda en teléfono; recorrido
completo de 62 mensajes; más de una vocalización y sin voz TTS.

Además de las pruebas automáticas de lógica, queda por
validar visualmente en Safari iOS: posición y tamaño,
duración de lectura, expresiones faciales, niveles
de mezcla, carga de archivos y ausencia de defectos.

Los mensajes se han incorporado directamente en esta rama
pública por autorización del propietario. No se han fusionado
a `main`.
