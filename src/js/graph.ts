import * as THREE from "three";
import {Vector3} from "three";

const colors: {[key:string]:number}= {
    orange: 0xfb6500,
    green: 0x378b59,
    steelBlue: 0x4377bf,
    blue: 0x0065fb,
    red: 0xd82c5d,
    lightgray: 0xf3f3f3,
    air: 0xf0f8ff,
    purple: 0x8300de,
    mint: 0x83ffde
};

function createMaterial(type:string, color:string, clipOverflow = true, clipDistance = 6){
    let material: THREE.Material=new THREE.MeshDepthMaterial();
    switch(type){
        case "standard":
            material = new THREE.MeshPhongMaterial({
                opacity: 0.8,
                transparent: true,
                side: THREE.DoubleSide,
                color: colors[color]
            });
            break;
        case "flat":
            material = new THREE.MeshBasicMaterial({
                color: colors[color],
                opacity: 0.8,
                side: THREE.DoubleSide,
                transparent: true,
            });
            break;
        case "line":
            material = new THREE.LineBasicMaterial({
                color: colors[color],
                opacity: 0.8,
                side: THREE.DoubleSide,
            });
            break;
        case "opaque":
            material = new THREE.MeshPhongMaterial({
                side: THREE.DoubleSide,
                color: colors[color]
            });
            break;

        case "normal":
        default:
            material = new THREE.MeshNormalMaterial({
                side: THREE.DoubleSide
            });
            break;
    }
    if(clipOverflow){
        material.clippingPlanes= [
            new THREE.Plane( new THREE.Vector3( 1, 0, 0 ), clipDistance ),
            new THREE.Plane( new THREE.Vector3( 0, 1, 0 ), clipDistance ),
            new THREE.Plane( new THREE.Vector3( 0, 0, 1 ), clipDistance ),
            new THREE.Plane( new THREE.Vector3(-1, 0, 0 ), clipDistance ),
            new THREE.Plane( new THREE.Vector3( 0,-1, 0 ), clipDistance ),
            new THREE.Plane( new THREE.Vector3( 0, 0,-1 ), clipDistance ),
        ];
    }
    return material;
}

/**
 * The abstract interface for a visualized graph
 */
abstract class Graph {
    name: string;
    material:THREE.Material;
    mesh: THREE.Mesh|THREE.Line;
    //Vector providing camera orientation for rendering optimization
    cameraPosition: THREE.Vector3;
    protected constructor (name: string) {
        this.name = name;
    }
    /**
     * Returns the effective bounds of visualization for this graph
     */
    getBounds(): number[][] {
        return [[-5, 5], [-5, 5], [-5, 5]];
    }

    /**
     * Constructs geometries without populating them
     * @param param parameters specifying the geometry
     */
    abstract constructGeometry(param:{[key:string]:string}):void;

    /**
     * Populates the geometry of this graph
     */
    abstract populate(): void;

    setMaterial(material:THREE.Material){
        this.material = material;
    }

    /**
     * Called by canvas to update rendering orientations
     */
    abstract updateOrientation():void;

    timeDependent: boolean = true;
    updateTime(): void {
        if(this.timeDependent){
            this.populate();
            this.update();
        }
    }

    abstract update():void;

    /**
     * Disposes the THREE mesh and geometries of this, releasing their memory
     */
    abstract dispose():void;
}

class CartesianGraph extends Graph{
    geometry:THREE.BufferGeometry;
    mesh: THREE.Mesh;
    //Create vertex overheads >3721*3
    vertices = new Float32Array(36000);
    //Create index overheads >3721*6
    indices:number[] = [];
    dataInterface: (x: number, y: number) => number;
    uCount = 100;
    vCount = 100;
    private mapping = (u:number, v:number)=>[-5+v*10, 5-u*10];

    /**
     * @param name name of the graph, needs to be unique
     * @param dataInterface the cartesian function being passed
     */
    constructor(name: string ,dataInterface: (x: number, y: number) => number) {
        super(name);
        this.geometry = new THREE.BufferGeometry();
        this.dataInterface = dataInterface;
    }
    constructGeometry(param:{[key:string]:string}=
                          {'material': "standard", 'color': "blue"}): void {
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute( 'position', new THREE.BufferAttribute( this.vertices, 3 ) );
        this.material = createMaterial((param['material'])?param['material']:'standard',
                                (param['color'])?param['color']:'blue');
        this.mesh = new THREE.Mesh( this.geometry, this.material );
        this.mesh.name = this.name;
    }

    /**
     * Generate indices for mesh creation
     * @param uCount # of vertices + 1 in the u direction
     * @param vCount # of vertices + 1 in the v direction
     */
    generateIndices(uCount = this.uCount, vCount = this.vCount){
        this.indices.length=0;
        /*
         * Upon population, there will be (uCount+1)*(vCount+1) vertices created,
         * namely uCount corresponds to the # of edges in the u direction, and vCount
         * # of edges in v, so that there will be exactly 2*uCount*vCount triangular mesh formed.
         */
        for(let i = 0; i < uCount; i++){
            for(let j = 0; j < vCount; j++){
                let a = i * (vCount+1) + j;
                let b = a + 1;
                let c = b + (vCount+1);
                let d = c - 1;
                this.indices.push(a, b, c);
                this.indices.push(c, d, a);
            }
        }
        this.geometry.setIndex(this.indices);
    }

    /**
     *
     * Upon population, there will be (uCount+1)*(vCount+1) vertices created,
     * namely uCount corresponds to the # of edges in the u direction, and vCount
     * # of edges along v.
     * @param mapping a mapping for the vertex generation, used to serve refined mesh generation
     * @param uCount # of vertices + 1 in the u direction
     * @param vCount # of vertices + 1 in the v direction
     */
    populate(mapping = this.mapping, uCount = this.uCount, vCount = this.vCount): void {

        for(let i = 0; i <= uCount; i++){
            for(let j = 0; j <= vCount; j++){
                let u = i/uCount, v = j/uCount;
                let [x,y] = mapping(u,v);
                let k  = 3*(i*(vCount+1)+j);
                this.vertices[k] = x;
                this.vertices[k+1] = y;
                this.vertices[k+2] = this.dataInterface(x,y);
            }
        }
        this.geometry.attributes.position.needsUpdate = true;
    }

    update(): void {
        this.geometry.computeVertexNormals();
    }

    private orientation = 0;
    private xAxis = new Vector3(1,0,0);
    private yAxis = new Vector3(0,1,0);
    private holder = new Vector3(0,0,0);
    updateOrientation(): void {
        this.holder.x = this.cameraPosition.x;
        this.holder.y = this.cameraPosition.y;
        let xAngle = this.holder.angleTo(this.xAxis);
        let yAngle = this.holder.angleTo(this.yAxis);
        let orientation;
        if(yAngle>=Math.PI*3/4)
            orientation = 0;
        if(yAngle<=Math.PI/4)
            orientation = 1;
        if(xAngle>=Math.PI*3/4)
            orientation = 2;
        if(xAngle<=Math.PI/4)
            orientation = 3;
        console.log(orientation);
        if(orientation!=this.orientation){
            let mapping;
            this.orientation = orientation;
            switch(orientation){
                case 0:
                    mapping = (u:number, v:number)=>[-5+v*10, 5-u*10];
                    break;
                case 1:
                    mapping = (u:number, v: number)=>[5-v*10, -5+u*10];
                    break;
                case 2:
                    mapping = (u:number, v: number)=>[5-u*10, -5+v*10];
                    break;
                case 3:
                    mapping = (u:number, v: number)=>[-5+u*10, 5-v*10];
                    break;
            }
            this.mapping = mapping;
            this.populate(mapping);
            this.update();
        }
    }


    timeDependent: boolean = true;

    dispose(){
        this.geometry.dispose();
        this.material.dispose();
    }
}

class CartesianGraph2D extends Graph{
    geometry:THREE.BufferGeometry;
    mesh: THREE.Line;
    //Create vertex overheads >3721*3
    vertices:THREE.Vector3[] = [];
    //Create index overheads >3721*6
    indices:number[] = [];
    dataInterface: (x: number) => number;
    uCount = 60;
    vCount = 60;

    /**
     * @param name name of the graph, needs to be unique
     * @param dataInterface the cartesian function being passed
     */
    constructor(name: string ,dataInterface: (x: number) => number) {
        super(name);
        this.geometry = new THREE.BufferGeometry();
        this.dataInterface = dataInterface;
    }
    constructGeometry(param:{[key:string]:string}=
                          {'material': "standard", 'color': "blue"}): void {
        this.geometry = new THREE.BufferGeometry();
        this.material = createMaterial('line',
            (param['color'])?param['color']:'blue');
        this.mesh = new THREE.Line( this.geometry, this.material );
        this.mesh.name = this.name;
    }

    /**
     * Generate indices for mesh creation
     * @param uCount # of vertices + 1 in the u direction
     * @param vCount # of vertices + 1 in the v direction
     */
    generateIndices(uCount = this.uCount, vCount = this.vCount){
        // this.indices.length=0;
        // /*
        //  * Upon population, there will be (uCount+1)*(vCount+1) vertices created,
        //  * namely uCount corresponds to the # of edges in the u direction, and vCount
        //  * # of edges in v, so that there will be exactly 2*uCount*vCount triangular mesh formed.
        //  */
        // for(let i = 0; i < uCount; i++){
        //     this.indices.push(i, i+1);
        // }
        // this.geometry.setIndex(this.indices);
    }

    /**
     *
     * Upon population, there will be (uCount+1)*(vCount+1) vertices created,
     * namely uCount corresponds to the # of edges in the u direction, and vCount
     * # of edges along v.
     * @param mapping a mapping for the vertex generation, used to serve refined mesh generation
     * @param uCount # of vertices + 1 in the u direction
     * @param vCount # of vertices + 1 in the v direction
     */
    populate(mapping = (u:number)=>[-5+u*10], uCount = this.uCount, vCount = this.vCount): void {

        for(let i = 0; i <= uCount; i++){
            let u = i/uCount;
            let [x] = mapping(u);
            let k  = i;
            this.vertices[k] = new THREE.Vector3(x, this.dataInterface(x), 0);
        }
        this.geometry.setFromPoints(this.vertices);
        this.geometry.attributes.position.needsUpdate = true;
    }

    update(): void {
        this.geometry.computeVertexNormals();
    }

    dispose(){
        this.geometry.dispose();
        this.material.dispose();
    }

    updateOrientation(): void {
    }
}

export {Graph, CartesianGraph, CartesianGraph2D};