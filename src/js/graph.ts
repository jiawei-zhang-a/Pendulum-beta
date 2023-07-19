import * as THREE from "three";
import {
    BufferGeometry,
    ConeGeometry,
    CylinderGeometry, Group, Mesh,
    Vector3
} from "three";
import {Vec} from "./diffEqn";
import {L, Q} from "./core";
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
    red: 0xd82c5d,
    mint: 0x2effc7,
    lightgray: 0xf3f3f3,
    air: 0xf0f8ff,
    steelBlue: 0x4377bf,
    yellow: 0xeeee22,
    aliceblue: 0xa0a8ff
};

function cm(type: string, color: string, fog=false, clipOverflow = true, clipDistance = 6) {
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
                opacity: 0.8,
                linewidth: 0.9
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
    material.fog = fog;
    return material;
}

/**
 * Graph
 * The abstract interface for a visualized graph
 */
abstract class G {
    //name
    n: string;
    //material
    m: THREE.Material;
    //mesh
    s: THREE.Mesh | THREE.Line | THREE.Object3D;
    //cameraPosition
    //Vector providing camera orientation for rendering optimization
    p: THREE.Vector3;
    //For informational use
    //color
    c: string;
    //dataInterface
    d: Function;
    //param
    a: { [p: string]: string };

    protected constructor(name: string) {
        this.n = name;
    }

    /**
     * bounds
     * The visual bounds here specify the ranges on which the functions
     * are evaluated. This is to supplied when the camera gets updated
     */
    b = [[-5, 5], [-5, 5], [-5, 5]];

    /**
     * getBounds
     * Returns the effective bounds of visualization for this graph
     */
    gb(): number[][] {
        return this.b;
    }

    /**
     * setBounds
     * Called by the graphics module when camera location is updated
     * based on which the inheriting class should update the populate
     * mapping. Also updates the clipping planes
     * @param bounds
     */
    sb(bounds: number[][]){
        this.b = bounds;
        // this.material.clippingPlanes[0]
        for(let i = 0; i<3;i++){
            this.m.clippingPlanes[i].constant = 1.2*bounds[i][1];
        }
        for(let i = 0; i<3;i++){
            this.m.clippingPlanes[i+3].constant = -1.2*bounds[i][0];
        }
    }

    /**
     * constructGeometry
     * Constructs geometries without populating them
     * @param param parameters specifying the geometry
     */
    abstract cg(param: { [key: string]: string }): void;

    /**
     * populate
     * Populates the geometry of this graph
     */
    abstract pu(): void;
    //setMaterial
    sm(material: THREE.Material) {
        this.m = material;
    }

    //queryColor
    qc() {
        if (!this.s.visible)
            return -1;
        return colors[this.c];
    }

    /**
     * updateOrientation
     * Called by canvas to update rendering orientations
     */
    abstract uo(): void;

    //timeDependent
    td: boolean = true;

    //updateTIme
    ut(): void {
        if (this.td) {
            this.pu();
            this.u();
        }
    }

    //update
    abstract u(): void;

    /**
     * dispose
     * Disposes the THREE mesh and geometries of this, releasing their memory
     */
    abstract di(): void;

    //generateIndices
    gi() {

    }
    //hideMesh
    hm() {
        this.s.visible = false;
    }
    //showMesh
    ss() {
        this.s.visible = true;
    }
}

//CartesianGraph
class CG extends G {
    //geometry
    g: THREE.BufferGeometry;
    s: THREE.Mesh;
    //vertices
    //Create vertex overheads >3721*3
    v = new Float32Array(36000);
    //indices
    //Create index overheads >3721*6
    i: number[] = [];
    //dataInterface
    d: (x: number, y: number) => Number;
    //uCount
    uc = 100;
    //vCount
    vc = 100;
    //mapping
    protected mp = (u: number, v: number) => [-5 + v * 10, 5 - u * 10];

    /**
     * @param name name of the graph, needs to be unique
     * @param dataInterface the cartesian function being passed
     */
    constructor(name: string, dataInterface: (x: number, y: number) => Number) {
        super(name);
        this.g = new THREE.BufferGeometry();
        this.d = dataInterface;
    }

    cg(param: { [key: string]: string } =
           {'material': "standard", 'color': "blue"}): void {
        this.g = new THREE.BufferGeometry();
        this.c = (param['color']) ? param['color'] : 'blue';
        this.g.setAttribute('position', new THREE.BufferAttribute(this.v, 3));
        this.m = cm((param['material']) ? param['material'] : 'standard',
            (param['color']) ? param['color'] : 'blue');
        this.s = new THREE.Mesh(this.g, this.m);
        this.s.name = this.n;
    }

    /**
     * generateIndices
     * Generate indices for mesh creation
     * @param uCount # of vertices + 1 in the u direction
     * @param vCount # of vertices + 1 in the v direction
     */
    gi(uCount = this.uc, vCount = this.vc) {
        this.i.length = 0;
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
                this.i.push(a, b, c);
                this.i.push(c, d, a);
            }
        }
        this.g.setIndex(this.i);
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
    pu(mapping = this.mp, uCount = this.uc, vCount = this.vc): void {

        for (let i = 0; i <= uCount; i++) {
            for (let j = 0; j <= vCount; j++) {
                let u = i / uCount, v = j / uCount;
                let [x, y] = mapping(u, v);
                let k = 3 * (i * (vCount + 1) + j);
                this.v[k] = x;
                this.v[k + 1] = y;
                this.v[k + 2] = +this.d(x, y);
            }
        }
        this.g.attributes.position.needsUpdate = true;
    }

    u(): void {
        this.g.computeVertexNormals();
    }

    private orientation = 0;
    private xAxis = new Vector3(1, 0, 0);
    private yAxis = new Vector3(0, 1, 0);
    private holder = new Vector3(0, 0, 0);

    uo(): void {
        this.holder.x = this.p.x;
        this.holder.y = this.p.y;
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
        //console.log(orientation);
        if (orientation != this.orientation) {
            let mapping;
            this.orientation = orientation;
            let xi = this.b[0][0], xf = this.b[0][1],
                yi = this.b[1][0], yf = this.b[1][1];
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
            this.mp = mapping;
            this.pu(mapping);
            this.u();
        }
    }

    sb(bounds: number[][]){
        super.sb(bounds);
        let xi = bounds[0][0], xf = bounds[0][1],
            yi = bounds[1][0], yf = bounds[1][1];
        this.mp = (u, v)=> [xi+(xf-xi)*u, yi+(yf-yi)*v];
    }

    td: boolean = true;

    di() {
        this.g.dispose();
        this.m.dispose();
    }
}

/**
 * CartesianAsynchronousGraph
 * Accepts asynchronous inputs for functions
 */
class CAG extends CG{
    asyncInterface: (x: number, y: number)=>Promise<number|Number>;
    /**
     * @param name name of the graph, needs to be unique
     * @param asyncInterface the asynchronous cartesian function being passed
     */
    constructor(name: string,asyncInterface: (x: number, y: number)=>Promise<number|Number>) {
        super(name, undefined);
        this.g = new THREE.BufferGeometry();
        this.asyncInterface = asyncInterface;
        this.td = false;
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
    async pu(mapping = this.mp, uCount = this.uc, vCount = this.vc) {
        if(!this.pending){
            this.pending = true;
            let wait = ()=>{
                if(this.timeLeft>0){
                    this.timeLeft--;
                    setTimeout(wait, 1);
                }else{
                    this.timeLeft = this.threshold;
                    //console.log("populating, time out in: "+this.timeLeft);
                    this.proxyPopulate(mapping, uCount, vCount);
                    this.pending = false;
                }
            }
            wait();
        }else{
            this.timeLeft = this.threshold;
        }
    }
    proxyPopulate(mapping = this.mp, uCount = this.uc, vCount = this.vc){
        for (let i = 0; i <= uCount; i++) {
            for (let j = 0; j <= vCount; j++) {
                let u = i / uCount, v = j / uCount;
                let [x, y] = mapping(u, v);
                let k = 3 * (i * (vCount + 1) + j);
                this.v[k] = x;
                this.v[k + 1] = y;
                this.asyncInterface(x,y).then((val)=>{
                    this.v[k + 2] = +val;
                    if(i==uCount&&j==vCount){
                        this.g.attributes.position.needsUpdate = true;
                        this.u();
                    }
                });
            }
        }
    }
}

//CartesianGraph
class CC extends CG {
    g: THREE.BufferGeometry;
    s: THREE.Mesh;
    //Create vertex overheads >3721*3
    v = new Float32Array(36000);
    //Create index overheads >3721*6
    i: number[] = [];
    d: (x: number, y: number) => Number;
    uc = 100;
    vc = 100;

    /**
     * @param name name of the graph, needs to be unique
     * @param dataInterface the cartesian function being passed
     */
    constructor(name: string, dataInterface: (x: number, y: number) => Number) {
        super(name, dataInterface);
        this.g = new THREE.BufferGeometry();
        this.d = dataInterface;
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
    pu(mapping = this.mp, uCount = this.uc, vCount = this.vc): void {

        for (let i = 0; i <= uCount; i++) {
            for (let j = 0; j <= vCount; j++) {
                let u = i / uCount, v = j / uCount;
                let [x, y] = mapping(u, v);
                let k = 3 * (i * (vCount + 1) + j);
                this.v[k] = x;
                let val = this.d(x, y);
                this.v[k + 1] = y+((val instanceof Q)?+val.data[1]:0);
                this.v[k + 2] = (val instanceof Q)?+val.data[0]:+val;
            }
        }
        this.g.attributes.position.needsUpdate = true;
    }
}

//CartesianGraph2D
class CGT extends G {
    //geometry
    g: THREE.BufferGeometry;
    s: THREE.Line;
    //Create vertex overheads >3721*3
    //vertices
    v: THREE.Vector3[] = [];
    //Create index overheads >3721*6
    //indices
    i: number[] = [];
    d: (x: number) => number;
    //uCount
    uc = 60;
    //vCount
    vc = 60;

    /**
     * @param name name of the graph, needs to be unique
     * @param dataInterface the cartesian function being passed
     */
    constructor(name: string, dataInterface: (x: number) => number) {
        super(name);
        this.g = new THREE.BufferGeometry();
        this.d = dataInterface;
    }

    cg(param: { [key: string]: string } =
           {'material': "standard", 'color': "blue"}): void {
        this.g = new THREE.BufferGeometry();
        this.m = cm('line',
            (param['color']) ? param['color'] : 'blue');
        this.s = new THREE.Line(this.g, this.m);
        this.s.name = this.n;
    }

    /**
     * Generate indices for mesh creation
     * @param uCount # of vertices + 1 in the u direction
     * @param vCount # of vertices + 1 in the v direction
     */
    gi(uCount = this.uc, vCount = this.vc) {
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
    pu(mapping = (u: number) => [-5 + u * 10], uCount = this.uc, vCount = this.vc): void {

        for (let i = 0; i <= uCount; i++) {
            let u = i / uCount;
            let [x] = mapping(u);
            this.v[i] = new THREE.Vector3(x, this.d(x), 0);
        }
        this.g.setFromPoints(this.v);
        this.g.attributes.position.needsUpdate = true;
    }

    u(): void {
        this.g.computeVertexNormals();
    }

    di() {
        this.g.dispose();
        this.m.dispose();
    }

    uo(): void {
    }
}

//VecField3D
class VF extends G {
    vecFunc: (...baseVec: number[]) => number[];
    style: { [p: string]: (length: number) => number } = {};
    vector3Ds: VD[] = [];
    traces: LineTrace[] = [];

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
        this.td = true;
    }

    cg(param: { [p: string]: string }): void {
        this.c = param['color'];
        let vs = [];
        let vectors = this.vector3Ds;
        let func = (t: number) => {
            return -5 + 10 * t;
        };
        for (let i = 0; i < 1; i += 0.1) {
            for (let j = 0; j < 1; j += 0.1) {
                for (let k = 0; k < 1; k += 0.1) {
                    vs.push([func(i), func(j), func(k)]);
                }
            }
        }

        for(let x0 = -5; x0<=5; x0+=2){
            for(let y0 = -5; y0<=5; y0+=2){
                for(let z0 = -5; z0<=5; z0+=2){
                    let v0 = [x0, y0, z0];
                    this.traces.push(new LineTrace(v0.toString(), this.vecFunc, v0));
                    // let v01 = [0, x0, z0];
                    // this.traces.push(new LineTrace(v01.toString(), this.vecFunc, v01));
                }
            }
        }
        this.s = new THREE.Group();
        // for (let v of vs) {
        //     let vec3d = new VD(v.toString(), this.vecFunc,
        //         () => v);
        //     vectors.push(vec3d);
        //     vec3d.cg(param);
        //     this.s.add(vec3d.s);
        // }
        for(let trace of this.traces){
            trace.cg(param);
            trace.gi();
            this.s.add(trace.s);
        }
    }

    di(): void {
    }

    pu(): void {
        // for (let vector3D of this.vector3Ds) {
        //     vector3D.pu();
        // }

        for (let trace of this.traces) {
            trace.pu();
        }
    }

    u(): void {
    }

    uo(): void {
    }

    //updateVecFunc
    uv(vecFunc: (...baseVec: number[]) => number[]) {
        this.vecFunc = vecFunc;
        // for (let vector3d of this.vector3Ds) {
        //     vector3d.vector = this.vecFunc;
        // }
        for(let trace of this.traces){
            trace.updateVecFunc(this.vecFunc);
        }
    }
}
//Vector3D
class VD extends G {
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
        this.td = true;
    }

    /**
     * @param param
     *  color: string valued specification of mesh color
     *  material: string valued specification of mesh material
     * @param style
     */
    cg(param: { [p: string]: string }, style: { [p: string]: (length: number) => number } = {}): void {
        // this.cone = new BufferGeometry();
        // this.cone.setAttribute( 'position', new THREE.BufferAttribute( this.buffer, 3 ) );
        // this.ring = new BufferGeometry();
        // this.ring.setAttribute( 'position', new THREE.BufferAttribute( this.buffer, 3 ) );
        // this.cylinder = new BufferGeometry();
        // this.cylinder.setAttribute( 'position', new THREE.BufferAttribute( this.buffer, 3 ) );
        // this.base = new BufferGeometry();
        // this.base.setAttribute( 'position', new THREE.BufferAttribute( this.buffer, 3 ) );
        this.c = param['color'];
        let l = 1;
        let r0 = this.r0(l);
        let r1 = this.r1(l);
        let h0 = this.h0(l);
        let h1 = this.h1(l);
        this.cone = new ConeGeometry(r1, h1, 20, 3);
        this.cone.translate(0, h0 + h1 / 2, 0);
        this.cylinder = new CylinderGeometry(r0, r0, h0, 20, 3);
        this.cylinder.translate(0, h0 / 2, 0);
        this.m = cm('light',
            (param['color']) ? param['color'] : 'blue', false);
        this.coneMesh = new THREE.Mesh(this.cone, this.m);
        this.coneMesh.setRotationFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
        // let ringMesh = new THREE.Mesh(this.ring, this.material);
        this.cylinderMesh = new THREE.Mesh(this.cylinder, this.m);
        this.cylinderMesh.setRotationFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
        // let baseMesh = new THREE.Mesh(this.base, this.material);
        this.s = new THREE.Group();
        this.s.add(this.coneMesh);
        this.coneMesh.renderOrder = 0;
        // this.mesh.add(ringMesh);
        // ringMesh.renderOrder=2;
        this.s.add(this.cylinderMesh);
        this.cylinderMesh.renderOrder = -1;
        // this.mesh.add(baseMesh);
        // baseMesh.renderOrder=0;
        this.bv = this.s.position;
        this.cone.computeVertexNormals();
        this.cylinder.computeVertexNormals();
    }

    /**
     * Populate the relevant geometries into the vertex
     * buffer
     */
    pu(): void {
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
        // let length = Math.sqrt(this.rv.length());
        let length = 1.2;
        this.cylinderMesh.scale.set(length, length, length);
        this.coneMesh.scale.set(length, length, length);
        //@ts-ignore
        this.cylinderMesh.material.color.setHex(this.get3PhaseColor(Math.atan(this.rv.length())) * 2);
        //@ts-ignore
        this.coneMesh.material.color.setHex(this.get3PhaseColor(Math.atan(this.rv.length())) * 2);
        this.s.lookAt(this.rv.add(this.bv));
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

    di(): void {
        this.m.dispose();
    }

    gi() {
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

    u(): void {
        // this.cone.computeVertexNormals();
        // this.ring.computeVertexNormals();
        // this.cylinder.computeVertexNormals();
        // this.base.computeVertexNormals();
    }

    /**
     * Compute theta start and repopulate, invert the camera position
     * into the arrow frame, and rotate the arrow accordingly
     */
    uo(): void {
        // let inverse = this.mesh.matrix.clone().invert();
        // let camera = this.cameraPosition.clone().transformDirection(inverse);
        // let x = camera.x;
        // let y = camera.y;
        // this.thetaStart = Math.PI/2+((x<=0)?Math.PI:0)+((x!=0)?Math.atan(y/x):Math.PI/2);
        this.pu();
    }
}

//ParametricSurface
class PS extends G {
    //geometry
    g: THREE.BufferGeometry;
    s: THREE.Mesh;
    //vertices
    //Create vertex overheads >3721*3
    v = new Float32Array(36000);
    //indices
    //Create index overheads >3721*6
    i: number[] = [];
    d: (x: number, y: number) => number[];
    //uCount
    uc = 100;
    //vCount
    vc = 100;

    /**
     * @param name name of the graph, needs to be unique
     * @param dataInterface the cartesian function being passed
     */
    constructor(name: string, dataInterface: (x: number, y: number) => number[]) {
        super(name);
        this.g = new THREE.BufferGeometry();
        this.d = dataInterface;
    }

    cg(param: { [key: string]: string } =
           {'material': "standard", 'color': "blue"}): void {
        this.g = new THREE.BufferGeometry();
        this.c = (param['color']) ? param['color'] : 'blue';
        this.g.setAttribute('position', new THREE.BufferAttribute(this.v, 3));
        this.m = cm((param['material']) ? param['material'] : 'standard',
            (param['color']) ? param['color'] : 'blue');
        this.s = new THREE.Mesh(this.g, this.m);
        this.s.name = this.n;
    }

    /**
     * Generate indices for mesh creation
     * @param uCount # of vertices + 1 in the u direction
     * @param vCount # of vertices + 1 in the v direction
     */
    gi(uCount = this.uc, vCount = this.vc) {
        this.i.length = 0;
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
                this.i.push(a, b, c);
                this.i.push(c, d, a);
            }
        }
        this.g.setIndex(this.i);
    }

    /**
     *
     * Upon population, there will be (uCount+1)*(vCount+1) vertices created,
     * namely uCount corresponds to the # of edges in the u direction, and vCount
     * # of edges along v.
     * @param uCount # of vertices + 1 in the u direction
     * @param vCount # of vertices + 1 in the v direction
     */
    pu(uCount = this.uc, vCount = this.vc): void {
        for (let i = 0; i <= uCount; i++) {
            for (let j = 0; j <= vCount; j++) {
                let u = i / uCount, v = j / uCount;
                let k = 3 * (i * (vCount + 1) + j);
                let vertex = this.d(u, v);
                this.v[k] = vertex[0];
                this.v[k + 1] = vertex[1];
                this.v[k + 2] = vertex[2];
            }
        }
        this.g.attributes.position.needsUpdate = true;
    }

    u(): void {
        this.g.computeVertexNormals();
    }

    uo(): void {
    }

    td: boolean = true;

    di() {
        this.g.dispose();
        this.m.dispose();
    }
}

//ParametricLine
class P extends G {
    //geometry
    g: LineGeometry;
    s: Line2;
    //positions
    //Create vertex overheads >3721*3
    sp: number[] = [];
    //indices
    //Create index overheads >3721*6
    i: number[] = [];
    d: (x: number) => Number[];
    //uCount
    uc = 1000;
    //vCount
    vc = 1000;

    /**
     * @param name name of the graph, needs to be unique
     * @param dataInterface the cartesian function being passed
     */
    constructor(name: string, dataInterface: (x: number) => Number[], uCount = 1000) {
        super(name);
        this.d = dataInterface;
        this.uc = uCount;
    }

    cg(param: { [key: string]: string } =
           {'material': "standard", 'color': "blue"}): void {
        this.g = new LineGeometry();
        this.c = (param['color']) ? param['color'] : 'blue';
        this.m = cm('line2',
            this.c);
        this.s = new Line2(this.g, <LineMaterial> this.m);
        this.s.name = this.n;
    }

    /**
     * Generate indices for mesh creation
     * @param uCount # of vertices + 1 in the u direction
     * @param vCount # of vertices + 1 in the v direction
     */
    gi(uCount = this.uc, vCount = this.vc) {
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
    pu(mapping = (u: number) => u, uCount = this.uc, vCount = this.vc): void {
        this.sp.length = 0
        for (let i = 0; i <= uCount; i++) {
            let u = i / uCount;
            let x = mapping(u);
            let vec = this.d(x);
            this.sp.push(+vec[0], +vec[1], (vec.length>2)?+vec[2]:0);
        }
        this.g.setPositions(this.sp);
        // //console.log(this.positions);
    }

    u(): void {
        //console.log("line distances computed");
        this.s.computeLineDistances();
        this.s.scale.set( 1, 1, 1 );
    }

    di() {
        this.g.dispose();
        this.m.dispose();
    }

    uo(): void {
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

class LineTrace extends G {
    geometry: THREE.BufferGeometry;
    s: THREE.Line;
    //Create vertex overheads >3721*3
    vertices: THREE.Vector3[] = [];
    //Create index overheads >3721*6
    indices: number[] = [];
    d: (...baseVec: number[]) => number[];
    uCount = 100;
    vCount = 1000;
    v0: number[];

    /**
     * @param name name of the graph, needs to be unique
     * @param dataInterface the cartesian function being passed
     * @param v0
     * @param uCount
     */
    constructor(name: string, dataInterface: (...baseVec: number[]) => number[], v0: number[], uCount = 10) {
        super(name);
        this.geometry = new THREE.BufferGeometry();
        const holder = new Vec();
        this.d = (x,y,z)=>{
            let vec =holder.set(...dataInterface(x,y,z));
            return [...vec.normalize(vec).multiply(1.5,vec).components];
        };
        this.uCount = uCount;
        this.v0 = v0;
    }

    updateVecFunc(vecFunc: (...baseVec: number[])=>number[]){
        const holder = new Vec();
        this.d = (x,y,z)=>{
            let vec =holder.set(...vecFunc(x,y,z));
            return [...vec.normalize(vec).multiply(1.5,vec).components];
        };
    }

    cg(param: { [key: string]: string } =
           {'material': "opaque", 'color': "blue"}): void {
        this.geometry = new THREE.BufferGeometry();
        this.m = cm('line',
            (param['color']) ? param['color'] : 'blue',true);
        this.s = new THREE.Line(this.geometry, this.m);
        this.s.name = this.n;
    }

    /**
     * Generate indices for mesh creation
     * @param uCount # of vertices + 1 in the u direction
     * @param vCount # of vertices + 1 in the v direction
     */
    gi(uCount = this.uCount, vCount = this.vCount) {
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
    pu(uCount = this.uCount, dt = 1.0/uCount): void {
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
        let k1 = this.d(...trace);
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
        return this.d(...this.traceHolder);
    }
    k3(dt: number, trace0: number[], k2: number[]) {
        for(let j = 0; j<3; j++){
            this.traceHolder[j]=k2[j]*dt/2+trace0[j];
        }
        return this.d(...this.traceHolder);
    }
    k4(dt: number, trace0: number[], k3: number[]) {
        for(let j = 0; j<3; j++){
            this.traceHolder[j]=k3[j]*dt+trace0[j];
        }
        return this.d(...this.traceHolder);
    }

    u(): void {
        this.geometry.computeVertexNormals();
    }

    di() {
        this.geometry.dispose();
        this.m.dispose();
    }

    uo(): void {
    }
}

//GroupGraph
abstract class GG extends G {
    //updateGroupSize
    abstract ug(evalHandle: L): void;
}

/**
 * CartesianGroup
 * Holds a group of graphs and operates on them simultaneously,
 * loads from an evaluation handle and applies graph types
 * based on the output of the first dimension
 */
class CR extends GG {
    subGraphs: CG[];
    //uCount
    uc = 100;
    //vCount
    vc = 100;
    d: (x: number, y: number) => Number[];
    //mapping
    private pm = (u: number, v: number) => [-5 + v * 10, 5 - u * 10];

    constructor(name: string, evalHandle: L,
                dataInterface: Function) {
        super(name);
        this.subGraphs = [];
        for (let i = 0; i < evalHandle.s.length; i++) {
            this.subGraphs[i] = new CG(name + ":" + i, undefined);
        }
        this.d = <(x: number, y: number) => Number[]>dataInterface;
    }

    cg(param: { [p: string]: string }): void {
        this.a = param;
        this.s = new Group();
        for (let subGraph of this.subGraphs) {
            subGraph.cg(param);
            subGraph.gi(this.uc, this.vc);
            this.s.add(subGraph.s);
        }
    }

    di(): void {
    }

    pu(mapping = this.pm, uCount = this.uc,
       vCount = this.vc): void {
        for (let i = 0; i <= uCount; i++) {
            for (let j = 0; j <= vCount; j++) {
                let u = i / uCount, v = j / uCount;
                let [x, y] = mapping(u, v);
                let k = 3 * (i * (vCount + 1) + j);
                let g = this.d(x, y);
                for (let q = 0; q < this.subGraphs.length; q++) {
                    let graph = this.subGraphs[q];
                    graph.v[k] = x;
                    graph.v[k + 1] = y;
                    graph.v[k + 2] = g[q].valueOf();
                }
            }
        }
        for (let graph of this.subGraphs) {
            graph.g.attributes.position.needsUpdate = true;
        }
    }

    u(): void {
        for (let graph of this.subGraphs)
            graph.u();
    }

    uo(): void {
    }

    ug(evalHandle: L): void {
        //console.log(evalHandle);
        //console.log("sub graph counts: " + this.subGraphs.length);
        //console.log("sub evaluable counts: " + evalHandle.s.length);
        //console.log(this.subGraphs);
        while (evalHandle.s.length < this.subGraphs.length) {
            let graph = this.subGraphs.pop();
            this.s.remove(graph.s);
            graph.di();
            // this.subGraphs[this.subGraphs.length-1].mesh.visible = false;
        }
        for (let i = this.subGraphs.length; i < evalHandle.s.length; i++) {
            let subGraph = new CG(this.n + "i", undefined);
            subGraph.cg(this.a);
            subGraph.gi(this.uc, this.vc);
            this.s.add(subGraph.s);
            this.subGraphs[i] = subGraph;
        }
    }

    sb(bounds: number[][]){
        super.sb(bounds);
        for(let graph of this.subGraphs){
            graph.sb(bounds);
        }
    }
}

// Vector3DGroup
class VG extends GG {
    subGraphs: VD[];
    d: () => Number[];

    constructor(name: string, evalHandle: L,
                dataInterface: Function) {
        super(name);
        this.subGraphs = [];
        for (let i = 0; i < evalHandle.s.length; i++) {
            this.subGraphs[i] = new VD(name + ":" + i, undefined, () => [0, 0, 0]);
        }
        this.d = <() => Number[]>dataInterface;
    }

    cg(param: { [p: string]: string }): void {
        this.s = new THREE.Group();
        this.a = param;
        for (let subGraph of this.subGraphs) {
            subGraph.cg(param);
            this.s.add(subGraph.s);
        }
    }

    di(): void {
    }

    pu(): void {
        let g = this.d();
        for (let i = 0; i < g.length; i++) {
            let subGraph = this.subGraphs[i];
            let baseVec = subGraph.baseVec();
            subGraph.bv.fromArray(baseVec);
            let vector = (<Q>g[i]).data;
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

    u(): void {
        for (let graph of this.subGraphs)
            graph.u();
    }

    ug(evalHandle: L): void {
        ////console.log(evalHandle);
        //console.log("sub graph counts: " + this.subGraphs.length);
        //console.log("sub evaluable counts: " + evalHandle.s.length);
        //console.log(this.subGraphs);
        while (evalHandle.s.length < this.subGraphs.length) {
            let graph = this.subGraphs.pop();
            this.s.remove(graph.s);
            graph.di();
            // this.subGraphs[this.subGraphs.length-1].mesh.visible = false;
        }
        for (let i = this.subGraphs.length; i < evalHandle.s.length; i++) {
            let subGraph = new VD(this.n + ":" + i, undefined, () => [0, 0, 0]);
            subGraph.cg(this.a);
            this.s.add(subGraph.s);
            this.subGraphs[i] = subGraph;
        }
    }

    uo(): void {
    }
}

//ParametricGraph
class PG extends GG {
    //subGraphs
    sg: PS[];
    //uCount
    uc = 100;
    //vCount
    vc = 100;
    d: (x: number, y: number) => Number[];

    constructor(name: string, evalHandle: L,
                dataInterface: Function) {
        super(name);
        this.sg = [];
        for (let i = 0; i < evalHandle.s.length; i++) {
            this.sg[i] = new PS(name + ":" + i, undefined);
        }
        this.d = <(x: number, y: number) => Number[]>dataInterface;
    }

    cg(param: { [p: string]: string }): void {
        this.a = param;
        this.s = new Group();
        for (let subGraph of this.sg) {
            subGraph.cg(param);
            subGraph.gi(this.uc, this.vc);
            this.s.add(subGraph.s);
        }
    }

    di(): void {
    }

    pu(uCount = this.uc,
       vCount = this.vc): void {
        for (let i = 0; i <= uCount; i++) {
            for (let j = 0; j <= vCount; j++) {
                let u = i / uCount, v = j / uCount;
                let k = 3 * (i * (vCount + 1) + j);
                let g = this.d(u, v);
                for (let q = 0; q < this.sg.length; q++) {
                    let graph = this.sg[q];
                    let vertex = (<Q>g[q]).data;
                    while(vertex.length<3)
                        vertex.push(0);
                    graph.v[k] = +vertex[0];
                    graph.v[k + 1] = +vertex[1];
                    graph.v[k + 2] = +vertex[2];
                }
            }
        }
        for (let graph of this.sg) {
            graph.g.attributes.position.needsUpdate = true;
        }
    }

    u(): void {
        for (let graph of this.sg)
            graph.u();
    }

    uo(): void {
    }

    ug(evalHandle: L): void {
        //console.log(evalHandle);
        //console.log("sub graph counts: " + this.sg.length);
        //console.log("sub evaluable counts: " + evalHandle.s.length);
        //console.log(this.sg);
        while (evalHandle.s.length < this.sg.length) {
            let graph = this.sg.pop();
            this.s.remove(graph.s);
            graph.di();
            // this.subGraphs[this.subGraphs.length-1].mesh.visible = false;
        }
        for (let i = this.sg.length; i < evalHandle.s.length; i++) {
            let subGraph = new PS(this.n + "i", undefined);
            subGraph.cg(this.a);
            subGraph.gi(this.uc, this.vc);
            this.s.add(subGraph.s);
            this.sg[i] = subGraph;
        }
    }
}

export {
    G, GG, CG, CAG, CGT, CR, VD, VG, VF,
    PS, PG, P, CC, colors, loadRenderer
};