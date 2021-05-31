// VERY IMPORTANT: we HAVE to import three.module.js because this file is being used as a module.
// If we try to import three.js or three.min.js, our program WILL NOT RUN AT ALL

import * as THREE from '../libraries/three.js-master/build/three.module.js';
import {OrbitControls} from '../libraries/three.js-master/examples/jsm/controls/OrbitControls.js';
import {FirstPersonControls} from '../libraries/three.js-master/examples/jsm/controls/FirstPersonControls.js';
import {PointerLockControls} from '../libraries/three.js-master/examples/jsm/controls/PointerLockControls.js';
import {GLTFLoader} from '../libraries/three.js-master/examples/jsm/loaders/GLTFLoader.js';
import {FBXLoader} from '../libraries/three.js-master/examples/jsm/loaders/FBXLoader.js';
import {DRACOLoader} from "../libraries/three.js-master/examples/jsm/loaders/DRACOLoader.js";

import '../libraries/cannon/cannon.js';
import {LoadModels} from './LoadModels.js';

//import {GameObject} from "./GameObject.js";

// these will manage the loading screen
var loadingScreen, loadingManager, RESOURCES_LOADED;
// the loadingManager is added to every *Loader() so it keeps track of whats loaded or not
// then RESOURCES_LOADED will be set to true when its done
// now scroll all the way down to init()

// vertex and fragment shaders
const _VS = `
varying vec3 vWorldPosition;
void main() {
  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

const _FS = `
uniform vec3 topColor;
uniform vec3 bottomColor;
uniform float offset;
uniform float exponent;
varying vec3 vWorldPosition;
void main() {
  float h = normalize( vWorldPosition + offset ).y;
  gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h , 0.0), exponent ), 0.0 ) ), 1.0 );
}`;

const playershoot = new Event('playershoot');
const hitmarker = new Event('hitmarker');
const hitmarker_head = new Event('hitmarker_head');

class World {

    renderer; // the renderer that renders the world on screen

    scene // the graphics component of our scene

    clock;

    player;

    physics_world;

    zombieManager;
    effectManager;
    loadModels;

    constructor()
    {
        // graphics world setup stuff
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
        });
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(this.renderer.domElement);

        window.addEventListener('resize', () => {
            this._OnWindowResize();
        }, false);

        this.clock = new THREE.Clock();

        this.physics_world = new CANNON.World();
        this.physics_world.gravity.set(0, -15, 0);
        this.physics_world.broadphase = new CANNON.NaiveBroadphase();
        this.physics_world.solver.iterations = 40;

        this.StartUp();
    }

    StartUp() {

        const fov = 60;
        const aspect = 1920 / 1080;
        const near = 1.0;
        const far = 1000.0;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xFFFFFF);
        this.scene.fog = new THREE.FogExp2(0x89b2eb, 0.002);

        let light = new THREE.DirectionalLight(0xFFFFFF, 1.0);
        light.position.set(20, 100, 1);
        light.target.position.set(0, 0, 0);
        light.castShadow = true;
        light.shadow.bias = -0.001;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        light.shadow.camera.near = 0.1;
        light.shadow.camera.far = 500.0;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 500.0;
        light.shadow.camera.left = 100;
        light.shadow.camera.right = -100;
        light.shadow.camera.top = 100;
        light.shadow.camera.bottom = -100;
        this.scene.add(light);

        const axesHelper = new THREE.AxesHelper( 5 );
        this.scene.add( axesHelper );

        light = new THREE.AmbientLight(0xffffff);
        light.intensity = 1;
        this.scene.add(light);

        const plane_geometry = new THREE.PlaneGeometry(1000, 1000, 10, 10);
        plane_geometry.computeVertexNormals()
        plane_geometry.computeTangents()
        const plane = new THREE.Mesh(
            plane_geometry,
            new THREE.MeshPhongMaterial({
                color: 0x228B22
            }));
        plane.receiveShadow = true;
        plane.rotation.x = -Math.PI / 2;
        plane.name = "ground";
        this.scene.add(plane);

        const planeShape = new CANNON.Plane();
        const planeBody = new CANNON.Body({ mass: 0 });
        planeBody.addShape(planeShape)
        planeBody.position.x = plane.position.x;
        planeBody.position.y = plane.position.y;
        planeBody.position.z = plane.position.z;
        planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2)
        this.physics_world.add(planeBody)

        this.player = new Player(this);

      /*  const loader = new GLTFLoader(loadingManager);
        loader.load('./resources/models/BDRM-2.glb', (gltf) => {
            let model = gltf.scene;

            model.traverse(o => {
                if (o.isMesh)
                {
                    o.castShadow = true;
                    o.receiveShadow = true;
                    o.material = this.GetMaterial('./resources/models/btr-80_browncamo.png');
                    o.geometry.computeBoundingBox()

                    //const helper = new THREE.Box3Helper( o.geometry.boundingBox, 0xffff00 );
                    //this._scene.add( helper );
                }

                //console.log(o)
            });

            this.scene.add(model);
        });*/

       // this.cube1 = new Cube(this.scene, this.physics_world);
       // this.cube2 = new Cube(this.scene, this.physics_world);

        this.zombieManager = new ZombieManager(this);
        this.effectManager = new EffectManager(this);

        this.loadModels = new LoadModels(this.scene, this.physics_world);

        this.SkyBox(this.scene);

        //this.LoadSky();
        this.RAF();
    }

    SkyBox(scene){
        let material = []

        let texture_bk = new THREE.TextureLoader(loadingManager).load('./resources/cloudy/gray/bk.jpg');
        let texture_ft = new THREE.TextureLoader(loadingManager).load('./resources/cloudy/gray/ft.jpg');
        let texture_dn = new THREE.TextureLoader(loadingManager).load('./resources/cloudy/gray/dn.jpg');
        let texture_up = new THREE.TextureLoader(loadingManager).load('./resources/cloudy/gray/up.jpg');
        let texture_lt = new THREE.TextureLoader(loadingManager).load('./resources/cloudy/gray/lt.jpg');
        let texture_rt = new THREE.TextureLoader(loadingManager).load('./resources/cloudy/gray/rt.jpg');

        material.push(new THREE.MeshBasicMaterial({map: texture_ft}));
        material.push(new THREE.MeshBasicMaterial({map: texture_bk}));
        material.push(new THREE.MeshBasicMaterial({map: texture_up}));
        material.push(new THREE.MeshBasicMaterial({map: texture_dn}));
        material.push(new THREE.MeshBasicMaterial({map: texture_rt}));
        material.push(new THREE.MeshBasicMaterial({map: texture_lt}));

        for(let index = 0;index < 6;++index){
            material[index].side = THREE.BackSide;
        }

        let skyBox = new THREE.BoxGeometry(1000,1000,1000);
        let sky = new THREE.Mesh(skyBox,material)

        scene.add(sky);
    }

    LoadSky() {
        const hemiLight = new THREE.HemisphereLight(0xFFFFFF, 0xFFFFFFF, 0.6);
        hemiLight.color.setHSL(0.6, 1, 0.6);
        hemiLight.groundColor.setHSL(0.095, 1, 0.75);
        this.scene.add(hemiLight);

        const uniforms = {
            "topColor": { value: new THREE.Color(0x0077ff) },
            "bottomColor": { value: new THREE.Color(0xffffff) },
            "offset": { value: 33 },
            "exponent": { value: 0.6 }
        };
        uniforms["topColor"].value.copy(hemiLight.color);

        this.scene.fog.color.copy(uniforms["bottomColor"].value);

        const skyGeo = new THREE.SphereBufferGeometry(1000, 32, 15);
        const skyMat = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: _VS,
            fragmentShader: _FS,
            side: THREE.BackSide
        });

        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);
    }

    RAF() {
        requestAnimationFrame(() => {
            // This block runs while resources are loading.
            if( RESOURCES_LOADED == false ){
                loadingScreen.box.position.x -= 0.05;
                if( loadingScreen.box.position.x < -10 ) loadingScreen.box.position.x = 10;
                loadingScreen.box.position.y = Math.sin(loadingScreen.box.position.x);
                this.renderer.render(loadingScreen.scene, loadingScreen.camera);
            }

            if (this.player.camera3P != null) {
                this.renderer.render(this.scene, this.player.camera3P._camera);
                this.player.Update();
            }

            this.physics_world.step(1 / 60);

            //this.cube1.Update();
            //this.cube2.Update();

            this.zombieManager.Update();
            this.effectManager.Update();

            this.RAF();
        });
    }

    GetMaterial(directory)
    {
        let texture = new THREE.TextureLoader(loadingManager).load(directory);
        texture.flipY = false; // we flip the texture so that its the right way up
        const material = new THREE.MeshPhongMaterial({
            map: texture,
            color: 0xffffff,
            skinning: true
        });
        return material;
    }

    _OnWindowResize() {
        // this._player.camera3P._camera.aspect = window.innerWidth / window.innerHeight;
        // this._player.camera3P._camera.updateProjectionMatrix();
        // this._renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

class Cube
{
    mesh;
    cubeBody;

    constructor(scene, physics_world)
    {
        const material = new THREE.MeshNormalMaterial()
        this.mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material)
        this.mesh.position.x = 0
        this.mesh.position.y = 5
        this.mesh.position.z = 0
        this.mesh.castShadow = true
        scene.add(this.mesh)

        const cubeShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5))
        this.cubeBody = new CANNON.Body({ mass: 1 });
        this.cubeBody.addShape(cubeShape)
        this.cubeBody.position.x = this.mesh.position.x
        this.cubeBody.position.y = this.mesh.position.y
        this.cubeBody.position.z = this.mesh.position.z
        physics_world.add(this.cubeBody)
    }
    Update()
    {
        this.mesh.position.copy(this.cubeBody.position);
        this.mesh.quaternion.copy(this.cubeBody.quaternion);
    }
}

class Player extends THREE.Object3D
{

    world;

    model;

    file_animations;
    animation_mixer;
    controller;
    _clock;
    camera3P;

    _shooter;

    _body;

    _spine;
    _righthand;

    animation_mixer;
    _anim_running;
    _anim_idle;
    _anim_reload;

    _gun;

    health = 100;

    constructor(world)
    {
        super();

        this.world = world;
        this.controller = new PlayerController();

        const loader = new GLTFLoader(loadingManager);
        loader.load('./resources/models/Character.glb', (gltf) => {

            let texture = new THREE.TextureLoader(loadingManager).load('./resources/models/character.png');
            texture.flipY = false; // we flip the texture so that its the right way up
            const material = new THREE.MeshPhongMaterial({
                map: texture,
                color: 0xffffff,
                skinning: true
            });
            this.model = gltf.scene;
            this.model.traverse(o => {
                if (o.isMesh)
                {
                    o.castShadow = true;
                    o.receiveShadow = true;
                    o.material = material;

                    this.geometry = o.geometry;
                }
                if (o.isBone && o.name === 'Spine') {
                    this._spine = o;
                }
                if (o.isBone && o.name === 'left_hand')
                {
                    this._righthand = o;
                }
            });

            this.geometry.computeBoundingBox();

            const cubeShape = new CANNON.Box(new CANNON.Vec3(.5, 1, .5))
            this._body = new CANNON.Body({ mass: 1 });
            this._body.addShape(cubeShape, new CANNON.Vec3(0, 1, 0))
            //this.model.translateY(1);
            this._body.position.copy(this.model.position)
            this.world.physics_world.add(this._body)

            this.file_animations = gltf.animations;
            this.animation_mixer = new THREE.AnimationMixer(this.model);

            this._anim_idle = THREE.AnimationClip.findByName(this.file_animations, 'Idle');
            this.animation_mixer.clipAction(this._anim_idle).play();

            this._anim_running = THREE.AnimationClip.findByName(this.file_animations, 'Run');
            this._anim_holdgun = THREE.AnimationClip.findByName(this.file_animations, 'HoldGun');
            this._anim_reload = THREE.AnimationClip.findByName(this.file_animations, 'Reload');
            this._anim_die = THREE.AnimationClip.findByName(this.file_animations, 'ZombieDie');

            const fov = 60;
            const aspect = 1920 / 1080;
            const near = 1.0;
            const far = 1000.0;
            this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
            this._camera.position.set(1, 2,-3);
            this._camera.lookAt(new THREE.Vector3(this.model.position.x, this.model.position.y + 2, this.model.position.z));

            this.camera3P = new Camera3P(this.world.renderer, this.model.position, this.model.rotation);
            this.world.scene.add(this.camera3P._camera);

            this.world.scene.add(this.model);

            this._shooter = new PlayerShooter(this);

            this._gun = new Gun(this, 40);

            this.addEventListener('playerdamaged', (e) => this._onDamaged(e), false)
        });
    }
    _onDamaged(event)
    {
        this.health -= event.damage;
        if (this.health < 0)
        {
            this.health = 0;
        }
    }
    AnimateRun()
    {
        if (!this.animation_mixer) { return; }

        this.animation_mixer.clipAction(this._anim_idle).stop();
        this.animation_mixer.clipAction(this._anim_running).play()
    }
    AnimateIdle()
    {
        if (!this.animation_mixer) { return; }

        this.animation_mixer.clipAction(this._anim_running).stop();
        this.animation_mixer.clipAction(this._anim_idle).play()
    }
    AnimateHoldGun()
    {
        if (!this.animation_mixer) { return; }

        this.animation_mixer.clipAction(this._anim_reload).stop();
        this.animation_mixer.clipAction(this._anim_holdgun).play();
    }
    AnimateReload()
    {
        if (!this.animation_mixer) { return; }

        this.animation_mixer.clipAction(this._anim_holdgun).stop();
        this.animation_mixer.clipAction(this._anim_reload).loop = THREE.LoopOnce;
        this.animation_mixer.clipAction(this._anim_reload).play();
    }
    AnimateDie()
    {
        if (!this.animation_mixer) { return; }

        this.animation_mixer.clipAction(this._anim_running).stop();
        this.animation_mixer.clipAction(this._anim_idle).stop();
        this.animation_mixer.clipAction(this._anim_holdgun).stop();
        this.animation_mixer.clipAction(this._anim_reload).stop();
        this.animation_mixer.clipAction(this._anim_die).loop = THREE.LoopOnce;
        this.animation_mixer.clipAction(this._anim_die).clampWhenFinished = true;
        this.animation_mixer.clipAction(this._anim_die).play();
    }

    Update()
    {
        let spine_rot = this._spine.rotation.y;

        if (this.animation_mixer)
        {
            this.animation_mixer.update(this.world.clock.getDelta());
        }
        if (this.health <= 0)
        {
            this.AnimateDie();
            if (this.camera3P != null)
            {
                this.controller.current_yaw = 0;
                this.controller.current_pitch = 0;

                const global_rot = new THREE.Quaternion();
                this._spine.getWorldQuaternion (global_rot);

                this.camera3P.Update(this.world.clock.getDelta(), this.model.position, global_rot, this.model.position);
            }
            return;
        }

        if (this.controller == null)
        {
            console.log("controller was null");
        }
        if (this.controller.keys.forward)
        {
            this.AnimateRun();
            this.model.translateZ(0.12);
            //console.log("forward");
        }
        else if (this.controller.keys.backward)
        {
            this.AnimateRun();
            this.model.translateZ(-0.08);
            //console.log("forward");
        }
        else
        {
            this.AnimateIdle();
        }

        if (this._shooter._start_reload || this.animation_mixer.clipAction(this._anim_reload).isRunning())
        {
            this.AnimateReload();
            this._shooter._is_reloading = true;
            this._shooter._start_reload = false;
        }
        else
        {
            this.AnimateHoldGun();
            this._shooter._is_reloading = false;
        }

        this._spine.rotation.y = spine_rot + this.controller.current_pitch;

        // if (this.controller.current_yaw != 0)
        // {
        //     console.log(spine_rot*180/Math.PI)
        // }

        if ((this.controller.current_yaw > 0 && this._spine.rotation.y < Math.PI/2 + Math.PI/4) && (this.controller.current_yaw < 0 && this._spine.rotation.y > Math.PI/2 - Math.PI/4))
        {
            this._spine.rotation.y = spine_rot + this.controller.current_pitch;
        }

        this.model.rotateY(this.controller.current_yaw);
        //this._spine.rotateX(this.controller.current_pitch);

        this._body.position.copy(this.model.position);
        this._body.quaternion.copy(this.model.quaternion);

        if (this.camera3P != null)
        {
            this.controller.current_yaw = 0;
            this.controller.current_pitch = 0;

            const global_rot = new THREE.Quaternion();
            this._spine.getWorldQuaternion (global_rot);

            this.camera3P.Update(this.world.clock.getDelta(), this.model.position, global_rot, this._shooter.Look(this.world.scene, this._spine));
        }

        this._shooter.Update(this.world.scene, this._spine);

        this._gun.Update();

        //const arrow = new THREE.ArrowHelper(this._righthand.direction, this._righthand.position, 5, 0xfc5a03 );
        //scene.add( arrow );
    }
}

class Gun extends THREE.Object3D
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

        const loader = new GLTFLoader(loadingManager);
        loader.load('./resources/models/M4.glb', (gltf) => {

            const texture = new THREE.TextureLoader(loadingManager).load('./resources/models/M4A1.png');
            texture.flipY = false; // we flip the texture so that its the right way up
            const material = new THREE.MeshPhongMaterial({
                map: texture,
                color: 0xffffff,
                skinning: true
            });
            this.model = gltf.scene;
            this.model.position.x += 0.05;

            this.model.traverse(o => {
                if (o.isMesh)
                {
                    o.castShadow = true;
                    o.receiveShadow = true;
                    o.material = material;

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

            this._flash_texture = new THREE.TextureLoader(loadingManager).load('./resources/models/flash.png');
            this._flash_texture.flipY = false; // we flip the texture so that its the right way up

            document.addEventListener('playershoot', (e) => this._onShoot(e), false)

            this._time_since_flash = Date.now();
        });
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

class PlayerShooter
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

    _rounds; // magazine capacity, weapon will stop firing if this reaches 0

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
            if (this._firing_mode === 'SEMI') {this._firing_mode = 'AUTO'}
            else if (this._firing_mode === 'AUTO') {this._firing_mode = 'BURST'}
            else if (this._firing_mode === 'BURST') {this._firing_mode = 'SEMI'}

            const reload_sound = new THREE.PositionalAudio(this._audioListener);

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

    Update(scene)
    {

        if (this._is_reloading)
        {
            this._rounds = 30
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

class PlayerController {

    keys;
    current_yaw;
    current_pitch;

    constructor() {
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            space: false,
            shift: false,
        };

        this.current_yaw = 1;
        this.current_pitch = 1;
        this.x_previous = 0;
        this.y_previous = 0;

        document.addEventListener('keydown', (e) => this._onKeyDown(e), false);
        document.addEventListener('keyup', (e) => this._onKeyUp(e), false);
        document.addEventListener('mousemove', (e) => this._OnMouseMove(e), false);
        document.addEventListener('pointerlockchange', (e) => this._OnPointerLockStateChanged(e), false);
        document.addEventListener('pointerlockchange', (e) => this._OnPointerLockError(e), false);

        var havePointerLock = 'pointerLockElement' in document ||
            'mozPointerLockElement' in document ||
            'webkitPointerLockElement' in document;

        if (havePointerLock)
        {
            const element = document.getElementById('viewport');
            element.requestPointerLock = element.requestPointerLock
                // || element.mozRequestPointerLock
                // || element.webkitRequestPointerLock;
            element.requestPointerLock();
        }
    }

    _onKeyDown(event) {
        switch (event.keyCode) {
            case 87: // w
                this.keys.forward = true;
                break;
            case 65: // a
                this.keys.left = true;
                break;
            case 83: // s
                this.keys.backward = true;
                break;
            case 68: // d
                this.keys.right = true;
                break;
            case 32: // SPACE
                this.keys.space = true;
                break;
            case 16: // SHIFT
                this.keys.shift = true;
                break;
        }
    }

    _onKeyUp(event) {
        switch(event.keyCode) {
            case 87: // w
                this.keys.forward = false;
                break;
            case 65: // a
                this.keys.left = false;
                break;
            case 83: // s
                this.keys.backward = false;
                break;
            case 68: // d
                this.keys.right = false;
                break;
            case 32: // SPACE
                this.keys.space = false;
                break;
            case 16: // SHIFT
                this.keys.shift = false;
                break;
        }
    }

    _OnMouseMove(event)
    {
        if (document.pointerLockElement === document.getElementById('viewport'))
        {
            this.current_yaw = event.movementX * -0.01;
            this.current_pitch = event.movementY * -0.005;
        }
        else
        {
            // let x = event.screenX;
            // let x_change = event.screenX - this.x_previous;
            // this.x_previous = x;
            // this.current_yaw = x_change * -0.01;
            //
            // let y = event.screenY;
            // let y_change = event.screenY - this.y_previous;
            // this.y_previous = y;
            // this.current_pitch = y_change * -0.005;

        }

        if (this.current_yaw > Math.PI/12) {this.current_yaw = Math.PI/12}
        if (this.current_yaw < -Math.PI/12) {this.current_yaw = -Math.PI/12}
        if (this.current_pitch > Math.PI/12) {this.current_pitch = Math.PI/12}
        if (this.current_pitch < -Math.PI/12) {this.current_pitch = -Math.PI/12}

    }
    _OnPointerLockStateChanged(event)
    {
        console.log("pointer lock state was changed")
    }
    _OnPointerLockError(event)
    {
        console.log("POINTER LOCK ERROR")
    }
};

class Camera3P
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

let _APP = null;

// initializes the world
function loadWorld() {

    _APP = new World();

}

// THE FIRST FUNCTION THAT IS CALLED WHEN THIS SCRIPT RUNS
function init() {

    // An object to hold all the things needed for our loading screen
    loadingScreen = {
        scene: new THREE.Scene(),
        camera: new THREE.PerspectiveCamera(90, 1280/720, 0.1, 100),

        /* this is the little blue box animation you'll see on the loading screen.
           it will be fancier in time
        */
        box: new THREE.Mesh(
            new THREE.BoxGeometry(0.5,0.5,0.5),
            new THREE.MeshBasicMaterial({ color:0x4444ff })
        )
    };

    loadingManager = null;
    RESOURCES_LOADED = false;

    // Set up the loading screen's scene. It can be treated just like our main scene.
    loadingScreen.box.position.set(0,0,5);
    loadingScreen.camera.lookAt(loadingScreen.box.position);
    loadingScreen.scene.add(loadingScreen.box);

    // then the loading manager
    loadingManager = new THREE.LoadingManager();
    loadingManager.onLoad = function(){
        // console.log("loaded all resources");
        RESOURCES_LOADED = true;
    };
    window.addEventListener('DOMContentLoaded', loadWorld());
}

class ZombieManager
{
    world;
    _zombies; // list of zombies in the world right now

    constructor(world)
    {
        this.world = world;
        this._zombies = [];

        document.addEventListener('keydown', (e) => this._onKeyDown(e), false);
    }
    AddNewZombie()
    {
        let zombie = new Zombie(this, new THREE.Vector3(0, 0, 0))
        this._zombies.push(zombie);
    }
    Update()
    {
        for(let i = 0; i < this._zombies.length; i++)
        {
            this._zombies[i].Update();
            // if (!this._zombies[i].isAlive)
            // {
            //     this._zombies.splice(i);
            // }
        }
    }

    _onKeyDown(event)
    {
        if (event.key === "P") // reload
        {
            this.AddNewZombie();
        }
    }

}

class Zombie
{
    manager;
    model;
    body;

    health;

    file_animations;
    animation_mixer;

    bone_neck;
    bone_spine;
    hitbox_head;
    hitbox_body;

    _start_die = false;

    _time_last_attack = 0;

    constructor(zombieManager, position)
    {
        this.clock = new THREE.Clock();

        this.manager = zombieManager;

        this.health = 100;

        const loader = new GLTFLoader(loadingManager);
        loader.load('./resources/models/Character.glb', (gltf) => {

            let texture = new THREE.TextureLoader(loadingManager).load('./resources/models/character.png');
            texture.flipY = false; // we flip the texture so that its the right way up
            const material = new THREE.MeshPhongMaterial({
                map: texture,
                color: 0xffffff,
                skinning: true
            });
            this.model = gltf.scene;
            this.model.position.copy(position);
            this.model.traverse(o => {
                if (o.isMesh)
                {
                    o.castShadow = true;
                    o.receiveShadow = true;
                    o.material = material;

                    this.geometry = o.geometry;

                    //this.geometry.computeBoundingBox();
                }

                const hitbox_material = new THREE.MeshNormalMaterial();
                hitbox_material.transparent = true;
                hitbox_material.opacity = 0;
                if (o.isBone && o.name === 'neck')
                {
                    console.log(o)

                    this.bone_neck = o;


                    this.hitbox_head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), hitbox_material)

                    let global_pos = new THREE.Vector3();
                    let global_rot = new THREE.Quaternion();
                    this.bone_neck.getWorldPosition(global_pos);
                    this.bone_neck.getWorldQuaternion(global_rot);

                    this.hitbox_head.position.copy(global_pos)
                    this.hitbox_head.quaternion.copy(global_rot)

                    this.hitbox_head.castShadow = false
                    this.manager.world.scene.add(this.hitbox_head)

                    this.hitbox_head.geometry.computeBoundingBox()

                    this.hitbox_head.name = 'zombie_head'

                    this.hitbox_head.addEventListener('zombiehit', (e) => this._onHeadShot(e), false)
                }
                if (o.isBone && o.name === 'Spine')
                {
                    console.log(o)

                    this.bone_spine = o;

                    this.hitbox_body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.4), hitbox_material)

                    let global_pos = new THREE.Vector3();
                    let global_rot = new THREE.Quaternion();
                    this.bone_spine.getWorldPosition(global_pos);
                    this.bone_spine.getWorldQuaternion(global_rot);

                    this.hitbox_body.position.copy(global_pos)
                    this.hitbox_body.quaternion.copy(global_rot)

                    this.hitbox_body.castShadow = false
                    this.manager.world.scene.add(this.hitbox_body)

                    this.hitbox_body.geometry.computeBoundingBox()

                    this.hitbox_body.name = 'zombie_body'

                    this.hitbox_body.addEventListener('zombiehit', (e) => this._onBodyShot(e), false)
                }
            });

            // const cubeShape = new CANNON.Box(new CANNON.Vec3(.5, 1, .5))
            // this._body = new CANNON.Body({ mass: 1 });
            // this._body.addShape(cubeShape, new CANNON.Vec3(0, 1, 0))
            // //this.model.translateY(1);
            // this._body.position.copy(this.model.position)
            // physics_world.add(this._body)

            this.file_animations = gltf.animations;
            this.animation_mixer = new THREE.AnimationMixer(this.model);

            this._anim_walk = THREE.AnimationClip.findByName(this.file_animations, 'ZombieWalk');
            this.animation_mixer.clipAction(this._anim_walk).play();

            this._anim_attack = THREE.AnimationClip.findByName(this.file_animations, 'ZombieAttack');
            this._anim_die = THREE.AnimationClip.findByName(this.file_animations, 'ZombieDie');

            this.manager.world.scene.add(this.model);
        });
    }
    AnimateAttack()
    {
        if (!this.animation_mixer) { return; }

        this.animation_mixer.clipAction(this._anim_walk).stop();
        this.animation_mixer.clipAction(this._anim_attack).play();

    }
    AnimateWalk()
    {
        if (!this.animation_mixer) { return; }

        this.animation_mixer.clipAction(this._anim_attack).stop();
        this.animation_mixer.clipAction(this._anim_walk).play();

    }
    AnimateDie()
    {
        if (!this.animation_mixer) { return; }

        this.animation_mixer.clipAction(this._anim_walk).stop();
        this.animation_mixer.clipAction(this._anim_attack).stop();
        this.animation_mixer.clipAction(this._anim_die).loop = THREE.LoopOnce;
        this.animation_mixer.clipAction(this._anim_die).clampWhenFinished = true;
        this.animation_mixer.clipAction(this._anim_die).play();
    }
    _onHeadShot(event)
    {
        let damage = event.damage*2;

        this.RecalculateHealth(damage);
    }
    _onBodyShot(event)
    {
        let damage = event.damage;

        this.RecalculateHealth(damage);
    }
    RecalculateHealth(damage)
    {
        if (this.health > 0 && this.health - damage <= 0)
        {
            this._start_die = true;
            this.health = 0;
        }
        else
        {
            this.health -= damage;
        }
        console.log(this.health);
    }
    Update()
    {
        if (this.animation_mixer)
        {
            this.animation_mixer.update(this.clock.getDelta());
        }
        if (this.model != null)
        {
            if (this.health > 0)
            {
                this.model.lookAt(this.manager.world.player.model.position);

                if (this.model.position.distanceToSquared(this.manager.world.player.model.position) > 4)
                {
                    this.model.translateZ(0.1);
                }
                if (this.model.position.distanceToSquared(this.manager.world.player.model.position) > 5 || this.manager.world.player.health <= 0)
                {
                    this.AnimateWalk();
                }
                else
                {
                    this.AnimateAttack();
                    const time = (this.animation_mixer.clipAction(this._anim_attack).time / this._anim_attack.duration).toFixed(2);
                    if (0.4 <= time && time <= 0.6 && Date.now() - this._time_last_attack > 0.25*1000)
                    {
                        this.manager.world.player.dispatchEvent({ type: 'playerdamaged', damage: 7});
                        this._time_last_attack = Date.now();
                    }
                }
            }
            else
            {
                this.AnimateDie();
            }
            let head_pos = new THREE.Vector3();
            let head_rot = new THREE.Quaternion();
            this.bone_neck.getWorldPosition(head_pos);
            this.bone_neck.getWorldQuaternion(head_rot);

            this.hitbox_head.quaternion.copy(head_rot);
            head_pos.y += 0.4;
            this.hitbox_head.position.copy(head_pos);
            this.hitbox_head.geometry.computeBoundingSphere();

            let spine_pos = new THREE.Vector3();
            let spine_rot = new THREE.Quaternion();
            this.bone_spine.getWorldPosition(spine_pos);
            this.bone_spine.getWorldQuaternion(spine_rot);

            this.hitbox_body.quaternion.copy(spine_rot);
            spine_pos.y += 0.4;
            this.hitbox_body.position.copy(spine_pos);
            this.hitbox_body.geometry.computeBoundingSphere();
        }
    }
}

class EffectManager
{
    world;
    _effects; // list of effects

    M_tracer;

    constructor(world)
    {
        this.world = world;
        this._effects = [];

        // load tracer
        const loader = new GLTFLoader(loadingManager);
        loader.load('./resources/models/Tracer.glb', (gltf) => {

            const material = new THREE.MeshLambertMaterial({
                color: 0xffb71c,
                emissive: 0xffb71c,
                skinning: true
            });
            gltf.scene.traverse(o => {
                if (o.isMesh)
                {
                    o.material = material;
                }
                this.M_tracer = gltf.scene;
            });
        });

        // load casing
        loader.load('./resources/models/Casing.glb', (gltf) => {

            const material = new THREE.MeshLambertMaterial({
                color: 0x857735,
                skinning: true,
                reflectivity: 1.0,
                specular: 0xffffff,
                shininess: 255,
                emissiveIntensity: 0,
                refractionRatio: 0.1
            });
            gltf.scene.traverse(o => {
                if (o.isMesh)
                {
                    o.material = material;
                }
                this.M_casing = gltf.scene;
            });
        });
    }
    AddNewEffect(effect)
    {
        this._effects.push(effect)
    }
    Update()
    {
        for(let i = 0; i < this._effects.length; i++)
        {
            this._effects[i].Update();
        }

        // if (Date.now() % 120 == 0)
        // {
        //     console.log(this._effects.length)
        // }
    }
}

class Effect
{
    manager;
    isAlive; // is true until the effect's lifetime has ended
    lifetime; // lifetime of the particle effect in seconds
    _timeStarted; // the time ini milliseconds that the effect was created

    constructor(effectManager, lifetime, position) {
        this.manager = effectManager;
        this.isAlive = true;
        this.lifetime = lifetime;
        this._timeStarted = Date.now();
        this.manager.AddNewEffect(this);
    }
    Update()
    {
        if (Date.now() - this._timeStarted > this.lifetime*1000)
        {
            this.isAlive = false;
        }
    }
}

class Tracer extends  Effect
{
    model;
    body;

    hitfound;

    _shoot_raycaster;

    constructor(effectManager, lifetime, position, rotation, direction, damage)
    {
        super(effectManager, lifetime, position);

        this.manager = effectManager;

        this.model = new THREE.Object3D();
        //this.model = this.manager.M_tracer;
        this.model.copy(this.manager.M_tracer);
        this.model.position.copy(position);
        this.model.setRotationFromQuaternion(rotation.normalize())

        const cubeShape = new CANNON.Box(new CANNON.Vec3(.25, 25, .25));
        this.body = new CANNON.Body({ mass: 1 });
        this.body.addShape(cubeShape);
        this.body.position.copy(this.model.position);
        this.body.quaternion.copy(this.model.quaternion);
        this.body.collisionFilterGroup = 10;

        let velocity = new CANNON.Vec3(0, 0, 0);
        velocity.copy(direction);
        velocity.scale(400, velocity);
        this.body.velocity.copy(velocity);

        this._shoot_raycaster = new THREE.Raycaster();
        this._shoot_raycaster.near = 0;
        this._shoot_raycaster.far = 9;

        this.hitfound = false;

        this.damage = damage;

        this.manager.world.physics_world.add(this.body);
        this.manager.world.scene.add(this.model);



        this.Raycast();

        // const arrow = new THREE.ArrowHelper(direction, position, 10, 0xffff00);
        // this.manager.world.scene.add(arrow);

    }

    Update()
    {
        if (Date.now() - this._timeStarted > this.lifetime*1000)
        {
            this.isAlive = false;
            this.manager.world.scene.remove(this.model);
            this.manager.world.physics_world.remove(this.body);
        }
        if (this.hitfound)
        {
            this.isAlive = false;
        }
        if (!this.isAlive)
        {
            this.manager.world.scene.remove(this.model);
            this.manager.world.physics_world.remove(this.body);
            return;
        }
        else if (this.model != null)
        {
            this.model.position.copy(this.body.position);
            this.model.quaternion.copy(this.body.quaternion);
            this.Raycast();
        }
    }
    Raycast()
    {
        const global_pos = new THREE.Vector3();
        const global_dir = new THREE.Vector3();
        this.model.getWorldPosition(global_pos);
        this.model.getWorldDirection(global_dir);

        // const hit_arrow = new THREE.ArrowHelper(global_dir, global_pos, 2, 0xff975e );
        // this.manager.world.scene.add(hit_arrow);

        this._shoot_raycaster.set(global_pos, global_dir);

        let hit = [];
        let intersects = this._shoot_raycaster.intersectObjects(this.manager.world.scene.children, false, hit);

        for (let i = 0; i < hit.length; i++)
        {
            if (hit[i].face != null)
            {
                if (hit[i].object.name === 'zombie_head')
                {
                    hit[i].object.dispatchEvent({ type: 'zombiehit', damage: this.damage });
                    document.dispatchEvent(hitmarker_head);
                    let blood = new BloodSplatter(this.manager, hit[i].point, hit[i].face.normal);
                }
                else if (hit[i].object.name === 'zombie_body')
                {
                    hit[i].object.dispatchEvent({ type: 'zombiehit', damage: this.damage });
                    document.dispatchEvent(hitmarker);
                    let blood = new BloodSplatter(this.manager, hit[i].point, hit[i].face.normal);
                }
                else
                {
                    if (hit[i].object.name === "ground")
                    {
                        hit[i].face.normal.applyAxisAngle (new THREE.Vector3(1, 0, 0), -Math.PI/2);
                    }

                    let blood = new BulletHit(this.manager, hit[i].point, hit[i].face.normal);
                }

                //PlayBulletHitSound(this.manager.world.player._shooter._audioListener, this.model)

                //const hit_arrow = new THREE.ArrowHelper(hit[i].face.normal, hit[i].point, 2, 0xff975e );
                //this.manager.world.scene.add(hit_arrow);

                this.hitfound = true;

                break;
            }
        }
    }
}

class BloodSplatter extends Effect
{
    children = [];

    constructor(effectManager, position, direction)
    {
        super(effectManager, 2, position);

        for (let i = 0; i < 9; i++)
        {
            let spread_position = position;

            spread_position.x += THREE.MathUtils.randFloat(-0.2, 0.2);
            spread_position.t += THREE.MathUtils.randFloat(-0.2, 0.2);
            spread_position.z += THREE.MathUtils.randFloat(-0.2, 0.2);
            let particle = new PhysiParticle(this, position, direction,  5, Math.PI/12,0.15, 0.3, 0xbf0000);
            this.children.push(particle);
        }
    }
    Update()
    {
        if (Date.now() - this._timeStarted > this.lifetime*1000 && this.isAlive)
        {
            for (let i = 0; i < this.children.length; i++)
            {
                this.manager.world.scene.remove(this.children[i].point);
                this.manager.world.physics_world.remove(this.children[i].body);
            }
            this.isAlive = false;
            return;
        }
        if (!this.isAlive)
        {
            return;
        }
        for (let i = 0; i < this.children.length; i++)
        {
            this.children[i].Update();
        }
    }
}

class BulletHit extends Effect
{
    children = [];

    constructor(effectManager, position, direction) {
        super(effectManager, 2, position);

        for (let i = 0; i < 9; i++) {
            let spread_position = position;

            spread_position.x += THREE.MathUtils.randFloat(-0.2, 0.2);
            spread_position.t += THREE.MathUtils.randFloat(-0.2, 0.2);
            spread_position.z += THREE.MathUtils.randFloat(-0.2, 0.2);
            let particle = new PhysiParticle(this, position, direction, 7, Math.PI / 12, 0.1, 0.2, 0x968c80);
            this.children.push(particle);
        }
    }

    Update()
    {
        if (Date.now() - this._timeStarted > this.lifetime * 1000 && this.isAlive) {
            for (let i = 0; i < this.children.length; i++) {
                this.manager.world.scene.remove(this.children[i].point);
                this.manager.world.physics_world.remove(this.children[i].body);
            }
            this.isAlive = false;
            return;
        }
        if (!this.isAlive) {
            return;
        }
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].Update();
        }
    }
}


class PhysiParticle
{
    parentEffect

    point;
    body;

    constructor(parentEffect, position, direction, velocity, coneSpread, minSize, maxSize, color)
    {
        this.parentEffect = parentEffect;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute( 'position', new THREE.Float32BufferAttribute([0, 0, 0], 3 ) );

        const material = new THREE.PointsMaterial( { color: color } );
        material.size = THREE.MathUtils.randFloat(minSize, maxSize);
        material.sizeAttenuation = true

        this.point = new THREE.Points(geometry, material);
        this.point.position.copy(position)
        this.parentEffect.manager.world.scene.add(this.point);

        const cubeShape = new CANNON.Box(new CANNON.Vec3(0.05, 0.05, 0.05));
        this.body = new CANNON.Body({ mass: 1});
        this.body.addShape(cubeShape);
        this.body.position.copy(position);

        direction.applyAxisAngle (new THREE.Vector3(1, 0, 0), THREE.MathUtils.randFloat(-coneSpread, coneSpread));
        direction.applyAxisAngle (new THREE.Vector3(0, 1, 0), THREE.MathUtils.randFloat(-coneSpread, coneSpread));
        direction.applyAxisAngle (new THREE.Vector3(0, 0, 1), THREE.MathUtils.randFloat(-coneSpread, coneSpread));

        direction.addScalar(velocity/10);
        this.body.velocity.copy(direction);

        this.parentEffect.manager.world.physics_world.add(this.body);
    }
    Update()
    {
        this.point.position.copy(this.body.position);
    }
}

class BulletCasing extends Effect
{
    parentEffect

    point;
    body;

    _soundPlayed = false;

    constructor(effectManager, position, rotation, direction)
    {
        super(effectManager, 10, position);

        // rotation.x += THREE.MathUtils.randFloat(-0.5, 0.5);
        // rotation.y += THREE.MathUtils.randFloat(-0.5, 0.5);
        // rotation.z += THREE.MathUtils.randFloat(-0.5, 0.5);
        // rotation.w += THREE.MathUtils.randFloat(-0.5, 0.5);

        this.model = new THREE.Object3D();
        this.model.copy(this.manager.M_casing);
        this.model.position.copy(position);
        this.model.setRotationFromQuaternion(rotation.normalize())

        const cubeShape = new CANNON.Box(new CANNON.Vec3(0.05, 0.05, 0.05));
        this.body = new CANNON.Body({ mass: 1 });
        this.body.addShape(cubeShape);
        this.body.position.copy(this.model.position);
        this.body.quaternion.copy(this.model.quaternion);
        const rand = THREE.MathUtils.randFloat(5, 20)
        this.body.angularVelocity = new CANNON.Vec3(rand, rand, rand)
        //this.body.collisionFilterGroup = 10;

        direction.applyAxisAngle (new THREE.Vector3(1, 0, 0), THREE.MathUtils.randFloat(-0.3, 0.3));
        direction.applyAxisAngle (new THREE.Vector3(0, 1, 0), THREE.MathUtils.randFloat(-0.3, 0.3));
        direction.applyAxisAngle (new THREE.Vector3(0, 0, 1), THREE.MathUtils.randFloat(-0.3, 0.3));

        this.body.velocity.copy(direction);
        this.body.velocity.scale(10, this.body.velocity);

        this.manager.world.physics_world.add(this.body);
        this.manager.world.scene.add(this.model);

        this.body.addEventListener("collide", (e) => this._onCollide(e), false);
    }
    _onCollide(event)
    {
        if (!this._soundPlayed)
        {
            PlayCasingDropSound(this.manager.world.player._shooter._audioListener, this.model)
            this._soundPlayed = true;
        }
    }
    Update()
    {
        if (Date.now() - this._timeStarted > this.lifetime * 1000 && this.isAlive) {
            this.manager.world.scene.remove(this.model);
            this.manager.world.physics_world.remove(this.body);
            this.isAlive = false;
            return;
        }
        if (!this.isAlive) {
            return;
        }
        this.model.position.copy(this.body.position);
        this.model.quaternion.copy(this.body.quaternion);
    }
}

function PlayBulletHitSound(listener, object3D)
{
    let sound = "";
    let rand = THREE.MathUtils.randInt(0, 6);
    switch(rand)
    {
        case 0: sound = './resources/sounds/bullet_hit_1.mp3'; break;
        case 1: sound = './resources/sounds/bullet_hit_2.mp3'; break;
        case 2: sound = './resources/sounds/bullet_hit_3.mp3'; break;
        case 3: sound = './resources/sounds/bullet_hit_4.mp3'; break;
        case 4: sound = './resources/sounds/bullet_hit_5.mp3'; break;
        case 5: sound = './resources/sounds/bullet_hit_6.mp3'; break;
        case 6: sound = './resources/sounds/bullet_hit_7.mp3'; break;
    }

    const hitsound = new THREE.PositionalAudio(listener);

    const audioLoader = new THREE.AudioLoader();
    audioLoader.load(sound, function (buffer) {
        hitsound.setBuffer(buffer);
        hitsound.setMaxDistance(0.5);
        hitsound.setRefDistance(0.1)
        hitsound.setRolloffFactor(0.9)
        hitsound.setDistanceModel('linear')
        hitsound.setLoop(false);
        hitsound.setVolume(0.5);
        object3D.add(hitsound);
        hitsound.play();
    });
}

function PlayCasingDropSound(listener, object3D)
{
    let sound = "";
    let rand = THREE.MathUtils.randInt(0, 5);
    switch(rand)
    {
        case 0: sound = './resources/sounds/casing_1.wav'; break;
        case 1: sound = './resources/sounds/casing_2.wav'; break;
        case 2: sound = './resources/sounds/casing_3.wav'; break;
        case 3: sound = './resources/sounds/casing_4.wav'; break;
        case 4: sound = './resources/sounds/casing_5.wav'; break;
        case 5: sound = './resources/sounds/casing_6.wav'; break;
    }

    const hitsound = new THREE.PositionalAudio(listener);

    const audioLoader = new THREE.AudioLoader();
    audioLoader.load(sound, function (buffer) {
        hitsound.setBuffer(buffer);
        hitsound.setMaxDistance(20);
        hitsound.setRefDistance(0.1)
        hitsound.setRolloffFactor(0.9)
        hitsound.setDistanceModel('linear')
        hitsound.setLoop(false);
        hitsound.setVolume(1);
        object3D.add(hitsound);
        hitsound.play();
    });
}

// so that index2.js can call Main.js
export {init};