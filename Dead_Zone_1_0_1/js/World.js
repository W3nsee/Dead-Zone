// === MAPA Y LUCES ===
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6); scene.add(hemiLight);
const floorGeometry = new THREE.PlaneGeometry(120, 120); const floorMaterial = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, depthWrite: false });
const floor = new THREE.Mesh(floorGeometry, floorMaterial); floor.rotation.x = - Math.PI / 2; scene.add(floor);

function addObstacle(mesh) { scene.add(mesh); obstacles.push(mesh); boundingBoxes.push(new THREE.Box3().setFromObject(mesh)); }

// === PAREDES ===
const wallMat = new THREE.MeshPhongMaterial({ color: 0x222222 }); const wallGeoH = new THREE.BoxGeometry(100, 15, 2); const wallGeoV = new THREE.BoxGeometry(2, 15, 100);
const wallN = new THREE.Mesh(wallGeoH, wallMat); wallN.position.set(0, 7.5, -50); addObstacle(wallN);
const wallS = new THREE.Mesh(wallGeoH, wallMat); wallS.position.set(0, 7.5, 50); addObstacle(wallS);
const wallE = new THREE.Mesh(wallGeoV, wallMat); wallE.position.set(50, 7.5, 0); addObstacle(wallE);
const wallW = new THREE.Mesh(wallGeoV, wallMat); wallW.position.set(-50, 7.5, 0); addObstacle(wallW);

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
    group.position.set(x, 0, z); scene.add(group); const rackBox = new THREE.Mesh(new THREE.BoxGeometry(4, 8, 8), new THREE.MeshBasicMaterial({visible:false}));
    rackBox.position.set(x, 4, z); addObstacle(rackBox);
}

function createBarrel(x, z) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2.5, 16), new THREE.MeshPhongMaterial({ color: 0x660000 })); b.position.set(x, 1.25, z); addObstacle(b); }

function createShop(x, y, z, rotY, color, tipo, precio, nombre) {
    const group = new THREE.Group(); const panel = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 0.2), new THREE.MeshPhongMaterial({ color: color, emissive: color, emissiveIntensity: 0.2 })); group.add(panel);
    let displayWp; if (tipo === 'pistola') displayWp = createLowPolyPistol(); else if (tipo === 'escopeta') displayWp = createLowPolyShotgun(); else if (tipo === 'rifle') displayWp = createLowPolyRifle(); else displayWp = new THREE.Group(); 
    if (tipo !== 'granadas') { displayWp.position.set(0, 0, 0.2); displayWp.rotation.y = -Math.PI / 2; displayWp.scale.set(1.5, 1.5, 1.5); group.add(displayWp); }
    group.position.set(x, y, z); group.rotation.y = rotY; scene.add(group); tiendas.push({ mesh: panel, tipo: tipo, precio: precio, nombre: nombre, group: group });
}

createRack(-25, -20); createRack(-25, 20); createRack(25, -20); createRack(25, 20);
createWoodenCrate(0, 1.5, -10); createWoodenCrate(0, 4.5, -10); createWoodenCrate(3, 1.5, -10);
createWoodenCrate(-10, 1.5, 20); createWoodenCrate(-10, 4.5, 20); createWoodenCrate(-13, 1.5, 20);
createBarrel(5, -5); createBarrel(7, -4.5); createBarrel(6, -7); createBarrel(-15, 0); createBarrel(-15, 2);

createShop(10, 2, -48.9, 0, 0xff3333, 'escopeta', 1500, "Escopeta"); createShop(-10, 2, -48.9, 0, 0x33ff33, 'rifle', 2500, "Rifle M4");
createShop(0, 2, 48.9, Math.PI, 0x3333ff, 'granadas', 500, "Granadas x2"); createShop(-5, 2, 48.9, Math.PI, 0x888888, 'pistola', 100, "Balas Pistola");