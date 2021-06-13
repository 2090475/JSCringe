import * as THREE from "../libraries/three.js-master/build/three.module.js";

export class Camera3P
{
    _camera;
    controls;
    look_position;
    constructor(renderer, lookPosition)
    {
        const fov = 60;
        const aspect = 1920 / 1080;
        const near = 1.0;
        const far = 3000.0;
        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this._camera.position.set(3, 2,-3);
        this._camera.lookAt(new THREE.Vector3(lookPosition.x, lookPosition.y + 2, lookPosition.z));

        this._currentPosition = new THREE.Vector3();
        this._currentLookat = new THREE.Vector3();

        //const controls = new OrbitControls( this._camera, renderer.domElement );
        //controls.update();
    }

    Update(deltaTime, position, rotation, lookPos)
    {
        const idealOffset = new THREE.Vector3(-2, 1,-3);
        idealOffset.applyQuaternion(rotation)
        idealOffset.add(position);

        this._currentPosition.lerp(idealOffset, 0.3);
        this._currentLookat.lerp(lookPos, 0.1);

        this._camera.position.copy(this._currentPosition);
        this._camera.lookAt(this._currentLookat);
    }
}