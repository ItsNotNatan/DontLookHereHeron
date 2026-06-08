// src/pages/MedidorCargas/engine3D.js
import { GAP, getGC } from '../../components/CargoForm/constants';

export const buildVehicle = (vehicleConfig, sceneState, THREE) => {
  // --- Funções Auxiliares de Construção ---
  const createMaterialPhong = (colorHex, shininessVal = 60, specularHex = 0x222222) => 
    new THREE.MeshPhongMaterial({ 
      color: colorHex, 
      shininess: shininessVal, 
      specular: new THREE.Color(specularHex) 
    });

  const createMaterialTransparent = (colorHex, opacityVal = 0.12, shininessVal = 140) => 
    new THREE.MeshPhongMaterial({ 
      color: colorHex, 
      transparent: true, 
      opacity: opacityVal, 
      side: THREE.DoubleSide, 
      depthWrite: false, 
      shininess: shininessVal, 
      specular: new THREE.Color(0.7, 0.85, 1) 
    });
  
  const createMesh = (geometry, material, posX, posY, posZ) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(posX, posY, posZ); 
    mesh.castShadow = true; 
    mesh.receiveShadow = true;
    mesh.userData.isVehicle = true; 
    sceneState.vehGrp.add(mesh); 
    return mesh;
  };
  
  const createBox = (width, height, depth) => new THREE.BoxGeometry(width, height, depth);
  const createCylinder = (radius, height, segments = 20) => new THREE.CylinderGeometry(radius, radius, height, segments);

  // --- Dimensões Base do Veículo ---
  const length = vehicleConfig.L;
  const width = vehicleConfig.W;
  const height = vehicleConfig.H;
  const vehicleType = vehicleConfig.type;
  
  const groundClearance = getGC(vehicleType);
  const cargoBayYCenter = groundClearance + height / 2;

  // --- Materiais ---
  const matGlass = createMaterialTransparent(0x88bbdd, 0.10);
  const matFrame = createMaterialPhong(0x2a4060, 50, 0x445577);
  const matFloor = createMaterialPhong(0x8b6e3a, 15);
  const matCabin = createMaterialPhong(0x1c3355, 120, 0x4477cc);
  const matCabinDark = createMaterialPhong(0x162440, 80, 0x334488);
  const matWindow = new THREE.MeshPhongMaterial({ color: 0x99ccff, transparent: true, opacity: 0.38, shininess: 200, specular: new THREE.Color(1, 1, 1) });
  const matMetal = createMaterialPhong(0x445566, 140, 0x778899);
  const matChrome = createMaterialPhong(0xaabbcc, 200, 0xffffff);
  const matWheel = createMaterialPhong(0x111111, 20);
  const matRim = createMaterialPhong(0x999999, 180, 0xffffff);
  const matBumper = createMaterialPhong(0x1a1a1a, 40);
  const matGrill = createMaterialPhong(0x0d0d0d, 30);
  const matLight = new THREE.MeshPhongMaterial({ color: 0xffffaa, emissive: new THREE.Color(0.5, 0.5, 0) });
  const matBrake = new THREE.MeshPhongMaterial({ color: 0xff3300, emissive: new THREE.Color(0.35, 0.05, 0) });
  const matExhaust = createMaterialPhong(0x667788, 80, 0x889999);
  const matChassis = createMaterialPhong(0x0c1015, 20);
  const matRubber = createMaterialPhong(0x1a1a1a, 5);
  const matPlanks = createMaterialPhong(0x7a5218, 8);

  // --- Baú / Compartimento de Carga ---
  createMesh(createBox(length, height, 0.04), matGlass, 0, cargoBayYCenter, width / 2);
  createMesh(createBox(length, height, 0.04), matGlass, 0, cargoBayYCenter, -width / 2);
  createMesh(createBox(0.04, height, width), matGlass, -length / 2, cargoBayYCenter, 0);
  createMesh(createBox(length, 0.04, width), matGlass, 0, groundClearance + height, 0);

  // --- Chão (Assoalho) ---
  createMesh(createBox(length, 0.07, width), matFloor, 0, groundClearance + 0.035, 0);
  for (let plankX = -length / 2 + 0.3; plankX < length / 2 - 0.1; plankX += 0.3) {
    const plankMesh = new THREE.Mesh(createBox(0.015, 0.075, width), matPlanks);
    plankMesh.position.set(plankX, groundClearance + 0.04, 0); 
    sceneState.vehGrp.add(plankMesh);
  }

  // --- Estrutura (Frame) ---
  const frameThickness = 0.055;
  createMesh(createBox(length + 0.01, frameThickness, frameThickness), matFrame, 0, groundClearance + height, width / 2); 
  createMesh(createBox(length + 0.01, frameThickness, frameThickness), matFrame, 0, groundClearance + height, -width / 2);
  createMesh(createBox(length + 0.01, frameThickness, frameThickness), matFrame, 0, groundClearance, width / 2); 
  createMesh(createBox(length + 0.01, frameThickness, frameThickness), matFrame, 0, groundClearance, -width / 2);
  
  const numPillars = Math.max(2, Math.ceil(length / 2.5));
  for (let i = 0; i <= numPillars; i++) {
    const pillarX = -length / 2 + (length / numPillars) * i;
    createMesh(createBox(frameThickness, height + frameThickness, frameThickness), matFrame, pillarX, cargoBayYCenter, width / 2);
    createMesh(createBox(frameThickness, height + frameThickness, frameThickness), matFrame, pillarX, cargoBayYCenter, -width / 2);
  }
  
  const numBeams = Math.max(2, Math.ceil(length / 3));
  for (let i = 0; i <= numBeams; i++) {
    createMesh(createBox(frameThickness, frameThickness, width), matFrame, -length / 2 + (length / numBeams) * i, groundClearance + height, 0);
  }

  // --- Chassi ---
  createMesh(createBox(length + 0.2, 0.15, width * 0.52), matChassis, -0.05, groundClearance * 0.35, 0);
  [-length / 3, 0, length / 3].forEach(posX => { 
    createMesh(createBox(0.12, 0.12, width * 0.52), matChassis, posX, groundClearance * 0.28, 0); 
  });

  // --- Rodas ---
  const wheelRadiusMap = { small: 0.27, van: 0.31, truck: 0.43, semi: 0.52, sider: 0.52, ddeck: 0.52 };
  const wheelRadius = wheelRadiusMap[vehicleType] || 0.43;
  const wheelThickness = wheelRadius * 0.55;
  const wheelY = wheelRadius;
  
  const addWheel = (posX, posY, posZ) => {
    const tireCore = new THREE.Mesh(createCylinder(wheelRadius, wheelThickness, 24), matWheel); 
    tireCore.rotation.x = Math.PI / 2; tireCore.position.set(posX, posY, posZ); tireCore.castShadow = true; sceneState.vehGrp.add(tireCore);
    
    const sidewall = new THREE.Mesh(createCylinder(wheelRadius * 0.96, wheelThickness + 0.005, 24), matRubber); 
    sidewall.rotation.x = Math.PI / 2; sidewall.position.set(posX, posY, posZ); sceneState.vehGrp.add(sidewall);
    
    const rimDisk = new THREE.Mesh(createCylinder(wheelRadius * 0.62, wheelThickness * 0.45, 10), matRim); 
    rimDisk.rotation.x = Math.PI / 2; rimDisk.position.set(posX, posY, posZ); sceneState.vehGrp.add(rimDisk);
    
    for (let i = 0; i < 5; i++) {
      const angle = i * (Math.PI * 2 / 5);
      const spoke = new THREE.Mesh(createBox(wheelRadius * 0.44, wheelRadius * 0.09, wheelThickness * 0.38), matChrome);
      spoke.rotation.z = angle; spoke.position.set(posX + Math.cos(angle) * wheelRadius * 0.34, posY + Math.sin(angle) * wheelRadius * 0.34, posZ); 
      sceneState.vehGrp.add(spoke);
    }
    const hub = new THREE.Mesh(new THREE.SphereGeometry(wheelRadius * 0.17, 8, 6), matChrome); 
    hub.position.set(posX, posY, posZ); sceneState.vehGrp.add(hub);
  };
  
  const addDoubleWheel = (posX, posY, posZ) => { 
    addWheel(posX, posY, posZ + wheelThickness * 0.64); 
    addWheel(posX, posY, posZ - wheelThickness * 0.64); 
  };

  // --- Cabine ---
  const cabinLengthMap = { small: 1.55, van: 1.35, truck: 2.0, semi: 2.3, sider: 2.3, ddeck: 2.3 };
  const cabinHeightMap = { small: height + 0.02, van: height, truck: height * 0.97, semi: height * 0.88, sider: height * 0.88, ddeck: height * 0.6 };
  
  const cabinLength = cabinLengthMap[vehicleType] || 2.0;
  const cabinHeight = cabinHeightMap[vehicleType] || height * 0.97;
  const cabinWidth = width + 0.04;
  const cabinX = length / 2 + cabinLength / 2;

  if (vehicleType === 'small') {
    createMesh(createBox(cabinLength, cabinHeight, cabinWidth), matCabin, cabinX, groundClearance + cabinHeight / 2, 0);
    createMesh(createBox(cabinLength * 0.52, cabinHeight * 0.43, cabinWidth * 0.88), matWindow, cabinX + cabinLength * 0.02, groundClearance + cabinHeight * 0.72, 0);
    createMesh(createBox(0.04, cabinHeight * 0.35, cabinWidth * 0.8), matWindow, cabinX - cabinLength / 2, groundClearance + cabinHeight * 0.68, 0);
    createMesh(createBox(cabinLength * 0.34, cabinHeight * 0.26, 0.04), matWindow, cabinX - cabinLength * 0.06, groundClearance + cabinHeight * 0.73, cabinWidth / 2);
    createMesh(createBox(cabinLength * 0.34, cabinHeight * 0.26, 0.04), matWindow, cabinX - cabinLength * 0.06, groundClearance + cabinHeight * 0.73, -cabinWidth / 2);
    createMesh(createBox(0.11, 0.36, cabinWidth * 1.02), matBumper, cabinX + cabinLength / 2 + 0.055, groundClearance + 0.18, 0);
    createMesh(createBox(0.065, 0.2, cabinWidth * 0.72), matGrill, cabinX + cabinLength / 2 + 0.04, groundClearance + 0.18, 0);
    [cabinWidth * 0.33, -cabinWidth * 0.33].forEach(z => createMesh(createBox(0.055, 0.13, 0.18), matLight, cabinX + cabinLength / 2 + 0.035, groundClearance + 0.38, z));
    [cabinWidth / 2 + 0.09, -cabinWidth / 2 - 0.09].forEach(z => createMesh(createBox(0.16, 0.09, 0.055), matCabinDark, cabinX + cabinLength * 0.2, groundClearance + cabinHeight * 0.72, z));
    createMesh(createBox(cabinLength * 0.4, 0.06, cabinWidth * 0.35), matMetal, cabinX, groundClearance + cabinHeight + 0.03, 0);
    
    addWheel(cabinX + cabinLength * 0.24, wheelY, width / 2 + wheelThickness * 0.54); 
    addWheel(cabinX + cabinLength * 0.24, wheelY, -width / 2 - wheelThickness * 0.54);
    addWheel(-length / 2 + 0.22, wheelY, width / 2 + wheelThickness * 0.54); 
    addWheel(-length / 2 + 0.22, wheelY, -width / 2 - wheelThickness * 0.54);
    [cabinWidth * 0.34, -cabinWidth * 0.34].forEach(z => createMesh(createBox(0.04, 0.11, 0.16), matBrake, cabinX - cabinLength / 2, groundClearance + cabinHeight * 0.38, z));
  
  } else if (vehicleType === 'van') {
    createMesh(createBox(cabinLength, cabinHeight, cabinWidth), matCabin, cabinX, groundClearance + cabinHeight / 2, 0);
    createMesh(createBox(cabinLength * 0.65, 0.07, cabinWidth * 0.96), matCabin, cabinX, groundClearance + cabinHeight, 0);
    createMesh(createBox(cabinLength * 0.58, cabinHeight * 0.49, cabinWidth * 0.9), matWindow, cabinX + cabinLength * 0.04, groundClearance + cabinHeight * 0.68, 0);
    createMesh(createBox(cabinLength * 0.3, cabinHeight * 0.28, 0.04), matWindow, cabinX - cabinLength * 0.07, groundClearance + cabinHeight * 0.72, cabinWidth / 2);
    createMesh(createBox(cabinLength * 0.3, cabinHeight * 0.28, 0.04), matWindow, cabinX - cabinLength * 0.07, groundClearance + cabinHeight * 0.72, -cabinWidth / 2);
    createMesh(createBox(0.13, 0.52, cabinWidth * 1.02), matBumper, cabinX + cabinLength / 2 + 0.065, groundClearance + 0.26, 0);
    createMesh(createBox(0.07, 0.3, cabinWidth * 0.7), matGrill, cabinX + cabinLength / 2 + 0.05, groundClearance + 0.28, 0);
    [cabinWidth * 0.37, -cabinWidth * 0.37].forEach(z => createMesh(createBox(0.065, 0.22, 0.25), matLight, cabinX + cabinLength / 2 + 0.04, groundClearance + 0.55, z));
    [cabinWidth / 2 + 0.12, -cabinWidth / 2 - 0.12].forEach(z => createMesh(createBox(0.21, 0.13, 0.07), matCabinDark, cabinX + cabinLength * 0.22, groundClearance + cabinHeight * 0.76, z));
    
    addWheel(cabinX + cabinLength * 0.27, wheelY, width / 2 + wheelThickness * 0.58); 
    addWheel(cabinX + cabinLength * 0.27, wheelY, -width / 2 - wheelThickness * 0.58);
    addWheel(-length / 2 + 0.2, wheelY, width / 2 + wheelThickness * 0.58); 
    addWheel(-length / 2 + 0.2, wheelY, -width / 2 - wheelThickness * 0.58);
    [cabinWidth * 0.35, -cabinWidth * 0.35].forEach(z => createMesh(createBox(0.05, 0.14, 0.19), matBrake, cabinX - cabinLength / 2 - 0.01, groundClearance + cabinHeight * 0.4, z));
  
  } else {
    const isSemiTruck = (vehicleType === 'semi' || vehicleType === 'sider' || vehicleType === 'ddeck');
    createMesh(createBox(cabinLength, cabinHeight, cabinWidth), matCabin, cabinX, groundClearance + cabinHeight / 2, 0);
    
    if (isSemiTruck) {
      createMesh(createBox(cabinLength * 0.52, cabinHeight * 0.24, cabinWidth * 0.97), matCabinDark, cabinX - cabinLength * 0.19, groundClearance + cabinHeight * 0.88, 0);
    }
    
    createMesh(createBox(cabinLength, 0.07, cabinWidth * 0.93), matMetal, cabinX, groundClearance + cabinHeight + 0.04, 0);
    createMesh(createBox(0.07, cabinHeight * 0.45, cabinWidth * 0.87), matWindow, cabinX + cabinLength / 2, groundClearance + cabinHeight * 0.71, 0);
    createMesh(createBox(cabinLength * 0.44, cabinHeight * 0.3, 0.06), matWindow, cabinX + cabinLength * 0.04, groundClearance + cabinHeight * 0.73, cabinWidth / 2);
    createMesh(createBox(cabinLength * 0.44, cabinHeight * 0.3, 0.06), matWindow, cabinX + cabinLength * 0.04, groundClearance + cabinHeight * 0.73, -cabinWidth / 2);
    createMesh(createBox(0.2, 0.62, cabinWidth * 1.04), matBumper, cabinX + cabinLength / 2 + 0.1, groundClearance + 0.31, 0);
    createMesh(createBox(0.065, 0.085, cabinWidth * 0.9), matChrome, cabinX + cabinLength / 2 + 0.115, groundClearance + 0.54, 0);
    createMesh(createBox(0.065, 0.085, cabinWidth * 0.9), matChrome, cabinX + cabinLength / 2 + 0.115, groundClearance + 0.28, 0);
    
    for (let grillIdx = 0; grillIdx < 6; grillIdx++) {
      createMesh(createBox(0.065, 0.046, cabinWidth * 0.74), matGrill, cabinX + cabinLength / 2 + 0.04, groundClearance + 0.15 + grillIdx * 0.068, 0);
    }
    
    [cabinWidth * 0.37, -cabinWidth * 0.37].forEach(z => createMesh(createBox(0.075, 0.21, 0.28), matLight, cabinX + cabinLength / 2 + 0.05, groundClearance + 0.53, z));
    [cabinWidth * 0.2, -cabinWidth * 0.2].forEach(z => createMesh(createBox(0.055, 0.09, 0.15), matLight, cabinX + cabinLength / 2 + 0.045, groundClearance + 0.16, z));
    createMesh(createBox(cabinWidth * 0.85, 0.06, 0.08), matChrome, cabinX, groundClearance + cabinHeight + 0.02, 0);
    
    [cabinWidth / 2 + 0.14, -cabinWidth / 2 - 0.14].forEach(z => {
      createMesh(createBox(0.06, 0.35, 0.055), matChrome, cabinX + cabinLength * 0.22, groundClearance + cabinHeight * 0.67, z > 0 ? cabinWidth / 2 + 0.05 : -cabinWidth / 2 - 0.05);
      createMesh(createBox(0.26, 0.17, 0.085), matCabinDark, cabinX + cabinLength * 0.18, groundClearance + cabinHeight * 0.79, z);
    });
    
    [cabinWidth * 0.36, -cabinWidth * 0.36].forEach(z => createMesh(createCylinder(0.075, cabinHeight * 0.52, 10), matExhaust, cabinX - cabinLength * 0.24, groundClearance + cabinHeight + cabinHeight * 0.26, z));
    
    createMesh(createBox(1.05, 0.43, 0.31), matMetal, cabinX - cabinLength * 0.08, groundClearance + 0.22, cabinWidth / 2 + 0.17);
    createMesh(createBox(1.05, 0.43, 0.31), matMetal, cabinX - cabinLength * 0.08, groundClearance + 0.22, -cabinWidth / 2 - 0.17);
    
    [0.2, 0.38].forEach(stepY => {
      createMesh(createBox(0.3, 0.04, 0.25), matChrome, cabinX + cabinLength * 0.24, stepY, cabinWidth / 2 + 0.14);
      createMesh(createBox(0.3, 0.04, 0.25), matChrome, cabinX + cabinLength * 0.24, stepY, -cabinWidth / 2 - 0.14);
    });
    
    if (isSemiTruck) {
      createMesh(createBox(0.88, 0.21, 0.92), matMetal, cabinX - cabinLength * 0.54, groundClearance + 0.075, 0);
      createMesh(createBox(0.88, 0.06, 0.92), matChrome, cabinX - cabinLength * 0.54, groundClearance + 0.17, 0);
    }
    
    [cabinWidth * 0.39, -cabinWidth * 0.39].forEach(z => createMesh(createBox(0.055, 0.15, 0.21), matBrake, cabinX - cabinLength / 2 - 0.02, groundClearance + 0.46, z));
    
    addWheel(cabinX + cabinLength * 0.23, wheelY, width / 2 + wheelThickness * 0.64); 
    addWheel(cabinX + cabinLength * 0.23, wheelY, -width / 2 - wheelThickness * 0.64);
    
    if (isSemiTruck) {
      addDoubleWheel(cabinX - cabinLength * 0.27, wheelY, width / 2 + wheelThickness * 0.72); 
      addDoubleWheel(cabinX - cabinLength * 0.27, wheelY, -width / 2 - wheelThickness * 0.72);
      
      const numAxles = vehicleConfig.L > 12 ? 3 : 2;
      for (let axleIdx = 0; axleIdx < numAxles; axleIdx++) { 
        addDoubleWheel(-length / 2 + 0.65 + axleIdx * 0.75, wheelY, width / 2 + wheelThickness * 0.72); 
        addDoubleWheel(-length / 2 + 0.65 + axleIdx * 0.75, wheelY, -width / 2 - wheelThickness * 0.72); 
      }
    } else {
      addDoubleWheel(-length / 2 + 0.82, wheelY, width / 2 + wheelThickness * 0.64); 
      addDoubleWheel(-length / 2 + 0.82, wheelY, -width / 2 - wheelThickness * 0.64);
      addDoubleWheel(-length / 2 + 1.54, wheelY, width / 2 + wheelThickness * 0.64); 
      addDoubleWheel(-length / 2 + 1.54, wheelY, -width / 2 - wheelThickness * 0.64);
    }
  }

  // --- Double Deck / Sider Configs ---
  if (vehicleType === 'ddeck') {
    const deckMiddleY = groundClearance + height * 0.475 + 0.06;
    createMesh(createBox(length, 0.12, width), matFloor, 0, deckMiddleY - 0.06, 0);
    const matPlanksDouble = createMaterialPhong(0x7a5218, 8);
    for (let deckPlankX = -length / 2 + 0.3; deckPlankX < length / 2 - 0.1; deckPlankX += 0.3) {
      const deckPlank = new THREE.Mesh(createBox(0.015, 0.13, width), matPlanksDouble); 
      deckPlank.position.set(deckPlankX, deckMiddleY, 0); 
      sceneState.vehGrp.add(deckPlank);
    }
    createMesh(createBox(length + 0.01, 0.065, 0.065), matFrame, 0, deckMiddleY, width / 2);
    createMesh(createBox(length + 0.01, 0.065, 0.065), matFrame, 0, deckMiddleY, -width / 2);
  }

  if (vehicleType === 'sider') {
    const matCurtain = new THREE.MeshPhongMaterial({ color: 0x1133aa, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false });
    createMesh(createBox(length + 0.04, 0.065, 0.065), matChrome, 0, groundClearance + height + 0.065, width / 2 + 0.03);
    createMesh(createBox(length + 0.04, 0.065, 0.065), matChrome, 0, groundClearance + height + 0.065, -width / 2 - 0.03);
    createMesh(createBox(length + 0.04, 0.04, 0.04), matMetal, 0, groundClearance, width / 2 + 0.03);
    createMesh(createBox(length + 0.04, 0.04, 0.04), matMetal, 0, groundClearance, -width / 2 - 0.03);
    const curtainGeo = new THREE.BoxGeometry(length, height, 0.015);
    [width / 2 + 0.01, -width / 2 - 0.01].forEach(z => {
      const curtainMesh = new THREE.Mesh(curtainGeo, matCurtain); 
      curtainMesh.position.set(0, cargoBayYCenter, z); 
      sceneState.vehGrp.add(curtainMesh);
    });
  }

  [width / 2 * 0.63, -width / 2 * 0.63].forEach(z => createMesh(createBox(0.055, 0.17, 0.23), matBrake, -length / 2 - 0.02, groundClearance + height * 0.52, z));
  createMesh(createBox(0.025, 0.06, width * 0.7), matChrome, -length / 2 - 0.02, groundClearance + 0.22, 0);
};

export const placeCargos = (vehicleConfig, cargosList, sceneState, selectedCargoId, THREE) => {
  const groundClearance = getGC(vehicleConfig.type);
  const cargoUnits = [];
  
  // Transforma as cargas baseando-se na quantidade (qty)
  cargosList.forEach(cargo => {
    for (let quantityIndex = 0; quantityIndex < cargo.qty; quantityIndex++) {
      cargoUnits.push({ 
        id: cargo.id, 
        name: cargo.name, 
        length: cargo.l, 
        width: cargo.w, 
        height: cargo.h, 
        color: cargo.color, 
        label: cargo.name + (cargo.qty > 1 ? ' #' + (quantityIndex + 1) : ''), 
        unitIdx: quantityIndex 
      });
    }
  });

  const placeOnDeck = (deckUnits, bayLength, bayWidth, bayHeight, floorY) => {
    let currentX = -bayLength / 2 + GAP;
    let currentZ = -bayWidth / 2 + GAP;
    let maxRowLength = 0;

    // 🟢 MUDANÇA AQUI: Mantemos a altura da caixa SEMPRE colada ao chão.
    let currentY = floorY + GAP;

    deckUnits.forEach(cargoUnit => {
      const cLength = cargoUnit.length;
      const cWidth = cargoUnit.width;
      const cHeight = cargoUnit.height;
      
      // Quebra de linha Z (profundidade)
      if (currentZ + cWidth > bayWidth / 2 - GAP) { 
        currentX += maxRowLength + GAP; 
        currentZ = -bayWidth / 2 + GAP; 
        maxRowLength = 0; 
      }
      
      // 🟢 MUDANÇA AQUI: Removemos a lógica que subia o eixo Y.
      // Se a caixa passar do comprimento X, ela simplesmente continua para fora do caminhão.

      let cargoX = currentX + cLength / 2;
      let cargoY = currentY + cHeight / 2; // O Y da base + metade da altura
      let cargoZ = currentZ + cWidth / 2;
      
      const positionKey = cargoUnit.id + '_' + cargoUnit.unitIdx;
      
      // Sobrescreve a posição se o usuário tiver arrastado (posição manual)
      if (sceneState.posOv[positionKey]) { 
        cargoX = sceneState.posOv[positionKey].x; 
        cargoY = sceneState.posOv[positionKey].y; 
        cargoZ = sceneState.posOv[positionKey].z; 
      }

      const isInsideBay = (currentX + cLength <= bayLength / 2 + 0.015) && 
                          (currentZ + cWidth <= bayWidth / 2 + 0.015) && 
                          (currentY + cHeight <= floorY + bayHeight + 0.015);
      
      const cargoColor = new THREE.Color(cargoUnit.color);

      const cargoGeometry = new THREE.BoxGeometry(cLength, cHeight, cWidth);
      const cargoMaterial = new THREE.MeshPhongMaterial({
        color: cargoColor, 
        transparent: true, 
        opacity: isInsideBay ? 0.88 : 0.38, 
        shininess: 85,
        specular: new THREE.Color(0.15, 0.15, 0.15),
        emissive: (selectedCargoId === cargoUnit.id) ? new THREE.Color(0, 0.05, 0.12) : (isInsideBay ? new THREE.Color(0, 0, 0) : new THREE.Color(0.22, 0, 0))
      });
      
      const cargoMesh = new THREE.Mesh(cargoGeometry, cargoMaterial);
      cargoMesh.position.set(cargoX, cargoY, cargoZ);
      cargoMesh.castShadow = true; 
      cargoMesh.receiveShadow = true;
      cargoMesh.frustumCulled = false; 
      cargoMesh.userData = { movable: true, cid: cargoUnit.id, label: cargoUnit.label, unitIdx: cargoUnit.unitIdx, posKey: positionKey, inBay: isInsideBay };
      sceneState.cargoGrp.add(cargoMesh);

      // Bordas da caixa
      const edgeGeometry = new THREE.EdgesGeometry(cargoGeometry);
      const edgeMaterial = new THREE.LineBasicMaterial({ color: cargoColor, transparent: true, opacity: isInsideBay ? 0.95 : 0.35 });
      const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      edgeLines.position.copy(cargoMesh.position);
      edgeLines.frustumCulled = false;
      edgeLines.userData = { linkedTo: cargoMesh.uuid };
      sceneState.cargoGrp.add(edgeLines);

      // Face Superior
      const topColor = new THREE.Color(cargoUnit.color);
      topColor.lerp(new THREE.Color(1, 1, 1), 0.4);
      const topGeometry = new THREE.PlaneGeometry(cLength - 0.01, cWidth - 0.01);
      const topMaterial = new THREE.MeshBasicMaterial({ color: topColor, transparent: true, opacity: isInsideBay ? 0.25 : 0.08, side: THREE.DoubleSide });
      const topFace = new THREE.Mesh(topGeometry, topMaterial);
      topFace.rotation.x = -Math.PI / 2;
      topFace.position.set(cargoX, cargoY + cHeight / 2 + 0.003, cargoZ);
      topFace.frustumCulled = false; 
      topFace.userData = { topOf: cargoMesh.uuid };
      sceneState.cargoGrp.add(topFace);

      // Face Frontal
      const frontColor = new THREE.Color(cargoUnit.color);
      frontColor.lerp(new THREE.Color(1, 1, 1), 0.18);
      const frontGeometry = new THREE.PlaneGeometry(cLength - 0.01, cHeight - 0.01);
      const frontMaterial = new THREE.MeshBasicMaterial({ color: frontColor, transparent: true, opacity: isInsideBay ? 0.12 : 0.04, side: THREE.DoubleSide });
      const frontFace = new THREE.Mesh(frontGeometry, frontMaterial);
      frontFace.position.set(cargoX, cargoY, cargoZ + cWidth / 2 + 0.003);
      frontFace.frustumCulled = false; 
      sceneState.cargoGrp.add(frontFace);

      maxRowLength = Math.max(maxRowLength, cLength);
      currentZ += cWidth + GAP;
    });
  };

  // Separação de Lógica para caminhões de dois andares (ddeck)
  if (vehicleConfig.type === 'ddeck') {
    const deckHeight = vehicleConfig.H * 0.475 - 0.08;
    const halfUnits = Math.ceil(cargoUnits.length / 2);
    // Para caminhões de dois andares, a lógica respeita o facto de que as caixas não se empilham por andar!
    placeOnDeck(cargoUnits.slice(0, halfUnits), vehicleConfig.L, vehicleConfig.W, deckHeight, groundClearance);
    placeOnDeck(cargoUnits.slice(halfUnits), vehicleConfig.L, vehicleConfig.W, deckHeight, groundClearance + vehicleConfig.H * 0.475 + 0.08);
  } else {
    placeOnDeck(cargoUnits, vehicleConfig.L, vehicleConfig.W, vehicleConfig.H, groundClearance);
  }
};