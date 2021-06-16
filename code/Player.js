import * as THREE from "../libraries/three.js-master/build/three.module.js";
import {A_character, M_character} from "../code/Main.js";

import '../libraries/cannon/cannon.js';
import {PlayerController} from "../code/PlayerController.js";
import {Camera3P} from "../code/Camera3P.js";
import {PlayerShooter} from "../code/PlayerShooter.js";
import {Gun} from "../code/Gun.js";

export class Player extends THREE.Object3D
{

    world;

    model;

    moveForward = [];
    moveBackward = [];

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

        this.model = M_character;

        this.model.traverse(o => {
            if (o.isMesh)
            {
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
        this._body.addEventListener("collide",(e) => this._onCollide(e));


        this.world.physics_world.add(this._body)

        this.file_animations = [];
        console.log(A_character);
        for (let i = 0; i < A_character.length; i++)
        {
            this.file_animations.push(A_character[i]);
        }

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
    }

    //call back method for collision
    _onCollide(event){

        if(event.contact.bi.id == 200 || event.contact.bi.id == 0){

            //this is when the player collides with the plane
            //it still seems to collide with the scene in level though
            console.log("collided with the plane ",event.contact.bi.id);

        }else{

            //when the is a collision with one of the scene children,set the state of motion to false/1
            //after the state of motion is changed the we check which button was pressed when the collision
            //occurred the we disable that button to keep the player from moving
            
            this.moveForward[0] = 1;
            this.moveBackward[0] = 1;
            console.log("the was a collision ",event.contact);
        }
    
    }


    _onDamaged(event)
    {
        this.health -= event.damage;

        if (this.health < 0)
        {
            this.health = 0;
        }

        document.getElementById("healthBar").textContent = this.health.toString();
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
            if(this.moveForward.length == 0 || this.moveForward[0] == 0){ 
                // this.world.scene.add(new THREE.ArrowHelper(this.collisionRay.ray.direction, this.collisionRay.ray.origin, collides.distance, 0xff0000));
                 //above line adds the ray to the scene, primarily used for debuging
 
                this.model.translateZ(0.12);
                this.moveForward[0] = 0;
              
             }
 
             
            this.moveBackward[0] = 0;
        }
        else if (this.controller.keys.backward)
        {
            this.AnimateRun();

            //player can move backwards provided that they haven't collided with anything
            if(this.moveBackward.length == 0 || this.moveBackward[0] == 0){

                this.model.translateZ(-0.08);
                this.moveBackward[0] = 0;

            }

            //enable forward movement when player has collided with an object and is back tracking

            this.moveForward[0] = 0;
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