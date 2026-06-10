// src/pages/MedidorCargas/MedidorCargas.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCargasContext } from '../../components/context/CargasContext.jsx';
import * as THREE from 'three';
import './MedidorCargas.css';

// Usamos as constantes locais em vez do banco
import { VEHICLES, getGC } from '../../components/CargoForm/constants';
import { buildVehicle, placeCargos } from './engine3D';

// Componentes modulares
import ModalRelatorio from '../../components/ModalRelatorio/ModalRelatorio';
import SidebarCargas from './SidebarCargas';
import StatsBar from './StatsBar';

export default function MedidorCargas() {
  const navigate = useNavigate();
  const location = useLocation();

  // 🟢 O CÉREBRO CENTRAL (Contexto)
  const { cargasGlobais: cargas, setCargasGlobais: setCargas } = useCargasContext() || { cargasGlobais: [], setCargasGlobais: () => {} };

  const [veiculosBD, setVeiculosBD] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [showRelatorio, setShowRelatorio] = useState(false);
  const [hasOverlap, setHasOverlap] = useState(false);

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const selBarWrapperRef = useRef(null);

  const [unit, setUnit] = useState('m');
  const [selVeh, setSelVeh] = useState(null);
  const [selCid, setSelCid] = useState(null);
  const [mode, setMode] = useState('orbit');

  const panelRefs = useRef({});
  const selBarRefs = useRef({ sx: null, sy: null, sz: null, sn: null });

  const tState = useRef({
    scene: null, cam: null, renderer: null, raycaster: null,
    vehGrp: null, cargoGrp: null,
    theta: 0.7, phi: 0.42, radius: 18, panX: 0, panY: 0,
    orbiting: false, panning: false, lastMX: 0, lastMY: 0,
    dragging: false, dragObj: null, dragPlane: null, dragOff: null,
    hovered: null, posOv: {}, nextId: 0,
    selCid: null, mode: 'orbit', selVeh: null,
    selPosKey: null // NOVO: Guarda a chave única da instância da caixa clicada
  }).current;

  useEffect(() => { tState.selCid = selCid; }, [selCid]);
  useEffect(() => { tState.mode = mode; }, [mode]);
  useEffect(() => { tState.selVeh = selVeh; }, [selVeh]);

  useEffect(() => {
    setVeiculosBD(VEHICLES);
    if (VEHICLES.length > 0) setSelVeh(VEHICLES[0].id);
    setCarregando(false);
  }, []);

  useEffect(() => {
    if (location.state?.abrirRelatorio) {
      setShowRelatorio(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const toM = (v) => unit === 'cm' ? v / 100 : v;
  const fmt = (v) => unit === 'm' ? v.toFixed(2) + 'm' : (v * 100).toFixed(0) + 'cm';
  
  const totalVol = () => {
    if (!cargas) return 0;
    return cargas.reduce((s, c) => s + (parseFloat(c.comprimento || 0) * parseFloat(c.largura || 0) * parseFloat(c.altura || 0) * parseInt(c.quantidade || 1)), 0);
  };

  const totalArea = () => {
    if (!cargas) return 0;
    return cargas.reduce((s, c) => s + (parseFloat(c.comprimento || 0) * parseFloat(c.largura || 0) * parseInt(c.quantidade || 1)), 0);
  };

  const checkFit = (v) => {
    if (!cargas || !cargas.length) return '';
    const vol = totalVol();
    const area = totalArea();
    
    const bv = v.vol || (v.L * v.W * v.H);
    const ba = v.type === 'ddeck' ? (v.L * v.W * 2) : (v.L * v.W);

    const dimOk = cargas.every(c => parseFloat(c.comprimento || 0) <= v.L && parseFloat(c.largura || 0) <= v.W && parseFloat(c.altura || 0) <= v.H);
    if (!dimOk || vol > bv || area > ba) return 'over';
    if (vol / bv > 0.85 || area / ba > 0.85) return 'tight';
    return 'ok';
  };
  
  // NOVO: Atualizamos esta função para procurar a caixa exata que foi clicada
  const getSelMesh = (cid) => {
    if (!tState.cargoGrp) return null;
    
    // 1. Tenta encontrar a caixa EXATA que o utilizador clicou 
    // Garantimos também que a chave começa com o ID selecionado (ex: "123_0" pertence ao cid 123)
    if (tState.selPosKey && tState.selPosKey.startsWith(String(cid))) {
      const exactMesh = tState.cargoGrp.children.find(
        c => c.isMesh && c.userData.movable && c.userData.posKey === tState.selPosKey
      );
      if (exactMesh) return exactMesh;
    }

    // 2. Fallback: Se não encontrarmos a exata, pega a primeira caixa do grupo
    return tState.cargoGrp.children.find(c => c.isMesh && c.userData.movable && c.userData.cid === cid);
  };
  
  const updateSelBar = (mesh) => {
    if (!mesh) {
      if (selBarWrapperRef.current) selBarWrapperRef.current.style.display = 'none';
      return;
    }
    if (selBarWrapperRef.current) selBarWrapperRef.current.style.display = 'flex';
    if (selBarRefs.current.sn) selBarRefs.current.sn.textContent = mesh.userData.label;
    if (selBarRefs.current.sx) selBarRefs.current.sx.textContent = mesh.position.x.toFixed(2) + 'm';
    if (selBarRefs.current.sy) selBarRefs.current.sy.textContent = mesh.position.y.toFixed(2) + 'm';
    if (selBarRefs.current.sz) selBarRefs.current.sz.textContent = mesh.position.z.toFixed(2) + 'm';
  };

  const syncPanel = (mesh) => {
    if (!mesh) return;
    const cid = mesh.userData.cid;
    const refs = panelRefs.current[cid];
    if (refs) {
      if (refs.px) refs.px.value = mesh.position.x.toFixed(3);
      if (refs.py) refs.py.value = mesh.position.y.toFixed(3);
      if (refs.pz) refs.pz.value = mesh.position.z.toFixed(3);
    }
  };
  
  const syncEdges = (mesh) => {
    tState.cargoGrp.children.forEach(c => {
      if (c.isLineSegments && c.userData.linkedTo === mesh.uuid) c.position.copy(mesh.position);
      if (c.userData.topOf === mesh.uuid) { c.position.x = mesh.position.x; c.position.z = mesh.position.z; }
    });
  };

  const updateCam = useCallback(() => {
    if (!tState.cam) return;
    const x = tState.radius * Math.sin(tState.phi) * Math.sin(tState.theta);
    const y = tState.radius * Math.cos(tState.phi);
    const z = tState.radius * Math.sin(tState.phi) * Math.cos(tState.theta);
    tState.cam.position.set(x + tState.panX, Math.max(0.3, y + tState.panY), z);
    tState.cam.lookAt(tState.panX, tState.panY, 0);
  }, []);
  
  const resetCam = () => {
    const v = veiculosBD.find(x => x.id === tState.selVeh);
    if (!v) return;
    tState.radius = Math.max(v.L, v.H) * 1.9 + 8;
    tState.theta = 0.7; tState.phi = 0.42; tState.panX = 0;
    tState.panY = v.H * 0.5;
    updateCam();
  };

  const setView = (t) => {
    if (t === 'top') { tState.phi = 0.04; tState.theta = 0.001; }
    if (t === 'front') { tState.phi = Math.PI / 2 - 0.04; tState.theta = 0.001; }
    if (t === 'side') { tState.phi = Math.PI / 2 - 0.04; tState.theta = Math.PI / 2; }
    updateCam();
  };

  const checkAllCollisions = useCallback(() => {
    if (!tState.cargoGrp) return false;
    const meshes = tState.cargoGrp.children.filter(c => c.isMesh && c.userData.movable);
    const overlappingIds = new Set();
    let overlapFound = false;

    for (let i = 0; i < meshes.length; i++) {
      const boxA = new THREE.Box3().setFromObject(meshes[i]);
      boxA.expandByScalar(-0.015);

      for (let j = i + 1; j < meshes.length; j++) {
        const boxB = new THREE.Box3().setFromObject(meshes[j]);
        boxB.expandByScalar(-0.015);

        if (boxA.intersectsBox(boxB)) {
          overlappingIds.add(meshes[i].uuid);
          overlappingIds.add(meshes[j].uuid);
          overlapFound = true;
        }
      }
    }

    meshes.forEach(mesh => {
      mesh.userData.isOverlapping = overlappingIds.has(mesh.uuid);
    });

    setHasOverlap(overlapFound);
    return overlapFound;
  }, [tState]);

  useEffect(() => {
    if (tState.scene || !canvasRef.current || !wrapRef.current || carregando) return;

    tState.scene = new THREE.Scene();
    tState.scene.background = new THREE.Color(0xf1f5f9);
    tState.scene.fog = new THREE.FogExp2(0xf1f5f9, 0.009);

    tState.cam = new THREE.PerspectiveCamera(40, wrapRef.current.clientWidth / wrapRef.current.clientHeight, 0.05, 600);
    updateCam();

    tState.renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
    tState.renderer.setSize(wrapRef.current.clientWidth, wrapRef.current.clientHeight);
    tState.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    tState.renderer.shadowMap.enabled = true;
    tState.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    tState.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    tState.renderer.toneMappingExposure = 1.0;

    tState.raycaster = new THREE.Raycaster();

    tState.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 2.0);
    sun.position.set(30, 55, 25);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    tState.scene.add(sun);
    
    const fill = new THREE.DirectionalLight(0xffffff, 1.2);
    fill.position.set(-25, 15, -20); tState.scene.add(fill);
    tState.scene.add(new THREE.HemisphereLight(0xffffff, 0xe2e8f0, 0.8));

    const grid = new THREE.GridHelper(160, 100, 0x94a3b8, 0xcbd5e1);
    tState.scene.add(grid);
    
    const fMesh = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.ShadowMaterial({ opacity: 0.1 }));
    fMesh.rotation.x = -Math.PI / 2; fMesh.receiveShadow = true;
    tState.scene.add(fMesh);

    tState.vehGrp = new THREE.Group(); tState.scene.add(tState.vehGrp);
    tState.cargoGrp = new THREE.Group(); tState.scene.add(tState.cargoGrp);
    tState.dragPlane = new THREE.Plane();
    tState.dragOff = new THREE.Vector3();
    
    let reqId;
    const loop = () => {
      reqId = requestAnimationFrame(loop);
      if (tState.renderer && tState.scene && tState.cam) tState.renderer.render(tState.scene, tState.cam);
    };
    loop();

    const handleResize = () => {
      if (!wrapRef.current || !tState.cam || !tState.renderer) return;
      const width = wrapRef.current.clientWidth;
      const height = wrapRef.current.clientHeight;
      if (width === 0 || height === 0) return; 
      tState.cam.aspect = width / height;
      tState.cam.updateProjectionMatrix();
      tState.renderer.setSize(width, height);
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    if (wrapRef.current) resizeObserver.observe(wrapRef.current);

    return () => {
      cancelAnimationFrame(reqId);
      resizeObserver.disconnect();
      if (tState.renderer) {
        tState.renderer.dispose();
        tState.renderer = null;
      }
      tState.scene = null;
      tState.cam = null;
    };
  }, [updateCam, carregando, tState]);

  const buildScene = useCallback(() => {
    if (!tState.scene || !tState.vehGrp || !tState.cargoGrp) return;
    while (tState.vehGrp.children.length) tState.vehGrp.remove(tState.vehGrp.children[0]);
    while (tState.cargoGrp.children.length) tState.cargoGrp.remove(tState.cargoGrp.children[0]);

    const v = veiculosBD.find(x => x.id === selVeh);
    if (!v) return;

    buildVehicle(v, tState, THREE);

    const cargasPara3D = (cargas || []).map(c => ({
      id: c.id,
      name: c.nome,
      l: parseFloat(c.comprimento || 0),
      w: parseFloat(c.largura || 0),
      h: parseFloat(c.altura || 0),
      qty: parseInt(c.quantidade || 1),
      color: c.cor || '#cccccc'
    }));

    placeCargos(v, cargasPara3D, tState, selCid, THREE);

    if (selCid !== null) {
      const mesh = getSelMesh(selCid);
      if (mesh) { mesh.material.emissive.setHex(0x222222); syncPanel(mesh); updateSelBar(mesh); }
    } else {
      updateSelBar(null);
    }

    setTimeout(() => { checkAllCollisions(); }, 50);

  }, [selVeh, cargas, selCid, veiculosBD, tState, checkAllCollisions]);
  
  useEffect(() => { buildScene(); }, [selVeh, cargas, buildScene]);

  const getNDC = (e) => {
    const r = tState.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  
  const getHit = (ndc) => {
    tState.raycaster.setFromCamera(ndc, tState.cam);
    const meshes = tState.cargoGrp.children.filter(c => c.isMesh && c.userData.movable);
    const hits = tState.raycaster.intersectObjects(meshes, false);
    return hits.length ? hits[0] : null;
  };

  const onMD = (e) => {
    tState.lastMX = e.clientX; tState.lastMY = e.clientY;
    if (tState.mode === 'drag') {
      const hit = getHit(getNDC(e));
      if (hit && hit.object.userData.movable) {
        tState.dragging = true; tState.dragObj = hit.object;
        setSelCid(hit.object.userData.cid);
        tState.selPosKey = hit.object.userData.posKey; // NOVO: Armazena exatamente qual foi clicada
        const ch = tState.dragObj.geometry.parameters.height;
        tState.dragPlane.set(new THREE.Vector3(0, 1, 0), -(tState.dragObj.position.y - ch / 2));
        const pt = new THREE.Vector3();
        tState.raycaster.ray.intersectPlane(tState.dragPlane, pt);
        tState.dragOff.copy(pt).sub(tState.dragObj.position); tState.dragOff.y = 0;
      } else { tState.orbiting = true; }
    } else {
      if (e.buttons === 1) {
        const hit2 = getHit(getNDC(e));
        if (hit2 && hit2.object.userData.movable) {
          setSelCid(hit2.object.userData.cid);
          tState.selPosKey = hit2.object.userData.posKey; // NOVO: Armazena a identidade única
        }
        tState.orbiting = true;
      }
      if (e.buttons === 2) tState.panning = true;
    }
  };

  const onMM = (e) => {
    const dx = e.clientX - tState.lastMX;
    const dy = e.clientY - tState.lastMY;
    tState.lastMX = e.clientX; tState.lastMY = e.clientY;
    
    if (tState.dragging && tState.dragObj) {
      tState.raycaster.setFromCamera(getNDC(e), tState.cam);
      const pt = new THREE.Vector3();
      
      if (tState.raycaster.ray.intersectPlane(tState.dragPlane, pt)) {
        const v = veiculosBD.find(x => x.id === tState.selVeh);
        if (!v) return;
        
        const proposedX = pt.x - tState.dragOff.x; 
        const proposedZ = pt.z - tState.dragOff.z;
        
        const hw = v.L / 2, hd = v.W / 2;
        const chl = tState.dragObj.geometry.parameters.width / 2;
        const chd = tState.dragObj.geometry.parameters.depth / 2;
        
        const clampedX = Math.max(-hw + chl, Math.min(hw - chl, proposedX));
        const clampedZ = Math.max(-hd + chd, Math.min(hd - chd, proposedZ));

        tState.dragObj.position.x = clampedX;
        tState.dragObj.position.z = clampedZ;
        
        syncEdges(tState.dragObj);
        const key = tState.dragObj.userData.posKey;
        if (key) tState.posOv[key] = { x: tState.dragObj.position.x, y: tState.dragObj.position.y, z: tState.dragObj.position.z };
        updateSelBar(tState.dragObj);
        syncPanel(tState.dragObj);
      }
      return;
    }
    
    if (tState.orbiting) {
      tState.theta -= dx * 0.007;
      tState.phi = Math.max(0.04, Math.min(Math.PI / 2 - 0.03, tState.phi - dy * 0.007));
      updateCam();
    }
    if (tState.panning) {
      const s = tState.radius * 0.0014;
      tState.panX -= dx * s; 
      tState.panY -= dy * s; 
      updateCam();
    }
    
    if (tState.mode === 'drag') {
      const hit = getHit(getNDC(e));
      const obj = hit ? hit.object : null;
      if (obj !== tState.hovered) {
        if (tState.hovered && tState.hovered.userData.cid !== tState.selCid) {
          tState.hovered.material.emissive.setHex(tState.hovered.userData.inBay ? 0x000000 : 0x440000);
        }
        tState.hovered = (obj && obj.userData.movable) ? obj : null;
        if (tState.hovered && tState.hovered.userData.cid !== tState.selCid) {
          tState.hovered.material.emissive.setHex(0x111111);
        }
        if (canvasRef.current) canvasRef.current.style.cursor = tState.hovered ? 'grab' : 'crosshair';
      }
    }
  };

  const onMU = () => {
    tState.orbiting = false;
    tState.panning = false;
    if (tState.dragging) {
      tState.dragging = false; tState.dragObj = null;
      if (canvasRef.current) canvasRef.current.style.cursor = tState.mode === 'drag' ? 'crosshair' : 'default';
      checkAllCollisions();
    }
  };
  
  const onWheel = (e) => { tState.radius = Math.max(1.5, Math.min(130, tState.radius + e.deltaY * 0.05)); updateCam(); };
  
  useEffect(() => {
    if (!tState.cargoGrp) return;
    tState.cargoGrp.children.forEach(c => {
      if (c.isMesh && c.userData.movable) {
        if (c.userData.isOverlapping) {
          c.material.emissive.setHex(0xaa0000);
        } else if (c.userData.cid === selCid) {
          c.material.emissive.setHex(0x222222);
        } else {
          c.material.emissive.setHex(c.userData.inBay ? 0x000000 : 0x440000);
        }
      }
    });
  }, [selCid, tState, hasOverlap]); 
  
  useEffect(() => {
    if (canvasRef.current) canvasRef.current.style.cursor = mode === 'drag' ? 'crosshair' : 'default';
    if (mode === 'orbit' && tState.hovered) {
      if (tState.hovered.userData.cid !== selCid) tState.hovered.material.emissive.setHex(tState.hovered.userData.inBay ? 0x000000 : 0x440000);
      tState.hovered = null;
    }
  }, [mode, selCid, tState]);

  const handleAddCargo = (novaCarga) => {
    tState.nextId++;
    setCargas([...(cargas || []), { 
      id: Date.now(),
      nome: novaCarga.name || `Carga ${(cargas || []).length + 1}`, 
      comprimento: toM(novaCarga.l), 
      largura: toM(novaCarga.w), 
      altura: toM(novaCarga.h), 
      quantidade: novaCarga.qty,
      peso: '', 
      cor: novaCarga.color 
    }]);
  };

  const handleDelCargo = (id) => {
    setCargas((cargas || []).filter(x => x.id !== id));
    Object.keys(tState.posOv).forEach(k => { if (k.split('_')[0] == id) delete tState.posOv[k]; });
    if (selCid === id) {
      setSelCid(null);
      tState.selPosKey = null; // NOVO: Limpa a referência
    }
  };
  
  const handleSelectVeh = (id) => {
    setSelVeh(id);
    tState.posOv = {}; 
    tState.selPosKey = null; // NOVO: Limpa a referência
    setSelCid(null);
    resetCam();
  };
  
  const applyPos = (cid) => {
    const v = veiculosBD.find(x => x.id === tState.selVeh);
    if (!v) return;
    const px = parseFloat(panelRefs.current[cid]?.px?.value) || 0;
    const py = parseFloat(panelRefs.current[cid]?.py?.value) || 0;
    const pz = parseFloat(panelRefs.current[cid]?.pz?.value) || 0;
    const mesh = getSelMesh(cid);
    if (!mesh) return;
    
    const gc = getGC(v.type);
    const hw = v.L / 2, hd = v.W / 2;
    const chl = mesh.geometry.parameters.width / 2;
    const chv = mesh.geometry.parameters.height / 2;
    const chd = mesh.geometry.parameters.depth / 2;
    
    const newX = Math.max(-hw + chl, Math.min(hw - chl, px));
    const newY = Math.max(gc + chv, Math.min(gc + v.H - chv, py));
    const newZ = Math.max(-hd + chd, Math.min(hd - chd, pz));

    mesh.position.set(newX, newY, newZ);
    syncEdges(mesh);

    const key = mesh.userData.posKey;
    if (key) tState.posOv[key] = { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z };
    updateSelBar(mesh);
    syncPanel(mesh);
    checkAllCollisions(); 
  };

  const alternarAndar = (cid) => {
    const v = veiculosBD.find(x => x.id === tState.selVeh);
    if (!v || v.type !== 'ddeck') return;
    
    const mesh = getSelMesh(cid);
    if (!mesh) return;

    const gc = getGC(v.type);
    const secondFloorY = gc + (v.H * 0.475) + 0.08; 
    const chv = mesh.geometry.parameters.height / 2;

    let newY;
    if (mesh.position.y >= secondFloorY) {
      newY = gc + chv;
    } else {
      newY = secondFloorY + chv;
    }

    mesh.position.y = newY;
    syncEdges(mesh);

    const key = mesh.userData.posKey;
    if (key) tState.posOv[key] = { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z };
    updateSelBar(mesh);
    syncPanel(mesh);
    checkAllCollisions();
  };
  
  const nudge = (cid, axis, delta) => {
    const el = panelRefs.current[cid]?.[`p${axis}`];
    if (el) {
      el.value = (parseFloat(el.value) || 0) + delta;
      applyPos(cid);
    }
  };
  
  const resetPos = (cid) => {
    Object.keys(tState.posOv).forEach(k => { if (k.split('_')[0] == cid) delete tState.posOv[k]; });
    buildScene();
  };

  const focusCargo = (cid) => {
    const mesh = getSelMesh(cid);
    if (!mesh) return;
    tState.panX = mesh.position.x;
    tState.panY = mesh.position.y; updateCam();
  };

  if (carregando) {
    return (
      <div className="medidor-loading-screen">
        <div className="medidor-loading-content">
          <div className="medidor-spinner"></div>
          <h2 className="medidor-loading-title">Inicializando Motor 3D</h2>
          <p className="medidor-loading-text">Carregando modelos físicos...</p>
        </div>
      </div>
    );
  }

  if (!veiculosBD || veiculosBD.length === 0) return <div style={{ color: 'var(--text)', padding: 20 }}>Nenhum veículo configurado no sistema.</div>;

  const actVeh = veiculosBD.find(x => x.id === selVeh);
  
  const vVol = totalVol();
  const vBv = actVeh ? (actVeh.vol || (actVeh.L * actVeh.W * actVeh.H)) : 0;
  const vPct = vBv ? Math.round(vVol / vBv * 100) : 0;
  
  const vArea = totalArea();
  const vBa = actVeh ? (actVeh.L * actVeh.W) : 0;
  const areaMax = actVeh?.type === 'ddeck' ? vBa * 2 : vBa;
  const aPct = areaMax ? Math.round(vArea / areaMax * 100) : 0;
  
  const maxOcupacao = Math.max(vPct, aPct);

  let fCls = '', fChip = 'Aguardando', fChipCls = 'chip-idle', fSv = '—', fBg = 'var(--muted)';
  
  // 🟢 NOVA LÓGICA PARA VERIFICAR OS LIMITES EXCEDIDOS
  let avisoCapacidade = null;
  if (actVeh) {
    if (vPct > 100 && aPct > 100) {
      avisoCapacidade = "Capacidade de Volume e Piso Excedidas!";
    } else if (vPct > 100) {
      avisoCapacidade = "Capacidade de Volume Excedida!";
    } else if (aPct > 100) {
      avisoCapacidade = "Capacidade de Piso Excedida!";
    }

    if (!cargas || cargas.length === 0) { 
      fChip = 'Sem cargas'; fBg = 'var(--muted)'; 
    }
    else if (vPct > 100) { 
      fCls = 'sv-over'; fChip = 'Excede capacidade'; fChipCls = 'chip-over'; fSv = 'Excede Vol!'; fBg = 'var(--red)'; 
    }
    else if (aPct > 100) { 
      fCls = 'sv-over'; fChip = 'Falta Piso (Chão)'; fChipCls = 'chip-over'; fSv = 'Excede Área!'; fBg = 'var(--orange)'; 
    }
    else if (maxOcupacao > 85) { 
      fCls = 'sv-tight'; fChip = 'Espaço apertado'; fChipCls = 'chip-tight'; fSv = 'Ajustado'; fBg = 'var(--yellow)'; 
    }
    else { 
      fCls = 'sv-ok'; fChip = 'Cabe perfeitamente'; fChipCls = 'chip-ok'; fSv = '✓ OK'; fBg = 'var(--green)'; 
    }
  }

  const sidebarProps = {
    unit, setUnit, cargas, selCid, setSelCid,
    handleAddCargo, handleDelCargo, fmt, focusCargo,
    applyPos, resetPos, alternarAndar, nudge, panelRefs,
    actVeh, veiculosBD, selVeh, handleSelectVeh, checkFit
  };

  const statsProps = {
    vVol, vBv, vArea, areaMax, maxOcupacao, actVeh, fCls, fSv, fBg, vPct, aPct
  };

  // 🟢 Encontra qual é a carga atualmente selecionada
  const selectedCargo = cargas?.find(c => c.id === selCid);

  return (
    <div className="medidor-wrapper-3d">
      <header className="header-top">
        <div className="logo">
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center' }} title="Voltar">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        </div>
        <div className="hrtags">
          <span className="tag tag-b">VISUALIZAÇÃO 3D</span>
          <span className="tag tag-o" onClick={() => setShowRelatorio(true)}>📄 VER MANIFESTO</span>
        </div>
      </header>

      <div className="layout">
        
        <SidebarCargas {...sidebarProps} />

        <div className="main-view">
          <div className="topbar">
            <div>
              <div className="veh-lbl">{actVeh ? actVeh.name : 'Selecione um veículo →'}</div>
              <div className="veh-sub">{actVeh ? `Baú: ${actVeh.L}m × ${actVeh.W}m × ${actVeh.H}m  |  Vol: ${actVeh.vol ? actVeh.vol.toFixed(1) + ' m³' : '2 compartimentos'}` : 'Escolha na lista à esquerda'}</div>
            </div>
            <div className={`chip ${fChipCls}`}>{fChip}</div>
          </div>

          <div id="cwrap" ref={wrapRef} style={{ position: 'relative' }}>
            <canvas id="c" tabIndex={0} ref={canvasRef}
              onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU} onWheel={onWheel}
              onContextMenu={e => e.preventDefault()} />

            {/* 🟢 PAINEL DE POSIÇÃO MANUAL */}
            {selectedCargo && (
              <div style={{
                position: 'absolute', bottom: '20px', left: '20px',
                background: 'rgba(255, 255, 255, 0.95)', border: '1px solid var(--border)',
                padding: '15px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                zIndex: 20, width: '280px', display: 'flex', flexDirection: 'column', gap: '10px',
                pointerEvents: 'auto'
              }}>
                <div className="pp-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0, fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  <span>📍 Manual: <span style={{ color: 'var(--text)' }}>{selectedCargo.nome}</span></span>
                  <button onClick={() => setSelCid(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.2rem' }} title="Fechar painel">✕</button>
                </div>
                <div className="pp-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {['x', 'y', 'z'].map(axis => (
                    <div key={axis} className="pp-field" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center', color: `var(--${axis === 'x' ? 'red' : axis === 'y' ? 'green' : 'accent'})` }}>Eixo {axis.toUpperCase()}</label>
                      <div className="pp-iw" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input type="number" defaultValue="0" step="0.05" onChange={() => applyPos(selectedCargo.id)} ref={el => { if (!panelRefs.current[selectedCargo.id]) panelRefs.current[selectedCargo.id] = {}; panelRefs.current[selectedCargo.id][`p${axis}`] = el; }} style={{ background: '#ffffff', border: '1px solid var(--border2)', borderRadius: '6px', color: 'var(--text)', fontSize: '0.85rem', padding: '6px 22px 6px 8px', outline: 'none', width: '100%', textAlign: 'right' }} />
                        <span className="pp-suf" style={{ position: 'absolute', right: '8px', fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700, pointerEvents: 'none' }}>m</span>
                      </div>
                      <div className="pp-arrows" style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                        <div className="pp-arr" onClick={() => nudge(selectedCargo.id, axis, -0.1)} style={{ flex: 1, background: '#ffffff', border: '1px solid var(--border2)', color: 'var(--muted2)', cursor: 'pointer', fontSize: '0.8rem', padding: '4px 0', borderRadius: '4px', textAlign: 'center' }}>{axis === 'y' ? '▼' : '◀'}</div>
                        <div className="pp-arr" onClick={() => nudge(selectedCargo.id, axis, 0.1)} style={{ flex: 1, background: '#ffffff', border: '1px solid var(--border2)', color: 'var(--muted2)', cursor: 'pointer', fontSize: '0.8rem', padding: '4px 0', borderRadius: '4px', textAlign: 'center' }}>{axis === 'y' ? '▲' : '▶'}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pp-btns" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                  <div className="pp-btn ok" onClick={() => applyPos(selectedCargo.id)} style={{ padding: '8px', border: '1px solid var(--green)', background: '#f0fdf4', color: 'var(--green)', cursor: 'pointer', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center' }}>✓ Aplicar</div>
                  <div className="pp-btn" onClick={() => resetPos(selectedCargo.id)} style={{ padding: '8px', border: '1px solid var(--border2)', background: '#ffffff', color: 'var(--muted2)', cursor: 'pointer', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center' }}>↺ Resetar</div>
                  
                  {actVeh && actVeh.type === 'ddeck' && (
                    <div className="pp-btn" style={{ gridColumn: 'span 2', borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--acD)', padding: '8px', border: '1px solid var(--accent)', cursor: 'pointer', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center' }} onClick={() => alternarAndar(selectedCargo.id)}>
                      ↕ Mudar Andar
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 🔴 BANNER DE AVISO DE SOBREPOSIÇÃO 🔴 */}
            {hasOverlap && (
              <div style={{
                position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
                backgroundColor: '#ef4444', color: 'white', padding: '8px 16px',
                borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem',
                boxShadow: '0 4px 10px rgba(239, 68, 68, 0.4)', zIndex: 10,
                display: 'flex', alignItems: 'center', gap: '8px',
                animation: 'slideUp 0.3s'
              }}>
                ⚠️ SOBREPOSIÇÃO DE CAIXA: Uma ou mais cargas estão a colidir!
              </div>
            )}

            {/* 🔴 BANNER DE AVISO DE CAPACIDADE EXCEDIDA */}
            {avisoCapacidade && (
              <div style={{
                position: 'absolute', top: '20px', right: '20px',
                backgroundColor: '#ef4444', color: 'white', padding: '10px 16px',
                borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem',
                boxShadow: '0 4px 10px rgba(239, 68, 68, 0.4)', zIndex: 10,
                display: 'flex', alignItems: 'center', gap: '8px',
                animation: 'slideUp 0.3s'
              }}>
                ⛔ {avisoCapacidade}
              </div>
            )}

            {!selVeh && (
              <div className="hint"><h3>🚛 VISUALIZAÇÃO 3D</h3><p>Adicione cargas e selecione um veículo</p></div>
            )}

            {selVeh && (
              <>
                <div className="modebar">
                  <button className={`mbtn ${mode === 'orbit' ? 'on' : ''}`} onClick={() => setMode('orbit')}>⟳ Girar Câmera</button>
                  <div className="msep"></div>
                  <button className={`mbtn ${mode === 'drag' ? 'on' : ''}`} onClick={() => setMode('drag')}>✥ Arrastar Carga</button>
                </div>

                <div className="info">
                  <b>Girar:</b> Arrastar<br />
                  <b>Zoom:</b> Scroll<br />
                  <b>Pan:</b> Btn direito<br />
                  <b>Arrastar carga:</b> Modo ✥
                </div>

                <div className="cambtns">
                  <div className="cbtn" onClick={resetCam} title="Reset">⟳</div>
                  <div className="cbtn" onClick={() => setView('top')} title="Topo">⊤</div>
                  <div className="cbtn" onClick={() => setView('front')} title="Frontal">▣</div>
                  <div className="cbtn" onClick={() => setView('side')} title="Lateral">◧</div>
                </div>

                <div className="selbar" ref={selBarWrapperRef}>
                  <span className="sn" ref={el => selBarRefs.current.sn = el}>—</span>
                  <div className="sc">
                    <span>X:<span className="sx" ref={el => selBarRefs.current.sx = el}>0</span></span>
                    <span>Y:<span className="sy" ref={el => selBarRefs.current.sy = el}>0</span></span>
                    <span>Z:<span className="sz" ref={el => selBarRefs.current.sz = el}>0</span></span>
                  </div>
                </div>
              </>
            )}
          </div>

          <StatsBar {...statsProps} />
          
        </div>
      </div>
      
      {showRelatorio && (
        <ModalRelatorio 
          veiculo={actVeh} 
          cargas={cargas} 
          ocupacao={Math.min(200, maxOcupacao)} 
          onClose={() => setShowRelatorio(false)} 
        />
      )}
    </div>
  );
}