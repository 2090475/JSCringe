import * as THREE from '../libraries/three.js-master/build/three.module.js';

export class Camera3P{
    _camera;
    controls;
    look_position;
    constructor(renderer, lookPosition, lookRotation)
    {
        const fov = 60;
        const aspect = 1920 / 1080;
        const near = 1.0;
        const far = 1000.0;
        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this._camera.position.set(3, 2,-3);
        this._camera.lookAt(new THREE.Vector3(lookPosition.x + 3, lookPosition.y + 4, lookPosition.z));

        this._currentPosition = new THREE.Vector3();
        this._currentLookat = new THREE.Vector3();

        //const controls = new OrbitControls( this._camera, renderer.domElement );
        //controls.update();
    }

    Update(deltaTime, position, rotation)
    {
        const idealOffset = new THREE.Vector3(0, 3,-5);
        idealOffset.applyQuaternion(rotation);
        idealOffset.add(position);

        this._currentPosition.lerp(idealOffset, 0.5);
        this._currentLookat.lerp(new THREE.Vector3(position.x, position.y + 2, position.z), 0.5);

        this._camera.position.copy(this._currentPosition);
        this._camera.lookAt(this._currentLookat);
    }
}

