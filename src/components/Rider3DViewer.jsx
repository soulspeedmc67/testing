import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Sparkles, RotateCw } from "lucide-react";

export default function Rider3DViewer({
  className = "w-full h-64",
  autoRotate = true,
  interactive = true,
  showControls = true
}) {
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isRotating, setIsRotating] = useState(autoRotate);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animId;
    let renderer, scene, camera, controls, modelGroup;

    try {
      const width = container.clientWidth || 320;
      const height = container.clientHeight || 240;

      // 1. Scene setup
      scene = new THREE.Scene();

      // 2. Camera setup matching scripts/rider3d framing
      camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
      camera.position.set(0, 1.8, 3.8);

      // 3. Renderer setup with high visual fidelity
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.NeutralToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      container.innerHTML = "";
      container.appendChild(renderer.domElement);

      // 4. Studio Lighting matching the 3D generation setup
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0xcdbfb0, 1.1);
      scene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight(0xfff4e6, 2.8);
      keyLight.position.set(-3.5, 6, 3.5);
      keyLight.castShadow = true;
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0xcfe0ff, 1.2);
      rimLight.position.set(4, 3, -3.5);
      scene.add(rimLight);

      const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
      fillLight.position.set(3, 1.5, 4);
      scene.add(fillLight);

      // 5. Controls
      if (interactive) {
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enablePan = false;
        controls.enableZoom = false;
        controls.autoRotate = autoRotate;
        controls.autoRotateSpeed = 1.8;
        controls.minPolarAngle = Math.PI / 4;
        controls.maxPolarAngle = Math.PI / 2 + 0.1;
      }

      // 6. Load 3D GLB Model
      const loader = new GLTFLoader();
      loader.load(
        "/3d/dashit-rider.glb",
        (gltf) => {
          modelGroup = gltf.scene;

          // Compute bounding box to center perfectly
          const box = new THREE.Box3().setFromObject(modelGroup);
          const center = box.getCenter(new THREE.Vector3());

          modelGroup.position.x += -center.x;
          modelGroup.position.y += -center.y + 0.1;
          modelGroup.position.z += -center.z;

          // Enable shadows and enhance materials
          modelGroup.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                child.material.needsUpdate = true;
              }
            }
          });

          scene.add(modelGroup);
          if (controls) {
            controls.target.set(0, 0, 0);
          }
          setIsLoading(false);
        },
        undefined,
        (err) => {
          console.error("Error loading DASHit 3D rider model:", err);
          setLoadError(true);
          setIsLoading(false);
        }
      );

      // 7. Animation loop
      const clock = new THREE.Clock();
      const animate = () => {
        animId = requestAnimationFrame(animate);
        const delta = clock.getDelta();

        if (controls) {
          controls.update();
        } else if (modelGroup && isRotating) {
          modelGroup.rotation.y += delta * 0.8;
        }

        renderer.render(scene, camera);
      };
      animate();

      // 8. Resize listener
      const handleResize = () => {
        if (!container || !renderer || !camera) return;
        const newW = container.clientWidth || 320;
        const newH = container.clientHeight || 240;
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        cancelAnimationFrame(animId);
        if (controls) controls.dispose();
        if (renderer) renderer.dispose();
      };
    } catch (e) {
      console.error("WebGL error in Rider3DViewer:", e);
      setLoadError(true);
      setIsLoading(false);
    }
  }, [interactive]);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden rounded-3xl ${className}`}>
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FF5B00]/10 via-transparent to-black/40 pointer-events-none" />

      {/* WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing z-10" />

      {/* Loading Skeleton */}
      {isLoading && !loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 z-20 bg-black/40 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-full border-2 border-[#FF5B00] border-t-transparent animate-spin" />
          <span className="text-[11px] font-bold text-white/70 tracking-wider uppercase">
            Loading 3D Rider...
          </span>
        </div>
      )}

      {/* Fallback if WebGL fails */}
      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4">
          <img
            src="/rider/rider_180.png"
            alt="DASHit Delivery Partner"
            className="w-36 h-36 object-contain filter drop-shadow-2xl"
          />
        </div>
      )}

      {/* Floating 3D Badge */}
      {showControls && !isLoading && !loadError && (
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
          <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center space-x-1.5 text-[11px] font-semibold text-white/80 select-none">
            <Sparkles className="w-3 h-3 text-[#FF5B00]" />
            <span>3D Rider · Drag to rotate</span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsRotating((prev) => !prev);
            }}
            className="pointer-events-auto p-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white/80 transition-transform active:scale-90"
            title="Toggle rotation"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
