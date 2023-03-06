import * as THREE from "three";
import {
    BufferGeometry,
    ConeGeometry,
    CylinderGeometry, Group, Mesh,
    Vector3
} from "three";
import {Vec} from "./diffEqn";
import {Evaluable, Quantity} from "./core";
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import {Line2} from "three/examples/jsm/lines/Line2.js";

let renderer:THREE.WebGLRenderer;

function loadRenderer(r: THREE.WebGLRenderer){
    renderer = r;
}
const colors: { [key: string]: number } = {
    orange: 0xfb6500,
    blue: 0x0065fb,
    green: 0x378b59,
    purple: 0x8300de,
    mint: 0x8300de,
    // mint: 0x2effc7,
    red: 0xd82c5d,
    lightgray: 0xf3f3f3,
    air: 0xf0f8ff,
    steelBlue: 0x4377bf,
};

function createMaterial(type: string, color: string, clipOverflow = true, clipDistance = 6) {
    let material: THREE.Material;
    switch (type) {
        case "standard":
            material = new THREE.MeshPhongMaterial({
                opacity: 0.8,
                transparent: true,
                side: THREE.DoubleSide,
                color: colors[color]
            });
            break;
        case "light":
            material = new THREE.MeshPhongMaterial({
                opacity: 0.5,
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
            //@ts-ignore
            material = new THREE.LineBasicMaterial({
                color: colors[color],
                transparent: true,
                opacity: 0.5,
                linewidth: 1
            });
            break;
        case "line2":
            let resolution = new THREE.Vector2();
            renderer.getSize(resolution);
            material = new LineMaterial( {

                color: colors[color],
                linewidth: 2, // in world units with size attenuation, pixels otherwise
                vertexColors: false,
                resolution: resolution,
                //resolution:  // to be set by renderer, eventually
                dashed: false,
                gapSize: 0.2,
                dashSize:0.4,
                alphaToCoverage: false,

                polygonOffset: true,
                polygonOffsetFactor: 0,
                polygonOffsetUnits: -40
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
    if (clipOverflow) {
        material.clippingPlanes = [
            new THREE.Plane(new THREE.Vector3(1, 0, 0), clipDistance),
            new THREE.Plane(new THREE.Vector3(0, 1, 0), clipDistance),
            new THREE.Plane(new THREE.Vector3(0, 0, 1), clipDistance),
            new THREE.Plane(new THREE.Vector3(-1, 0, 0), clipDistance),
            new THREE.Plane(new THREE.Vector3(0, -1, 0), clipDistance),
            new THREE.Plane(new THREE.Vector3(0, 0, -1), clipDistance),
        ];
    }
    return material;
}

/**
 * The abstract interface for a visualized graph
 */
abstract class Graph {
    name: string;
    material: THREE.Material;
    mesh: THREE.Mesh | THREE.Line | THREE.Object3D;
    //Vector providing camera orientation for rendering optimization
    cameraPosition: THREE.Vector3;
    //For informational use
    color: string;
    dataInterface: Function;
    param: { [p: string]: string };

    protected constructor(name: string) {
        this.name = name;
    }

    /**
     * The visual bounds here specify the ranges on which the functions
     * are evaluated. This is to supplied when the camera gets updated
     */
    bounds = [[-5, 5], [-5, 5], [-5, 5]];

    /**
     * Returns the effective bounds of visualization for this graph
     */
    getBounds(): number[][] {
        return this.bounds;
    }

    /**
     * Called by the graphics module when camera location is updated
     * based on which the inheriting class should update the populate
     * mapping. Also updates the clipping planes
     * @param bounds
     */
    setBounds(bounds: number[][]){
        this.bounds = bounds;
        // this.material.clippingPlanes[0]
        for(let i = 0; i<3;i++){
            this.material.clippingPlanes[i].constant = 1.2*bounds[i][1];
        }
        for(let i = 0; i<3;i++){
            this.material.clippingPlanes[i+3].constant = -1.2*bounds[i][0];
        }
    }

    /**
     * Constructs geometries without populating them
     * @param param parameters specifying the geometry
     */
    abstract constructGeometry(param: { [key: string]: string }): void;

    /**
     * Populates the geometry of this graph
     */
    abstract populate(): void;

    setMaterial(material: THREE.Material) {
        this.material = material;
    }

    queryColor() {
        if (!this.mesh.visible)
            return -1;
        return colors[this.color];
    }

    /**
     * Called by canvas to update rendering orientations
     */
    abstract updateOrientation(): void;

    timeDependent: boolean = true;

    updateTime(): void {
        if (this.timeDependent) {
            this.populate();
            this.update();
        }
    }

    abstract update(): void;

    /**
     * Disposes the THREE mesh and geometries of this, releasing their memory
     */
    abstract dispose(): void;

    generateIndices() {

    }

    hideMesh() {
        this.mesh.visible = false;
    }


    showMesh() {
        this.mesh.visible = true;
    }
}

class CartesianGraph extends Graph {
    geometry: THREE.BufferGeometry;
    mesh: THREE.Mesh;
    //Create vertex overheads >3721*3
    vertices = new Float32Array(36000);
    //Create index overheads >3721*6
    indices: number[] = [];
    dataInterface: (x: number, y: number) => Number;
    uCount = 100;
    vCount = 100;
    protected mapping = (u: number, v: number) => [-5 + v * 10, 5 - u * 10];

    /**
     * @param name name of the graph, needs to be unique
     * @param dataInterface the cartesian function being passed
     */
    constructor(name: string, dataInterface: (x: number, y: number) => Number) {
        super(name);
        this.geometry = new THREE.BufferGeometry();
        this.dataInterface = dataInterface;
    }

    constructGeometry(param: { [key: string]: string } =
                          {'material': "standard", 'color': "blue"}): void {
        this.geometry = new THREE.BufferGeometry();
        this.color = (param['color']) ? param['color'] : 'blue';
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.vertices, 3));
        this.material = createMaterial((param['material']) ? param['material'] : 'standard',
            (param['color']) ? param['color'] : 'blue');
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.name = this.name;
    }

    /**
     * Generate indices for mesh creation
     * @param uCount # of vertices + 1 in the u direction
     * @param vCount # of vertices + 1 in the v direction
     */
    generateIndices(uCount = this.uCount, vCount = this.vCount) {
        this.indices.length = 0;
        /*
         * Upon population, there will be (uCount+1)*(vCount+1) vertices created,
         * namely uCount corresponds to the # of edges in the u direction, and vCount
         * # of edges in v, so that there will be exactly 2*uCount*vCount triangular mesh formed.
         */
        for (let i = 0; i < uCount; i++) {
            for (let j = 0; j < vCount; j++) {
                let a = i * (vCount + 1) + j;
                let b = a + 1;
                let c = b + (vCount + 1);
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

        for (let i = 0; i <= uCount; i++) {
            for (let j = 0; j <= vCount; j++) {
                let u = i / uCount, v = j / uCount;
                let [x, y] = mapping(u, v);
                let k = 3 * (i * (vCount + 1) + j);
                this.vertices[k] = x;
                this.vertices[k + 1] = y;
                this.vertices[k + 2] = +this.dataInterface(x, y);
            }
        }
        this.geometry.attributes.position.needsUpdate = true;
    }

    update(): void {
        this.geometry.computeVertexNormals();
    }

    private orientation = 0;
    private xAxis = new Vector3(1, 0, 0);
    private yAxis = new Vector3(0, 1, 0);
    private holder = new Vector3(0, 0, 0);

    updateOrientation(): void {
        this.holder.x = this.cameraPosition.x;
        this.holder.y = this.cameraPosition.y;
        let xAngle = this.holder.angleTo(this.xAxis);
        let yAngle = this.holder.angleTo(this.yAxis);
        let orientation;
        if (yAngle >= Math.PI * 3 / 4)
            orientation = 0;
        if (yAngle <= Math.PI / 4)
            orientation = 1;
        if (xAngle >= Math.PI * 3 / 4)
            orientation = 2;
        if (xAngle <= Math.PI / 4)
            orientation = 3;
        console.log(orientation);
        if (orientation != this.orientation) {
            let mapping;
            this.orientation = orientation;
            let xi = this.bounds[0][0], xf = this.bounds[0][1],
                yi = this.bounds[1][0], yf = this.bounds[1][1];
            switch (orientation) {
                case 0:
                    mapping = (u: number, v: number) => [xi + v * (xf-xi), yf - u * (yf-yi)];
                    break;
                case 1:
                    mapping = (u: number, v: number) => [xf - v * (xf-xi), yi + u * (yf-yi)];
                    break;
                case 2:
                    mapping = (u: number, v: number) => [xf - u * (xf-xi), yi + v * (yf-yi)];
                    break;
                case 3:
                    mapping = (u: number, v: number) => [xi + u * (xf-xi), yf - v * (yf-yi)];
                    break;
            }
            this.mapping = mapping;
            this.populate(mapping);
            this.update();
        }
    }

    setBounds(bounds: number[][]){
        super.setBounds(bounds);
        let xi = bounds[0][0], xf = bounds[0][1],
            yi = bounds[1][0], yf = bounds[1][1];
        this.mapping = (u,v)=> [xi+(xf-xi)*u, yi+(yf-yi)*v];
    }

    timeDependent: boolean = true;

    dispose() {
        this.geometry.dispose();
        this.material.dispose();
    }
}

/**
 * Accepts asynchronous inputs for functions
 */
class CartesianAsyncGraph extends CartesianGraph{
    asyncInterface: (x: number, y: number)=>Promise<number|Number>;
    /**
     * @param name name of the graph, needs to be unique
     * @param asyncInterface the asynchronous cartesian function being passed
     */
    constructor(name: string,asyncInterface: (x: number, y: number)=>Promise<number|Number>) {
        super(name, undefined);
        this.geometry = new THREE.BufferGeometry();
        this.asyncInterface = asyncInterface;
        this.timeDependent = false;
    }

    /**
     * Time threshold
     */
    threshold = 100;
    timeLeft = 0;
    pending = false;

    /**
     * The amount of time populate can be called per second is limited by a time threshold
     * Upon population, there will be (uCount+1)*(vCount+1) vertices created,
     * namely uCount corresponds to the # of edges in the u direction, and vCount
     * # of edges along v.
     * @param mapping a mapping for the vertex generation, used to serve refined mesh generation
     * @param uCount # of vertices + 1 in the u direction
     * @param vCount # of vertices + 1 in the v direction
     */
    async populate(mapping = this.mapping, uCount = this.uCount, vCount = this.vCount) {
       if(!this.pending){
           this.pending = true;
           let wait = ()=>{
               if(this.timeLeft>0){
                   this.timeLeft--;
                   setTimeout(wait, 1);
               }else{
                   this.timeLeft = this.threshold;
                   console.log("populating, time out in: "+this.timeLeft);
                   this.proxyPopulate(mapping, uCount, vCount);
                   this.pending = false;
               }
           }
           wait();
       }else{
           this.timeLeft = this.threshold;
       }
    }
    proxyPopulate(mapping = this.mapping, uCount = this.uCount, vCount = this.vCount){
        for (let i = 0; i <= uCount; i++) {
            for (let j = 0; j <= vCount; j++) {
                let u = i / uCount, v = j / uCount;
                let [x, y] = mapping(u, v);
                let k = 3 * (i * (vCount + 1) + j);
                this.vertices[k] = x;
                this.vertices[k + 1] = y;
                this.asyncInterface(x,y).then((val)=>{
                    this.vertices[k + 2] = +val;
                    if(i==uCount&&j==vCount){
                        this.geometry.attributes.position.needsUpdate = true;
                        this.update();
                    }
                });
            }
        }
    }
}

class ComplexCartesianGraph extends CartesianGraph {
    geometry: THREE.BufferGeometry;
    mesh: THREE.Mesh;
    //Create vertex overheads >3721*3
    vertices = new Float32Array(36000);
    //Create index overheads >3721*6
    indices: number[] = [];
    dataInterface: (x: number, y: number) => Number;
    uCount = 100;
    vCount = 100;

    /**
     * @param name name of the graph, needs to be unique
     * @param dataInterface the cartesian function being passed
     */
    constructor(name: string, dataInterface: (x: number, y: number) => Number) {
        super(name, dataInterface);
        this.geometry = new THREE.BufferGeometry();
        this.dataInterface = dataInterface;
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

        for (let i = 0; i <= uCount; i++) {
            for (let j = 0; j <= vCount; j++) {
                let u = i / uCount, v = j / uCount;
                let [x, y] = mapping(u, v);
                let k = 3 * (i * (vCount + 1) + j);
                this.vertices[k] = x;
                let val = this.dataInterface(x, y);
                this.vertices[k + 1] = y+((val instanceof Quantity)?+val.data[1]:0);
                this.vertices[k + 2] = (val instanceof Quantity)?+val.data[0]:+val;
            }
        }
        this.geometry.attributes.position.needsUpdate = true;
    }
}

class CartesianGraph2D extends Graph {
    geometry: THREE.BufferGeometry;
    mesh: THREE.Line;
    //Create vertex overheads >3721*3
    vertices: THREE.Vector3[] = [];
    //Create index overheads >3721*6
    indices: number[] = [];
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

    constructGeometry(param: { [key: string]: string } =
                          {'material': "standard", 'color': "blue"}): void {
        this.geometry = new THREE.BufferGeometry();
        this.material = createMaterial('line',
            (param['color']) ? param['color'] : 'blue');
        this.mesh = new THREE.Line(this.geometry, this.material);
        this.mesh.name = this.name;
    }

    /**
     * Generate indices for mesh creation
     * @param uCount # of vertices + 1 in the u direction
     * @param vCount # of vertices + 1 in the v direction
     */
    generateIndices(uCount = this.uCount, vCount = this.vCount) {
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
    populate(mapping = (u: number) => [-5 + u * 10], uCount = this.uCount, vCount = this.vCount): void {

        for (let i = 0; i <= uCount; i++) {
            let u = i / uCount;
            let [x] = mapping(u);
            this.vertices[i] = new THREE.Vector3(x, this.dataInterface(x), 0);
        }
        this.geometry.setFromPoints(this.vertices);
        this.geometry.attributes.position.needsUpdate = true;
    }

    update(): void {
        this.geometry.computeVertexNormals();
    }

    dispose() {
        this.geometry.dispose();
        this.material.dispose();
    }

    updateOrientation(): void {
    }
}

class VecField3D extends Graph {
    trace = true;
    vecFunc: (...baseVec: number[]) => number[];
    style: { [p: string]: (length: number) => number } = {};
    vector3Ds: Vector3D[] = [];
    traces: LineTrace[] = [];
    traceMesh: Group;
    /**
     *
     * @param name
     * @param vector
     * @param style
     *  r0: maps from vector length to tail radius
     *  r1: maps from vector length to head radius
     *  h0: maps from vector length to tail height
     *  h1: maps from vector length to head height
     */
    constructor(name: string, vector: (...baseVec: number[]) => number[], style: { [p: string]: (length: number) => number } = {}) {
        super(name);
        this.vecFunc = vector;
        this.timeDependent = true;
    }

    fieldMesh: Group;

    constructGeometry(param: { [p: string]: string }): void {
        this.color = param['color'];
        let vs = [];
        let vectors = this.vector3Ds;
        let func = (t: number) => {
            return -5 + 10 * t;
        };

        for(let x0 = -5; x0<=5; x0+=1.25){
            for(let y0 = -5; y0<=5; y0+=1.25) {
                for (let z0 = -5; z0 <= 5; z0 +=1.25) {
                    let v0 = [x0, y0, z0];
                    this.traces.push(new LineTrace(v0.toString(), this.vecFunc, v0));
                }
            }
        }
        for (let i = 0; i < 1; i += 0.1) {
            for (let j = 0; j < 1; j += 0.1) {
                for (let k = 0; k < 1; k += 0.1) {
                    vs.push([func(i), func(j), func(k)]);
                }
            }
        }

        this.mesh = new THREE.Group();
        this.fieldMesh = new THREE.Group();
        this.traceMesh = new THREE.Group();
        for(let trace of this.traces){
            trace.constructGeometry(param);
            trace.generateIndices();
            this.traceMesh.add(trace.mesh);
        }
        for (let v of vs) {
            let vec3d = new Vector3D(v.toString(), this.vecFunc,
                () => v);
            vectors.push(vec3d);
            vec3d.constructGeometry(param);
            this.fieldMesh.add(vec3d.mesh);
        }
        this.traceMesh.visible = this.trace;
        this.fieldMesh.visible = !this.trace;
        this.mesh.add(this.traceMesh);
        this.mesh.add(this.fieldMesh);
    }

    dispose(): void {
    }

    toggleTrace(){
        this.trace = !this.trace;
        this.traceMesh.visible = this.trace;
        this.fieldMesh.visible = !this.trace;
        this.populate();
    }

    populate(): void {
        if(this.trace){
            for (let trace of this.traces) {
                trace.populate();
            }
        }else{
            for (let vector3D of this.vector3Ds) {
                vector3D.populate();
            }
        }
    }

    update(): void {
    }

    updateOrientation(): void {
    }

    updateVecFunc(vecFunc: (...baseVec: number[]) => number[]) {
        this.vecFunc = vecFunc;
        for (let vector3d of this.vector3Ds) {
            vector3d.vector = this.vecFunc;
        }
        for(let trace of this.traces){
            trace.dataInterface = this.vecFunc;
        }
    }
}

class Vector3D extends Graph {
    cCount = 10;
    vector: (...baseVec: number[]) => number[];
    baseVec: () => number[];
    rv: Vector3;
    bv: Vector3;
    cone: ConeGeometry;
    coneMesh: Mesh;
    ring: BufferGeometry;
    cylinder: CylinderGeometry;
    cylinderMesh: Mesh;
    base: BufferGeometry;
    buffer: Float32Array = new Float32Array(303);
    thetaStart = 0;

    r0: (length: number) => number = () => 0.01;
    r1: (length: number) => number = () => 0.07
    h0: (length: number) => number = (length) => 0.75;
    h1: (length: number) => number = (length) => 0.25;
    indices: number[] = [];

    /**
     *
     * @param name
     * @param vector
     * @param base
     *  r0: maps from vector length to tail radius
     *  r1: maps from vector length to head radius
     *  h0: maps from vector length to tail height
     *  h1: maps from vector length to head height
     */
    constructor(name: string, vector: (...baseVec: number[]) => number[], base: () => number[]) {
        super(name);
        this.vector = vector;
        this.baseVec = base;
        this.rv = new THREE.Vector3();
        this.timeDependent = true;
    }

    /**
     * @param param
     *  color: string valued specification of mesh color
     *  material: string valued specification of mesh material
     * @param style
     */
    constructGeometry(param: { [p: string]: string }, style: { [p: string]: (length: number) => number } = {}): void {
        // this.cone = new BufferGeometry();
        // this.cone.setAttribute( 'position', new THREE.BufferAttribute( this.buffer, 3 ) );
        // this.ring = new BufferGeometry();
        // this.ring.setAttribute( 'position', new THREE.BufferAttribute( this.buffer, 3 ) );
        // this.cylinder = new BufferGeometry();
        // this.cylinder.setAttribute( 'position', new THREE.BufferAttribute( this.buffer, 3 ) );
        // this.base = new BufferGeometry();
        // this.base.setAttribute( 'position', new THREE.BufferAttribute( this.buffer, 3 ) );
        this.color = param['color'];
        let l = 1;
        let r0 = this.r0(l);
        let r1 = this.r1(l);
        let h0 = this.h0(l);
        let h1 = this.h1(l);
        this.cone = new ConeGeometry(r1, h1, 20, 3);
        this.cone.translate(0, h0 + h1 / 2, 0);
        this.cylinder = new CylinderGeometry(r0, r0, h0, 20, 3);
        this.cylinder.translate(0, h0 / 2, 0);
        this.material = createMaterial('light',
            (param['color']) ? param['color'] : 'blue', false);
        this.coneMesh = new THREE.Mesh(this.cone, this.material);
        this.coneMesh.setRotationFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
        // let ringMesh = new THREE.Mesh(this.ring, this.material);
        this.cylinderMesh = new THREE.Mesh(this.cylinder, this.material);
        this.cylinderMesh.setRotationFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
        // let baseMesh = new THREE.Mesh(this.base, this.material);
        this.mesh = new THREE.Group();
        this.mesh.add(this.coneMesh);
        this.coneMesh.renderOrder = 0;
        // this.mesh.add(ringMesh);
        // ringMesh.renderOrder=2;
        this.mesh.add(this.cylinderMesh);
        this.cylinderMesh.renderOrder = -1;
        // this.mesh.add(baseMesh);
        // baseMesh.renderOrder=0;
        this.bv = this.mesh.position;
        this.cone.computeVertexNormals();
        this.cylinder.computeVertexNormals();
    }

    /**
     * Populate the relevant geometries into the vertex
     * buffer
     */
    populate(): void {
        let baseVec = this.baseVec();
        this.bv.fromArray(baseVec);
        this.rv.fromArray(this.vector(...baseVec));
        // this.populateRing(0, this.cCount, r0, 0);
        // this.populateRing(3*this.cCount, this.cCount, r0, h0);
        // this.populateRing(6*this.cCount, this.cCount, r1, h0);
        // this.populateRing(9*this.cCount, this.cCount, 0, h0+h1);
        // this.populateRing(12*this.cCount, 1, 0, 0);
        this.transform();
        // this.cone.attributes.position.needsUpdate = true;
        // this.ring.attributes.position.needsUpdate = true;
        // this.cylinder.attributes.position.needsUpdate = true;
        // this.base.attributes.position.needsUpdate = true;
    }

    transform() {
        let length = Math.log(1+Math.abs(this.rv.length()));
        this.cylinderMesh.scale.set(length, length, length);
        this.coneMesh.scale.set(length, length, length);
        //@ts-ignore
        this.cylinderMesh.material.color.setHex(this.get3PhaseColor(Math.atan(this.rv.length())) * 2);
        //@ts-ignore
        this.coneMesh.material.color.setHex(this.get3PhaseColor(Math.atan(this.rv.length())) * 2);
        this.mesh.lookAt(this.rv.add(this.bv));
    }

    get3PhaseColor(angle: number) {
        let p1 = (Math.cos(angle) + 1) / 2;
        let p2 = (Math.cos(angle + Math.PI * 2 / 3) + 1) / 2;
        let p3 = (Math.cos(angle + Math.PI / 3 * 4) + 1) / 2;
        let b1 = 0xff * p1;
        let b2 = 0xff * p2;
        let b3 = 0xff * p3;
        return (b1 << 16) + (b2 << 8) + b3;
    }

    populateRing(startIndex: number, size: number, r: number, h: number,
                 theta0 = this.thetaStart): void {
        for (let i = 0; i < size; i++) {
            let theta = theta0 + Math.PI * 2 * i / size;
            this.buffer[startIndex + 3 * i] = r * Math.cos(theta);
            this.buffer[startIndex + 3 * i + 1] = r * Math.sin(theta);
            this.buffer[startIndex + 3 * i + 2] = h;
        }
    }

    dispose(): void {
        this.material.dispose();
    }

    generateIndices() {
        // let coneIndices = [];
        // let c = this.cCount;
        // for(let i = 0; i<c; i++){
        //     coneIndices.push(i+2*c, (i+1)%c+2*c, i+3*c);
        // }
        // this.cone.setIndex(coneIndices);
        // let ringIndices = [];
        // for(let i = 0; i<c; i++){
        //     ringIndices.push(i+c, (i+1)%c+c, i+2*c);
        //     ringIndices.push((i+1)%c+c, (i+1)%c+2*c, i+2*c);
        // }
        // this.ring.setIndex(ringIndices);
        // let cylinderIndices = [];
        // for(let i = 0; i<c; i++){
        //     cylinderIndices.push(i, (i+1)%c, i+c);
        //     cylinderIndices.push((i+1)%c, (i+1)%c+c, i+c);
        // }
        // this.cylinder.setIndex(cylinderIndices);
        // let baseIndices = [];
        // for(let i = 0; i<c; i++){
        //     baseIndices.push(i, (i+1)%c, 4*c);
        // }
        // this.base.setIndex(baseIndices);
    }

    update(): void {
        // this.cone.computeVertexNormals();
        // this.ring.computeVertexNormals();
        // this.cylinder.computeVertexNormals();
        // this.base.computeVertexNormals();
    }

    /**
     * Compute theta start and repopulate, invert the camera position
     * into the arrow frame, and rotate the arrow accordingly
     */
    updateOrientation(): void {
        // let inverse = this.mesh.matrix.clone().invert();
        // let camera = this.cameraPosition.clone().transformDirection(inverse);
        // let x = camera.x;
        // let y = camera.y;
        // this.thetaStart = Math.PI/2+((x<=0)?Math.PI:0)+((x!=0)?Math.atan(y/x):Math.PI/2);
        this.populate();
    }
}

class ParametricSurface extends Graph {
    geometry: THREE.BufferGeometry;
    mesh: THREE.Mesh;
    //Create vertex overheads >3721*3
    vertices = new Float32Array(36000);
    //Create index overheads >3721*6
    indices: number[] = [];
    dataInterface: (x: number, y: number) => number[];
    uCount = 100;
    vCount = 100;

    /**
     * @param name name of the graph, needs to be unique
     * @param dataInterface the cartesian function being passed
     */
    constructor(name: string, dataInterface: (x: number, y: number) => number[]) {
        super(name);
        this.geometry = new THREE.BufferGeometry();
        this.dataInterface = dataInterface;
    }

    constructGeometry(param: { [key: string]: string } =
                          {'material': "standard", 'color': "blue"}): void {
        this.geometry = new THREE.BufferGeometry();
        this.color = (param['color']) ? param['color'] : 'blue';
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.vertices, 3));
        this.material = createMaterial((param['material']) ? param['material'] : 'standard',
            (param['color']) ? param['color'] : 'blue');
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.name = this.name;
    }

    /**
     * Generate indices for mesh creation
     * @param uCount # of vertices + 1 in the u direction
     * @param vCount # of vertices + 1 in the v direction
     */
    generateIndices(uCount = this.uCount, vCount = this.vCount) {
        this.indices.length = 0;
        /*
         * Upon population, there will be (uCount+1)*(vCount+1) vertices created,
         * namely uCount corresponds to the # of edges in the u direction, and vCount
         * # of edges in v, so that there will be exactly 2*uCount*vCount triangular mesh formed.
         */
        for (let i = 0; i < uCount; i++) {
            for (let j = 0; j < vCount; j++) {
                let a = i * (vCount + 1) + j;
                let b = a + 1;
                let c = b + (vCount + 1);
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
     * @param uCount # of vertices + 1 in the u direction
     * @param vCount # of vertices + 1 in the v direction
     */
    populate(uCount = this.uCount, vCount = this.vCount): void {
        for (let i = 0; i <= uCount; i++) {
            for (let j = 0; j <= vCount; j++) {
                let u = i / uCount, v = j / uCount;
                let k = 3 * (i * (vCount + 1) + j);
                let vertex = this.dataInterface(u, v);
                this.vertices[k] = vertex[0];
                this.vertices[k + 1] = vertex[1];
                this.vertices[k + 2] = vertex[2];
            }
        }
        this.geometry.attributes.position.needsUpdate = true;
    }

    update(): void {
        this.geometry.computeVertexNormals();
    }

    updateOrientation(): void {
    }

    timeDependent: boolean = true;

    dispose() {
        this.geometry.dispose();
        this.material.dispose();
    }
}

class ParametricLine extends Graph {
    geometry: LineGeometry;
    mesh: Line2;
    //Create vertex overheads >3721*3
    positions: number[] = [];
    //Create index overheads >3721*6
    indices: number[] = [];
    dataInterface: (x: number) => Number[];
    uCount = 1000;
    vCount = 1000;

    /**
     * @param name name of the graph, needs to be unique
     * @param dataInterface the cartesian function being passed
     */
    constructor(name: string, dataInterface: (x: number) => Number[], uCount = 1000) {
        super(name);
        this.dataInterface = dataInterface;
        this.uCount = uCount;
    }

    constructGeometry(param: { [key: string]: string } =
                          {'material': "standard", 'color': "blue"}): void {
        this.geometry = new LineGeometry();
        this.material = createMaterial('line2',
            (param['color']) ? param['color'] : 'blue');
        this.mesh = new Line2(this.geometry, <LineMaterial> this.material);
        this.mesh.name = this.name;
    }

    /**
     * Generate indices for mesh creation
     * @param uCount # of vertices + 1 in the u direction
     * @param vCount # of vertices + 1 in the v direction
     */
    generateIndices(uCount = this.uCount, vCount = this.vCount) {
        // this.indices.length = 0;
        // /*
        //  * Upon population, there will be (uCount+1)*(vCount+1) vertices created,
        //  * namely uCount corresponds to the # of edges in the u direction, and vCount
        //  * # of edges in v, so that there will be exactly 2*uCount*vCount triangular mesh formed.
        //  */
        // for (let i = 0; i < uCount; i++) {
        //     this.indices.push(i, i + 1);
        // }
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
    populate(mapping = (u: number) => u, uCount = this.uCount, vCount = this.vCount): void {
        this.positions.length = 0
        for (let i = 0; i <= uCount; i++) {
            let u = i / uCount;
            let x = mapping(u);
            let vec = this.dataInterface(x);
            this.positions.push(+vec[0], +vec[1], (vec.length>2)?+vec[2]:0);
        }
        this.geometry.setPositions(this.positions);
        // console.log(this.positions);
    }

    update(): void {
        console.log("line distances computed");
        this.mesh.computeLineDistances();
        this.mesh.scale.set( 1, 1, 1 );
    }

    dispose() {
        this.geometry.dispose();
        this.material.dispose();
    }

    updateOrientation(): void {
    }
}

class Tracer {
    t0: number;
    v0: Vector3;
    dv: Vector3 = new Vector3();

    trace(t: number, v0: Vector3, dv: (...v: number[]) => number[]) {
        if (this.t0 == undefined) {
            this.t0 = t;
            this.v0 = v0;
            return this.v0;
        }
        this.dv.fromArray(dv(v0.x, v0.y, v0.z));
        this.v0.add(this.dv.multiplyScalar(t - this.t0));
        this.t0 = t;
        return this.v0;
    }
}

class LineTrace extends Graph {
    geometry: THREE.BufferGeometry;
    mesh: THREE.Line;
    //Create vertex overheads >3721*3
    vertices: THREE.Vector3[] = [];
    //Create index overheads >3721*6
    indices: number[] = [];
    dataInterface: (...baseVec: number[]) => number[];
    vecDataInterface: (t:number, n:Vec[])=>Vec;
    uCount = 250;
    vCount = 1000;
    v0: number[];

    /**
     * @param name name of the graph, needs to be unique
     * @param dataInterface the cartesian function being passed
     * @param v0
     * @param uCount
     */
    constructor(name: string, dataInterface: (...baseVec: number[]) => number[], v0: number[], uCount = 100) {
        super(name);
        this.geometry = new THREE.BufferGeometry();
        this.dataInterface = dataInterface;
        const holder = new Vec();
        this.vecDataInterface = (t,n)=>{
            holder.components = this.dataInterface(...n[0].components);
            return holder;
        };
        this.uCount = uCount;
        this.v0 = v0;
    }

    constructGeometry(param: { [key: string]: string } =
                          {'material': "opaque", 'color': "blue"}): void {
        this.geometry = new THREE.BufferGeometry();
        this.material = createMaterial('line',
            (param['color']) ? param['color'] : 'blue');
        this.mesh = new THREE.Line(this.geometry, this.material);
        this.mesh.name = this.name;
    }

    /**
     * Generate indices for mesh creation
     * @param uCount # of vertices + 1 in the u direction
     * @param vCount # of vertices + 1 in the v direction
     */
    generateIndices(uCount = this.uCount, vCount = this.vCount) {
        this.indices.length = 0;
        // /*
        //  * Upon population, there will be (uCount+1)*(vCount+1) vertices created,
        //  * namely uCount corresponds to the # of edges in the u direction, and vCount
        //  * # of edges in v, so that there will be exactly 2*uCount*vCount triangular mesh formed.
        //  */
        for (let i = 0; i <= uCount*2+1; i++) {
            this.indices.push(i, i + 1);
        }
    }

    /**
     *
     * Upon population, there will be (uCount+1)*(vCount+1) vertices created,
     * namely uCount corresponds to the # of edges in the u direction, and vCount
     * # of edges along v.
     * @param uCount # of vertices + 1 in the u direction
     * @param dt
     */
    populate(uCount = this.uCount, dt = 0.01): void {
        this.vertices.length=0
        let trace = [...this.v0];
        for (let i = 0; i <= uCount; i++) {
            this.step(trace, -dt);
            this.vertices.splice(0,0,new THREE.Vector3(...trace));
        }
        trace = [...this.v0];
        this.vertices.push(new THREE.Vector3(...trace));
        for (let i = 0; i <= uCount; i++) {
            this.step(trace,dt);
            this.vertices.push(new THREE.Vector3(...trace));
        }
        this.geometry.setFromPoints(this.vertices);
        this.geometry.attributes.position.needsUpdate = true;
    }

    step(trace: number[], dt: number){
        let k1 = this.dataInterface(...trace);
        let k2 = this.k2(dt, trace, k1);
        let k3 = this.k3(dt, trace, k2);
        let k4 = this.k4(dt, trace, k3);
        for(let j = 0; j<3; j++){
            trace[j] += dt*(k1[j]+2*k2[j]+2*k3[j]+k4[j])/6;
        }
    }
    traceHolder = new Array(3);
    k2(dt: number, trace0: number[], k1: number[]) {
        for(let j = 0; j<3; j++){
            this.traceHolder[j]=k1[j]*dt/2+trace0[j];
        }
        return this.dataInterface(...this.traceHolder);
    }
    k3(dt: number, trace0: number[], k2: number[]) {
        for(let j = 0; j<3; j++){
            this.traceHolder[j]=k2[j]*dt/2+trace0[j];
        }
        return this.dataInterface(...this.traceHolder);
    }
    k4(dt: number, trace0: number[], k3: number[]) {
        for(let j = 0; j<3; j++){
            this.traceHolder[j]=k3[j]*dt+trace0[j];
        }
        return this.dataInterface(...this.traceHolder);
    }

    update(): void {
        this.geometry.computeVertexNormals();
    }

    dispose() {
        this.geometry.dispose();
        this.material.dispose();
    }

    updateOrientation(): void {
    }
}

abstract class GroupGraph extends Graph {
    abstract updateGroupSize(evalHandle: Evaluable): void;
}

/**
 * Holds a group of graphs and operates on them simultaneously,
 * loads from an evaluation handle and applies graph types
 * based on the output of the first dimension
 */
class CartesianGroup extends GroupGraph {
    subGraphs: CartesianGraph[];
    uCount = 100;
    vCount = 100;
    dataInterface: (x: number, y: number) => Number[];
    private mapping = (u: number, v: number) => [-5 + v * 10, 5 - u * 10];

    constructor(name: string, evalHandle: Evaluable,
                dataInterface: Function) {
        super(name);
        this.subGraphs = [];
        for (let i = 0; i < evalHandle.subEvaluables.length; i++) {
            this.subGraphs[i] = new CartesianGraph(name + ":" + i, undefined);
        }
        this.dataInterface = <(x: number, y: number) => Number[]>dataInterface;
    }

    constructGeometry(param: { [p: string]: string }): void {
        this.param = param;
        this.mesh = new Group();
        for (let subGraph of this.subGraphs) {
            subGraph.constructGeometry(param);
            subGraph.generateIndices(this.uCount, this.vCount);
            this.mesh.add(subGraph.mesh);
        }
    }

    dispose(): void {
    }

    populate(mapping = this.mapping, uCount = this.uCount,
             vCount = this.vCount): void {
        for (let i = 0; i <= uCount; i++) {
            for (let j = 0; j <= vCount; j++) {
                let u = i / uCount, v = j / uCount;
                let [x, y] = mapping(u, v);
                let k = 3 * (i * (vCount + 1) + j);
                let g = this.dataInterface(x, y);
                for (let q = 0; q < this.subGraphs.length; q++) {
                    let graph = this.subGraphs[q];
                    graph.vertices[k] = x;
                    graph.vertices[k + 1] = y;
                    graph.vertices[k + 2] = g[q].valueOf();
                }
            }
        }
        for (let graph of this.subGraphs) {
            graph.geometry.attributes.position.needsUpdate = true;
        }
    }

    update(): void {
        for (let graph of this.subGraphs)
            graph.update();
    }

    updateOrientation(): void {
    }

    updateGroupSize(evalHandle: Evaluable): void {
        console.log(evalHandle);
        console.log("sub graph counts: " + this.subGraphs.length);
        console.log("sub evaluable counts: " + evalHandle.subEvaluables.length);
        console.log(this.subGraphs);
        while (evalHandle.subEvaluables.length < this.subGraphs.length) {
            let graph = this.subGraphs.pop();
            this.mesh.remove(graph.mesh);
            graph.dispose();
            // this.subGraphs[this.subGraphs.length-1].mesh.visible = false;
        }
        for (let i = this.subGraphs.length; i < evalHandle.subEvaluables.length; i++) {
            let subGraph = new CartesianGraph(this.name + "i", undefined);
            subGraph.constructGeometry(this.param);
            subGraph.generateIndices(this.uCount, this.vCount);
            this.mesh.add(subGraph.mesh);
            this.subGraphs[i] = subGraph;
        }
    }

    setBounds(bounds: number[][]){
        super.setBounds(bounds);
        for(let graph of this.subGraphs){
            graph.setBounds(bounds);
        }
    }
}

class Vector3DGroup extends GroupGraph {
    subGraphs: Vector3D[];
    dataInterface: () => Number[];

    constructor(name: string, evalHandle: Evaluable,
                dataInterface: Function) {
        super(name);
        this.subGraphs = [];
        for (let i = 0; i < evalHandle.subEvaluables.length; i++) {
            this.subGraphs[i] = new Vector3D(name + ":" + i, undefined, () => [0, 0, 0]);
        }
        this.dataInterface = <() => Number[]>dataInterface;
    }

    constructGeometry(param: { [p: string]: string }): void {
        this.mesh = new THREE.Group();
        this.param = param;
        for (let subGraph of this.subGraphs) {
            subGraph.constructGeometry(param);
            this.mesh.add(subGraph.mesh);
        }
    }

    dispose(): void {
    }

    populate(): void {
        let g = this.dataInterface();
        for (let i = 0; i < g.length; i++) {
            let subGraph = this.subGraphs[i];
            let baseVec = subGraph.baseVec();
            subGraph.bv.fromArray(baseVec);
            let vector = (<Quantity>g[i]).data;
            while (vector.length < 3)
                vector.push(0);
            subGraph.rv.fromArray(<number[]>vector);
            // subGraph.populateRing(0, subGraph.cCount, r0, 0);
            // subGraph.populateRing(3*subGraph.cCount, subGraph.cCount, r0, h0);
            // subGraph.populateRing(6*subGraph.cCount, subGraph.cCount, r1, h0);
            // subGraph.populateRing(9*subGraph.cCount, subGraph.cCount, 0, h0+h1);
            // subGraph.populateRing(12*subGraph.cCount, 1, 0, 0);
            subGraph.transform()
        }
    }

    update(): void {
        for (let graph of this.subGraphs)
            graph.update();
    }

    updateGroupSize(evalHandle: Evaluable): void {
        console.log(evalHandle);
        console.log("sub graph counts: " + this.subGraphs.length);
        console.log("sub evaluable counts: " + evalHandle.subEvaluables.length);
        console.log(this.subGraphs);
        while (evalHandle.subEvaluables.length < this.subGraphs.length) {
            let graph = this.subGraphs.pop();
            this.mesh.remove(graph.mesh);
            graph.dispose();
            // this.subGraphs[this.subGraphs.length-1].mesh.visible = false;
        }
        for (let i = this.subGraphs.length; i < evalHandle.subEvaluables.length; i++) {
            let subGraph = new Vector3D(this.name + ":" + i, undefined, () => [0, 0, 0]);
            subGraph.constructGeometry(this.param);
            this.mesh.add(subGraph.mesh);
            this.subGraphs[i] = subGraph;
        }
    }

    updateOrientation(): void {
    }
}

class ParametricGroup extends GroupGraph {
    subGraphs: ParametricSurface[];
    uCount = 100;
    vCount = 100;
    dataInterface: (x: number, y: number) => Number[];

    constructor(name: string, evalHandle: Evaluable,
                dataInterface: Function) {
        super(name);
        this.subGraphs = [];
        for (let i = 0; i < evalHandle.subEvaluables.length; i++) {
            this.subGraphs[i] = new ParametricSurface(name + ":" + i, undefined);
        }
        this.dataInterface = <(x: number, y: number) => Number[]>dataInterface;
    }

    constructGeometry(param: { [p: string]: string }): void {
        this.param = param;
        this.mesh = new Group();
        for (let subGraph of this.subGraphs) {
            subGraph.constructGeometry(param);
            subGraph.generateIndices(this.uCount, this.vCount);
            this.mesh.add(subGraph.mesh);
        }
    }

    dispose(): void {
    }

    populate(uCount = this.uCount,
             vCount = this.vCount): void {
        for (let i = 0; i <= uCount; i++) {
            for (let j = 0; j <= vCount; j++) {
                let u = i / uCount, v = j / uCount;
                let k = 3 * (i * (vCount + 1) + j);
                let g = this.dataInterface(u, v);
                for (let q = 0; q < this.subGraphs.length; q++) {
                    let graph = this.subGraphs[q];
                    let vertex = (<Quantity>g[q]).data;
                    while(vertex.length<3)
                        vertex.push(0);
                    graph.vertices[k] = +vertex[0];
                    graph.vertices[k + 1] = +vertex[1];
                    graph.vertices[k + 2] = +vertex[2];
                }
            }
        }
        for (let graph of this.subGraphs) {
            graph.geometry.attributes.position.needsUpdate = true;
        }
    }

    update(): void {
        for (let graph of this.subGraphs)
            graph.update();
    }

    updateOrientation(): void {
    }

    updateGroupSize(evalHandle: Evaluable): void {
        console.log(evalHandle);
        console.log("sub graph counts: " + this.subGraphs.length);
        console.log("sub evaluable counts: " + evalHandle.subEvaluables.length);
        console.log(this.subGraphs);
        while (evalHandle.subEvaluables.length < this.subGraphs.length) {
            let graph = this.subGraphs.pop();
            this.mesh.remove(graph.mesh);
            graph.dispose();
            // this.subGraphs[this.subGraphs.length-1].mesh.visible = false;
        }
        for (let i = this.subGraphs.length; i < evalHandle.subEvaluables.length; i++) {
            let subGraph = new ParametricSurface(this.name + "i", undefined);
            subGraph.constructGeometry(this.param);
            subGraph.generateIndices(this.uCount, this.vCount);
            this.mesh.add(subGraph.mesh);
            this.subGraphs[i] = subGraph;
        }
    }
}

export {
    Graph, GroupGraph, CartesianGraph, CartesianAsyncGraph, CartesianGraph2D, CartesianGroup, Vector3D, Vector3DGroup, VecField3D,
    ParametricSurface, ParametricGroup, ParametricLine, ComplexCartesianGraph, colors, loadRenderer
};