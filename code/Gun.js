import * as THREE from "../libraries/three.js-master/build/three.module.js";
import {M_M4, T_gunflash} from "../code/Main.js";
import {BulletCasing} from "../code/E_BulletCasing.js";

export class Gun extends THREE.Object3D
{
    _player;
    model;

    damage;

    _barrel;
    _eject;

    _time_since_flash;

    light;

    constructor(player, damage)
    {
        super();

        this._player = player;

        this.damage = damage;

        this.model = new THREE.Group();
        this.model.copy(M_M4);
        this.model.position.x += 0.05;

        this.model.traverse(o => {
            if (o.isMesh)
            {
                if (o.name === 'barrel')
                {
                    this._barrel = o;
                }
                if (o.name === 'eject')
                {
                    this._eject = o;
                }
            }
        });

        this.add(this.model);
        this._player._righthand.add(this.model);

        this._player.world.scene.add(this);

        this._flash_texture = T_gunflash;

        document.addEventListener('playershoot', (e) => this._onShoot(e), false)

        this._time_since_flash = Date.now();
    }

    _onShoot(event)
    {
        let global_pos = new THREE.Vector3();
        this._barrel.getWorldPosition(global_pos)

        const vertices = [global_pos.x, global_pos.y, global_pos.z];

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );

        const material = new THREE.PointsMaterial( { color: 0xffffff } );
        material.size = THREE.MathUtils.randFloat(1.25, 1.75);
        material.sizeAttenuation = true
        material.map = this._flash_texture;
        material.transparent = true;

        this._flashPoint = new THREE.Points(geometry, material);
        this.light = new THREE.PointLight( 0xfcc96a, 3, 8 );
        this.light.position.copy(global_pos);

        this._player.world.scene.add(this._flashPoint);
        this._player.world.scene.add(this.light);

        this._eject.getWorldPosition(global_pos);
        let global_dir = new THREE.Vector3();
        let global_rot = new THREE.Quaternion();
        this._eject.getWorldDirection(global_dir);
        this._eject.getWorldQuaternion(global_rot);
        const casing = new BulletCasing(this._player.world.effectManager, global_pos, global_rot, global_dir)

        this._time_since_flash = Date.now();
    }

    Update()
    {
        if (this._flashPoint != null && Date.now() - this._time_since_flash > 0.02*1000)
        {
            this._player.world.scene.remove(this._flashPoint)
            this._player.world.scene.remove(this.light)
        }
    }
}