// 描画まわり：レンダラ、ポストエフェクト（ブルーム・ビネット・粒子）、画質設定
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const QUALITY = {
  high: { dpr: 1.5, shadow: 1024, bloom: true, msaa: 4, lights: 8, mirror: 512 },
  medium: { dpr: 1.0, shadow: 512, bloom: true, msaa: 2, lights: 6, mirror: 384 },
  low: { dpr: 0.75, shadow: 256, bloom: false, msaa: 0, lights: 4, mirror: 256 },
};

export function createRenderer(canvas, quality = 'high') {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020203);
  scene.fog = new THREE.FogExp2(0x040405, 0.075);
  const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.03, 140);
  camera.rotation.order = 'YXZ';

  let composer, bloom, film, q;
  const filmShader = {
    uniforms: { tDiffuse: { value: null }, time: { value: 0 }, fade: { value: 1 }, flash: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float time; uniform float fade; uniform float flash; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        vec4 c = texture2D(tDiffuse, vUv);
        vec2 d = (vUv - 0.5) * vec2(1.0, 0.85);
        float v = smoothstep(0.78, 0.18, length(d));
        c.rgb *= mix(0.42, 1.0, v);
        float n = h(vUv * vec2(1920.0, 1080.0) + fract(time * 13.7) * 100.0);
        c.rgb += (n - 0.5) * (0.05 + flash * 0.25);
        c.rgb = mix(c.rgb, vec3(dot(c.rgb, vec3(0.299,0.587,0.114))), 0.18 + flash * 0.5);
        c.rgb *= (1.0 - fade);
        gl_FragColor = vec4(c.rgb, 1.0);
      }`,
  };

  function build(qualityName) {
    q = QUALITY[qualityName] || QUALITY.high;
    const dpr = Math.min(window.devicePixelRatio || 1, q.dpr);
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight);
    const prevFade = film ? film.uniforms.fade.value : 1;
    composer?.dispose?.();
    const rt = new THREE.WebGLRenderTarget(window.innerWidth * dpr, window.innerHeight * dpr, { type: THREE.HalfFloatType, samples: q.msaa });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), 0.55, 0.6, 0.82);
    bloom.enabled = q.bloom;
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    film = new ShaderPass(filmShader);
    film.uniforms.fade.value = prevFade;
    composer.addPass(film);
    // 影の解像度
    scene.traverse((o) => {
      if (o.isLight && o.castShadow && o.shadow) {
        const size = Math.max(q.shadow, o.userData.minShadow || 0);
        if (o.shadow.mapSize.x !== size) {
          o.shadow.mapSize.set(size, size);
          o.shadow.map?.dispose();
          o.shadow.map = null;
          o.shadow.needsUpdate = true;
        }
      }
    });
  }
  build(quality);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    bloom.setSize(window.innerWidth / 2, window.innerHeight / 2);
  });

  return {
    renderer, scene, camera,
    get film() { return film; },
    setQuality: build,
    get shadowSize() { return q.shadow; },
    get quality() { return q; },
    render() { composer.render(); },
  };
}
