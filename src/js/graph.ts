import * as THREE from "three";

const materials:{[key:string]:THREE.Material} = {
    standard: new THREE.MeshPhongMaterial({
        opacity: 0.8,
        transparent: true,
        side: THREE.DoubleSide,
        color: 0x7890ab
    }),
    opaque: new THREE.MeshPhongMaterial({
        side: THREE.DoubleSide,
        color: 0x7890ab
    }),
    flat: new THREE.MeshBasicMaterial({
        color: 0x7890ab,
        opacity: 0.8,
        transparent: true,
    }),
    line: new THREE.LineBasicMaterial({
        color: 0x7890ab,
        opacity: 0.8
    })
};

const colors: {[key:string]:number}= {
    orange: 0xfb6500,
    green: 0x378b59,
    steelBlue: 0x4377bf,
    blue: 0x0065fb,
    red: 0xd82c5d,
    lightgray: 0xf3f3f3,
    air: 0xf0f8ff,
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
                color: 0x7890ab
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
    mesh: THREE.Mesh;
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
    abstract populate(dataInterface:(x:number)=>number): void;

    setMaterial(material:THREE.Material){
        this.material = material;
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
    vertices = new Float32Array(12000);
    //Create index overheads >3721*6
    indices:number[] = [];
    constructor(name: string) {
        super(name);
        this.geometry = new THREE.BufferGeometry();
    }
    constructGeometry(param:{[key:string]:string}=
                          {'material': "standard", 'color': "blue"}): void {
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute( 'position', new THREE.BufferAttribute( this.vertices, 3 ) );
        let material = createMaterial((param['material'])?param['material']:'standard',
                                (param['color'])?param['color']:'blue');
        this.mesh = new THREE.Mesh( this.geometry, material );
        this.mesh.name = this.name;
    }

    /**
     * Generate indices for mesh creation
     * @param uCount # of vertices + 1 in the u direction
     * @param vCount # of vertices + 1 in the v direction
     */
    generateIndices(uCount = 60, vCount = 60){
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
     * @param dataInterface the cartesian function being passed
     * @param mapping a mapping for the vertex generation, used to serve refined mesh generation
     * @param uCount # of vertices + 1 in the u direction
     * @param vCount # of vertices + 1 in the v direction
     */
    populate(dataInterface: (x: number, y: number) => number,
             mapping = (u:number, v:number)=>[-5+v*10, 5-u*10], uCount = 60, vCount = 60): void {

        for(let i = 0; i <= uCount; i++){
            for(let j = 0; j <= vCount; j++){
                let u = i/uCount, v = j/uCount;
                let [x,y] = mapping(u,v);
                let k  = 3*(i*(vCount+1)+j);
                this.vertices[k] = x;
                this.vertices[k+1] = y;
                this.vertices[k+2] = dataInterface(x,y);

            }
        }
    }

    update(): void {
        this.geometry.computeVertexNormals();
    }

    dispose(){
        this.geometry.dispose();
        this.material.dispose();
    }
}

export {Graph, CartesianGraph};