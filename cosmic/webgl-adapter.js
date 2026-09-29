import { deriveVfxState } from './vfx-state.js';

export const NATIVE_WEBGL_CONTRACT = Object.freeze({
  api: 'webgl2',
  externalRuntime: false,
  postprocess: 'shockwave+bloom',
  particleSystems: 1,
});

export function normalizeOriginToNdc(point, width, height) {
  const w = Math.max(1, width || 1);
  const h = Math.max(1, height || 1);
  return {
    x: (point.x / w) * 2 - 1,
    y: 1 - (point.y / h) * 2,
  };
}

export function buildParticleSeedData(count, random = Math.random) {
  const n = Math.max(1, Math.floor(count));
  const positions = new Float32Array(n * 3);
  const directions = new Float32Array(n * 3);
  const speeds = new Float32Array(n);
  const seeds = new Float32Array(n);
  const sizes = new Float32Array(n);
  const lives = new Float32Array(n);
  const classes = new Float32Array(n);

  for (let i = 0; i < n; i += 1) {
    const classValue = i % 17 === 0 ? 2 : i % 5 === 0 ? 1 : 0;
    const jitter = random() - 0.5;
    const angle = classValue === 2
      ? (Math.floor(i / 17) % 12) * (Math.PI * 2 / 12) + jitter * 0.18
      : (i / n) * Math.PI * 2 + jitter * (classValue === 1 ? 0.38 : 0.52);
    const radial = classValue === 2 ? 0.92 + random() * 0.16 : 0.72 + random() * 0.56;
    directions[i * 3] = Math.cos(angle) * radial;
    directions[i * 3 + 1] = Math.sin(angle) * radial;
    directions[i * 3 + 2] = (random() - 0.5) * 0.18;
    speeds[i] = classValue === 2 ? 0.85 + random() * 0.72 : classValue === 1 ? 0.58 + random() * 1.0 : 0.32 + random() * 0.92;
    seeds[i] = random();
    sizes[i] = classValue === 2 ? 3.4 + random() * 2.2 : classValue === 1 ? 1.6 + random() * 1.8 : 0.7 + random() * 1.35;
    lives[i] = classValue === 2 ? 0.74 + random() * 0.26 : classValue === 1 ? 0.50 + random() * 0.42 : 0.30 + random() * 0.62;
    classes[i] = classValue;
  }

  return { positions, directions, speeds, seeds, sizes, lives, classes };
}

const PARTICLE_VERTEX = `#version 300 es
precision highp float;
in vec3 aPosition;
in vec3 aDirection;
in float aSpeed;
in float aSeed;
in float aSize;
in float aLife;
in float aClass;
uniform float uTime;
uniform float uExplosion;
uniform vec2 uOrigin;
uniform float uAspect;
uniform float uPixelRatio;
out float vLife;
out float vSeed;
out float vClass;
out float vAngle;
void main(){
  float progress=clamp(uExplosion/2.7,0.0,1.0);
  float burst=progress*progress*(3.0-2.0*progress);
  float radialReach=2.7*pow(progress,1.35);
  float distance=radialReach*aSpeed*(0.68+aLife*0.30)*(1.0+0.12*aClass);
  vec2 direction=aDirection.xy;
  direction.x/=max(uAspect,0.001);
  vec2 turbulence=vec2(sin(uTime*1.7+aSeed*21.0),cos(uTime*1.3+aSeed*17.0))*.008*burst;
  vec2 xy=uOrigin+aPosition.xy+direction*distance+turbulence;
  gl_Position=vec4(xy,aPosition.z+aDirection.z*0.1,1.0);
  gl_PointSize=max(1.0,aSize*uPixelRatio*(1.0+.20*aClass));
  vLife=aLife;
  vSeed=aSeed;
  vClass=aClass;
  vAngle=atan(direction.y,direction.x);
}`;

const PARTICLE_FRAGMENT = `#version 300 es
precision highp float;
uniform float uFade;
in float vLife;
in float vSeed;
in float vClass;
in float vAngle;
out vec4 outColor;
void main(){
  vec2 p=gl_PointCoord-.5;
  vec2 axis=vec2(cos(vAngle),sin(vAngle));
  vec2 q=vec2(dot(p,axis),dot(p,vec2(-axis.y,axis.x)));
  float r=length(p);
  float core=1.0-smoothstep(.06,.46,r);
  float halo=1.0-smoothstep(.22,.50,r);
  float spark=1.0-smoothstep(.12,.48,length(vec2(q.x*.82,q.y*1.45)));
  float shard=1.0-smoothstep(.025,.19,length(vec2(q.x*.38,q.y*3.0)));
  float shape=mix(core*.54+halo*.18,spark*.68+core*.12,step(.5,vClass));
  shape=mix(shape,shard,step(1.5,vClass));
  vec3 color=mix(vec3(.34,.43,.90),vec3(.74,.58,1.0),vSeed);
  color=mix(color,vec3(.92,.82,1.0),step(.5,vClass)*.30);
  color=mix(color,vec3(1.0,.94,1.0),step(1.5,vClass)*.48);
  float alpha=shape*vLife*uFade*(.78-.05*vClass);
  if(alpha<.01)discard;
  outColor=vec4(color*alpha,alpha);
}`;

const FULLSCREEN_VERTEX = `#version 300 es
precision highp float;
out vec2 vUv;
void main(){
  vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));
  vUv=p;
  gl_Position=vec4(p*2.0-1.0,0.0,1.0);
}`;

const SINGULARITY_FRAGMENT = `#version 300 es
precision highp float;
uniform float uTime;
uniform float uEnergy;
uniform vec2 uOrigin;
uniform vec2 uResolution;
in vec2 vUv;
out vec4 outColor;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
void main(){
  vec2 aspect=vec2(uResolution.x/max(uResolution.y,1.0),1.0);
  vec2 d=(vUv-uOrigin)*aspect;
  float r=length(d);
  float noise=hash(floor((d+uTime*.015)*110.0));
  float core=exp(-r*80.0)*(1.0+.16*noise);
  float halo=exp(-r*18.0);
  float rayH=pow(max(0.0,1.0-abs(d.y)*95.0),3.0)*exp(-abs(d.x)*3.0);
  float rayV=pow(max(0.0,1.0-abs(d.x)*115.0),4.0)*exp(-abs(d.y)*4.0);
  float corona=exp(-pow((r-.035)*34.0,2.0));
  vec3 color=vec3(1.0)*core
    +vec3(.72,.58,1.0)*halo*.82
    +vec3(.62,.72,1.0)*(rayH*.28+rayV*.16)
    +vec3(.42,.20,.95)*corona*.18;
  float alpha=clamp((core+halo*.72+rayH*.22+rayV*.12+corona*.14)*uEnergy,0.0,1.0);
  outColor=vec4(color*uEnergy*alpha,alpha);
}`;

const POST_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform vec2 uResolution;
uniform vec2 uOrigin;
uniform float uShockwave;
uniform float uStrength;
uniform float uBloom;
uniform float uBloomRadius;
uniform float uTime;
in vec2 vUv;
out vec4 outColor;

vec4 sampleScene(vec2 uv){return texture(uScene,clamp(uv,vec2(0.001),vec2(.999)));}
vec3 bright(vec4 c){
  float l=max(max(c.r,c.g),c.b);
  return c.rgb*smoothstep(.22,.82,l);
}
void main(){
  vec2 aspect=vec2(uResolution.x/max(uResolution.y,1.0),1.0);
  vec2 d=(vUv-uOrigin)*aspect;
  float dist=length(d);
  float ring=exp(-pow((dist-uShockwave)*42.0,2.0));
  vec2 dir=dist>.0001?normalize(d)/aspect:vec2(0.0);
  vec2 uv=clamp(vUv-dir*ring*uStrength,vec2(.001),vec2(.999));
  vec2 texel=1.0/max(uResolution,vec2(1.0));
  float spread=max(.75,uBloomRadius*4.0);
  vec2 dx=vec2(texel.x*spread,0.0);
  vec2 dy=vec2(0.0,texel.y*spread);
  vec2 dg=vec2(texel.x,texel.y)*spread*.72;

  vec4 base=sampleScene(uv);
  vec3 bloom=bright(sampleScene(uv+dx))+bright(sampleScene(uv-dx))
    +bright(sampleScene(uv+dy))+bright(sampleScene(uv-dy));
  bloom+=bright(sampleScene(uv+dg))+bright(sampleScene(uv-dg))
    +bright(sampleScene(uv+vec2(dg.x,-dg.y)))+bright(sampleScene(uv+vec2(-dg.x,dg.y)));
  bloom*=.105*uBloom;

  float chroma=ring*uStrength*.8;
  float red=sampleScene(uv+dir*chroma).r;
  float blue=sampleScene(uv-dir*chroma).b;
  vec3 color=vec3(red,base.g,blue)+bloom;
  float ringActive=step(0.0001,uStrength);
  float ringGlow=ring*max(0.0,1.0-uShockwave*.45)*.18*ringActive;
  color+=vec3(.74,.66,1.0)*ringGlow;
  float alpha=max(base.a,clamp(max(max(bloom.r,bloom.g),bloom.b)*.9+ringGlow,0.0,1.0));
  vec3 straightColor=alpha>0.0001?color/alpha:vec3(0.0);
  outColor=vec4(clamp(straightColor,vec3(0.0),vec3(1.0)),alpha);
}`;

export function hasRenderableEffect(vfx = {}) {
  return Number(vfx.singularityEnergy) > 0.0001
    || (Number(vfx.explosion) > 0.0001 && Number(vfx.fade) > 0.0001)
    || Number(vfx.shockwaveStrength) > 0.0001;
}

export function waitForGpu(gl, {
  requestAnimationFrame = (callback) => globalThis.requestAnimationFrame(callback),
  maxPolls = 30,
} = {}) {
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  if (!sync) return Promise.reject(new Error('WebGL2 could not create a warm-up fence'));
  gl.flush();
  return new Promise((resolve, reject) => {
    let polls = 0;
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      try { gl.deleteSync(sync); } catch {}
      callback(value);
    };
    const poll = () => {
      let status;
      try {
        status = gl.clientWaitSync(sync, 0, 0);
      } catch (error) {
        finish(reject, error);
        return;
      }
      polls += 1;
      if (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED) {
        finish(resolve);
      } else if (status === gl.WAIT_FAILED) {
        finish(reject, new Error('WebGL2 warm-up fence failed'));
      } else if (polls >= Math.max(1, Math.floor(maxPolls))) {
        finish(reject, new Error('WebGL2 warm-up fence did not finish'));
      } else {
        try {
          requestAnimationFrame(poll);
        } catch (error) {
          finish(reject, error);
        }
      }
    };
    poll();
  });
}

function compileShader(gl, type, source, label) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error(`WebGL2 could not allocate ${label} shader`);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const detail = gl.getShaderInfoLog(shader) || 'unknown shader compile error';
    gl.deleteShader(shader);
    throw new Error(`${label} shader compile failed: ${detail}`);
  }
  return shader;
}

function createProgram(gl, vertex, fragment, label) {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertex, `${label} vertex`);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragment, `${label} fragment`);
  const program = gl.createProgram();
  if (!program) throw new Error(`WebGL2 could not allocate ${label} program`);
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const detail = gl.getProgramInfoLog(program) || 'unknown program link error';
    gl.deleteProgram(program);
    throw new Error(`${label} program link failed: ${detail}`);
  }
  return program;
}

function uniformLocations(gl, program, names) {
  return Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)]));
}

function createParticleBuffer(gl, program, locationName, values, size) {
  const location = gl.getAttribLocation(program, locationName);
  if (location < 0) throw new Error(`WebGL2 particle attribute ${locationName} is inactive`);
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error(`WebGL2 could not allocate ${locationName} buffer`);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, values, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  return buffer;
}

function createSceneTarget(gl, width, height) {
  const texture = gl.createTexture();
  const framebuffer = gl.createFramebuffer();
  if (!texture || !framebuffer) throw new Error('WebGL2 could not allocate post-process target');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    gl.deleteFramebuffer(framebuffer);
    gl.deleteTexture(texture);
    throw new Error(`WebGL2 post-process framebuffer incomplete: 0x${status.toString(16)}`);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { texture, framebuffer, width, height };
}

function resizeSceneTarget(gl, target, width, height) {
  if (target.width === width && target.height === height) return;
  target.width = width;
  target.height = height;
  gl.bindTexture(gl.TEXTURE_2D, target.texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
}

function safeDelete(gl, kind, resource) {
  if (!resource) return;
  try { gl[kind]?.(resource); } catch {}
}

export async function createNativeWebglBackend({ container, quality, onContextLost }) {
  const doc = container?.ownerDocument ?? globalThis.document;
  const canvas = doc?.createElement?.('canvas');
  if (!canvas) throw new Error('WebGL2 backend requires a canvas-capable document');
  canvas.className = 'cosmic-webgl-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  container.append(canvas);

  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
  });
  if (!gl) {
    canvas.remove();
    throw new Error('WebGL2 is unavailable');
  }

  const particleProgram = createProgram(gl, PARTICLE_VERTEX, PARTICLE_FRAGMENT, 'particle');
  const singularityProgram = createProgram(gl, FULLSCREEN_VERTEX, SINGULARITY_FRAGMENT, 'singularity');
  const postProgram = createProgram(gl, FULLSCREEN_VERTEX, POST_FRAGMENT, 'postprocess');
  const fullscreenVao = gl.createVertexArray();
  const particleVao = gl.createVertexArray();
  if (!fullscreenVao || !particleVao) throw new Error('WebGL2 could not allocate vertex arrays');

  const particleCount = Math.max(1, Math.floor(quality?.particleCount ?? 2600));
  const seed = buildParticleSeedData(particleCount);
  gl.bindVertexArray(particleVao);
  const particleBuffers = [
    createParticleBuffer(gl, particleProgram, 'aPosition', seed.positions, 3),
    createParticleBuffer(gl, particleProgram, 'aDirection', seed.directions, 3),
    createParticleBuffer(gl, particleProgram, 'aSpeed', seed.speeds, 1),
    createParticleBuffer(gl, particleProgram, 'aSeed', seed.seeds, 1),
    createParticleBuffer(gl, particleProgram, 'aSize', seed.sizes, 1),
    createParticleBuffer(gl, particleProgram, 'aLife', seed.lives, 1),
    createParticleBuffer(gl, particleProgram, 'aClass', seed.classes, 1),
  ];
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  const particleUniforms = uniformLocations(gl, particleProgram, [
    'uTime', 'uExplosion', 'uFade', 'uOrigin', 'uAspect', 'uPixelRatio',
  ]);
  const singularityUniforms = uniformLocations(gl, singularityProgram, [
    'uTime', 'uEnergy', 'uOrigin', 'uResolution',
  ]);
  const postUniforms = uniformLocations(gl, postProgram, [
    'uScene', 'uResolution', 'uOrigin', 'uShockwave', 'uStrength', 'uBloom', 'uBloomRadius', 'uTime',
  ]);

  let cssWidth = 0;
  let cssHeight = 0;
  let measuredCssWidth = 0;
  let measuredCssHeight = 0;
  let sizeDirty = true;
  let bufferWidth = 1;
  let bufferHeight = 1;
  let originScreen = { x: 0.5, y: 0.5 };
  let originNdc = { x: 0, y: 0 };
  let originUv = { x: 0.5, y: 0.5 };
  let disposed = false;
  let contextWasLost = false;
  let canvasHasEffect = false;
  let sceneTarget = createSceneTarget(gl, 1, 1);

  const win = doc?.defaultView ?? globalThis.window;
  const measureViewport = () => {
    if (disposed || contextWasLost) return;
    measuredCssWidth = Math.max(1, container.clientWidth || win?.innerWidth || 1);
    measuredCssHeight = Math.max(1, container.clientHeight || win?.innerHeight || 1);
    sizeDirty = true;
  };
  const resizeObserver = typeof (win?.ResizeObserver ?? globalThis.ResizeObserver) === 'function'
    ? new (win?.ResizeObserver ?? globalThis.ResizeObserver)(measureViewport)
    : null;
  resizeObserver?.observe(container);
  win?.addEventListener?.('resize', measureViewport, { passive: true });
  measureViewport();

  const resize = () => {
    if (disposed || contextWasLost) return;
    const width = measuredCssWidth || 1;
    const height = measuredCssHeight || 1;
    const dpr = Math.max(1, Math.min(Number(quality?.dpr) || 1, Number(quality?.maxDpr) || 1.5));
    const nextBufferWidth = Math.max(1, Math.round(width * dpr));
    const nextBufferHeight = Math.max(1, Math.round(height * dpr));
    if (!sizeDirty && width === cssWidth && height === cssHeight && nextBufferWidth === bufferWidth && nextBufferHeight === bufferHeight) return;
    if (width === cssWidth && height === cssHeight && nextBufferWidth === bufferWidth && nextBufferHeight === bufferHeight) {
      sizeDirty = false;
      return;
    }
    cssWidth = width;
    cssHeight = height;
    bufferWidth = nextBufferWidth;
    bufferHeight = nextBufferHeight;
    canvas.width = bufferWidth;
    canvas.height = bufferHeight;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    resizeSceneTarget(gl, sceneTarget, bufferWidth, bufferHeight);
    originNdc = normalizeOriginToNdc(originScreen, cssWidth, cssHeight);
    originUv = { x: originScreen.x / cssWidth, y: 1 - originScreen.y / cssHeight };
    sizeDirty = false;
  };

  const updateOrigin = (point) => {
    originScreen = { x: Number(point?.x) || cssWidth / 2, y: Number(point?.y) || cssHeight / 2 };
    originNdc = normalizeOriginToNdc(originScreen, cssWidth, cssHeight);
    originUv = { x: originScreen.x / cssWidth, y: 1 - originScreen.y / cssHeight };
  };

  const contextLost = (event) => {
    if (disposed) return;
    contextWasLost = true;
    event?.preventDefault?.();
    onContextLost?.();
  };
  canvas.addEventListener('webglcontextlost', contextLost, { once: true });

  const renderScene = ({ elapsed, vfx }) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, sceneTarget.framebuffer);
    gl.viewport(0, 0, bufferWidth, bufferHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    if (vfx.singularityEnergy > 0.0001) {
      gl.useProgram(singularityProgram);
      gl.bindVertexArray(fullscreenVao);
      gl.uniform1f(singularityUniforms.uTime, elapsed);
      gl.uniform1f(singularityUniforms.uEnergy, vfx.singularityEnergy);
      gl.uniform2f(singularityUniforms.uOrigin, originUv.x, originUv.y);
      gl.uniform2f(singularityUniforms.uResolution, bufferWidth, bufferHeight);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    if (vfx.explosion > 0.0001 && vfx.fade > 0.0001) {
      gl.useProgram(particleProgram);
      gl.bindVertexArray(particleVao);
      gl.uniform1f(particleUniforms.uTime, elapsed);
      gl.uniform1f(particleUniforms.uExplosion, vfx.explosion);
      gl.uniform1f(particleUniforms.uFade, vfx.fade);
      gl.uniform2f(particleUniforms.uOrigin, originNdc.x, originNdc.y);
      gl.uniform1f(particleUniforms.uAspect, cssWidth / Math.max(1, cssHeight));
      gl.uniform1f(particleUniforms.uPixelRatio, bufferWidth / Math.max(1, cssWidth));
      gl.drawArrays(gl.POINTS, 0, particleCount);
    }
  };

  const renderPost = ({ elapsed, vfx }) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, bufferWidth, bufferHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.useProgram(postProgram);
    gl.bindVertexArray(fullscreenVao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTarget.texture);
    gl.uniform1i(postUniforms.uScene, 0);
    gl.uniform2f(postUniforms.uResolution, bufferWidth, bufferHeight);
    gl.uniform2f(postUniforms.uOrigin, originUv.x, originUv.y);
    gl.uniform1f(postUniforms.uShockwave, vfx.shockwave);
    gl.uniform1f(postUniforms.uStrength, vfx.shockwaveStrength);
    gl.uniform1f(postUniforms.uBloom, (Number(quality?.bloomStrength) || 0.9) * vfx.bloomBoost);
    gl.uniform1f(postUniforms.uBloomRadius, Number(quality?.bloomRadius) || 0.5);
    gl.uniform1f(postUniforms.uTime, elapsed);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindTexture(gl.TEXTURE_2D, null);
  };

  const clearOutput = () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, bufferWidth, bufferHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  };

  const render = (payload = {}) => {
    if (disposed || contextWasLost) return;
    resize();
    const elapsed = Number.isFinite(payload.elapsed) ? payload.elapsed : 0;
    const vfx = deriveVfxState(payload);
    if (!hasRenderableEffect(vfx)) {
      if (canvasHasEffect) clearOutput();
      canvasHasEffect = false;
      return;
    }
    canvasHasEffect = true;
    renderScene({ elapsed, vfx });
    renderPost({ elapsed, vfx });
  };

  return {
    particleSystemCount: 1,
    kind: 'native-webgl2',
    async prewarm() {
      resize();
      updateOrigin({ x: cssWidth / 2, y: cssHeight / 2 });
      render({
        phase: 'bigBang',
        progress: 0.2,
        elapsed: 3.18,
        windows: { primaryFlash: 0.5, bigBang: 0.2 },
      });
      render({ phase: 'hold', progress: 0, elapsed: 0, windows: {} });
      await waitForGpu(gl);
    },
    setOrigin(point) {
      resize();
      updateOrigin(point);
    },
    sample(payload) { render(payload); },
    debugLoseContext() {
      if (disposed) return false;
      const ext = gl.getExtension('WEBGL_lose_context');
      if (!ext) return false;
      ext.loseContext();
      return true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      resizeObserver?.disconnect?.();
      win?.removeEventListener?.('resize', measureViewport);
      canvas.removeEventListener('webglcontextlost', contextLost);
      safeDelete(gl, 'deleteFramebuffer', sceneTarget?.framebuffer);
      safeDelete(gl, 'deleteTexture', sceneTarget?.texture);
      for (const buffer of particleBuffers) safeDelete(gl, 'deleteBuffer', buffer);
      safeDelete(gl, 'deleteVertexArray', particleVao);
      safeDelete(gl, 'deleteVertexArray', fullscreenVao);
      safeDelete(gl, 'deleteProgram', particleProgram);
      safeDelete(gl, 'deleteProgram', singularityProgram);
      safeDelete(gl, 'deleteProgram', postProgram);
      if (!contextWasLost) {
        try { gl.getExtension('WEBGL_lose_context')?.loseContext?.(); } catch {}
      }
      canvas.remove();
      sceneTarget = null;
    },
  };
}

export const productionWebglAdapter = Object.freeze({
  createBackend: createNativeWebglBackend,
});
