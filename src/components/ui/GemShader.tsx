import { useEffect, useRef } from 'react';

type Palette = readonly [string, string, string];

/**
 * A lava lamp, drawn by a fragment shader behind a card.
 *
 * Four metaballs drift sideways and rise through the card; where their fields
 * overlap they read as wax, and a thin lit rim marks the wax edge. Motion is
 * slow on purpose: you notice it over a few seconds, never at a glance. A
 * specular highlight follows the pointer, and the bottom settles into the
 * stone's depth colour so a caption can sit on it. Each card gets its own
 * seed, so no two cards move in step.
 *
 * It only animates while on screen, draws one still frame under
 * prefers-reduced-motion, renders below device resolution (the image is soft
 * by design, so the saving is free), and leaves the CSS gem gradient
 * underneath as the fallback when WebGL is unavailable.
 */
const FRAG = `precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform vec3 uLight;
uniform vec3 uBody;
uniform vec3 uDepth;
uniform float uDark;
uniform float uSeed;

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = (uTime + uSeed * 37.0) * 0.45;

  // Metaballs: four soft blobs drifting sideways and rising, wrapping from the
  // bottom back to the top. Their summed field is the "wax" of the lamp.
  float field = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    vec2 c = vec2(0.7 * sin(t * 0.3 + fi * 2.1), mod(t * 0.12 + fi * 0.37, 1.8) - 0.9);
    vec2 d = p - c;
    field += 0.09 / dot(d, d);
  }

  // Inside the wax, and a lit rim just where the wax meets the liquid.
  float wax = smoothstep(0.9, 1.9, field);
  float rim = smoothstep(1.0, 1.25, field) - smoothstep(1.25, 1.7, field);

  vec3 col = mix(uDepth, uBody, 0.3 + 0.4 * uv.y);
  col = mix(col, mix(uBody, uLight, 0.6), wax * 0.85);
  col += uLight * rim * mix(0.25, 0.4, uDark);

  // Specular highlight that follows the pointer.
  float spec = exp(-6.0 * length((uv - uMouse) * vec2(uRes.x / uRes.y, 1.0)));
  col += uLight * spec * mix(0.22, 0.4, uDark);

  // Settle into the depth colour at the bottom, where captions sit.
  col = mix(col, uDepth, smoothstep(0.42, 0.0, uv.y) * 0.6);

  gl_FragColor = vec4(col, 1.0);
}`;

const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';

const rgb = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255] as const;
};

const isDark = () => document.documentElement.classList.contains('dark');

const GemShader = ({ light, dark }: { light: Palette; dark: Palette }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const palettes = useRef({ light, dark });
  palettes.current = { light, dark };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: false,
      powerPreference: 'low-power',
    });
    if (!gl) {
      console.warn('GemShader: WebGL unavailable, keeping the CSS gem.');
      return;
    }

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (gl.getShaderParameter(s, gl.COMPILE_STATUS)) return s;
      console.warn('GemShader compile failed:', gl.getShaderInfoLog(s));
      return null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook.
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(prog, name);
    const uRes = u('uRes');
    const uTime = u('uTime');
    const uMouse = u('uMouse');
    const uLight = u('uLight');
    const uBody = u('uBody');
    const uDepth = u('uDepth');
    const uDark = u('uDark');
    const uSeed = u('uSeed');
    const seed = Math.random() * 10;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mouse = { x: 0.2, y: 0.85, tx: 0.2, ty: 0.85 };
    let visible = false;
    let raf = 0;
    let last = 0;
    const start = performance.now();

    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 2) * 0.6;
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * scale));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const draw = (now: number) => {
      const dark = isDark();
      const [l, b, d] = (dark ? palettes.current.dark : palettes.current.light).map(rgb);
      mouse.x += (mouse.tx - mouse.x) * 0.08;
      mouse.y += (mouse.ty - mouse.y) * 0.08;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, reduced ? 0 : (now - start) / 1000);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform3f(uLight, l[0], l[1], l[2]);
      gl.uniform3f(uBody, b[0], b[1], b[2]);
      gl.uniform3f(uDepth, d[0], d[1], d[2]);
      gl.uniform1f(uDark, dark ? 1 : 0);
      gl.uniform1f(uSeed, seed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // ~30fps is plenty for a slow drift and halves the cost of eight canvases.
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 33) return;
      last = now;
      draw(now);
    };
    const run = () => {
      cancelAnimationFrame(raf);
      if (!visible) return;
      if (reduced) draw(performance.now());
      else raf = requestAnimationFrame(loop);
    };

    // The card around the canvas receives the pointer; the canvas itself ignores it.
    const host = canvas.closest<HTMLElement>('a, #skills');
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.tx = (e.clientX - r.left) / r.width;
      mouse.ty = 1 - (e.clientY - r.top) / r.height;
      if (reduced) draw(performance.now());
    };
    const onLeave = () => {
      mouse.tx = 0.2;
      mouse.ty = 0.85;
    };
    host?.addEventListener('pointermove', onMove);
    host?.addEventListener('pointerleave', onLeave);

    const ro = new ResizeObserver(() => {
      resize();
      draw(performance.now());
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      run();
    });
    io.observe(canvas);
    // The theme lives on <html>; redraw when it flips so a paused canvas updates.
    const mo = new MutationObserver(() => draw(performance.now()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      host?.removeEventListener('pointermove', onMove);
      host?.removeEventListener('pointerleave', onLeave);
      // Free the program but keep the context: React re-runs effects in
      // development, and a lost context comes back unusable on the same canvas.
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      <canvas ref={canvasRef} className="h-full w-full" />
    </span>
  );
};

export default GemShader;
