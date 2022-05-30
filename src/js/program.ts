import {cos, DiffEqn, Euler, RK4, Vec} from "./diffEqn";
import {CartesianGraph2D, ParametricLine} from "./graph";
import {Canvas} from "./graphics";
function main(canvas: Canvas){
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
    let eqn:DiffEqn = new DiffEqn((t, n)=>{
        return rHolder.set(n[0].x*a-2*q*cos(2*t)*n[0].x,
            n[0].y*a+2*q*cos(2*t)*n[0].y,
            -2*a*n[0].z);
    }, 2);

    let rk4 = new RK4(eqn, 0.1, 0,
        [new Vec(x0, y0, z0), new Vec(dx0, dy0, dz0)]);
    let solution = rk4.getSolution(true, [-50, 10000]);
    let sHolder = new Vec();
    let graph3 = new CartesianGraph2D('time domain',
        (x)=>solution(x*5, sHolder).x/5);
    graph3.constructGeometry({'color':'purple'});
    graph3.generateIndices();
    graph3.populate();
    canvas.addGraph(graph3);

    let graph4 = new ParametricLine('parametric domain',
        (x)=>solution(x*1000, sHolder).multiply(0.1), 10000);
    graph4.constructGeometry({'color':'blue'});
    graph4.generateIndices();
    graph4.populate();
    canvas.addGraph(graph4);

    let euler = new Euler(eqn, 0.01, 0,
        [new Vec(x0, y0, z0), new Vec(dx0, dy0, dz0)]);
    let eSolution = euler.getSolution(true, [-50, 100]);
    let eHolder = new Vec();
    let graph5 = new CartesianGraph2D('time domain',
        (x)=>eSolution(x*5, eHolder).x/5);
    graph5.constructGeometry({'color':'red'});
    graph5.generateIndices();
    graph5.populate();
    canvas.addGraph(graph5);
}
export {main};