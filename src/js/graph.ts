import * as THREE from "three";
import {
    BufferGeometry,
    ConeGeometry,
    CylinderGeometry, Group,
    LineBasicMaterial, Mesh,
    Vector3
} from "three";
import {Geometry} from "three/examples/jsm/deprecated/Geometry";
import {Vec} from "./diffEqn";
import {cssNumber, data} from "jquery";
import {Evaluable, Quantity} from "./core";

const colors: { [key: string]: number } = {
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
                opacity: 0.6,
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
     * Returns the effective bounds of visualization for this graph
     */
    getBounds(): number[][] {
        return [[-5, 5], [-5, 5], [-5, 5]];
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
            switch (orientation) {
                case 0:
                    mapping = (u: number, v: number) => [-5 + v * 10, 5 - u * 10];
                    break;
                case 1:
                    mapping = (u: number, v: number) => [5 - v * 10, -5 + u * 10];
                    break;
                case 2:
                    mapping = (u: number, v: number) => [5 - u * 10, -5 + v * 10];
                    break;
                case 3:
                    mapping = (u: number, v: number) => [-5 + u * 10, 5 - v * 10];
                    break;
            }
            this.mapping = mapping;
            this.populate(mapping);
            this.update();
        }
    }


    timeDependent: boolean = true;

    dispose() {
        this.geometry.dispose();
        this.material.dispose();
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
    vecFunc: (...baseVec: number[]) => number[];
    style: { [p: string]: (length: number) => number } = {};
    vector3Ds: Vector3D[] = [];

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

    constructGeometry(param: { [p: string]: string }): void {
        this.color = param['color'];
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
        this.mesh = new THREE.Group();
        for (let v of vs) {
            let vec3d = new Vector3D(v.toString(), this.vecFunc,
                () => v);
            vectors.push(vec3d);
            vec3d.constructGeometry({'color': 'orange'});
            this.mesh.add(vec3d.mesh);
        }
    }

    dispose(): void {
    }

    populate(): void {
        for (let vector3D of this.vector3Ds) {
            vector3D.populate();
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
        let length = this.rv.length();
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
    geometry: THREE.BufferGeometry;
    mesh: THREE.Line;
    //Create vertex overheads >3721*3
    vertices: THREE.Vector3[] = [];
    //Create index overheads >3721*6
    indices: number[] = [];
    dataInterface: (x: number) => Vec;
    uCount = 1000;
    vCount = 1000;

    /**
     * @param name name of the graph, needs to be unique
     * @param dataInterface the cartesian function being passed
     */
    constructor(name: string, dataInterface: (x: number) => Vec, uCount = 1000) {
        super(name);
        this.geometry = new THREE.BufferGeometry();
        this.dataInterface = dataInterface;
        this.uCount = uCount;
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
        this.indices.length = 0;
        // /*
        //  * Upon population, there will be (uCount+1)*(vCount+1) vertices created,
        //  * namely uCount corresponds to the # of edges in the u direction, and vCount
        //  * # of edges in v, so that there will be exactly 2*uCount*vCount triangular mesh formed.
        //  */
        for (let i = 0; i < uCount; i++) {
            this.indices.push(i, i + 1);
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
    populate(mapping = (u: number) => u, uCount = this.uCount, vCount = this.vCount): void {

        for (let i = 0; i <= uCount; i++) {
            let u = i / uCount;
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
    Graph, GroupGraph, CartesianGraph, CartesianGraph2D, CartesianGroup, Vector3D, Vector3DGroup, VecField3D,
    ParametricSurface, ParametricGroup, ParametricLine, ComplexCartesianGraph, colors
};