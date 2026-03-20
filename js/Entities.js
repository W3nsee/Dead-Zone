function generateUUID() { return Math.random().toString(36).substr(2, 9); }

function spawnZombie() {
    const side = Math.floor(Math.random() * 4);
    let nx, nz;
    if(side===0){nx=(Math.random()-0.5)*110; nz=-55;}
    else if(side===1){nx=(Math.random()-0.5)*110; nz=55;}
    else if(side===2){nx=-55; nz=(Math.random()-0.5)*110;}
    else {nx=55; nz=(Math.random()-0.5)*110;}

    let zObj = createZombieMesh();
    zObj.id = generateUUID(); // ID vital para multijugador
    zObj.mesh.position.set(nx, 0, nz);
    zObj.maxHp = 100 + (oleadaActual * 20);
    zObj.hp = zObj.maxHp;

    // Sonido Posicional
    let zSound = new THREE.PositionalAudio(audioListener);
    zSound.setRefDistance(5);
    if(zombieAudioBuffer) { zSound.setBuffer(zombieAudioBuffer); zSound.play(); }
    zObj.mesh.add(zSound); zObj.audio = zSound;

    scene.add(zObj.mesh);
    zombiesArray.push(zObj);
    zombiesVivos++;
    zombiesRestantes--;
    actualizarHUD();
}

function damageZombie(zId, damage, partType, hitPoint) {
    let zIndex = zombiesArray.findIndex(z => z.id === zId);
    if (zIndex === -1) return;
    let z = zombiesArray[zIndex];
    
    z.hp -= damage;
    z.hpBar.scale.x = Math.max(0, z.hp / z.maxHp);
    spawnFloatingDamage(damage, partType, hitPoint);

    if(z.hp <= 0) {
        if(z.audio) z.audio.stop();
        scene.remove(z.mesh);
        zombiesArray.splice(zIndex, 1);
        zombiesVivos--;
        mostrarDinero(100);
        actualizarHUD();
    }
}

function syncClientZombies(serverZombies) {
    // Eliminar los que ya no están en el server
    for (let i = zombiesArray.length - 1; i >= 0; i--) {
        if (!serverZombies.find(sz => sz.id === zombiesArray[i].id)) {
            scene.remove(zombiesArray[i].mesh);
            zombiesArray.splice(i, 1);
        }
    }
    // Actualizar o Crear
    serverZombies.forEach(sz => {
        let localZ = zombiesArray.find(z => z.id === sz.id);
        if (localZ) {
            localZ.mesh.position.set(sz.x, sz.y, sz.z);
            localZ.mesh.rotation.y = sz.rotY;
            localZ.hp = sz.hp;
            localZ.hpBar.scale.x = Math.max(0, localZ.hp / sz.maxHp);
        } else {
            let nZ = createZombieMesh();
            nZ.id = sz.id;
            nZ.mesh.position.set(sz.x, sz.y, sz.z);
            scene.add(nZ.mesh);
            zombiesArray.push(nZ);
        }
    });
}