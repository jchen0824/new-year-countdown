import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { loadFont, sampleTextGeometry } from '../utils/geometry';
import { HandData, ParticleShape } from '../types';

// Constants
const PARTICLE_COUNT = 9000; // Increased density for better text resolution
const FONT_URL = 'https://threejs.org/examples/fonts/helvetiker_bold.typeface.json';

interface ParticleNumberProps {
  handData: HandData;
  targetNumber: number;
}

const ParticleNumber: React.FC<ParticleNumberProps> = ({ handData, targetNumber }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { viewport, camera } = useThree();
  const [font, setFont] = useState<any>(null);
  
  // Physics State
  // We store positions and velocities in CPU arrays for maximum control over behavior
  const particles = useMemo(() => {
    return new Array(PARTICLE_COUNT).fill(0).map(() => ({
      pos: new THREE.Vector3((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 10),
      vel: new THREE.Vector3(),
      target: new THREE.Vector3(),
      color: new THREE.Color(),
      speed: 0.08 + Math.random() * 0.06, // Slightly faster
      phase: Math.random() * Math.PI * 2, // For noise offset
    }));
  }, []);

  // Load Font
  useEffect(() => {
    loadFont(FONT_URL).then(setFont);
  }, []);

  // Pre-calculate shapes
  const shapes = useMemo(() => {
    if (!font) return {};
    
    // Create buffers for all numbers
    const shapeMap: Record<string, Float32Array> = {};
    const numbers = [5, 4, 3, 2, 1, 0];
    
    numbers.forEach(n => {
      shapeMap[n.toString()] = sampleTextGeometry(n.toString(), font, PARTICLE_COUNT);
    });

    // Reduce scale for "Happy 2026" implicitly by generating it, we will scale logic later
    shapeMap['happy'] = sampleTextGeometry('Happy\n 2026', font, PARTICLE_COUNT);

    return shapeMap;
  }, [font]);

  // Dummy object for setting matrix
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  useFrame((state) => {
    if (!meshRef.current || !font) return;

    // 1. Calculate Hand Position in 3D World Space
    const targetX = (handData.x - 0.5) * viewport.width;
    const targetY = -(handData.y - 0.5) * viewport.height;
    
    // If hand is not present, float in center
    const handX = handData.isPresent ? targetX : 0;
    const handY = handData.isPresent ? targetY : 0;
    const handZ = 0;

    // 2. Determine Target Shape
    let currentShapeKey = targetNumber.toString();
    if (targetNumber <= 0) currentShapeKey = 'happy';

    const targetPositions = shapes[currentShapeKey];

    const time = state.clock.elapsedTime;

    // 3. Update Particles
    particles.forEach((p, i) => {
      if (targetPositions) {
        // Get the target local position for this particle index
        const idx3 = (i % (targetPositions.length / 3)) * 3;
        
        let tx = targetPositions[idx3];
        let ty = targetPositions[idx3 + 1];
        let tz = targetPositions[idx3 + 2];

        // Apply implosion effect if hand is a fist
        if (handData.isFist && targetNumber > 0) {
            tx *= 0.1;
            ty *= 0.1;
            tz *= 0.1;
        }

        // Adjust scale for specific numbers/text to fit screen
        // Base Geometry Size is now 8. 
        // Single digit height ~8 units.
        // Double line text height ~16 units.
        // Viewport height at z=15 is approx 12 units.
        
        let scale = 1.0; 
        if (targetNumber === 0) scale = 0.55; // 16 * 0.55 = 8.8 units height (Fits nicely)
        else scale = 1.1; // 8 * 1.1 = 8.8 units height (Matches size of happy text)

        p.target.set(
            handX + tx * scale,
            handY + ty * scale,
            handZ + tz * scale
        );
      }

      // Physics: Spring force
      const force = new THREE.Vector3().subVectors(p.target, p.pos).multiplyScalar(p.speed);
      
      // Plasma Noise / Turbulence
      // Reduced noise amplitude (0.05 -> 0.02) to keep text sharp and legible
      force.x += Math.sin(time * 4 + p.phase) * 0.02;
      force.y += Math.cos(time * 3 + p.phase) * 0.02;
      force.z += Math.sin(time * 5 + p.phase) * 0.02;

      p.vel.add(force);
      p.vel.multiplyScalar(0.90); // Less damping for more energetic movement
      p.pos.add(p.vel);

      // Update Matrix
      dummy.position.copy(p.pos);
      
      // Scale particles: Small core, pulsating
      // Base scale reduced significantly for sharpness
      const scaleBase = 0.5; 
      const pulse = Math.sin(time * 8 + p.phase) * 0.2 + 1; // Fast pulse
      dummy.scale.setScalar(scaleBase * pulse);
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      // Plasma Colors
      // Use HSL for vibrant shifts
      // Base color depends on state
      const color = new THREE.Color();
      
      if (targetNumber === 0) {
         // Golden/White Fireworks
         const hue = 0.1 + Math.sin(time + p.pos.x * 0.1) * 0.05; // Gold range
         color.setHSL(hue, 1.0, 0.6 + Math.random() * 0.4);
      } else {
         // Cyan/Magenta Plasma
         // Map position X to Hue (Cyan 0.5 to Magenta 0.8)
         const hue = 0.5 + (Math.sin(time * 0.5 + p.pos.x * 0.1) + 1) * 0.15;
         color.setHSL(hue, 1.0, 0.6);
      }
      
      // Boost brightness for HDR Bloom
      color.r *= 2.0;
      color.g *= 2.0;
      color.b *= 2.0;

      meshRef.current.setColorAt(i, color);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      {/* Much smaller geometry for crisp points */}
      <dodecahedronGeometry args={[0.08, 0]} />
      {/* Additive blending for plasma glow */}
      <meshBasicMaterial 
        toneMapped={false}
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
};

export default ParticleNumber;