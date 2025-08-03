import * as THREE from 'three';

export default class CameraController {
    constructor(camera, controls = null) {
        this.camera = camera;
        this.controls = controls;
        this.animation = null;
        this.focusAnimation = null;
        this.shots = {};
        this.currentShot = null;

        // Configuración de animaciones
        this.animationSettings = {
            focusDuration: 1.5,
            moveDuration: 2.0,
            easing: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
        };
    }

    /**
     * Define un nuevo shot de cámara
     * @param {string} name - Nombre identificador
     * @param {Object} config - Configuración del shot
     */
    defineShot(name, config) {
        this.shots[name] = {
            position: config.position ? new THREE.Vector3().copy(config.position) : null,
            target: config.target ? new THREE.Vector3().copy(config.target) : null,
            rotation: config.rotation ? new THREE.Euler(config.rotation) : null,
            fov: config.fov || this.camera.fov,
            lookAt: config.lookAt || null
        };
    }

    /**
     * Activa un shot predefinido
     */
    activateShot(name, options = {}) {
        if (!this.shots[name]) {
            console.warn(`Shot "${name}" no definido`);
            return;
        }

        const shot = this.shots[name];
        this.currentShot = name;
        const duration = options.duration || this.animationSettings.moveDuration;
        const easing = options.easing || this.animationSettings.easing;

        this.cancelAnimations();

        // Animaciones
        if (shot.position) {
            this.animateCameraTo(shot.position, duration, easing);
        }

        if (this.controls && shot.target) {
            this.animateTargetTo(shot.target, duration, easing);
        }

        if (!this.controls && shot.rotation) {
            this.animateRotationTo(shot.rotation, duration, easing);
        }

        if (!this.controls && shot.lookAt) {
            this.camera.lookAt(shot.lookAt);
        }

        if (shot.fov && this.camera.fov !== shot.fov) {
            this.animateFovTo(shot.fov, duration, easing);
        }
    }

    /**
     * Enfoca un objeto específico
     */
    focusObject(object, options = {}) {
        if (!object) return;

        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3()).length();
        const center = box.getCenter(new THREE.Vector3());

        const distance = options.distance || size * 1.5;
        const duration = options.duration || this.animationSettings.focusDuration;
        const easing = options.easing || this.animationSettings.easing;

        const direction = new THREE.Vector3()
            .subVectors(this.camera.position, center)
            .normalize()
            .multiplyScalar(distance);
        
        const targetPosition = new THREE.Vector3().addVectors(center, direction);

        this.cancelAnimations();
        this.animateCameraTo(targetPosition, duration, easing);
        
        if (this.controls) {
            this.animateTargetTo(center, duration, easing);
        } else {
            this.animateLookAt(center, duration, easing);
        }
    }

    // ====== MÉTODOS DE ANIMACIÓN ======

    animateCameraTo(targetPosition, duration, easing) {
        const startPosition = this.camera.position.clone();
        const startTime = Date.now();

        this.animation = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easing(progress);

            this.camera.position.lerpVectors(
                startPosition,
                targetPosition,
                easedProgress
            );

            if (progress < 1) {
                requestAnimationFrame(this.animation);
            } else {
                this.animation = null;
            }
        };

        requestAnimationFrame(this.animation);
    }

    animateTargetTo(target, duration, easing) {
        if (!this.controls) return;

        const startTarget = this.controls.target.clone();
        const startTime = Date.now();

        this.focusAnimation = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easing(progress);

            this.controls.target.lerpVectors(
                startTarget,
                target,
                easedProgress
            );
            this.controls.update();

            if (progress < 1) {
                requestAnimationFrame(this.focusAnimation);
            } else {
                this.focusAnimation = null;
            }
        };

        requestAnimationFrame(this.focusAnimation);
    }

    animateRotationTo(targetEuler, duration, easing) {
        const startQuat = this.camera.quaternion.clone();
        const targetQuat = new THREE.Quaternion().setFromEuler(targetEuler);
        const startTime = Date.now();

        const rotationAnimation = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easing(progress);

            THREE.Quaternion.slerp(
                startQuat,
                targetQuat,
                this.camera.quaternion,
                easedProgress
            );

            if (progress < 1) {
                requestAnimationFrame(rotationAnimation);
            }
        };

        requestAnimationFrame(rotationAnimation);
    }

    animateLookAt(target, duration, easing) {
        const startQuat = this.camera.quaternion.clone();
        this.camera.lookAt(target);
        const targetQuat = this.camera.quaternion.clone();
        this.camera.quaternion.copy(startQuat);

        const startTime = Date.now();

        this.focusAnimation = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easing(progress);

            THREE.Quaternion.slerp(
                startQuat,
                targetQuat,
                this.camera.quaternion,
                easedProgress
            );

            if (progress < 1) {
                requestAnimationFrame(this.focusAnimation);
            } else {
                this.focusAnimation = null;
            }
        };

        requestAnimationFrame(this.focusAnimation);
    }

    animateFovTo(targetFov, duration, easing) {
        const startFov = this.camera.fov;
        const startTime = Date.now();

        const fovAnimation = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easing(progress);

            this.camera.fov = startFov + (targetFov - startFov) * easedProgress;
            this.camera.updateProjectionMatrix();

            if (progress < 1) {
                requestAnimationFrame(fovAnimation);
            }
        };

        requestAnimationFrame(fovAnimation);
    }

    // ====== UTILIDADES ======

    cancelAnimations() {
        if (this.animation) {
            cancelAnimationFrame(this.animation);
            this.animation = null;
        }
        if (this.focusAnimation) {
            cancelAnimationFrame(this.focusAnimation);
            this.focusAnimation = null;
        }
    }

    getCurrentCameraState() {
        return {
            position: this.camera.position.clone(),
            target: this.controls ? this.controls.target.clone() : null,
            rotation: {
                x: THREE.MathUtils.radToDeg(this.camera.rotation.x),
                y: THREE.MathUtils.radToDeg(this.camera.rotation.y),
                z: THREE.MathUtils.radToDeg(this.camera.rotation.z),
                order: this.camera.rotation.order
            },
            fov: this.camera.fov
        };
    }

    restoreCameraState(state, animate = true) {
        if (animate) {
            if (state.position) {
                this.animateCameraTo(state.position, this.animationSettings.moveDuration, this.animationSettings.easing);
            }
            if (this.controls && state.target) {
                this.animateTargetTo(state.target, this.animationSettings.moveDuration, this.animationSettings.easing);
            }
            if (state.rotation) {
                const rotationRad = new THREE.Euler(
                    THREE.MathUtils.degToRad(state.rotation.x),
                    THREE.MathUtils.degToRad(state.rotation.y),
                    THREE.MathUtils.degToRad(state.rotation.z),
                    state.rotation.order || 'XYZ'
                );
                this.animateRotationTo(rotationRad, this.animationSettings.moveDuration, this.animationSettings.easing);
            }
            if (state.fov) {
                this.animateFovTo(state.fov, this.animationSettings.moveDuration, this.animationSettings.easing);
            }
        } else {
            if (state.position) this.camera.position.copy(state.position);
            if (this.controls && state.target) this.controls.target.copy(state.target);
            if (state.rotation) {
                this.camera.rotation.set(
                    THREE.MathUtils.degToRad(state.rotation.x),
                    THREE.MathUtils.degToRad(state.rotation.y),
                    THREE.MathUtils.degToRad(state.rotation.z),
                    state.rotation.order || 'XYZ'
                );
            }
            if (state.fov) {
                this.camera.fov = state.fov;
                this.camera.updateProjectionMatrix();
            }
            if (this.controls) this.controls.update();
        }
    }

    /**
     * Método rápido para crear shot desde posición actual
     */
    createShotFromCurrentPosition(name) {
        this.defineShot(name, this.getCurrentCameraState());
    }
}