import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import GLTFDebugger from './GLTFDebugger.js';


// Variables globales
let scene, camera, renderer, controls;

let starsGeometry, starsMaterial, stars;
let model, debuggerVar;

async function init() {
    // Crear escena
    scene = new THREE.Scene();
    
    // Crear cámara
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;
    
    // Crear renderizador
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000);
    document.body.appendChild(renderer.domElement);
    
    // Configurar controles
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    //controls.enableZoom = false;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.5;
    
    // Luces
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Inicializar debugger
    debuggerVar = new GLTFDebugger(scene, camera, renderer);
    debuggerVar.controls = controls; // Pasar la referencia a los controles
    debuggerVar.enable();    
    
    // Estrellas
    createStars();
    
    // Cargar modelo con todos los loaders necesarios
    await loadModel();
    
    // Eventos
    window.addEventListener('resize', onWindowResize);
    
    // Animación
    animate();
}

async function loadModel() {
    try {
        const loader = new GLTFLoader();
        
        // Configurar DRACOLoader
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        loader.setDRACOLoader(dracoLoader);
        
        // Configurar KTX2Loader
        const ktx2Loader = new KTX2Loader()
            .setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.146.0/examples/js/libs/basis/')
            .detectSupport(renderer);
        loader.setKTX2Loader(ktx2Loader);
        
        // Configurar MeshoptDecoder (opcional, para modelos que lo usen)
        loader.setMeshoptDecoder(MeshoptDecoder);
        
        // Cargar modelo
        const gltf = await loader.loadAsync('models/sceneRoot.glb');
        
        model = gltf.scene;
        model.position.set(0, 0, 0);
        model.scale.set(1, 1, 1);
        
        // Configurar sombras
        model.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        
        scene.add(model);
        controls.target.copy(model.position);
        
        console.log('Modelo cargado correctamente');
    } catch (error) {
        console.error('Error al cargar el modelo:', error);
        // Opcional: Mostrar un mensaje al usuario o cargar un modelo de respaldo
    }
}

// Resto del código permanece igual...
function createStars() {
    const starsCount = 5000;
    
    starsGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starsCount * 3);
    const sizes = new Float32Array(starsCount);
    const colors = new Float32Array(starsCount * 3);
    
    for (let i = 0; i < starsCount; i++) {
        const radius = 1000;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);
        
        sizes[i] = Math.random() * 2;
        
        if (Math.random() > 0.9) {
            colors[i * 3] = Math.random() > 0.5 ? 0.2 + Math.random() * 0.3 : 0.7 + Math.random() * 0.3;
            colors[i * 3 + 1] = Math.random() * 0.4;
            colors[i * 3 + 2] = Math.random() > 0.5 ? 0.7 + Math.random() * 0.3 : 0.2 + Math.random() * 0.3;
        } else {
            const intensity = 0.7 + Math.random() * 0.3;
            colors[i * 3] = intensity;
            colors[i * 3 + 1] = intensity;
            colors[i * 3 + 2] = intensity * (0.8 + Math.random() * 0.2);
        }
    }
    
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    starsMaterial = new THREE.PointsMaterial({
        size: 1,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true
    });
    
    stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    stars.rotation.x += 0.0001;
    stars.rotation.y += 0.0002;   
    
    
    controls.update();
    renderer.render(scene, camera);
}

init();