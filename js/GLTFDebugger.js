import * as THREE from 'three';


export default class GLTFDebugger {
    constructor(scene, camera, renderer) {
        // Propiedades básicas
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.controls = null;
        
        // Configuración inicial
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredObject = null;
        this.debugContainer = null;
        this.isEnabled = false;
        this.cameraPresets = [];
        this.currentPreset = null;
        this.cameraUpdateInterval = null;

        // Definición de métodos que necesitan binding
        this.handleMouseMove = (event) => {
            // Calcular posición del mouse normalizada
            this.mouse.x = (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;

            // Actualizar raycaster
            this.raycaster.setFromCamera(this.mouse, this.camera);

            // Buscar intersecciones
            const intersects = this.raycaster.intersectObjects(this.scene.children, true);

            // Resetear objeto hover anterior
            if (this.hoveredObject) {
                this.hoveredObject.material.emissive?.setHex(this.hoveredObject.userData.originalEmissive);
            }

            // Procesar nuevo hover
            if (intersects.length > 0) {
                this.hoveredObject = intersects[0].object;
                
                // Guardar color original si es la primera vez
                if (!this.hoveredObject.userData.originalEmissive && this.hoveredObject.material.emissive) {
                    this.hoveredObject.userData.originalEmissive = this.hoveredObject.material.emissive.getHex();
                }
                
                // Resaltar objeto
                if (this.hoveredObject.material.emissive) {
                    this.hoveredObject.material.emissive.setHex(0x888888);
                }

                // Mostrar info
                this.showDebugInfo(this.hoveredObject);
            } else {
                this.hoveredObject = null;
                document.getElementById('debug-info').textContent = 'No object hovered';
            }
        };

        this.handleClick = (event) => {
            if (!this.isEnabled || !this.hoveredObject) return;

            console.group('Clicked Object Debug Info');
            console.log('Object:', this.hoveredObject);
            console.log('Name:', this.hoveredObject.name);
            console.log('Position:', this.hoveredObject.position);
            console.log('Rotation:', this.hoveredObject.rotation);
            console.log('Scale:', this.hoveredObject.scale);
            console.log('UserData:', this.hoveredObject.userData);
            console.log('Material:', this.hoveredObject.material);
            console.groupEnd();

            // Mostrar en UI de debug
            const debugInfo = document.getElementById('debug-info');
            debugInfo.innerHTML = `
                <strong>Last Clicked:</strong><br>
                <strong>Name:</strong> ${this.hoveredObject.name}<br>
                <strong>Type:</strong> ${this.hoveredObject.type}<br>
                <strong>Position:</strong> ${JSON.stringify(this.hoveredObject.position.toArray())}<br>
                <strong>UserData:</strong> ${JSON.stringify(this.hoveredObject.userData)}
            `;
        };

        this.saveCameraPreset = () => {
            const presetName = prompt("Nombre del preset:");
            if (!presetName) return;
            
            const preset = {
                name: presetName,
                position: this.camera.position.clone(),
                rotation: this.camera.rotation.clone(),
                target: this.controls?.target?.clone() || new THREE.Vector3(),
                timestamp: new Date().toLocaleTimeString()
            };
            
            this.cameraPresets.push(preset);
            this.updatePresetButtons();
        };

        this.copyCameraCoords = () => {
            const textarea = document.getElementById('camera-coords');
            textarea.select();
            document.execCommand('copy');
            
            // Feedback visual
            const originalText = textarea.value;
            textarea.value = "¡Coordenadas copiadas al portapapeles!";
            setTimeout(() => {
                textarea.value = originalText;
            }, 1000);
        };

        this.applyCameraCoords = () => 
        {
            leerPortapapeles().then(text => {

            
            console.log('Texto a parsear:', text); // Depuración
            
            if (!text) {
                console.warn('El área de texto está vacía');
                return;
            }

            try {
            // Parsear con manejo de errores detallado
            const coords = JSON.parse(text);
            console.log('Coordenadas parseadas:', coords); // Depuración

            // Aplicar posición con validación
            if (coords.position) {
                if (!Array.isArray(coords.position)) {
                    throw new Error('La posición debe ser un array [x, y, z]');
                }
                
                const pos = coords.position.map(Number);
                if (pos.some(isNaN) || pos.length !== 3) {
                    throw new Error('Posición inválida. Use formato [1.23, 4.56, 7.89]');
                }
                
                console.log('Aplicando posición:', pos); // Depuración
                this.camera.position.set(pos[0], pos[1], pos[2]);
            }

            // Aplicar rotación con validación
            if (coords.rotation) {
                if (!Array.isArray(coords.rotation)) {
                    throw new Error('La rotación debe ser un array [x, y, z]');
                }
                
                const rot = coords.rotation.map(Number);
                if (rot.some(isNaN) || rot.length !== 3) {
                    throw new Error('Rotación inválida. Use formato [0.0, 15.5, 0.0] en grados');
                }
                
                console.log('Aplicando rotación:', rot); // Depuración
                this.camera.rotation.set(
                    THREE.MathUtils.degToRad(rot[0]),
                    THREE.MathUtils.degToRad(rot[1]),
                    THREE.MathUtils.degToRad(rot[2])
                );
            }

            // Aplicar target con validación
            if (this.controls && coords.target) 
                if (!Array.isArray(coords.target)) {
                    throw new Error('El target debe ser un array [x, y, z]');
                }
                
                const tgt = coords.target.map(Number);
                if (tgt.some(isNaN) || tgt.length !== 3) {
                    throw new Error('Target inválido. Use formato [0.0, 1.5, 0.0]');
                }
                
                console.log('Aplicando target', tgt);
                this.controls.target.set(tgt[0], tgt[1], tgt[2]);
            

            // Forzar actualización
            this.camera.updateProjectionMatrix();
            if (this.controls) {
                this.controls.update();
                console.log('Controles actualizados'); // Depuración
            }
            
            console.log('Transformación aplicada', {
                position: this.camera.position.toArray(),
                rotation: this.camera.rotation.toArray().map(THREE.MathUtils.radToDeg),
                target: this.controls?.target?.toArray()
            });

            // Feedback visual
            const originalBg = textarea.style.backgroundColor;
            textarea.style.backgroundColor = '#e8f5e9';
            setTimeout(() => {
                textarea.style.backgroundColor = originalBg;
            }, 500);
        } 
        
        catch (error) {
            
        console.error('Error al aplicar coordenadas:', error);
        
        // Feedback visual de error
        textarea.style.backgroundColor = '#ffebee';
        setTimeout(() => {
            textarea.style.backgroundColor = '';
        }, 1000);
        
        alert(`❌ Error: ${error.message}\n\nEjemplo de formato válido:\n\n{
        "position": [5.0, 2.0, -3.0],
        "rotation": [15.0, 30.0, 0.0],
        "target": [0.0, 0.5, 0.0]
        }`);
        }
        
            })
        }

        async function leerPortapapeles() {
            try {
                const texto = await navigator.clipboard.readText();
                console.log('Contenido del portapapeles:', texto);
                return texto;
            } catch (err) {
                console.error('Error al leer el portapapeles:', err);
                return null;
            }
        }
        // Crear la UI
        this.createDebugUI();
    }

    createDebugUI() {
    this.debugContainer = document.createElement('div');
    this.debugContainer.style.position = 'absolute';
    this.debugContainer.style.bottom = '10px';
    this.debugContainer.style.left = '10px';
    this.debugContainer.style.backgroundColor = 'rgba(0,0,0,0.7)';
    this.debugContainer.style.color = 'white';
    this.debugContainer.style.padding = '10px';
    this.debugContainer.style.borderRadius = '5px';
    this.debugContainer.style.fontFamily = 'Arial, sans-serif';
    this.debugContainer.style.zIndex = '100';
    this.debugContainer.style.maxHeight = '80vh';
    this.debugContainer.style.overflow = 'auto';
    
    this.debugContainer.innerHTML = `
        <h3 style="margin-top:0;">GLTF Debugger</h3>
        <div id="debug-hover-info" style="margin-bottom:15px;"></div>
        <div id="debug-camera-info" style="margin-bottom:15px;"></div>
        
        <div id="preset-buttons" style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:10px;"></div>
        
        <div style="display: flex; gap: 5px; margin-bottom: 10px;">
            <button id="save-preset" style="padding:5px;">Guardar Preset</button>
            <button id="copy-coords" style="padding:5px;">Copiar Coordenadas</button>
            <button id="apply-coords" style="padding:5px;">Aplicar Coordenadas</button>
        </div>
    `;
    
    document.body.appendChild(this.debugContainer);

    // Event listeners
    document.getElementById('save-preset').addEventListener('click', this.saveCameraPreset);
    document.getElementById('copy-coords').addEventListener('click', this.copyCameraCoords);
    document.getElementById('apply-coords').addEventListener('click', this.applyCameraCoords);
}

    enable() {
        if (this.isEnabled) return;
        
        this.isEnabled = true;
        this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove);
        this.renderer.domElement.addEventListener('click', this.handleClick);
        
        this.cameraUpdateInterval = setInterval(() => this.updateCameraInfo(), 100);
        console.log('GLTF Debugger enabled');
    }

    disable() {
        if (!this.isEnabled) return;
        
        this.isEnabled = false;
        this.renderer.domElement.removeEventListener('mousemove', this.handleMouseMove);
        this.renderer.domElement.removeEventListener('click', this.handleClick);
        clearInterval(this.cameraUpdateInterval);
        console.log('GLTF Debugger disabled');
    }

    updateCameraInfo() {
        const cameraInfo = document.getElementById('debug-camera-info');
        const coordsTextarea = document.getElementById('camera-coords');
        
        const cameraData = {
            position: this.camera.position.toArray().map(n => parseFloat(n.toFixed(3))),
            rotation: [
                parseFloat(THREE.MathUtils.radToDeg(this.camera.rotation.x).toFixed(3)),
                parseFloat(THREE.MathUtils.radToDeg(this.camera.rotation.y).toFixed(3)),
                parseFloat(THREE.MathUtils.radToDeg(this.camera.rotation.z).toFixed(3))
            ],
            target: this.controls?.target?.toArray().map(n => parseFloat(n.toFixed(3))) || [0, 0, 0]
        };
        
        cameraInfo.innerHTML = `
            <strong>Cámara Actual:</strong><br>
            <strong>Posición:</strong> ${cameraData.position.join(', ')}<br>
            <strong>Rotación:</strong> ${cameraData.rotation.join(', ')}°<br>
            <strong>Target:</strong> ${cameraData.target.join(', ')}
        `;
        
        coordsTextarea.value = JSON.stringify(cameraData, null, 2);
    }
    
    updatePresetButtons() {
        const container = document.getElementById('preset-buttons');
        container.innerHTML = '';
        
        this.cameraPresets.forEach((preset, index) => {
            const btn = document.createElement('button');
            btn.textContent = preset.name;
            btn.style.padding = '3px';
            btn.style.fontSize = '12px';
            
            btn.addEventListener('click', () => {
                this.applyCameraPreset(preset);
                this.currentPreset = index;
            });
            
            container.appendChild(btn);
        });
    }

    applyCameraPreset(preset) {
        this.camera.position.copy(preset.position);
        this.camera.rotation.copy(preset.rotation);
        
        if (this.controls && preset.target) {
            this.controls.target.copy(preset.target);
        }
        
        this.camera.updateProjectionMatrix();
        if (this.controls) this.controls.update();
    }

    showDebugInfo(object) {
        const debugInfo = document.getElementById('debug-hover-info');
        debugInfo.innerHTML = `
            <strong>Hovering:</strong><br>
            <strong>Name:</strong> ${object.name}<br>
            <strong>Type:</strong> ${object.type}
        `;
    }

    destroy() {
        this.disable();
        if (this.debugContainer) {
            document.body.removeChild(this.debugContainer);
        }
    }
}