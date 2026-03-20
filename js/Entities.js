// === CONFIGURACIÓN DE ARMAS ===
const armasConfig = {
    pistola:  { nombre: "Pistola Táctica", dmg: 40, magSize: 15, maxRes: 90, spread: 0.0, pellets: 1, auto: false, cooldownMs: 300, bulletSpeed: 200 },
    escopeta: { nombre: "Escopeta Caza", dmg: 30, magSize: 8, maxRes: 32, spread: 0.08, pellets: 6, auto: false, cooldownMs: 900, bulletSpeed: 180 },
    rifle:    { nombre: "Rifle M4", dmg: 25, magSize: 30, maxRes: 150, spread: 0.02, pellets: 1, auto: true, cooldownMs: 120, bulletSpeed: 250 }
};

let misArmas = { pistola: { mag: 15, res: 90, desbloqueada: true }, escopeta: { mag: 8, res: 32, desbloqueada: false }, rifle: { mag: 30, res: 150, desbloqueada: false } };

// === MODELOS DE ARMAS LOW POLY ===
const matDark = new THREE.MeshPhongMaterial({color: 0x1a1a1a, shininess: 30}); 
const matGrey = new THREE.MeshPhongMaterial({color: 0x444444, shininess: 20}); 
const matTan  = new THREE.MeshPhongMaterial({color: 0x9b8b74, shininess: 10}); 
const matWood = new THREE.MeshPhongMaterial({color: 0x5c3a21, shininess: 5});  

function createLowPolyPistol() {
    const group = new THREE.Group();
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.22), matDark); slide.position.set(0, 0.05, -0.05); group.add(slide);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.02, 0.22), matTan); frame.position.set(0, 0.02, -0.05); group.add(frame);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.12, 0.06), matTan); grip.position.set(0, -0.04, 0.03); grip.rotation.x = -Math.PI / 16; group.add(grip);
    const tGuard = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.03, 0.06), matTan); tGuard.position.set(0, -0.01, -0.03); group.add(tGuard);
    return group;
}

function createLowPolyShotgun() {
    const group = new THREE.Group();
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.25), matDark); receiver.position.set(0, 0.03, 0.0); group.add(receiver);
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.6), matGrey); barrel.position.set(0, 0.04, -0.4); group.add(barrel);
    const tube = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.45), matDark); tube.position.set(0, 0.01, -0.35); group.add(tube);
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.18), matWood); pump.position.set(0, 0.01, -0.3); group.add(pump);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.3), matWood); stock.position.set(0, -0.01, 0.25); stock.rotation.x = -Math.PI / 24; group.add(stock);
    return group;
}

function createLowPolyRifle() {
    const group = new THREE.Group();
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.25), matDark); receiver.position.set(0, 0.05, 0.0); group.add(receiver);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 0.08), matDark); mag.position.set(0, -0.05, -0.05); mag.rotation.x = Math.PI / 16; group.add(mag);
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.06, 0.35), matTan); handguard.position.set(0, 0.05, -0.3); group.add(handguard);
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.25), matGrey); barrel.position.set(0, 0.05, -0.55); group.add(barrel);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.25), matTan); stock.position.set(0, 0.02, 0.25); group.add(stock);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.12, 0.06), matDark); grip.position.set(0, -0.04, 0.1); grip.rotation.x = -Math.PI / 12; group.add(grip);
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.06), matDark); sight.position.set(0, 0.11, 0.0); group.add(sight);
    return group;
}

const weaponModels = { pistola: createLowPolyPistol(), escopeta: createLowPolyShotgun(), rifle: createLowPolyRifle() };
const weaponOffsets = {
    pistola: { hip: new THREE.Vector3(0.18, -0.15, -0.25), aim: new THREE.Vector3(0, -0.08, -0.2) },
    escopeta: { hip: new THREE.Vector3(0.2, -0.15, -0.25), aim: new THREE.Vector3(0, -0.08, -0.2) },
    rifle: { hip: new THREE.Vector3(0.2, -0.2, -0.35), aim: new THREE.Vector3(0, -0.14, -0.25) } 
};
const activeWeaponGroup = new THREE.Group(); let hipPosition = new THREE.Vector3(); let aimPosition = new THREE.Vector3(); let currentTargetPosition = new THREE.Vector3();
camera.add(activeWeaponGroup);

function equipWeapon(wpName) {
    armaActual = wpName; isShooting = false;
    while(activeWeaponGroup.children.length > 0) activeWeaponGroup.remove(activeWeaponGroup.children[0]);
    activeWeaponGroup.add(weaponModels[wpName]);
    let wi = document.getElementById('weapon-info'); if(wi) wi.innerText = armasConfig[wpName].nombre;
    hipPosition.copy(weaponOffsets[wpName].hip); aimPosition.copy(weaponOffsets[wpName].aim); currentTargetPosition.copy(hipPosition);
    if(typeof actualizarHUD === 'function') actualizarHUD();
}

// === ZOMBIES (Cuerpo Entero) ===
function createZombieMesh() {
    const group = new THREE.Group();
    const skinMat = new THREE.MeshPhongMaterial({ color: 0x4d7a3d }); const shirtMat = new THREE.MeshPhongMaterial({ color: 0x6e6351 }); const pantsMat = new THREE.MeshPhongMaterial({ color: 0x2b384f }); 
    const hairMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a }); const eyeMat = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0x550000 }); const mouthMat = new THREE.MeshPhongMaterial({ color: 0x111111 }); const bloodMat = new THREE.MeshPhongMaterial({ color: 0x880000 }); 
    
    const headGroup = new THREE.Group(); headGroup.position.set(0, 1.7, 0); headGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), skinMat));
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.42), hairMat); hair.position.set(0, 0.2, 0); headGroup.add(hair);
    const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02), eyeMat); leftEye.position.set(-0.1, 0.05, 0.21); headGroup.add(leftEye);
    const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02), eyeMat); rightEye.position.set(0.1, 0.05, 0.21); headGroup.add(rightEye);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.02), mouthMat); mouth.position.set(0, -0.1, 0.21); headGroup.add(mouth);
    const bloodMouth = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.02), bloodMat); bloodMouth.position.set(0.05, -0.15, 0.215); headGroup.add(bloodMouth);
    group.add(headGroup);
    
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.25), shirtMat); body.position.set(0, 1.15, 0); group.add(body);
    const chestBlood = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.02), bloodMat); chestBlood.position.set(-0.1, 1.2, 0.13); group.add(chestBlood);
    
    const armGeo = new THREE.BoxGeometry(0.15, 0.15, 0.6); armGeo.translate(0, 0, 0.3); 
    const leftArm = new THREE.Mesh(armGeo, skinMat); leftArm.position.set(-0.35, 1.4, 0); group.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, skinMat); rightArm.position.set(0.35, 1.4, 0); group.add(rightArm);
    const legGeo = new THREE.BoxGeometry(0.2, 0.8, 0.2); legGeo.translate(0, -0.4, 0); 
    const leftLeg = new THREE.Mesh(legGeo, pantsMat); leftLeg.position.set(-0.15, 0.8, 0); group.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, pantsMat); rightLeg.position.set(0.15, 0.8, 0); group.add(rightLeg);
    
    headGroup.traverse(c => { if(c.isMesh) { c.userData.isZombie = true; c.userData.part = 'head'; }});
    body.userData.isZombie = true; body.userData.part = 'body'; chestBlood.userData.isZombie = true; chestBlood.userData.part = 'body';
    leftArm.userData.isZombie = true; leftArm.userData.part = 'limb'; rightArm.userData.isZombie = true; rightArm.userData.part = 'limb';
    leftLeg.userData.isZombie = true; leftLeg.userData.part = 'limb'; rightLeg.userData.isZombie = true; rightLeg.userData.part = 'limb';

    const hpGroup = new THREE.Group();
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.1), new THREE.MeshBasicMaterial({color: 0x000000, depthTest: false}));
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.1), new THREE.MeshBasicMaterial({color: 0xff0000, depthTest: false}));
    bar.geometry.translate(0.4, 0, 0); bar.position.set(-0.4, 0, 0.01);
    hpGroup.add(bg, bar); hpGroup.position.y = 2.2; hpGroup.renderOrder = 999; group.add(hpGroup);

    group.userData = { head: headGroup, leftLeg, rightLeg, leftArm, rightArm };
    return { mesh: group, head: headGroup, lLeg: leftLeg, rLeg: rightLeg, lArm: leftArm, rArm: rightArm, hp: 100, maxHp: 100, speed: 4.0, hpBar: bar, hpGroup: hpGroup };
}

function spawnZombie() {
    let nx, nz; let validPosition = false; let attempts = 0; let spawnBox = new THREE.Box3();
    while(!validPosition && attempts < 20) {
        const angle = Math.random() * Math.PI * 2; const distance = 25 + Math.random() * 10; 
        nx = Math.max(-48, Math.min(48, camera.position.x + Math.cos(angle)*distance)); nz = Math.max(-48, Math.min(48, camera.position.z + Math.sin(angle)*distance));
        spawnBox.setFromCenterAndSize(new THREE.Vector3(nx, 1, nz), new THREE.Vector3(1.5, 2, 1.5));
        validPosition = !boundingBoxes.some(b => b.intersectsBox(spawnBox)); attempts++;
    }
    let zObj = createZombieMesh(); zObj.maxHp = 100 + (oleadaActual * 20); zObj.hp = zObj.maxHp; zObj.speed = 3.5 + (oleadaActual * 0.3); zObj.mesh.position.set(nx, 0, nz);
    let zSound = new THREE.PositionalAudio(audioListener); zSound.setRefDistance(5); zSound.setMaxDistance(50); zSound.setLoop(true); zSound.setVolume(baseVolumes.zombie * globalVolMulti * 1.5); 
    if(zombieAudioBuffer) { zSound.setBuffer(zombieAudioBuffer); zSound.play(); }
    zObj.mesh.add(zSound); zObj.audio = zSound;
    scene.add(zObj.mesh); zombiesArray.push(zObj); zombiesVivos++; zombiesRestantes--; if(typeof actualizarHUD === 'function') actualizarHUD();
}

function spawnFloatingDamage(dmg, type, pos3D) {
    const vector = pos3D.clone(); vector.project(camera); 
    if (vector.z > 1) return;
    const x = (vector.x * .5 + .5) * window.innerWidth; const y = (-(vector.y * .5) + .5) * window.innerHeight;
    const div = document.createElement('div'); div.className = `floating-dmg dmg-${type}`; div.innerText = dmg;
    div.style.left = `${x}px`; div.style.top = `${y}px`;
    let fCont = document.getElementById('floating-damage-container'); if(fCont) fCont.appendChild(div);
    setTimeout(() => { div.remove(); }, 800);
}

function damageZombie(zIndex, damage, partType, hitPoint) {
    let z = zombiesArray[zIndex]; z.hp -= damage; z.hpBar.scale.x = Math.max(0, z.hp / z.maxHp);
    spawnFloatingDamage(damage, partType, hitPoint);
    if(z.hp <= 0) {
        if(z.audio && z.audio.isPlaying) z.audio.stop();
        scene.remove(z.mesh); zombiesArray.splice(zIndex, 1); zombiesVivos--; 
        if(typeof mostrarDinero === 'function') mostrarDinero(100);
        let audio = audioZombieBase.cloneNode(); audio.volume = baseVolumes.zombie * globalVolMulti; audio.play().catch(()=>{});
        if(typeof actualizarHUD === 'function') actualizarHUD();
    }
}

function spawnMedkit() {
    if(medkits.length >= 4) return;
    const mk = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.4), new THREE.MeshPhongMaterial({color: 0xffffff}));
    const cross1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.41, 0.3), new THREE.MeshPhongMaterial({color: 0xff0000}));
    const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.41, 0.1), new THREE.MeshPhongMaterial({color: 0xff0000}));
    mk.add(box, cross1, cross2); let x = (Math.random() - 0.5) * 80; let z = (Math.random() - 0.5) * 80;
    mk.position.set(x, 0.2, z); scene.add(mk); medkits.push(mk);
}