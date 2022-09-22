import {cos, DiffEqn, Euler, RK4, Vec} from "./diffEqn";
import {CAG, CG, CGT, P, VD} from "./graph";
import {C} from "./graphics";
import {Vector3} from "three";
import 'bessel/bessel';
import {BufferGeometryUtils} from "three/examples/jsm/utils/BufferGeometryUtils";
import {Portal} from 'function-link';
import computeMorphedAttributes = BufferGeometryUtils.computeMorphedAttributes;
//@ts-ignore
let BESSEL = document.BESSEL;

function ode(canvas: C) {
    let a = 0.005;
    let q = 0.1590;
    let x0 = 4.523;
    let dx0 = 1.5;
    let y0 = -10;
    let z0 = 1;
    let dy0 = 2.5;
    let dz0 = 0;

    let additionHolder = new Vec();
    let rHolder = new Vec();
    let eqn: DiffEqn = new DiffEqn((t, n) => {
        return rHolder.set(n[0].x * a - 2 * q * cos(2 * t) * n[0].x,
            n[0].y * a + 2 * q * cos(2 * t) * n[0].y,
            -2 * a * n[0].z);
    }, 2);

    let rk4 = new RK4(eqn, 0.1, 0,
        [new Vec(x0, y0, z0), new Vec(dx0, dy0, dz0)]);
    let solution = rk4.getSolution(true, [-50, 10000]);
    let sHolder = new Vec();
    let graph3 = new CGT('time domain',
        (x) => solution(x * 5, sHolder).x / 5);
    graph3.cg({'color': 'purple'});
    graph3.gi();
    graph3.pu();
    canvas.ag(graph3);

    let graph4 = new P('parametric domain',
        (x) => {
            let vec = solution(x * 1000, sHolder).multiply(0.1);
            return [vec.x, vec.y, vec.z];
        }, 10000);
    graph4.cg({'color': 'blue'});
    graph4.gi();
    graph4.pu();
    canvas.ag(graph4);

    let euler = new Euler(eqn, 0.01, 0,
        [new Vec(x0, y0, z0), new Vec(dx0, dy0, dz0)]);
    let eSolution = euler.getSolution(true, [-50, 100]);
    let eHolder = new Vec();
    let graph5 = new CGT('time domain',
        (x) => eSolution(x * 5, eHolder).x / 5);
    graph5.cg({'color': 'red'});
    graph5.gi();
    graph5.pu();
    canvas.ag(graph5);
}

function field(canvas: C) {
    let vs = [];
    let vectors = [];
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

    let field1 = (x:number, y:number, z:number) => {
        let r = Math.sqrt(x * x + y * y + z * z);
        return [-y * z/r/r, z * x/r/r, -x * y/r/r];
    };
    let field = (x:number, y:number, z:number) => {
        let r = Math.sqrt(x * x + y * y + z * z);
        return [(y-z)/r*y, (z-x)/r*x, (x-y)/r*z];
    };
    for (let v of vs) {
        let t0 = 0;
        let tracer = new Tracer();
        let v0 = new Vector3(...v);
        let vec3d = new VD(v.toString(), field,
            () => tracer.trace(canvas.time * 0.1, v0, field).toArray());
        vectors.push(vec3d);
        vec3d.cg({'color': 'orange'});
        vec3d.gi();
        vec3d.pu();
        canvas.ag(vec3d);
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
        this.v0.x = ((this.v0.x + 6) % 12 - 12) % 12 + 6;
        return this.v0;
    }
}

class CylindricalContainment {
    n = 1;
    //n+1 toroidal flux to fully constrain the problem
    //last flux is for the vacuum region
    l = [1, 2, 2, 2];
    //Wall radius, fixed
    Rw = 3;
    R = new Array(this.n + 1); // First entry 0 for origin, indices forward by 1
    k = new Array(this.n);
    d = new Array(this.n);// First entry 0
    Bz = 0;
    Bphi = 0;
    mu0 = 1;

    getBR(i: number, B: number[], r:number) {
        if (i < this.n) {
            B[0] = this.k[i] * BESSEL.besselj(this.l[i] * r, 0) + ((i != 0) ? this.d[i] * BESSEL.bessely(this.l[i] * r, 0) : 0);
            B[1] = this.k[i] * BESSEL.besselj(this.l[i] * r, 1) + ((i != 0) ? this.d[i] * BESSEL.bessely(this.l[i] * r, 1) : 0);
            return;
        }
        B[0] = this.Bz; //Bz at wall
        B[1] = this.Bphi * r / this.Rw; //B phi at wall
    }

    loadParameters(params: number[]) {
        this.R[0] = 0;
        this.d[0] = 0;
        for (let i = 0; i < this.n; i++)
            this.R[i + 1] = this.R[i] + Math.abs(params[i]);
        this.R[this.n+1] = this.Rw;
        for (let i = 0; i < this.n; i++)
            this.k[i] = params[i + this.n];
        for (let i = 1; i < this.n; i++)//ommit d[0]
            this.d[i] = params[i - 1 + 2 * this.n];
        this.Bz = params[3 * this.n - 1];
        this.Bphi = params[3 * this.n];//Makes a total of 3n+1 parameters
        for (let i = 1; i < this.n; i++)//ommit d[0]
            this.d[i] = params[i - 1 + 2 * this.n];
        console.log(this);
    }
}

function cylindricalSteppedPressure(canvas: C) {
    console.log("method called");
    let vs = [];
    let vectors = [];
    let cm = new CylindricalContainment();
    cm.loadParameters([1,2,1,1,1]);
    let n = 0;
    for(let h = 0; h<cm.n+1; h++){
        let func = (i: number, phi: number, z: number) => {
            return [z,
                Math.cos(phi) * (i*cm.R[h+1]+(1-i)*cm.R[h]),
                Math.sin(phi) * (i*cm.R[h+1]+(1-i)*cm.R[h])];
        }
        for (let i = 0; i <= 1; i += 1/2) {
            for (let j = 0; j < Math.PI * 2; j += Math.PI * 2 / 10) {
                for (let k = -6; k < 6; k += 1) {
                    vs.push(func(i, j, k));
                }
            }
        }
        let vec = (z: number, x: number, y: number) => {
            let r = Math.sqrt(x * x + y * y);
            let Bm = [0,0];
            cm.getBR(h, Bm, r);
            return [Bm[0], -y / r * Bm[1], x / r * Bm[1]];
        }
        for (let v of vs) {
            let v0 = new Vector3(...v);
            let tracer = new Tracer();
            let vec3d = new VD(n.toString(),
                vec,
                () => tracer.trace(canvas.time, v0, vec).toArray());
            vectors.push(vec3d);
            vec3d.cg({'color': 'green'});
            vec3d.gi();
            vec3d.pu();
            // vec3d.timeDependent = true;
            canvas.ag(vec3d);
            n++;
        }
    }
}

function graphCylindrical(canvas: C){
    let link = Portal.importFunc(8080, 2);
    let graph = new CAG("cylindric error",
        (x,y)=><Promise<number>>link.get([x,y]));
    graph.cg();
    graph.gi();
    graph.pu();
    canvas.ag(graph);
    // link.get([1,1],(value)=>{console.log(value)});
    console.log(link);
}

function graphTorus(canvas: C){

}


export {ode, field, cylindricalSteppedPressure, graphCylindrical};