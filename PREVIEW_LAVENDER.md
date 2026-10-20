# Chispa — rama de prueba con diálogo automático de Lavender

> **Estado:** Desarrollo y validación. No fusionar con `main` hasta revisar
> la experiencia visual, la carga de medios y el rendimiento en iPhone.

Esta implementación **mantiene la página original de Chispa**, incluida
la carga inicial, la fractura de la constelación, el destello, la explosión,
la aparición de Lavender, su respiración y el estado melancólico.

La novedad es una secuencia de **burbujas animadas automáticas** una vez
que Lavender termina su aparición y entra en el estado `idle` de la
secuencia cinematográfica (alrededor de 15,2 segundos desde el inicio
del evento).

## Cómo abrir la prueba

`index.html?previewNarrative=1`

La URL `narrative-lab.html?previewNarrative=1` ahora **redirige** a
`index.html?previewNarrative=1`, para evitar un segundo diseño que
no representa la experiencia final.

No es necesario presionar ningún botón ni abrir paneles para que
Lavender muestre sus mensajes: solo se conserva el botón **ENTRAR**
original, necesario para comenzar la escena y habilitar el audio en
los navegadores móviles.

Sin el parámetro `previewNarrative=1`, el flujo original no añade
el diálogo.

## Comportamiento canónico

- **Personaje**: el mismo `LavenderSvgEngine` SVG de
  `lavender-runtime/dist/`, montado mediante `ChispaLavenderHost`.
  La geometría y las animaciones corporales no se reimplementan ni alteran.
- **Burbujas**: adaptación web de las reglas de
  `lib/core/mascot/companion/lavender_speech.dart` del proyecto Lyra POS:
  paleta lila, fondo oscuro, cola orientada hacia Lavender, entrada suave,
  escritura gradual y pausas según la puntuación.
  Es una adaptación de interfaz al DOM, **no** el widget Flutter original.
- **Movimiento**: el motor sigue reproduciendo `lament` y el movimiento
  melancólico. El diálogo solo orienta discretamente la mirada entre
  secciones.
- **Sonidos**: `lavender_hello.wav`, `lavender_talking.wav` y
  `lavender_thinking.wav`, copiados sin cambiar sus bytes del repositorio
  original Lyra POS. Suenan solo de forma ocasional (en la prueba,
  con al menos 24 s entre vocalizaciones) a volumen bajo.
- **Audio musical**: la pista original
  `assets/music/dandara-legacy.mp3` sigue reproduciéndose por
  `PageMusicDirector`. Solo en la rama y al iniciar el monólogo
  se habilita la repetición de esa pista.
- **Sin voz sintética, TTS ni locución**: Lavender únicamente escribe
  mediante burbujas, con sus vocalizaciones no verbales.
- **Narrativa**: texto completo en primera persona, con referencias
  a *Heavy* y *Apocalypse*; la letra de esta última se reduce
  a una cita muy breve y el resto es interpretación personal.

## Archivos

- `cosmic/narrative-preview.js`: narración, burbujas, escritura,
  anclaje responsive y sonidos discretos.
- `cosmic/narrative-preview.css`: presentación de burbujas.
- `cosmic/cosmic-event.js`: puente opt-in tras la secuencia original.
- `index.html`: carga del módulo de ensayo tras `script.js`.
- `assets/lavender/sfx/`: tres vocalizaciones originales de Lyra POS.
- `narrative-lab.html`: enlace heredado, ahora redirige a la
  experiencia original.

## Pendiente para aprobación de producción

1. Ejecutar la experiencia completa en Safari iOS con medios cargados.
2. Verificar disposición de burbujas sobre Lavender en orientaciones
   vertical/horizontal, y con zoom y texto grande.
3. Confirmar que `ENTRAR` habilita la música de fondo y Web Audio.
4. Ajustar tiempos, pausas, miradas y frecuencias de vocalización
   después de observar la ejecución real.
5. Revisar la redacción definitiva con el autor antes de fusionar.

La rama sigue siendo pública porque el repositorio Chispa es público.
No existe publicación automática en producción por editar esta rama.
