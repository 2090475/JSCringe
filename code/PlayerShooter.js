import * as THREE from "../libraries/three.js-master/build/three.module.js";
import {playershoot} from "../code/Main.js";
import {Tracer} from "../code/E_Tracer.js";

export class PlayerShooter
{
    _audioLoader;
    _audioListener;

    _is_firing;
    _is_reloading;
    _start_reload = false;

    _RPM;
    _reload_time; // reload duration in seconds
    _time_last_fired; // milisecond timestamp since last shot was fired
    _primed;

    _firing_mode; // firing mode of the player's weapon
    _spread;

    _bursts; // 3-round burst counter if firing mode is set to 'BURST'

    _rounds; // current numbr of rounds in the magazine, weapon will stop firing if this reaches 0
    _capacity; // magazine capacity, weapon will stop firing if this reaches 0

    _player; // not used for anything directly, we just use its position Vector3  for raycasting

    _look_raycaster;

    constructor(player)
    {
        this._audioListener = new THREE.AudioListener();
        player.camera3P._camera.add(this._audioListener);

        this._RPM = 850;

        this._is_firing = false;
        this._is_reloading = false; // boolean

        this._time_last_fired = Number.MIN_SAFE_INTEGER;

        this._rounds = 30;
        this._capacity = 30;
        this._primed = true;
        this._reload_time = 6;

        this._bursts = 1;
        this._spread = 0.01;

        this._firing_mode = 'SEMI';

        this._player = player;

        this._look_raycaster = new THREE.Raycaster();
        this._look_raycaster.near = 1;

        document.addEventListener('mousedown', (e) => this._onMouseDown(e), false);
        document.addEventListener('mouseup', (e) => this._onMouseUp(e), false);
        document.addEventListener('keypress', (e) => this._onKeyPress(e), false);
        document.addEventListener('hitmarker', (e) => this._onHitMarker(e), false);
        document.addEventListener('hitmarker_head', (e) => this._onHitMarkerHead(e), false);
    }

    _onHitMarker(event)
    {
        const hitmarker = new THREE.Audio(this._audioListener);
        this._audioLoader = new THREE.AudioLoader();
        this._audioLoader.load('./resources/sounds/hitmarker.mp3', function (buffer) {
            hitmarker.setBuffer(buffer);
            hitmarker.setLoop(false);
            hitmarker.setVolume(1.0);
            hitmarker.play();
        });
    }
    _onHitMarkerHead(event)
    {
        const hitmarker = new THREE.Audio(this._audioListener);
        this._audioLoader = new THREE.AudioLoader();
        this._audioLoader.load('./resources/sounds/hitmarker_head.mp3', function (buffer) {
            hitmarker.setBuffer(buffer);
            hitmarker.setLoop(false);
            hitmarker.setVolume(1.0);
            hitmarker.play();
        });
    }

    _onMouseDown(event)
    {
        if (!this._is_reloading)
        {
            this._is_firing = true;
        }
    }
    _onMouseUp(event)
    {
        this._is_firing = false;
        if (this._firing_mode === 'BURST')
        {
            this._bursts = 1;
        }
    }
    _onKeyPress(event)
    {
        if (event.key === "R") // reload
        {
            if (!this._is_reloading)
            {
                this._start_reload = true;
                this._primed = true;

                const reload_sound = new THREE.PositionalAudio(this._audioListener);

                this._audioLoader = new THREE.AudioLoader();
                this._player.model.add(reload_sound);
                this._audioLoader.load( './resources/sounds/M4_reload.mp3', function( buffer ) {
                    reload_sound.setBuffer( buffer );
                    reload_sound.setRefDistance(40);
                    reload_sound.setLoop( false );
                    reload_sound.setVolume( 1.0 );
                    reload_sound.play();
                });
            }
        }
        if (event.key === "B") // change firing mode
        {
            if (!this._is_reloading)
            {
                if (this._firing_mode === 'SEMI') {this._firing_mode = 'AUTO'}
                else if (this._firing_mode === 'AUTO') {this._firing_mode = 'BURST'}
                else if (this._firing_mode === 'BURST') {this._firing_mode = 'SEMI'}

                const reload_sound = new THREE.PositionalAudio(this._audioListener);

                document.getElementById("firingMode").textContent = this._firing_mode;

                this._audioLoader = new THREE.AudioLoader();
                this._player.model.add(reload_sound);
                this._audioLoader.load( './resources/sounds/Vector_firing_mode.mp3', function( buffer ) {
                    reload_sound.setBuffer( buffer );
                    reload_sound.setRefDistance(40);
                    reload_sound.setLoop( false );
                    reload_sound.setVolume( 1.0 );
                    reload_sound.play();
                });
            }
        }
    }

    Update(scene)
    {

        if (this._is_reloading)
        {
            const anim_reload = this._player._anim_reload;
            const time = (this._player.animation_mixer.clipAction(anim_reload).time / anim_reload.duration).toFixed(2);
            if (time >= 0.9)
            {
                this._rounds = this._capacity;
                document.getElementById("ammoCount").textContent = this._rounds + "/" + this._capacity;
            }
            return;
        }
        if (this._is_firing)
        {
            if (this._rounds > 0)
            {
                if (Date.now() - this._time_last_fired > (1 / (this._RPM / 60)) * 1000)
                {
                    const shoot_sound = new THREE.PositionalAudio(this._audioListener);

                    this._audioLoader = new THREE.AudioLoader();
                    this._player.model.add(shoot_sound);
                    this._audioLoader.load('./resources/sounds/M4_fire.mp3', function (buffer){
                        shoot_sound.setBuffer(buffer);
                        shoot_sound.setRefDistance(40);
                        shoot_sound.setLoop(false);
                        shoot_sound.setVolume(1.5);
                        shoot_sound.play();
                    });

                    this.Shoot(scene);

                    this._time_last_fired = Date.now();

                    this._rounds--;

                    document.getElementById("ammoCount").textContent = this._rounds + "/" + this._capacity;

                    if (this._firing_mode === 'SEMI')
                    {
                        this._is_firing = false;
                    }
                    if (this._firing_mode === 'BURST')
                    {
                        if (this._bursts == 3)
                        {
                            this._is_firing = false;
                            this._bursts = 1;
                        }
                        else {this._bursts++;}
                    }
                }
            }
            else if (this._primed)
            {
                const bolt_sound = new THREE.PositionalAudio(this._audioListener);
                this._player.model.add(bolt_sound);
                this._audioLoader = new THREE.AudioLoader();
                this._audioLoader.load( './resources/sounds/M4_boltclick.mp3', function( buffer ) {
                    bolt_sound.setBuffer( buffer );
                    bolt_sound.setRefDistance(40);
                    bolt_sound.setLoop( false );
                    bolt_sound.setVolume( 1.0 );
                    bolt_sound.play();
                });
                this._primed = false;
                this._is_firing = false;
            }
            else {
                const trigger_sound = new THREE.PositionalAudio(this._audioListener);
                this._player.model.add(trigger_sound);
                this._audioLoader = new THREE.AudioLoader();
                this._audioLoader.load('./resources/sounds/M4_trigger.mp3', function (buffer) {
                    trigger_sound.setBuffer(buffer);
                    trigger_sound.setRefDistance(40);
                    trigger_sound.setLoop(false);
                    trigger_sound.setVolume(1.0);
                    trigger_sound.play();
                });
                this._is_firing = false;
            }
        }
    }

    Shoot(scene)
    {
        const barrel = this._player._gun._barrel;

        document.dispatchEvent(playershoot);

        const global_pos = new THREE.Vector3();
        const global_dir = new THREE.Vector3();
        const global_rot = new THREE.Quaternion();
        barrel.getWorldPosition(global_pos);
        barrel.getWorldDirection(global_dir);
        barrel.getWorldQuaternion(global_rot);

        let randX = Math.random()*this._spread*2 - this._spread;
        let randY = Math.random()*this._spread*2 - this._spread;

        global_dir.applyAxisAngle (new THREE.Vector3(1, 0, 0), randY)
        global_dir.applyAxisAngle (new THREE.Vector3(0, 1, 0), randX)

        const tracer = new Tracer(this._player.world.effectManager, 5, global_pos, global_rot, global_dir, this._player._gun.damage);

        this._player._spine.rotation.y += 0.01 //recoil simulation?
    }

    Look(scene)
    {
        let spine;

        if (this._is_reloading) { spine = this._player._spine; }
        else { spine = this._player._gun._barrel }

        if (spine == null)
        {
            return new THREE.Vector3(0, 0, 0);
        }

        const global_pos = new THREE.Vector3();
        const global_dir = new THREE.Vector3();
        const global_rot = new THREE.Quaternion();
        spine.getWorldPosition(global_pos);
        spine.getWorldDirection(global_dir);
        spine.getWorldQuaternion(global_rot);

        let randX = Math.random()*this._spread*2 - this._spread;
        let randY = Math.random()*this._spread*2 - this._spread;

        global_dir.applyAxisAngle (new THREE.Vector3(1, 0, 0), randY)
        global_dir.applyAxisAngle (new THREE.Vector3(0, 1, 0), randX)

        //const arrow = new THREE.ArrowHelper(global_rot, global_pos, 10, 0xffff00 );
        //scene.add( arrow );

        this._look_raycaster.set(global_pos, global_dir);

        // calculate objects intersecting the picking ray
        const hit = [];
        const intersects = this._look_raycaster.intersectObjects(scene.children, false, hit);


        if (hit[0] != null)
        {
            return hit[0].point;
        }
        else
        {
            return global_pos;
        }
    }
}