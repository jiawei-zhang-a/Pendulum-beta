import {cos, DiffEqn, Euler, RK4, Vec} from "./diffEqn";
import {CartesianGraph2D, ParametricLine, Vector3D} from "./graph";
import {Canvas} from "./graphics";
import {Vector3} from "three";
import 'bessel/bessel';
import {BufferGeometryUtils} from "three/examples/jsm/utils/BufferGeometryUtils";
import computeMorphedAttributes = BufferGeometryUtils.computeMorphedAttributes;
//@ts-ignore
let BESSEL = document.BESSEL;

function ode(canvas: Canvas) {
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
    let graph3 = new CartesianGraph2D('time domain',
        (x) => solution(x * 5, sHolder).x / 5);
    graph3.constructGeometry({'color': 'purple'});
    graph3.generateIndices();
    graph3.populate();
    canvas.addGraph(graph3);

    let graph4 = new ParametricLine('parametric domain',
        (x) => solution(x * 1000, sHolder).multiply(0.1), 10000);
    graph4.constructGeometry({'color': 'blue'});
    graph4.generateIndices();
    graph4.populate();
    canvas.addGraph(graph4);

    let euler = new Euler(eqn, 0.01, 0,
        [new Vec(x0, y0, z0), new Vec(dx0, dy0, dz0)]);
    let eSolution = euler.getSolution(true, [-50, 100]);
    let eHolder = new Vec();
    let graph5 = new CartesianGraph2D('time domain',
        (x) => eSolution(x * 5, eHolder).x / 5);
    graph5.constructGeometry({'color': 'red'});
    graph5.generateIndices();
    graph5.populate();
    canvas.addGraph(graph5);
}

function field(canvas: Canvas) {
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
        let vec3d = new Vector3D(v.toString(), field,
            () => tracer.trace(canvas.time * 0.1, v0, field).toArray());
        vectors.push(vec3d);
        vec3d.constructGeometry({'color': 'orange'});
        vec3d.generateIndices();
        vec3d.populate();
        canvas.addGraph(vec3d);
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
    n = 4;
    //n+1 toroidal flux to fully constrain the problem
    //last flux is for the vacuum region
    pt = [2, -1, 3, -1, 1];
    pp = [1.2, -1, -1.3, 2];
    l = [1, 2, 2, 2];
    dp = [1, 1, 1, 1];
    //Wall radius, fixed
    Rw = 2;
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
        this.R[this.n+2] = this.Rw;
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

function cylindricalSteppedPressure(canvas: Canvas) {
    let vs = [];
    let vectors = [];
    let cm = new CylindricalContainment();
    cm.loadParameters([0.25779695284422416, 2.5528044544669064, 0.12835831270970327, 2.89744292979702, 10.445747864261534, -1.0568060357450244,
        5.997296076573234, 3.7552793178514605, -7.198437485339354, -2.5936554625092345, 2.868590646295159, 0.011632997087230873, 5.000001520142342E-7, 0.20605244188951416]);

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
            let vec3d = new Vector3D(v.toString(),
                vec,
                () => tracer.trace(canvas.time, v0, vec).toArray());
            vectors.push(vec3d);
            vec3d.constructGeometry({'color': 'green'});
            vec3d.generateIndices();
            vec3d.populate();
            canvas.addGraph(vec3d);
        }
    }
}

export {ode, field, cylindricalSteppedPressure};