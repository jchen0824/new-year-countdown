import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { HandData } from '../types';

export const useHandTracking = () => {
  const [handData, setHandData] = useState<HandData>({ x: 0.5, y: 0.5, isFist: false, isPresent: false });
  const [isReady, setIsReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastVideoTimeRef = useRef(-1);
  const requestRef = useRef<number>(0);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);

  useEffect(() => {
    const initMediaPipe = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      
      handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });

      startWebcam();
    };

    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener("loadeddata", () => {
            setIsReady(true);
            predict();
          });
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    };

    initMediaPipe();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (handLandmarkerRef.current) handLandmarkerRef.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const predict = () => {
    if (!handLandmarkerRef.current || !videoRef.current) return;

    if (videoRef.current.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = videoRef.current.currentTime;
      const result = handLandmarkerRef.current.detectForVideo(videoRef.current, performance.now());

      if (result.landmarks && result.landmarks.length > 0) {
        const landmarks = result.landmarks[0];
        
        // 1. Calculate Position (Center of Palm - roughly landmark 9)
        // MediaPipe coords: x (0 left, 1 right), y (0 top, 1 bottom)
        // We flip X because webcams are usually mirrored for the user
        const x = 1.0 - landmarks[9].x; 
        const y = landmarks[9].y;

        // 2. Calculate Fist (Euclidean distance between finger tips and wrist)
        // Wrist: 0
        // Tips: 8 (Index), 12 (Middle), 16 (Ring), 20 (Pinky)
        const wrist = landmarks[0];
        const tips = [8, 12, 16, 20];
        
        let avgDist = 0;
        tips.forEach(idx => {
          const tip = landmarks[idx];
          const dist = Math.sqrt(
            Math.pow(tip.x - wrist.x, 2) + 
            Math.pow(tip.y - wrist.y, 2) + 
            Math.pow(tip.z - wrist.z, 2)
          );
          avgDist += dist;
        });
        avgDist /= tips.length;

        // Threshold determined empirically. < 0.25 usually means closed fist relative to hand size
        // However, Z depth affects this. Using palm center (0) to middle finger base (9) as a scale factor makes it robust.
        const handScale = Math.sqrt(
            Math.pow(landmarks[9].x - landmarks[0].x, 2) + 
            Math.pow(landmarks[9].y - landmarks[0].y, 2)
        );

        const isFist = avgDist < (handScale * 1.8); // Relative threshold

        setHandData({ x, y, isFist, isPresent: true });
      } else {
        setHandData(prev => ({ ...prev, isPresent: false }));
      }
    }
    requestRef.current = requestAnimationFrame(predict);
  };

  return { videoRef, handData, isReady };
};
