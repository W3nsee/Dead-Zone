// === DETECCIÓN DE MÓVIL Y CONFIGURACIONES ===
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window);
let mobControls = document.getElementById('mobile-controls'); let grenadeHud = document.getElementById('grenade-hud');
if (isMobile) { if(mobControls) mobControls.style.display = 'block'; if(grenadeHud) grenadeHud.style.display = 'none'; }

// === AUDIOS GLOBALES ===
const audioShootPistola = new Audio('shoot.mp3'); const audioShootEscopeta = new Audio('shotgun.mp3'); const audioShootRifle = new Audio('rifle.mp3');
const audioZombieBase = new Audio('dead_zombie.mp3'); const audioReloadBase = new Audio('reload.mp3'); const audioPickupBase = new Audio('pickup.mp3');
const audioSlide = new Audio('slide.mp3'); const audioBuy = new Audio('buy.mp3'); const audioThrow = new Audio('throw.mp3'); const audioBoom = new Audio('boom.mp3');

let baseVolumes = { shoot: 0.4, zombie: 0.8, reload: 1.0, pickup: 1.0, slide: 0.8, buy: 1.0, throw: 1.0, boom: 1.0 }; let globalVolMulti = 1.0;
let volSlider = document.getElementById('volume-slider');
if(volSlider) { volSlider.addEventListener('input', (e) => { globalVolMulti = parseFloat(e.target.value); let volVal = document.getElementById('vol-value'); if(volVal) volVal.innerText = Math.round(globalVolMulti * 100) + '%'; }); }
document.addEventListener('contextmenu', event => event.preventDefault());

// === SISTEMA DE MAPEO DE TECLAS ===
let keyMap = { forward: 'KeyW', backward: 'KeyS', left: 'KeyA', right: 'KeyD', reload: 'KeyR', sprint: 'ShiftLeft', jump: 'Space', crouch: 'ControlLeft', interact: 'KeyE', grenade: 'KeyG', wp1: 'Digit1', wp2: 'Digit2', wp3: 'Digit3' };
function formatKey(code) { if (code.startsWith('Key')) return code.replace('Key', ''); if (code.startsWith('Digit')) return code.replace('Digit', ''); if (code === 'Space') return 'Espacio'; if (code.includes('Shift')) return 'Shift'; if (code.includes('Control')) return 'Ctrl'; return code; }
let waitingForKeyAction = null; let activeKeyBtn = null;
document.querySelectorAll('.key-btn').forEach(btn => { btn.addEventListener('click', (e) => { if (waitingForKeyAction) return; waitingForKeyAction = e.target.dataset.action; activeKeyBtn = e.target; e.target.classList.add('waiting'); e.target.innerText = "Presiona..."; }); });

// === ESTADO GLOBAL DEL JUGADOR ===
let puntos = 500, salud = 100, granadas = 2, armaActual = 'pistola', lastShootTime = 0;
let isGameActive = false, recargando = false, isAiming = false, isSprinting = false, isCrouching = false, isSliding = false;
let slideTimer = 0, canJump = true, isShooting = false, currentShopTarget = null, lastDamageTime = 0, muzzleFlashTimer = 0;

// === ESTADO LOBBY Y HORDAS ===
let isLobby = false, holdingStart = false, holdStartProgress = 0; // NUEVO: Sistema de Sala
let oleadaActual = 1, zombiesRestantes = 5, zombiesVivos = 0, maxZombiesEnMapa = 5, tiempoEntreOleadas = 0, estadoOleada = "activa"; 

// === ARRAYS GLOBALES ===
const zombiesArray = []; const activeBullets = []; const activeGrenades = []; const medkits = []; const tiendas = []; const obstacles = []; const boundingBoxes = [];  

// === THREE.JS SETUP GLOBAL ===
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x111111); scene.fog = new THREE.Fog(0x111111, 5, 60);
const normalFOV = 75; const aimFOV = 55; 
const camera = new THREE.PerspectiveCamera(normalFOV, window.innerWidth / window.innerHeight, 0.01, 1000); const cameraGroup = new THREE.Group(); scene.add(cameraGroup); cameraGroup.add(camera);
const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(window.innerWidth, window.innerHeight); document.body.appendChild(renderer.domElement);
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); }, false);

// === AUDIO ESPACIAL 3D ===
const audioListener = new THREE.AudioListener(); camera.add(audioListener); const audioLoader = new THREE.AudioLoader(); let zombieAudioBuffer = null;
audioLoader.load('zombie.mp3', (buffer) => { zombieAudioBuffer = buffer; zombiesArray.forEach(z => { if (z.audio && !z.audio.isPlaying) { z.audio.setBuffer(zombieAudioBuffer); z.audio.play(); } }); }, undefined, (err) => { console.log("Audio zombie.mp3 no encontrado."); });
function resumeAudio() { if (audioListener.context.state === 'suspended') { audioListener.context.resume(); } }
let raycaster = new THREE.Raycaster(); const muzzleFlashLight = new THREE.PointLight(0xffaa00, 0, 10); scene.add(muzzleFlashLight);