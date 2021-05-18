// VERY IMPORTANT: we HAVE to import three.module.js because this file is being used as a module.
// If we try to import three.js or three.min.js, our program WILL NOT RUN AT ALL

import * as THREE from '../libraries/three.js-master/build/three.module.js';
import {OrbitControls} from '../libraries/three.js-master/examples/jsm/controls/OrbitControls.js';
import {FirstPersonControls} from '../libraries/three.js-master/examples/jsm/controls/FirstPersonControls.js';
import {PointerLockControls} from '../libraries/three.js-master/examples/jsm/controls/PointerLockControls.js';
import {GLTFLoader} from '../libraries/three.js-master/examples/jsm/loaders/GLTFLoader.js';
import {FBXLoader} from '../libraries/three.js-master/examples/jsm/loaders/FBXLoader.js';
import {DRACOLoader} from "../libraries/three.js-master/examples/jsm/loaders/DRACOLoader.js";

//import '../libraries/cannon/cannon.js';

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

class World {

    _renderer; // the renderer that renders the world on screen

    _scene // the graphics component of our scene

    _clock;

    _player;

    constructor()
    {
        // graphics world setup stuff
        this._renderer = new THREE.WebGLRenderer({
            antialias: true,
        });
        this._renderer.shadowMap.enabled = true;
        this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this._renderer.setPixelRatio(window.devicePixelRatio);
        this._renderer.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(this._renderer.domElement);

        window.addEventListener('resize', () => {
            this._OnWindowResize();
        }, false);

        this._clock = new THREE.Clock();

        this.StartUp();
    }

    StartUp() {

        const fov = 60;
        const aspect = 1920 / 1080;
        const near = 1.0;
        const far = 1000.0;

        this._scene = new THREE.Scene();
        this._scene.background = new THREE.Color(0xFFFFFF);
    	this._scene.fog = new THREE.FogExp2(0x89b2eb, 0.002);

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
        this._scene.add(light);

        light = new THREE.AmbientLight(0xffffff);
        light.intensity = 1;
        this._scene.add(light);

        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(1000, 1000, 10, 10),
            new THREE.MeshPhongMaterial({
                color: 0x1e601c
            }));
        plane.receiveShadow = true;
        plane.rotation.x = -Math.PI / 2;
        this._scene.add(plane);

        this._player = new Player(this._renderer, this._scene);

        const loader = new GLTFLoader(loadingManager);
        loader.load('./resources/models/M1A2-Abrams.glb', (gltf) => {
            let model = gltf.scene;

            model.traverse(o => {
                if (o.isMesh)
                {
                    o.castShadow = true;
                    o.receiveShadow = true;
                    o.material = this.GetMaterial('./resources/models/woodlands.png');;
                }
            });

            this._scene.add(model);
        });

        this.LoadSky();
        this.RAF();
    }

    LoadSky() {
	    const hemiLight = new THREE.HemisphereLight(0xFFFFFF, 0xFFFFFFF, 0.6);
	    hemiLight.color.setHSL(0.6, 1, 0.6);
	    hemiLight.groundColor.setHSL(0.095, 1, 0.75);
	    this._scene.add(hemiLight);

	    const uniforms = {
	      "topColor": { value: new THREE.Color(0x0077ff) },
	      "bottomColor": { value: new THREE.Color(0xffffff) },
	      "offset": { value: 33 },
	      "exponent": { value: 0.6 }
	    };
	    uniforms["topColor"].value.copy(hemiLight.color);

	    this._scene.fog.color.copy(uniforms["bottomColor"].value);

	    const skyGeo = new THREE.SphereBufferGeometry(1000, 32, 15);
	    const skyMat = new THREE.ShaderMaterial({
	        uniforms: uniforms,
	        vertexShader: _VS,
	        fragmentShader: _FS,
	        side: THREE.BackSide
	    });

	    const sky = new THREE.Mesh(skyGeo, skyMat);
	    this._scene.add(sky);
	}

    RAF() {
        requestAnimationFrame(() => {
            // This block runs while resources are loading.
            if( RESOURCES_LOADED == false ){            
                loadingScreen.box.position.x -= 0.05;
                if( loadingScreen.box.position.x < -10 ) loadingScreen.box.position.x = 10;
                loadingScreen.box.position.y = Math.sin(loadingScreen.box.position.x);
                this._renderer.render(loadingScreen.scene, loadingScreen.camera);
            }

            if (this._player.camera3P != null) {
                this._renderer.render(this._scene, this._player.camera3P._camera);
                this._player.Update();
            }
            
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

class Player
{
    model;
    file_animations;
    animation_mixer;
    controller;
    _clock;
    camera3P;

    constructor(renderer, scene)
    {
        this._clock = new THREE.Clock();
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
                }
            });

            this.file_animations = gltf.animations;
            this.animation_mixer = new THREE.AnimationMixer(this.model);
            let idleAnim = THREE.AnimationClip.findByName(this.file_animations, 'Rest');
            this.animation_mixer.clipAction(idleAnim).play();

            const fov = 60;
            const aspect = 1920 / 1080;
            const near = 1.0;
            const far = 1000.0;
            this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
            this._camera.position.set(1, 2,-3);
            this._camera.lookAt(new THREE.Vector3(this.model.position.x, this.model.position.y + 2, this.model.position.z));

            this.camera3P = new Camera3P(renderer, this.model.position, this.model.rotation);
            scene.add(this.camera3P._camera);

            scene.add(this.model);
        });
    }

    AnimateRun()
    {
        if (!this.animation_mixer) { return; }

        let idleAnim = THREE.AnimationClip.findByName(this.file_animations, 'Run');
        this.animation_mixer.clipAction(idleAnim).play();
    }
    AnimateIdle()
    {
        if (!this.animation_mixer) { return; }

        this.animation_mixer.stopAllAction ();

        let idleAnim = THREE.AnimationClip.findByName(this.file_animations, 'Rest');
        this.animation_mixer.clipAction(idleAnim).play();
    }

    Update()
    {
        if (this.animation_mixer)
        {
            this.animation_mixer.update(this._clock.getDelta());
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
            this.model.translateZ(-0.1);
            //console.log("forward");
        }
        else
        {
            this.AnimateIdle();
        }

        this.model.rotateY(this.controller.current_yaw);

        if (this.camera3P != null)
        {
            this.controller.current_yaw = 0;
            this.camera3P.Update(this._clock.getDelta(), this.model.position, this.model.quaternion);
        }
        //this.model.translate(0.25, 0, 0);
    }
}

class PlayerController {

    keys;
    current_yaw;

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
        this.x_previous = 0;

        document.addEventListener('keydown', (e) => this._onKeyDown(e), false);
        document.addEventListener('keyup', (e) => this._onKeyUp(e), false);
        document.addEventListener('mousemove', (e) => this._OnMouseMove(e), false);
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
        //console.log(event.movementX);

        let x = event.screenX;
        let x_change = event.screenX - this.x_previous;
        this.x_previous = x;
        this.current_yaw = x_change * -0.03;
        //console.log(this.current_yaw);
    }
};

class Camera3P
{
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

// so that index2.js can call Main.js
export {init} ;

