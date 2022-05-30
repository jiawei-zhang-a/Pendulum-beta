import * as THREE from "three";
import {
    ArrowHelper,
    BufferGeometry,
    ConeGeometry,
    CylinderGeometry,
    Float32BufferAttribute,
    LineBasicMaterial,
    Vector3
} from "three";
import {Geometry} from "three/examples/jsm/deprecated/Geometry";
import {Vec} from "./diffEqn";

const colors: {[key:string]:number}= {
    orange: 0xfb6500,
    blue: 0x0065fb,
    green: 0x378b59,
    purple: 0x8300de,
    mint: 0x2effc7,
    red: 0xd82c5d,
    lightgray: 0xf3f3f3,
    air: 0xf0f8ff,
    steelBlue: 0x4377bf,
};

function createMaterial(type:string, color:string, clipOverflow = true, clipDistance = 6){
    let material: THREE.Material;
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
    mesh: THREE.Mesh|THREE.Line|THREE.Object3D;
    //Vector providing camera orientation for rendering optimization
    cameraPosition: THREE.Vector3;
    //For informational use
    color: string;
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

    queryColor(){
        return colors[this.color];
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

    generateIndices() {

    }
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
        this.color = (param['color'])?param['color']:'blue';
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
    constructor(name: string, dataInterface: (x: number) => number) {
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
            this.vertices[i] = new THREE.Vector3(x, this.dataInterface(x), 0);
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

class Vector3D extends Graph{
    cCount = 25;
    vector: number[];
    baseVec: number[];
    rv: Vector3;
    cone: BufferGeometry;
    ring: BufferGeometry;
    cylinder: BufferGeometry;
    base: BufferGeometry;
    buffer: Float32Array = new Float32Array(303);
    thetaStart = 0;

    r0: (length: number) => number=()=>0.05;
    r1: (length: number) => number=()=>0.15;
    h0: (length: number) => number=(length)=>length*0.7;
    h1: (length: number) => number=(length)=>length*0.3;
    indices:number[] = [];

    /**
     *
     * @param name
     * @param vector
     * @param base
     * @param style
     *  r0: maps from vector length to tail radius
     *  r1: maps from vector length to head radius
     *  h0: maps from vector length to tail height
     *  h1: maps from vector length to head height
     */
    constructor(name: string, vector: number[], base: number[] = [0,0,0], style: {[p: string]: (length: number)=>number}={}) {
        super(name);
        this.vector = vector;
        this.baseVec = base;
        this.rv = new THREE.Vector3();
    }

    /**
     * @param param
     *  color: string valued specification of mesh color
     *  material: string valued specification of mesh material
     */
    constructGeometry(param: { [p: string]: string }): void {
        this.cone = new BufferGeometry();
        this.cone.setAttribute( 'position', new THREE.BufferAttribute( this.buffer, 3 ) );
        this.ring = new BufferGeometry();
        this.ring.setAttribute( 'position', new THREE.BufferAttribute( this.buffer, 3 ) );
        this.cylinder = new BufferGeometry();
        this.cylinder.setAttribute( 'position', new THREE.BufferAttribute( this.buffer, 3 ) );
        this.base = new BufferGeometry();
        this.base.setAttribute( 'position', new THREE.BufferAttribute( this.buffer, 3 ) );
        this.material = createMaterial((param['material'])?param['material']:'standard',
            (param['color'])?param['color']:'blue');
        let coneMesh = new THREE.Mesh(this.cone, this.material);
        let ringMesh = new THREE.Mesh(this.ring, this.material);
        let cylinderMesh = new THREE.Mesh(this.cylinder, this.material);
        let baseMesh = new THREE.Mesh(this.base, this.material);
        this.mesh = new THREE.Group();
        this.mesh.add(coneMesh);
        coneMesh.renderOrder=3;
        this.mesh.add(ringMesh);
        ringMesh.renderOrder=2;
        this.mesh.add(cylinderMesh);
        cylinderMesh.renderOrder=1;
        this.mesh.add(baseMesh);
        baseMesh.renderOrder=0;
        this.mesh.name = this.name;
    }

    /**
     * Populate the relevant geometries into the vertex
     * buffer
     */
    populate(): void {
        this.rv.fromArray(this.vector);
        let l = this.rv.length();
        let r0 = this.r0(l);
        let r1 = this.r1(l);
        let h0 = this.h0(l);
        let h1 = this.h1(l);
        this.populateRing(0, this.cCount, r0, 0);
        this.populateRing(3*this.cCount, this.cCount, r0, h0);
        this.populateRing(6*this.cCount, this.cCount, r1, h0);
        this.populateRing(9*this.cCount, this.cCount, 0, h0+h1);
        this.populateRing(12*this.cCount, 1, 0, 0);
        this.mesh.lookAt(this.rv.normalize());
        this.cone.attributes.position.needsUpdate = true;
        this.ring.attributes.position.needsUpdate = true;
        this.cylinder.attributes.position.needsUpdate = true;
        this.base.attributes.position.needsUpdate = true;
        this.mesh.position.set(this.baseVec[0], this.baseVec[1], this.baseVec[2]);
    }

    populateRing(startIndex: number, size: number, r: number, h: number,
                 theta0 = this.thetaStart):void{
        for(let i = 0; i < size; i++){
            let theta = theta0 + Math.PI*2*i/size;
            this.buffer[startIndex+3*i] = r*Math.cos(theta);
            this.buffer[startIndex+3*i+1] = r*Math.sin(theta);
            this.buffer[startIndex+3*i+2] = h;
        }
    }

    dispose(): void {
        this.material.dispose();
    }

    generateIndices() {
        let coneIndices = [];
        let c = this.cCount;
        for(let i = 0; i<c; i++){
            coneIndices.push(i+2*c, (i+1)%c+2*c, i+3*c);
        }
        this.cone.setIndex(coneIndices);
        let ringIndices = [];
        for(let i = 0; i<c; i++){
            ringIndices.push(i+c, (i+1)%c+c, i+2*c);
            ringIndices.push((i+1)%c+c, (i+1)%c+2*c, i+2*c);
        }
        this.ring.setIndex(ringIndices);
        let cylinderIndices = [];
        for(let i = 0; i<c; i++){
            cylinderIndices.push(i, (i+1)%c, i+c);
            cylinderIndices.push((i+1)%c, (i+1)%c+c, i+c);
        }
        this.cylinder.setIndex(cylinderIndices);
        let baseIndices = [];
        for(let i = 0; i<c; i++){
            baseIndices.push(i, (i+1)%c, 4*c);
        }
        this.base.setIndex(baseIndices);
    }

    update(): void {
        this.cone.computeVertexNormals();
        this.ring.computeVertexNormals();
        this.cylinder.computeVertexNormals();
        this.base.computeVertexNormals();
    }

    /**
     * Compute theta start and repopulate, invert the camera position
     * into the arrow frame, and rotate the arrow accordingly
     */
    updateOrientation(): void {
        let inverse = this.mesh.matrix.clone().invert();
        let camera = this.cameraPosition.clone().transformDirection(inverse);
        let x = camera.x;
        let y = camera.y;
        this.thetaStart = Math.PI/2+((x<=0)?Math.PI:0)+((x!=0)?Math.atan(y/x):Math.PI/2);
        this.populate();
        this.update();
    }
}

class ParametricLine extends Graph{
    geometry:THREE.BufferGeometry;
    mesh: THREE.Line;
    //Create vertex overheads >3721*3
    vertices:THREE.Vector3[] = [];
    //Create index overheads >3721*6
    indices:number[] = [];
    dataInterface: (x: number) => Vec;
    uCount = 1000;
    vCount = 1000;

    /**
     * @param name name of the graph, needs to be unique
     * @param dataInterface the cartesian function being passed
     */
    constructor(name: string ,dataInterface: (x: number) => Vec, uCount = 1000) {
        super(name);
        this.geometry = new THREE.BufferGeometry();
        this.dataInterface = dataInterface;
        this.uCount = uCount;
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
        this.indices.length=0;
        // /*
        //  * Upon population, there will be (uCount+1)*(vCount+1) vertices created,
        //  * namely uCount corresponds to the # of edges in the u direction, and vCount
        //  * # of edges in v, so that there will be exactly 2*uCount*vCount triangular mesh formed.
        //  */
        for(let i = 0; i < uCount; i++){
            this.indices.push(i, i+1);
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
    populate(mapping = (u:number)=>u, uCount = this.uCount, vCount = this.vCount): void {

        for(let i = 0; i <= uCount; i++){
            let u = i/uCount;
            let x = mapping(u);
            let vec = this.dataInterface(x);
            this.vertices[i] = new THREE.Vector3(vec.x, vec.y, vec.z);
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

export {Graph, CartesianGraph, CartesianGraph2D, Vector3D, ParametricLine, colors};