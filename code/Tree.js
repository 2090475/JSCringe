import * as THREE from "../libraries/three.js-master/build/three.module.js";
import {M_pine_1} from "../code/Main.js";

export class Tree extends THREE.Object3D
{
    world;

    model;
    body;

    leaves;
    trunk;
    _geometry;

    constructor(world, position)
    {
        super({position: position});

        this.world = world;

        this.model = new THREE.Group();
        this.model.copy(M_pine_1);
        this.model.position.copy(position);
        this.model.rotateY(THREE.MathUtils.randFloat(0, 2*Math.PI))

        this.model.traverse(o => {
            if (o.isMesh)
            {
                if (o.name === 'pine_1_leaves')
                {
                    this.leaves = o;
                }
                if (o.name === 'pine_1_trunk')
                {
                    this.leaves = o;

                    
                }

                
            }
            
        });

      

       //i tried adding cannon bodies to the trunks of the trees but the collision doesn't seem to be working
       //for most of the trees 

        const cubeShape = this.createBoxShape(this.model.children[2].geometry);

        this.body = new CANNON.Body({ mass: 0 ,shape : cubeShape});

        this.body.position.copy(this.model.position);
        this.world.physics_world.add(this.body);

        this.add(this.model);    
        this.world.scene.add(this);
    }


    //the following methods are for creating box geometries that fit the models

    createBoxShape (geometry) {
        var vertices = this.getVertices(geometry);
    
        if (!vertices.length) return null;
    
        geometry.computeBoundingBox();
        var box = geometry.boundingBox;
        return new CANNON.Box(new CANNON.Vec3(
        (box.max.x - box.min.x) * 2,
        (box.max.y - box.min.y) * 2,
        (box.max.z - box.min.z) * 2
        ));
    }
    
    getVertices (geometry) {
        if (!geometry.attributes) {
          geometry = new THREE.BufferGeometry().fromGeometry(geometry);
        }
        return (geometry.attributes.position || {}).array || [];
    }

}