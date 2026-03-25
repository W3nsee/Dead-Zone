// === MAPA Y LUCES ===
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6); scene.add(hemiLight);
const floorGeometry = new THREE.PlaneGeometry(120, 120); const floorMaterial = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, depthWrite: false });
const floor = new THREE.Mesh(floorGeometry, floorMaterial); floor.rotation.x = - Math.PI / 2; scene.add(floor);

function addObstacle(mesh) { scene.add(mesh); obstacles.push(mesh); boundingBoxes.push(new THREE.Box3().setFromObject(mesh)); }

const wallMat = new THREE.MeshPhongMaterial({ color: 0x222222 }); 
function createWall(x, y, z, w, h, d) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    wall.position.set(x, y, z);
    addObstacle(wall);
}

// === SISTEMA DE PUERTAS COMPRABLES ===
const puertas = [];

function createDoor(x, y, z, w, h, d, rotY, id, cost, text) {
    const group = new THREE.Group();
    const matWood = new THREE.MeshPhongMaterial({ color: 0x5c3a21 }); 
    
    // Crear tablas de madera estilo barricada zombie
    if (w > d) { 
        for(let i=0; i<3; i++) { let plank = new THREE.Mesh(new THREE.BoxGeometry(w, h/4, d), matWood); plank.position.y = (i - 1) * (h/3); plank.rotation.z = (Math.random() - 0.5) * 0.2; group.add(plank); }
    } else { 
        for(let i=0; i<3; i++) { let plank = new THREE.Mesh(new THREE.BoxGeometry(w, h/4, d), matWood); plank.position.y = (i - 1) * (h/3); plank.rotation.x = (Math.random() - 0.5) * 0.2; group.add(plank); }
    }
    
    // Fondo semitransparente oscuro para bloquear visualmente
    const blocker = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.7 }));
    group.add(blocker);

    group.position.set(x, y, z); group.rotation.y = rotY; scene.add(group);
    
    const box = new THREE.Box3().setFromObject(group);
    obstacles.push(blocker); boundingBoxes.push(box);
    puertas.push({ id: id, group: group, mesh: blocker, box: box, cost: cost, nombre: text, abierta: false });
}

function openDoor(id) {
    let p = puertas.find(p => p.id === id);
    if(p && !p.abierta) {
        p.abierta = true;
        p.group.visible = false;
        
        // Retirar de los cálculos de colisiones
        let obsIdx = obstacles.indexOf(p.mesh); if (obsIdx > -1) obstacles.splice(obsIdx, 1);
        let boxIdx = boundingBoxes.indexOf(p.box); if (boxIdx > -1) boundingBoxes.splice(boxIdx, 1);
    }
}

function resetDoors() {
    puertas.forEach(p => {
        p.abierta = false; p.group.visible = true;
        if (!obstacles.includes(p.mesh)) obstacles.push(p.mesh);
        if (!boundingBoxes.includes(p.box)) boundingBoxes.push(p.box);
    });
}

// === CONSTRUCCIÓN DEL MAPA (3 ZONAS) ===
// 1. LÍMITES EXTERIORES
createWall(0, 7.5, -50, 100, 15, 2); // Norte
createWall(0, 7.5, 50, 100, 15, 2);  // Sur
createWall(-50, 7.5, 0, 2, 15, 100); // Oeste
createWall(50, 7.5, 0, 2, 15, 100);  // Este

// 2. PARED DIVISORIA HORIZONTAL (Separa el Norte - Zona 2)
createWall(-27.5, 7.5, -15, 45, 15, 2); // Pared Izquierda
createWall(27.5, 7.5, -15, 45, 15, 2);  // Pared Derecha
createDoor(0, 4, -15, 10, 8, 2, 0, 'door_north', 750, "Despejar Pasillo Norte"); // Puerta al medio

// 3. PARED DIVISORIA VERTICAL (Separa el Este - Zona 3)
createWall(15, 7.5, -10, 2, 15, 10);    // Pared Arriba
createWall(15, 7.5, 27.5, 2, 15, 45);   // Pared Abajo
createDoor(15, 4, 0, 2, 8, 10, 0, 'door_east', 1000, "Abrir Zona de Carga"); // Puerta en el medio

// === OBJETOS DEL MAPA ===
function createWoodenCrate(x, y, z) {
    const group = new THREE.Group(); const darkWood = new THREE.MeshPhongMaterial({ color: 0x4a3320 }); const lightWood = new THREE.MeshPhongMaterial({ color: 0x8b5a2b });
    const size = 3; const t = 0.2; const inner = new THREE.Mesh(new THREE.BoxGeometry(size - t, size - t, size - t), darkWood); group.add(inner);
    const edgeGeo = new THREE.BoxGeometry(t, size, t); const horizGeo = new THREE.BoxGeometry(size, t, t); const depthGeo = new THREE.BoxGeometry(t, t, size); const hs = size / 2 - t / 2;
    [[-hs, -hs], [hs, -hs], [-hs, hs], [hs, hs]].forEach(p => { let post = new THREE.Mesh(edgeGeo, lightWood); post.position.set(p[0], 0, p[1]); group.add(post); });
    [hs, -hs].forEach(y => { [hs, -hs].forEach(z => { let beam = new THREE.Mesh(horizGeo, lightWood); beam.position.set(0, y, z); group.add(beam); }); });
    [hs, -hs].forEach(y => { [hs, -hs].forEach(x => { let beam = new THREE.Mesh(depthGeo, lightWood); beam.position.set(x, y, 0); group.add(beam); }); });
    const diagLen = (size - t) * 1.414; const diagGeoX = new THREE.BoxGeometry(diagLen, t, t); const diagGeoZ = new THREE.BoxGeometry(t, t, diagLen);
    [hs, -hs].forEach(z => { let diag = new THREE.Mesh(diagGeoX, lightWood); diag.position.set(0, 0, z); diag.rotation.z = Math.PI / 4; group.add(diag); });
    [hs, -hs].forEach(x => { let diag = new THREE.Mesh(diagGeoZ, lightWood); diag.position.set(x, 0, 0); diag.rotation.x = Math.PI / 4; group.add(diag); });
    group.position.set(x, y, z); addObstacle(group);
}
function createRack(x, z) {
    const group = new THREE.Group(); const blue = new THREE.MeshPhongMaterial({ color: 0x1a3a5a }); const orange = new THREE.MeshPhongMaterial({ color: 0xd35400 });
    for(let i=0; i<4; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 8, 0.3), blue); p.position.set(i<2 ? -2 : 2, 4, i%2===0 ? -4 : 4); group.add(p); }
    [1.5, 4.5, 7.5].forEach(y => { const shelf = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 8), orange); shelf.position.y = y; group.add(shelf); });
    group.position.set(x, 0, z); scene.add(group); const rackBox = new THREE.Mesh(new THREE.BoxGeometry(4, 8, 8), new THREE.MeshBasicMaterial({visible:false})); rackBox.position.set(x, 4, z); addObstacle(rackBox);
}
function createBarrel(x, z) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2.5, 16), new THREE.MeshPhongMaterial({ color: 0x660000 })); b.position.set(x, 1.25, z); addObstacle(b); }
function createShop(x, y, z, rotY, color, tipo, precio, nombre) {
    const group = new THREE.Group(); const panel = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 0.2), new THREE.MeshPhongMaterial({ color: color, emissive: color, emissiveIntensity: 0.2 })); group.add(panel);
    let displayWp; if (tipo === 'pistola') displayWp = createLowPolyPistol(); else if (tipo === 'escopeta') displayWp = createLowPolyShotgun(); else if (tipo === 'rifle') displayWp = createLowPolyRifle(); else displayWp = new THREE.Group(); 
    if (tipo !== 'granadas') { displayWp.position.set(0, 0, 0.2); displayWp.rotation.y = -Math.PI / 2; displayWp.scale.set(1.5, 1.5, 1.5); group.add(displayWp); }
    group.position.set(x, y, z); group.rotation.y = rotY; scene.add(group); tiendas.push({ mesh: panel, tipo: tipo, precio: precio, nombre: nombre, group: group });
}

// DECORACIÓN POR ZONAS
// Zona 2 (Norte)
createRack(-25, -30); createRack(25, -30); createBarrel(5, -35); createBarrel(-15, -40);
// Zona 3 (Este)
createWoodenCrate(35, 1.5, 10); createWoodenCrate(35, 4.5, 10); createRack(40, 30);

// UBICACIÓN ESTRATÉGICA DE TIENDAS
createShop(-5, 2, 14.9, Math.PI, 0x888888, 'pistola', 100, "Balas Pistola"); // ZONA 1 (Spawn)
createShop(-14.9, 2, 5, Math.PI/2, 0x3333ff, 'granadas', 500, "Granadas x2"); // ZONA 1 (Spawn)
createShop(0, 2, -48.9, 0, 0xff3333, 'escopeta', 1500, "Escopeta Caza"); // ZONA 2 (Fondo Norte)
createShop(48.9, 2, 0, -Math.PI/2, 0x33ff33, 'rifle', 2500, "Rifle M4"); // ZONA 3 (Fondo Este)