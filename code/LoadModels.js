import '../libraries/cannon/cannon.js';
import {FBXLoader} from '../libraries/three.js-master/examples/jsm/loaders/FBXLoader.js';
import * as THREE from '../libraries/three.js-master/build/three.module.js';

class LoadModels{

    _geometry;
    _body;
    positionX;
    model = [];
    colliderWorld;
    positionZ;
    corner = [[0,-6],[5,0],[-77,-6],[-84,0],[-91,94],[-96,88],[-25,94],[-7,88]];
    trees = [
        'BirchTree_5.fbx','CommonTree_2.fbx',
        'CommonTree_4.fbx','Bush_2.fbx',
        'Rock_Moss_2.fbx','Rock_7.fbx',
        'Flowers.fbx','TreeStump.fbx',
        'Rock_4.fbx',
        'Willow_2.fbx','BirchTree_Dead_5.fbx'];
    
    loaderObjects;
    loader = new FBXLoader();

   constructor(scene,physics_world){
     this.loader.setPath('./resources/Houses/FBX/');
     
     this.colliderWorld = physics_world;
   
     this.layFence(scene,physics_world);
     
     

   }

   layoutTheFarm(scene,physics_world){

        
        for(let index = 0; index < 5 ; ++ index){
            this.loader.load(this.buildings[index],(fbx) => {
            
                fbx.scale.setScalar(0.05);
                fbx.traverse(c => {
                    c.castShadow = true;
                    this._geometry = c.geometry;
                  
                    fbx.position.set(this.farmCoordinates[index][0],0,this.farmCoordinates[index][1]); 
                   // }
                });
            
            
    
            this._geometry.computeBoundingBox();
    
            const boundingBox = new THREE.Box3().setFromObject(fbx);
    
            
            const cubeShape = this.createBoxShape(this._geometry);
            this._body = new CANNON.Body({ mass: 0 });
            this._body.addShape(cubeShape);
            this._body.position.copy(fbx.position);
            
            physics_world.add(this._body)
    
            if(index == 3){ fbx.rotateY(-1.7)}
            scene.add(fbx);  
            });
        }
   }

   /*
    *layFence() imports fence models into the mesh scene
    *but it only imports models at the coordinates specified by the corners list
    *the in between models are imported by the fillFence() method
    */

   layFence(scene){

      
    for(let index = 0; index < this.corner.length ; ++ index){
        this.loader.load('Fence.fbx',(fbx) => {

        
            fbx.scale.setScalar(0.02);
            fbx.traverse(c => {
                c.castShadow = true;
                this._geometry = c.geometry;
                fbx.position.set(this.corner[index][0],0, this.corner[index][1]);
                
            
            });

         this.model[0] = fbx; 
           

         if(index%2 == 0 && index != 6){
            this.fillFence(scene,this.corner[index],this.corner[index+2]);
        }else if(index == 7){
            this.fillFence(scene,this.corner[index],this.corner[2]);
            this.layFloor(scene);
            
        }  


        this._geometry.computeBoundingBox();
        
        const cubeShape = this.createBoxShape(this._geometry);
        this._body = new CANNON.Body({ mass: 0 });
        this._body.addShape(cubeShape);
        this._body.position.copy(fbx.position);
        console.log("Fence body",this._body)

        this.colliderWorld.addBody(this._body);
        
        
        

        


        index%2 == 1 ? 
        fbx.rotateY(-1.7)
            :null;

        scene.add(fbx); 
        });
     }
            
   }

   fillFence(myWorld,first,second){ 

        if(first[1] == second[1]){

            for(let i = 0; i < 6;++i){

                if(first[0] > second[0]){

                    this.loader.load('Fence.fbx',(fbx) => {

        
                        fbx.scale.setScalar(0.02);
                        fbx.traverse(c => {
                            c.castShadow = true;
                            this._geometry = c.geometry;
                            fbx.position.set(-11-(i*11),0,first[1]);
                         

                        });

                        this._geometry.computeBoundingBox();
                    
                        const cubeShape = this.createBoxShape(this._geometry);
                        this._body = new CANNON.Body({ mass: 0 });
                        this._body.addShape(cubeShape);
                        this._body.position.copy(fbx.position);

                        this.colliderWorld.addBody(this._body);

                        myWorld.add(fbx);

                    })

                }else{

                    this.loader.load('Fence.fbx',(fbx) => {

        
                        fbx.scale.setScalar(0.02);
                        fbx.traverse(c => {
                            c.castShadow = true;
                            this._geometry = c.geometry;
                         
                            fbx.position.set(first[0]+(i*11),0, first[1]);
                          
                          
                        });

                        this._geometry.computeBoundingBox();
                        //const dim = this._geometry.boundingBox
                        const cubeShape = this.createBoxShape(this._geometry);
                        this._body = new CANNON.Body({ mass: 0 });
                        this._body.addShape(cubeShape);
                        this._body.position.copy(fbx.position);

                        

                        this.colliderWorld.addBody(this._body);

                        myWorld.add(fbx);
                    })
        
                }
            }

        }else{
            this.p = 1.5
            //for when the x values are equal 
            for(let i = 0; i < 7;++i){

                if(first[1] > second[1]){

                    this.loader.load('Fence.fbx',(fbx) => {

        
                        fbx.scale.setScalar(0.02);
                        fbx.traverse(c => {
                            c.castShadow = true;
                            this._geometry = c.geometry;
                          
                            fbx.position.set(-10.5+first[0]+this.p,0,first[1]-11-(i*11));
                            

                        });

                        this._geometry.computeBoundingBox();
                        //const dim = this._geometry.boundingBox
                        const cubeShape = this.createBoxShape(this._geometry);
                        this._body = new CANNON.Body({ mass: 0 });
                        this._body.addShape(cubeShape);
                        this._body.position.copy(fbx.position);

                        this._body.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), this._body.positionY);

                        this.colliderWorld.addBody(this._body);

                        fbx.rotateY(-1.7);
                        this.p = this.p+1.5;
                        myWorld.add(fbx);

                    })

                }else{

                    this.loader.load('Fence.fbx',(fbx) => {

        
                        fbx.scale.setScalar(0.02);
                        fbx.traverse(c => {
                            c.castShadow = true;
                            this._geometry = c.geometry;
                            fbx.position.set(-7+first[0]-this.p,0, 11+(i*11));
                            
        
                           
                        });

                        this._geometry.computeBoundingBox();
                        //const dim = this._geometry.boundingBox
                        const cubeShape = this.createBoxShape(this._geometry);
                        this._body = new CANNON.Body({ mass: 0 });
                        this._body.addShape(cubeShape);
                        this._body.position.copy(fbx.position);

                        this._body.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), this._body.positionY);
                        this.colliderWorld.addBody(this._body);

                        fbx.rotateY(-1.7);
                        this.p = this.p+1.5;
                        myWorld.add(fbx);
                    })
        
                }
                
            }

        }


       

   }

layFloor(scene){
    this.loader.setPath('./resources/Textured_trees/FBX/');
    
    for(let index = 0; index < 100 ; ++ index){  
    this.loader.load('Grass_Short.fbx',(fbx) => {
            
            fbx.scale.setScalar(0.01);
            fbx.traverse(c => {
                c.castShadow = true;
                 
            });

            fbx.position.copy(this.getRandom(-80,80),0,this.getRandom(-90,60));
            scene.add(fbx);
            
        });

     
        

    }

    this.layFoliange(scene);
}

   layFoliange(scene){

    this.loader.setPath('./resources/Textured_trees/FBX/');
    for(let index = 0; index < 100 ; ++ index){
        let randNum = this.getRandom(0,10);
        this.loader.load(this.trees[randNum],(fbx) => {
            
            fbx.traverse(c => {
                c.castShadow = true;
                this._geometry = c.geometry;
                fbx.position.set(this.getRandom(-80,80),0,this.getRandom(-90,60));
                
               
            });
            randNum == 3? fbx.scale.setScalar(0.01) : fbx.scale.setScalar(0.03);
            

            this._geometry.computeBoundingBox();
                        
            const cubeShape = this.createBoxShape(this._geometry);
            this._body = new CANNON.Body({ mass: 0 });
            this._body.addShape(cubeShape);
            this._body.position.copy(fbx.position);
            this.colliderWorld.addBody(this._body);
            

            scene.add(fbx);
        });
    }

   // this.layFloor(scene);


   }

   getRandom(min, max) {
    return Math.floor(Math.random() * (max - min + 1) ) + min;
  }

    createBoxShape (geometry) {
        var vertices = this.getVertices(geometry);
    
        if (!vertices.length) return null;
    
        geometry.computeBoundingBox();
        var box = geometry.boundingBox;
        return new CANNON.Box(new CANNON.Vec3(
        (box.max.x - box.min.x) / 2,
        (box.max.y - box.min.y) / 2,
        (box.max.z - box.min.z) / 2
        ));
  }

   createBoundingBoxShape (object) {
        var shape, localPosition,
            box = new THREE.Box3();

    
        if (!isFinite(box.min.lengthSq())) return null;
    
        shape = new CANNON.Box(new CANNON.Vec3(
        (box.max.x - box.min.x) / 2,
        (box.max.y - box.min.y) / 2,
        (box.max.z - box.min.z) / 2
        ));
    
        localPosition = box.translate(clone.position.negate()).getCenter(new THREE.Vector3());
        if (localPosition.lengthSq()) {
        shape.offset = localPosition;
        }
    
        return shape;
  }

   getVertices (geometry) {
    if (!geometry.attributes) {
      geometry = new THREE.BufferGeometry().fromGeometry(geometry);
    }
    return (geometry.attributes.position || {}).array || [];
  }
}
export {LoadModels};