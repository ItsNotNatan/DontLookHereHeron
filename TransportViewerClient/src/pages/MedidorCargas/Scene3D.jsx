import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export default function Scene3D({ veiculo, cargas }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const groupRef = useRef(null);
  const controlsRef = useRef(null); 

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Setup da Cena
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe2e8f0);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.set(8, 8, 12);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Controles de Mouse (OrbitControls)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; 
    controlsRef.current = controls;

    // 3. Iluminação
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    const grid = new THREE.GridHelper(30, 30, 0x94a3b8, 0xcbd5e1);
    scene.add(grid);

    // 4. Grupo de Objetos (Baú e Cargas)
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);
    groupRef.current = mainGroup;

    // 🟢 5. O VIGIA DE TAMANHO (ResizeObserver é melhor que o window.resize)
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        }
      }
    });
    resizeObserver.observe(mountRef.current);

    // 6. Loop de Renderização
    let reqId;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(reqId);
      resizeObserver.disconnect();
      renderer.dispose();
      if (mountRef.current) mountRef.current.innerHTML = "";
    };
  }, []); 

  // Vigia as mudanças dos botões e atualiza o desenho
  useEffect(() => {
    if (!groupRef.current || !veiculo) return;

    const group = groupRef.current;

    while(group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      if(obj.geometry) obj.geometry.dispose();
      if(obj.material) obj.material.dispose();
    }

    const bauGeo = new THREE.BoxGeometry(veiculo.largura, veiculo.altura, veiculo.comprimento);
    const bauMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, transparent: true, opacity: 0.15 });
    const bau = new THREE.Mesh(bauGeo, bauMat);
    bau.position.y = veiculo.altura / 2;
    group.add(bau);

    const edges = new THREE.EdgesGeometry(bauGeo);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x1e40af, linewidth: 2 }));
    line.position.copy(bau.position);
    group.add(line);

    let currentZ = -veiculo.comprimento / 2;
    cargas.forEach(c => {
      for(let i = 0; i < c.qtd; i++) {
        const item = new THREE.Mesh(
          new THREE.BoxGeometry(c.larg * 0.98, c.alt * 0.98, c.comp * 0.98),
          new THREE.MeshStandardMaterial({ color: c.cor, roughness: 0.4 })
        );
        item.position.set(0, c.alt / 2, currentZ + (c.comp / 2));
        
        const itemEdges = new THREE.EdgesGeometry(item.geometry);
        const itemLine = new THREE.LineSegments(itemEdges, new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 }));
        item.add(itemLine);

        group.add(item);
        currentZ += c.comp; 
      }
    });

    if (cameraRef.current && controlsRef.current) {
      const maxDim = Math.max(veiculo.comprimento, veiculo.largura, veiculo.altura);
      // Puxa a câmera para trás baseado no tamanho do veículo
      cameraRef.current.position.set(maxDim * 1.5, maxDim * 1.0, maxDim * 1.5);
      controlsRef.current.target.set(0, veiculo.altura / 2, 0); 
      controlsRef.current.update();
    }

  }, [veiculo, cargas]); 

  return <div ref={mountRef} className="scene-container-3d" />;
}