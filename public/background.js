/**
 * Fluid pixel background.
 *
 * Three GPU passes per frame:
 *   1. flow     - a persistent, self-advecting velocity field. The pointer injects
 *                 momentum into it, so the current keeps flowing after the cursor
 *                 has moved on and slowly decays.
 *   2. field    - three octave fBm, its domain warped by the flow field.
 *   3. dots     - fixed pixel cells that sample the field from an upstream point,
 *                 which makes the sparse grid appear to stream along the flow.
 *
 * Degrades to a plain background when WebGL2 is missing, and renders a single
 * static frame when the visitor asks for reduced motion.
 */
(() => {
  'use strict';

  const canvas = document.querySelector('#bg-pixels');
  if (!canvas) return;

  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: false,
    powerPreference: 'low-power',
    stencil: false,
  });

  if (!gl) {
    canvas.remove();
    return;
  }

  const CONFIG = {
    pixelSize: 5,
    pixelGap: 2,
    fieldSpeed: 0.18,
    fieldScale: 0.5,
    flowScale: 0.25,
    maxDpr: 1.25,
  };

  const VERTEX = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * .5 + .5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

  // Shared between the flow and field passes.
  const NOISE = `
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise(vec2 p) {
  const float K1 = .366025404;
  const float K2 = .211324865;
  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  vec2 o = a.x > a.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
  vec3 n = h * h * h * h * vec3(dot(a, hash2(i)), dot(b, hash2(i + o)), dot(c, hash2(i + 1.0)));
  return dot(n, vec3(70.0));
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = .5;
  float frequency = 1.0;
  for (int i = 0; i < 3; i++) {
    value += amplitude * noise(p * frequency);
    frequency *= 2.0;
    amplitude *= .5;
  }
  return value * .5 + .5;
}`;

  const DECODE = `
vec2 decodeFlow(vec2 c) { return c * 2.0 - 1.0; }`;

  // rg = pointer-driven current, ba = current + ambient drift (what the other passes read).
  const FLOW = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uFlow;
uniform vec2 uMouse;
uniform vec2 uMousePrev;
uniform float uMouseActive;
uniform float uAspect;
uniform float uDt;
uniform float uTime;
${NOISE}
${DECODE}

vec2 encodeFlow(vec2 v) { return clamp(v, -1.0, 1.0) * .5 + .5; }

vec2 ambient(vec2 uv, float t) {
  vec2 q = vec2(
    fbm(uv * 1.5 + vec2(0.0, .18 * t)),
    fbm(uv * 1.5 + vec2(1.2, -.24 * t))
  );
  return vec2((q.x - .5) * .35, (q.y - .5) * 1.1 + .3) * .085;
}

float segmentDistance(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-7), 0.0, 1.0);
  return distance(p, a + ab * h);
}

void main() {
  vec2 uv = vUv;
  vec2 base = ambient(uv, uTime);
  vec2 current = decodeFlow(texture(uFlow, uv).rg);

  // Semi-Lagrangian advection: pull the current from upstream so it drifts along
  // itself and along the ambient stream instead of sitting where it was drawn.
  vec2 upstream = clamp(uv - (current + base) * uDt, vec2(.001), vec2(.999));
  current = decodeFlow(texture(uFlow, upstream).rg) * exp(-uDt * 1.45);

  // Splat the pointer stroke as a capsule between the last two frames, so fast
  // moves stay continuous instead of leaving gaps.
  vec2 p = vec2(uv.x * uAspect, uv.y);
  vec2 from = vec2(uMousePrev.x * uAspect, uMousePrev.y);
  vec2 to = vec2(uMouse.x * uAspect, uMouse.y);
  float reach = segmentDistance(p, from, to) / .13;
  float falloff = exp(-reach * reach) * uMouseActive;

  current += ((to - from) / max(uDt, 1e-4)) * falloff * uDt * 2.1;

  // A little rotation around the cursor keeps the water alive while it rests.
  vec2 toMouse = to - p;
  current += (vec2(-toMouse.y, toMouse.x) / max(length(toMouse), 1e-4)) * falloff * uDt * .35;

  float speed = length(current);
  if (speed > 1.0) current /= speed;

  outColor = vec4(encodeFlow(current), encodeFlow(current + base));
}`;

  const FIELD = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uFlow;
uniform float uTime;
uniform float uSpeed;
${NOISE}
${DECODE}

void main() {
  vec2 uv = vUv - decodeFlow(texture(uFlow, vUv).ba) * .2;
  float t = uTime * uSpeed;
  vec2 q = vec2(
    fbm(uv * .5 + vec2(0.0, .2 * t)),
    fbm(uv * .5 + vec2(1.2, -.3 * t))
  );
  outColor = vec4(vec3(fbm(uv * .5 + q * 4.0)), 1.0);
}`;

  const DOTS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uField;
uniform sampler2D uFlow;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uMouseActive;
uniform float uAspect;
uniform float uPixelSize;
uniform float uPixelGap;
uniform vec3 uAccent;
uniform vec3 uHighlight;
${DECODE}

float random(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  vec2 pixelCoord = vUv * uResolution;
  float total = uPixelSize + uPixelGap;
  vec2 blockId = floor(pixelCoord / total);
  vec2 blockPos = blockId * total;
  vec2 posInBlock = pixelCoord - blockPos;

  if (posInBlock.x > uPixelSize || posInBlock.y > uPixelSize) {
    outColor = vec4(0.0);
    return;
  }

  // Cells stay put; only the point they read from moves, which reads as flow.
  vec2 centerUv = (blockPos + vec2(uPixelSize * .5)) / uResolution;
  vec4 flow = texture(uFlow, centerUv);
  float field = texture(uField, clamp(centerUv - decodeFlow(flow.ba) * .17, vec2(0.0), vec2(1.0))).r;

  float threshold = .66 - .16 * random(blockId);
  if (field <= threshold) {
    outColor = vec4(0.0);
    return;
  }

  float energy = clamp(length(decodeFlow(flow.rg)) * 2.4, 0.0, 1.0);
  float near = (1.0 - smoothstep(0.0, .3, distance(
    vec2(centerUv.x * uAspect, centerUv.y),
    vec2(uMouse.x * uAspect, uMouse.y)
  ))) * uMouseActive;

  vec3 tint = random(blockId + 7.3) < .5 ? uAccent : uHighlight;
  vec3 color = mix(tint, uHighlight, clamp(energy * .7 + near * .45, 0.0, 1.0));
  float alpha = clamp(.34 + .52 * smoothstep(threshold, threshold + .16, field) + .32 * energy + .2 * near, 0.0, 1.0);
  outColor = vec4(color, alpha);
}`;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }

  function createProgram(fragment) {
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const name = gl.getActiveUniform(program, i).name;
      uniforms[name] = gl.getUniformLocation(program, name);
    }
    return { program, uniforms, position: gl.getAttribLocation(program, 'aPosition') };
  }

  function readColor(variable, fallback) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    const hex = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(raw);
    if (!hex) return fallback;
    const digits = hex[1].length === 3 ? hex[1].replace(/./g, char => char + char) : hex[1];
    return [0, 2, 4].map(offset => parseInt(digits.slice(offset, offset + 2), 16) / 255);
  }

  let flowPass;
  let fieldPass;
  let dotPass;
  try {
    flowPass = createProgram(FLOW);
    fieldPass = createProgram(FIELD);
    dotPass = createProgram(DOTS);
  } catch (error) {
    console.warn('Background shaders failed to build:', error);
    canvas.remove();
    return;
  }

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const halfFloat = gl.getExtension('EXT_color_buffer_float');
  const accent = readColor('--accent', [0.388, 0.702, 0.929]);
  const highlight = readColor('--text', [0.929, 0.949, 0.969]);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let flowTargets = [];
  let fieldTarget = null;
  let width = 1;
  let height = 1;
  let dpr = 1;
  let time = 0;
  let lastFrame = 0;
  let rafId = 0;
  let pointer = [0.5, 0.5];
  let pointerPrev = [0.5, 0.5];
  let pointerInside = 0;
  let pointerMix = 0;

  function createTarget(scale, internalFormat, format, type) {
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, targetWidth, targetHeight, 0, format, type, null);

    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    return { texture, framebuffer, width: targetWidth, height: targetHeight };
  }

  function release(target) {
    if (!target) return;
    gl.deleteTexture(target.texture);
    gl.deleteFramebuffer(target.framebuffer);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, CONFIG.maxDpr);
    const nextWidth = Math.max(1, Math.round(rect.width * dpr));
    const nextHeight = Math.max(1, Math.round(rect.height * dpr));
    if (nextWidth === width && nextHeight === height && fieldTarget) return;

    width = nextWidth;
    height = nextHeight;
    canvas.width = width;
    canvas.height = height;

    flowTargets.forEach(release);
    release(fieldTarget);

    const [internalFormat, type] = halfFloat
      ? [gl.RGBA16F, gl.HALF_FLOAT]
      : [gl.RGBA8, gl.UNSIGNED_BYTE];
    flowTargets = [
      createTarget(CONFIG.flowScale, internalFormat, gl.RGBA, type),
      createTarget(CONFIG.flowScale, internalFormat, gl.RGBA, type),
    ];
    fieldTarget = createTarget(CONFIG.fieldScale, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);

    // 0.5 is the encoded zero velocity.
    gl.clearColor(0.5, 0.5, 0.5, 0.5);
    for (const target of flowTargets) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  function usePass(pass, target) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.framebuffer : null);
    gl.viewport(0, 0, target ? target.width : width, target ? target.height : height);
    gl.useProgram(pass.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(pass.position);
    gl.vertexAttribPointer(pass.position, 2, gl.FLOAT, false, 0, 0);
  }

  function render(dt) {
    const aspect = width / height;
    pointerMix += (pointerInside - pointerMix) * Math.min(1, dt * 6);

    const source = flowTargets[0];
    const destination = flowTargets[1];
    usePass(flowPass, destination);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, source.texture);
    gl.uniform1i(flowPass.uniforms.uFlow, 0);
    gl.uniform2f(flowPass.uniforms.uMouse, pointer[0], pointer[1]);
    gl.uniform2f(flowPass.uniforms.uMousePrev, pointerPrev[0], pointerPrev[1]);
    gl.uniform1f(flowPass.uniforms.uMouseActive, pointerMix);
    gl.uniform1f(flowPass.uniforms.uAspect, aspect);
    gl.uniform1f(flowPass.uniforms.uDt, dt);
    gl.uniform1f(flowPass.uniforms.uTime, time);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    flowTargets = [destination, source];

    usePass(fieldPass, fieldTarget);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, destination.texture);
    gl.uniform1i(fieldPass.uniforms.uFlow, 0);
    gl.uniform1f(fieldPass.uniforms.uTime, time);
    gl.uniform1f(fieldPass.uniforms.uSpeed, CONFIG.fieldSpeed);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    usePass(dotPass, null);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fieldTarget.texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, destination.texture);
    gl.uniform1i(dotPass.uniforms.uField, 0);
    gl.uniform1i(dotPass.uniforms.uFlow, 1);
    gl.uniform2f(dotPass.uniforms.uResolution, width, height);
    gl.uniform2f(dotPass.uniforms.uMouse, pointer[0], pointer[1]);
    gl.uniform1f(dotPass.uniforms.uMouseActive, pointerMix);
    gl.uniform1f(dotPass.uniforms.uAspect, aspect);
    gl.uniform1f(dotPass.uniforms.uPixelSize, CONFIG.pixelSize * dpr);
    gl.uniform1f(dotPass.uniforms.uPixelGap, CONFIG.pixelGap * dpr);
    gl.uniform3f(dotPass.uniforms.uAccent, accent[0], accent[1], accent[2]);
    gl.uniform3f(dotPass.uniforms.uHighlight, highlight[0], highlight[1], highlight[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    pointerPrev = pointer;
  }

  function frame(now) {
    rafId = 0;
    const dt = Math.min(Math.max((now - lastFrame) / 1000, 0), 1 / 30) || 1 / 60;
    lastFrame = now;
    time += dt;
    render(dt);
    schedule();
  }

  function schedule() {
    if (rafId || document.hidden || reducedMotion.matches) return;
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    lastFrame = performance.now();
    if (reducedMotion.matches) {
      pointerMix = 0;
      render(1 / 60);
      return;
    }
    schedule();
  }

  window.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    pointer = [event.clientX / window.innerWidth, 1 - event.clientY / window.innerHeight];
    pointerInside = 1;
  }, { passive: true });

  window.addEventListener('pointerdown', event => {
    pointer = [event.clientX / window.innerWidth, 1 - event.clientY / window.innerHeight];
    pointerInside = 1;
  }, { passive: true });

  window.addEventListener('touchmove', event => {
    const touch = event.touches[0];
    if (!touch) return;
    pointer = [touch.clientX / window.innerWidth, 1 - touch.clientY / window.innerHeight];
    pointerInside = 1;
  }, { passive: true });

  document.documentElement.addEventListener('pointerleave', () => { pointerInside = 0; });
  window.addEventListener('touchend', () => { pointerInside = 0; }, { passive: true });
  window.addEventListener('blur', () => { pointerInside = 0; });
  document.addEventListener('visibilitychange', () => {
    lastFrame = performance.now();
    schedule();
  });
  reducedMotion.addEventListener('change', () => {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    start();
  });
  new ResizeObserver(() => {
    resize();
    if (reducedMotion.matches) render(1 / 60);
    else schedule();
  }).observe(canvas);

  resize();
  start();
})();
