import * as THREE from '../libraries/three.js-master/build/three.module.js';

import '../libraries/cannon/cannon.js';

import {Cube, T_grass} from "../code/Main.js";
import {Player} from "../code/Player.js";
import {ZombieManager} from "../code/ZombieManager.js";
import {EffectManager} from "../code/EffectManager.js";
import {GrassTuft} from "../code/GrassTuft.js";
import {Tree} from "../code/Tree.js";
import {Building, model_dir, material_dir} from "../code/Building.js";
import {LoadModels} from './LoadModels.js';

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

export class World {

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
    }

    LoadLevel1() {

        const fov = 60;
        const aspect = 1920 / 1080;
        const near = 1.0;
        const far = 1000.0;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xFFFFFF);
        this.scene.fog = new THREE.FogExp2(0xbccdd1, 0.01);
        //this.scene.fog = new THREE.Fog(0x8d99a6, 0, 80);

        let light = new THREE.DirectionalLight(0xffefbf, 1.0);
        light.position.set(20, 20, 1);
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

        // let light = new THREE.PointLight(0xFFFFFF, 1.00, 10000, 0.5);
        // light.position.set(100, 100, 100);
        // light.castShadow = true;
        // light.shadow.bias = -0.001;
        // light.shadow.mapSize.width = 4096;
        // light.shadow.mapSize.height = 4096;
        // light.shadow.camera.near = 0.5;
        // light.shadow.camera.far = 1000.0;
        // light.shadow.camera.left = 100;
        // light.shadow.camera.right = -100;
        // light.shadow.camera.top = 100;
        // light.shadow.camera.bottom = -100;
        // this.scene.add(light);

       /* const axesHelper = new THREE.AxesHelper( 5 );
        this.scene.add( axesHelper );*/

        //i commented out the above code because the player seems to be colliding with axis 

        light = new THREE.AmbientLight(0xffffff);
        light.intensity = 1;
        this.scene.add(light);

        const plane_geometry = new THREE.PlaneGeometry(1000, 1000, 10, 10);
        plane_geometry.computeVertexNormals()
        plane_geometry.computeTangents()

        const texture = T_grass;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(128, 128);

        const plane = new THREE.Mesh(
            plane_geometry,
            new THREE.MeshStandardMaterial({
                map: texture,
                color: 0xAAAAAA
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
        planeBody.id = 200
      
        this.physics_world.add(planeBody)

        this.player = new Player(this);

        this.GenerateTrees();
        this.GenerateGrass();

        this.cube1 = new Cube(this.scene, this.physics_world);
        this.cube2 = new Cube(this.scene, this.physics_world);

        this.zombieManager = new ZombieManager(this);
        this.effectManager = new EffectManager(this);

        this.LoadSky();
        this.RAF();
    }
    LoadLevel2() {

        const fov = 60;
        const aspect = 1920 / 1080;
        const near = 1.0;
        const far = 1000.0;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xFFFFFF);
        this.scene.fog = new THREE.FogExp2(0x89b2eb, 0.002);

        let light = new THREE.DirectionalLight(0xffefbf, 1.0);
        light.position.set(20, 20, 1);
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

        light = new THREE.AmbientLight(0xffffff);
        light.intensity = 1;
        this.scene.add(light);

        const plane_geometry = new THREE.PlaneGeometry(1000, 1000, 10, 10);
        plane_geometry.computeVertexNormals()
        plane_geometry.computeTangents()
        const plane = new THREE.Mesh(
            plane_geometry,
            new THREE.MeshPhongMaterial({
                color: 0x333333
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

        //SIDE ONE
        this.b1 = new Building(this,model_dir[0],material_dir[0],25,0,0, 0);
        this.b2 = new Building(this,model_dir[1],material_dir[1],25,0,42, 0);
        this.b3 = new Building(this, model_dir[2], material_dir[2], 25, 0, -42, 0);
        this.b4 = new Building(this,model_dir[1],material_dir[1],30,0,-82, 0);
        this.b16 = new Building(this, model_dir[5], material_dir[5], 35, 0, -125, Math.PI);

        //SIDE TWO
        this.b5 = new Building(this, model_dir[3], material_dir[3], -25,0,0,0);
        this.b6 = new Building(this, model_dir[4], material_dir[4], -25, 0, 26, 0);
        this.b7 = new Building(this, model_dir[0], material_dir[0], -25, 0, -30, 0);
        this.b8 = new Building(this, model_dir[5], material_dir[5], -25, 0, -69, 0);
        this.b9 = new Building(this, model_dir[6], material_dir[6], -20, 0, -103, 0);
        this.b10 = new Building(this, model_dir[6], material_dir[6], -20, 0, 55, 0);
        this.b17 = new Building(this, model_dir[1], material_dir[1], -20, 0, -148, 0);

        //SIDE THREE
        this.b11 = new Building(this, model_dir[1], material_dir[1], 0, 0, -160, Math.PI/2);
        this.b12 = new Building(this, model_dir[3], material_dir[3], 43, 0, -160, -Math.PI/2);
        this.b13 = new Building(this, model_dir[2], material_dir[2], -43, 0, -160, Math.PI/2);

        //SIDE FOUR
        this.b14 = new Building(this, model_dir[0], material_dir[0],0, 0, 82, -Math.PI/2);
        this.b15 = new Building(this, model_dir[1], material_dir[1], -42, 0, 82, -Math.PI/2);

        this.cube1 = new Cube(this.scene, this.physics_world);
        this.cube2 = new Cube(this.scene, this.physics_world);

        this.zombieManager = new ZombieManager(this);
        this.effectManager = new EffectManager(this);

        this.LoadSky();
        this.RAF();
    }

    LoadLevel3(){

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

        //floor material is the textures that is drawn over the plane in the third level

        var floorMaterial = new THREE.TextureLoader().load('seamlessGrass.jpg');

        floorMaterial.wrapS = floorMaterial.wrapT = THREE.RepeatWrapping; 
        floorMaterial.repeat.set( 100, 100 );


        var material = new THREE.MeshPhongMaterial( {

            map: floorMaterial,
            side: THREE.FrontSide

        } );

        const plane_geometry = new THREE.PlaneGeometry(1000, 1000, 10, 10);
        plane_geometry.computeVertexNormals()
        plane_geometry.computeTangents()
        const plane = new THREE.Mesh(
            plane_geometry,
            material
            );
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
        planeBody.id = 200;
        this.physics_world.add(planeBody)

        this.player = new Player(this);

        //loadModels object to load the models for level three
        //
        this.loadModels = new LoadModels(this.scene, this.physics_world);

        this.zombieManager = new ZombieManager(this);
        this.effectManager = new EffectManager(this);


        this.SkyBox(this.scene);
        this.RAF();
    }

    SkyBox(scene){
        let material = []

        let texture_bk = new THREE.TextureLoader().load('./resources/cloudy/gray/bk.jpg');
        let texture_ft = new THREE.TextureLoader().load('./resources/cloudy/gray/ft.jpg');
        let texture_dn = new THREE.TextureLoader().load('./resources/cloudy/gray/dn.jpg');
        let texture_up = new THREE.TextureLoader().load('./resources/cloudy/gray/up.jpg');
        let texture_lt = new THREE.TextureLoader().load('./resources/cloudy/gray/lt.jpg');
        let texture_rt = new THREE.TextureLoader().load('./resources/cloudy/gray/rt.jpg');

        material.push(new THREE.MeshBasicMaterial({map: texture_ft}));
        material.push(new THREE.MeshBasicMaterial({map: texture_bk}));
        material.push(new THREE.MeshBasicMaterial({map: texture_up}));
        material.push(new THREE.MeshBasicMaterial({map: texture_dn}));
        material.push(new THREE.MeshBasicMaterial({map: texture_rt}));
        material.push(new THREE.MeshBasicMaterial({map: texture_lt}));

        //the textures are initially mapped to the outside of the sky box
        //so in the loop we map the textures to the back side of the cube, which is the inside of the skybox 

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
            "topColor": { value: new THREE.Color(0x869eba) },
            "bottomColor": { value: new THREE.Color(0xbccdd1) },
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
            side: THREE.BackSide,
            //fog: true
        });

        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);
    }

    RAF() {
        requestAnimationFrame(() => {
            // This block runs while resources are loading.
            // if( RESOURCES_LOADED == false ){
            //     loadingScreen.box.position.x -= 0.05;
            //     if( loadingScreen.box.position.x < -10 ) loadingScreen.box.position.x = 10;
            //     loadingScreen.box.position.y = Math.sin(loadingScreen.box.position.x);
            //     this.renderer.render(loadingScreen.scene, loadingScreen.camera);
            // }

            if (this.player.camera3P != null) {
                this.renderer.render(this.scene, this.player.camera3P._camera);
                this.player.Update();
            }

            this.physics_world.step(1 / 60);

            //if you wanna add the cubes to the scene make sure to instatiate the cubes in the third level  

           // this.cube1.Update();
           // this.cube2.Update();

            this.zombieManager.Update();
            this.effectManager.Update();

            this.RAF();
        });
    }

    _OnWindowResize() {
        // this._player.camera3P._camera.aspect = window.innerWidth / window.innerHeight;
        // this._player.camera3P._camera.updateProjectionMatrix();
        // this._renderer.setSize(window.innerWidth, window.innerHeight);
    }

    GenerateTrees()
    {
        for (let i = 0; i < 150; i++)
        {
            let position = new THREE.Vector3(THREE.MathUtils.randInt(-100, 100), THREE.MathUtils.randInt(-3, -1), THREE.MathUtils.randInt(-100, 100))
            let tree = new Tree(this, position);
        }
    }
    GenerateGrass()
    {
        for (let i = 0; i < 100; i++)
        {
            let position = new THREE.Vector3(THREE.MathUtils.randInt(-80, 80), 0, THREE.MathUtils.randInt(-80, 80))
            let grass = new GrassTuft(this, position);
        }
    }
}