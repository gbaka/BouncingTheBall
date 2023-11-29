// // customShaderMaterial.js
// import * as THREE from 'https://cdn.skypack.dev/three@r130/build/three.module.js';
// import { ShaderMaterial } from 'https://cdn.skypack.dev/three-shader-material@1.4.0/dist/three-shader-material.esm.js';

const haloVertexShader = /*glsl*/`
varying vec3 vertexNormal;
void main() {
     vertexNormal = normal;
     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);   
}
`;
const haloFragmentShader = /*glsl*/`
varying vec3 vertexNormal;
void main() {
float intensity = pow(0.9 - dot(vertexNormal, vec3(0, 0, 1.0)), 2.0);
gl_FragColor = vec4(0.8, 1.0, 0.6, 0.2) * intensity;
}
`;

const customShaderMaterial = new THREE.ShaderMaterial({
    vertexShader:haloVertexShader,
    fragmentShader:haloFragmentShader,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide
});

// export default customShaderMaterial;
