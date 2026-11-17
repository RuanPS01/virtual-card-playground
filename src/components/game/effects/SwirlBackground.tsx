import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/game/stage';
import { tokenRgb } from '@/lib/tokens';

// Fundo animado: tinta em redemoinho lento, desenhada por um fragment shader.
// O canvas é renderizado em baixa resolução e ampliado com pixels visíveis.
// Isso dá o aspecto de pixel art e, de quebra, custa quase nada na GPU de um
// celular: são poucas dezenas de milhares de pixels por quadro.

const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAGMENT = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  float r = length(uv);
  float t = u_time * 0.11;

  // Gira mais perto do centro que nas bordas: é o que forma o redemoinho.
  float angle = 1.1 * exp(-1.4 * r) + t * 0.35;
  mat2 spin = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  vec2 p = spin * uv * 2.4;

  // Deformação em camadas: cada passo entorta o espaço do passo anterior.
  for (int i = 1; i < 5; i++) {
    float k = float(i);
    p.x += 0.6 / k * sin(k * 1.6 * p.y + t * 1.2 + 0.7 * k);
    p.y += 0.6 / k * cos(k * 1.4 * p.x - t + 1.9 * k);
  }

  float a = 0.5 + 0.5 * sin(p.x + p.y);
  float b = 0.5 + 0.5 * cos(p.x * 0.8 - p.y * 1.3 + t);

  vec3 color = mix(u_c1, u_c2, smoothstep(0.15, 0.85, a));
  color = mix(color, u_c3, smoothstep(0.55, 1.0, b) * 0.7);

  // Poucos degraus de cor, como tinta chapada.
  color = floor(color * 18.0 + 0.5) / 18.0;
  color *= 1.0 - 0.5 * r * r;
  gl_FragColor = vec4(color, 1.0);
}
`;

/** Quanto o canvas é menor que a tela. Maior = pixels maiores e menos custo. */
const PIXEL = 5;
const FRAME_MS = 1000 / 30;

const compile = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
};

const SwirlBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    // Sem WebGL o canvas fica transparente e aparece o degradê de .stage-bg.
    const gl = canvas?.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!canvas || !gl) return;

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    gl.uniform3fv(gl.getUniformLocation(program, 'u_c1'), tokenRgb('--felt-1'));
    gl.uniform3fv(gl.getUniformLocation(program, 'u_c2'), tokenRgb('--felt-2'));
    gl.uniform3fv(gl.getUniformLocation(program, 'u_c3'), tokenRgb('--felt-3'));
    const uRes = gl.getUniformLocation(program, 'u_res');
    const uTime = gl.getUniformLocation(program, 'u_time');

    const still = prefersReducedMotion();
    let frame = 0;
    let lastDraw = 0;
    // Começa em um ponto aleatório para duas abas não ficarem idênticas.
    const offset = Math.random() * 100;

    const draw = (time: number) => {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, offset + time / 1000);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const resize = () => {
      const width = Math.max(2, Math.round(canvas.clientWidth / PIXEL));
      const height = Math.max(2, Math.round(canvas.clientHeight / PIXEL));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      draw(still ? 0 : performance.now());
    };

    const loop = (time: number) => {
      frame = requestAnimationFrame(loop);
      // 30 quadros por segundo bastam para um movimento tão lento, e aba em
      // segundo plano não desenha nada.
      if (time - lastDraw < FRAME_MS || document.hidden) return;
      lastDraw = time;
      draw(time);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    if (!still) frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="stage-bg" aria-hidden="true">
      <canvas ref={canvasRef} className="stage-bg-canvas" />
    </div>
  );
};

export default SwirlBackground;
