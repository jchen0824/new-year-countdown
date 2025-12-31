import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';

// Helper to load font
export const loadFont = (url: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const loader = new FontLoader();
    loader.load(url, resolve, undefined, reject);
  });
};

// Generate random points on the surface of text
export const sampleTextGeometry = (text: string, font: any, sampleCount: number): Float32Array => {
  const geometry = new TextGeometry(text, {
    font: font,
    size: 8,
    depth: 0.01, // Flatter geometry concentrates particles on the face
    curveSegments: 6,
    bevelEnabled: false, // Disable bevel to sharp edges and cleaner text
  });

  geometry.center();
  geometry.computeBoundingBox();

  const posAttribute = geometry.attributes.position;
  const positions = new Float32Array(sampleCount * 3);
  const triangleCount = posAttribute.count / 3;
  const triangleAreas = [];
  let totalArea = 0;

  // Calculate triangle areas for weighted sampling
  for (let i = 0; i < triangleCount; i++) {
    const a = new THREE.Vector3().fromBufferAttribute(posAttribute, i * 3);
    const b = new THREE.Vector3().fromBufferAttribute(posAttribute, i * 3 + 1);
    const c = new THREE.Vector3().fromBufferAttribute(posAttribute, i * 3 + 2);

    const area = new THREE.Vector3().crossVectors(
      new THREE.Vector3().subVectors(b, a),
      new THREE.Vector3().subVectors(c, a)
    ).length() * 0.5;

    triangleAreas.push(area);
    totalArea += area;
  }

  // Sample points
  for (let i = 0; i < sampleCount; i++) {
    const r = Math.random() * totalArea;
    let accumulated = 0;
    let triangleIndex = 0;

    for (let j = 0; j < triangleCount; j++) {
      accumulated += triangleAreas[j];
      if (r <= accumulated) {
        triangleIndex = j;
        break;
      }
    }

    // Random point in triangle (Barycentric coordinates)
    const r1 = Math.random();
    const r2 = Math.random();
    const sqrtR1 = Math.sqrt(r1);
    const u = 1 - sqrtR1;
    const v = sqrtR1 * (1 - r2);
    const w = sqrtR1 * r2;

    const a = new THREE.Vector3().fromBufferAttribute(posAttribute, triangleIndex * 3);
    const b = new THREE.Vector3().fromBufferAttribute(posAttribute, triangleIndex * 3 + 1);
    const c = new THREE.Vector3().fromBufferAttribute(posAttribute, triangleIndex * 3 + 2);

    const p = new THREE.Vector3()
      .addScaledVector(a, u)
      .addScaledVector(b, v)
      .addScaledVector(c, w);

    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;
  }
  
  geometry.dispose();
  return positions;
};