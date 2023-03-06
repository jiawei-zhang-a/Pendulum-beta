import * as UI from './ui';
import {init, Canvas, Graph, CartesianGraph} from './graphics';
import {
    CartesianGraph2D,
    CartesianGroup,
    ComplexCartesianGraph,
    Vector3D,
    colors,
    VecField3D,
    GroupGraph,
    ParametricSurface,
    Vector3DGroup, ParametricGroup, CartesianAsyncGraph, ParametricLine
} from "./graph";
import {Core, Evaluable, Quantity, ResolutionError} from "./core";
import {SymNode} from "./parser";
import {cylindricalSteppedPressure, graphCylindrical, ode} from "./program";
// import {Portal} from "function-link";

// Coordinator of all actions of sub-modules
class Pendulum{
    //core
    e: Core;
    //canvas
    s: Canvas;
    //color names
    m: string[];
    constructor(s: Canvas){
        this.s = s;
        this.e = new Core(this);
        this.m = Object.keys(colors);
    }
    ci = 0;
    rc(){
        let modulo = 6;
        let colorName = this.m[this.ci%modulo];
        this.ci++;
        return colorName;
    }
    //Update graph
    ug(label: string, evalHandle: Evaluable){
        let graph = this.s.graphs[label];
        let compute = <(t: number, ...param: Number[])=>Number>evalHandle.compute.bind(evalHandle);
        let color = this.rc();
        let dataInterface;
        switch (evalHandle.visType){
            case 'cartesian':
                dataInterface = (x:number,y:number)=> compute(this.s.time,x,y);
                if(!(graph instanceof CartesianGraph)){
                    let deleted = this.s.removeGraph(label);
                    if(deleted!=undefined)
                        color = deleted.color;
                }
                if(this.s.graphs[label]==undefined){
                    graph = new CartesianGraph(label, dataInterface);
                    graph.constructGeometry({'material':'standard', 'color':color});
                    graph.generateIndices();
                    graph.populate();
                    this.s.addGraph(graph);
                }else{
                    if(graph instanceof CartesianGraph){
                        if(evalHandle.visible)
                            graph.showMesh();
                        graph.dataInterface = dataInterface;
                        graph.populate();
                        graph.update();
                    }
                }
                break;
            case 'cartesianAsync':
                let computeAsync = <(t: number, ...param: Number[])=>Promise<Number>>evalHandle.compute;
                dataInterface = (x:number,y:number)=> computeAsync(this.s.time,x,y);
                if(!(graph instanceof CartesianGraph)){
                    let deleted = this.s.removeGraph(label);
                    if(deleted!=undefined)
                        color = deleted.color;
                }
                if(this.s.graphs[label]==undefined){
                    graph = new CartesianAsyncGraph(label, dataInterface);
                    graph.constructGeometry({'material':'standard', 'color':color});
                    graph.generateIndices();
                    graph.populate();
                    this.s.addGraph(graph);
                }else{
                    if(graph instanceof CartesianAsyncGraph){
                        if(evalHandle.visible)
                            graph.showMesh();
                        graph.asyncInterface = dataInterface;
                        graph.populate();
                        graph.update();
                    }
                }
                break;
            case 'vector':
                let vecInterface = (x:number,y:number,z:number)=>{
                    // @ts-ignore
                    let result = <Number[]>compute(this.s.time, x, y, z).data;
                    let l = result.length;
                    return [(l>0)?+result[0]:0, (l>1)?+result[1]:0, (l>2)?+result[2]:0];
                };
                if(!(graph instanceof Vector3D)){
                    let deleted = this.s.removeGraph(label);
                    if(deleted!=undefined)
                        color = deleted.color;
                }
                if(this.s.graphs[label] == undefined){
                    graph = new Vector3D(label, vecInterface, ()=>[0,0,0]);
                    graph.constructGeometry({'material':'standard', 'color':color});
                    graph.populate();
                    this.s.addGraph(graph);
                }else{
                    if(graph instanceof Vector3D){
                        if(evalHandle.visible)
                            graph.showMesh();
                        graph.vector = vecInterface;
                        graph.populate();
                        graph.update();
                    }
                }
                break;
            case 'vecField':
                dataInterface = (x:number,y:number,z:number)=>{
                    // @ts-ignore
                    let result = <Number[]>compute(this.s.time, x, y, z).data;
                    let l = result.length;
                    return [(l>0)?+result[0]:0, (l>1)?+result[1]:0, (l>2)?+result[2]:0];
                };
                if(!(graph instanceof VecField3D)){
                    let deleted = this.s.removeGraph(label);
                    if(deleted!=undefined)
                        color = deleted.color;
                }
                if(this.s.graphs[label] == undefined){
                    graph = new VecField3D(label, dataInterface);
                    graph.constructGeometry({'material':'standard', 'color':color});
                    graph.populate();
                    if(evalHandle.timeDependent)
                        (<VecField3D> graph).toggleTrace();
                    this.s.addGraph(graph);
                }else{
                    if(graph instanceof VecField3D){
                        if(evalHandle.visible)
                            graph.showMesh();
                        graph.vecFunc = dataInterface;
                        graph.updateVecFunc(dataInterface);
                        graph.populate();
                        graph.update();
                    }
                }
                break;
            case 'parametricSurface':
                dataInterface = (u:number,v:number)=>{
                    // @ts-ignore
                    let result = <Number[]>compute(this.s.time, u, v).data;
                    let l = result.length;
                    return [(l>0)?+result[0]:0, (l>1)?+result[1]:0, (l>2)?+result[2]:0];
                };
                if(!(graph instanceof ParametricSurface)){
                    let deleted = this.s.removeGraph(label);
                    if(deleted!=undefined)
                        color = deleted.color;
                }
                if(this.s.graphs[label] == undefined){
                    graph = new ParametricSurface(label, dataInterface);
                    graph.constructGeometry({'material':'opaque', 'color':color});
                    graph.generateIndices();
                    graph.populate();
                    this.s.addGraph(graph);
                }else{
                    if(graph instanceof ParametricSurface){
                        if(evalHandle.visible)
                            graph.showMesh();
                        graph.dataInterface = dataInterface;
                        graph.populate();
                        graph.update();
                    }
                }
                break;
            case 'parametricCurve':
                dataInterface = (u:number)=>{
                    // @ts-ignore
                    let result = <Number[]>compute(this.s.time, u).data;
                    let l = result.length;
                    return [(l>0)?+result[0]:0, (l>1)?+result[1]:0, (l>2)?+result[2]:0];
                };
                if(!(graph instanceof ParametricLine)){
                    let deleted = this.s.removeGraph(label);
                    if(deleted!=undefined)
                        color = deleted.color;
                }
                if(this.s.graphs[label] == undefined){
                    graph = new ParametricLine(label, dataInterface);
                    graph.constructGeometry({'material':'opaque', 'color':color});
                    graph.generateIndices();
                    graph.populate();
                    this.s.addGraph(graph);
                }else{
                    if(graph instanceof ParametricLine){
                        if(evalHandle.visible)
                            graph.showMesh();
                        graph.dataInterface = dataInterface;
                        graph.populate();
                        graph.update();
                    }
                }
                break;
            case 'group':
                if(evalHandle.subEvaluables.length!=0)
                   switch(evalHandle.subEvaluables[0].visType){
                       case 'cartesian':
                           graph = this.gg(label, CartesianGroup, graph, color,
                               evalHandle,
                               (x:number,y:number)=>
                                   (<Quantity>evalHandle.compute(this.s.time, x, y)).data);
                           break;
                       case 'vector':
                           graph = this.gg(label, Vector3DGroup, graph, color, evalHandle,
                               (x:number,y:number)=>
                                   (<Quantity>evalHandle.compute(this.s.time, x, y)).data);
                           break;
                       case 'parametricSurface':
                           graph = this.gg(label, ParametricGroup, graph, color, evalHandle,
                               (x:number,y:number)=>
                                   (<Quantity>evalHandle.compute(this.s.time, x, y)).data);
                           break;
                   }
        }
        graph.timeDependent = evalHandle.timeDependent;
        if(!evalHandle.visible)
            graph.hideMesh();
        evalHandle.onUpdate(()=>{
            graph.timeDependent = evalHandle.timeDependent;
            graph.populate();
            graph.update();
        });
    }

    //groupGraph
    private gg(label: string, A: { new(label: string, evalHandle: Evaluable, dataInteface: Function): GroupGraph },
               graph: Graph, color: string, evalHandle: Evaluable,
               dataInterface: Function):Graph{
        if(!(graph instanceof A)){
            let deleted = this.s.removeGraph(label);
            if(deleted!=undefined)
                color = deleted.color;
        }
        if(this.s.graphs[label] == undefined){
            graph = new A(label, evalHandle, dataInterface);
            graph.constructGeometry({'material':'standard', 'color':color});
            graph.populate();
            this.s.addGraph(graph);
        }else{
            if(graph instanceof A){
                if(evalHandle.visible)
                    graph.showMesh();
                graph.dataInterface = dataInterface;
                graph.updateGroupSize(evalHandle);
                graph.populate();
                graph.update();
            }
        }
        return graph;
    }
    /**
     * wipeGraph
     * Wipes the graph with the corresponding label
     * @param label
     */
    wg(label: string){
        let graph = this.s.graphs[label];
        if(graph!=undefined){
            graph.hideMesh();
        }
    }

    /**
     * deleteGraph
     * Deletes the graph with the corresponding label
     * @param label
     */
    dg(label: string){
        this.s.removeGraph(label);
    }

    //getHint
    gh(statement: SymNode) {
        return this.e.guessLabel(statement);
    }
    //updateDefinition
    ud(uid: string, oldLabel: SymNode, label: SymNode, definition: SymNode){
        try{
            if(label == undefined) {
                if (oldLabel != undefined)
                    this.dd(oldLabel);
                return;
            }
            if(oldLabel!=undefined &&oldLabel.content!=label.content){
                this.dd(oldLabel);
            }
            this.wg(label.content);
            this.e.resolveEquation(label, uid, definition);
            let variable = this.e.environment.variables[label.content];
            this.ug(variable.name,variable.evalHandle);
        }catch (e) {
            console.log(e);
        }
    }
    //deleteDefinition
    dd(label: SymNode){
        this.e.deleteDefinition(label.content);
        this.dg(label.content);
    }
    //setFieldPlugins
    sfp(uid: string, plugins: string[]){
        UI.defControls[uid].setFieldPlugins(plugins);
    }
    setInvisible(label: SymNode){
        let variable = this.e.environment.variables[label.content];
        if(variable==undefined)
            return;
        let evalHandle = variable.evalHandle;
        let graph = this.s.graphs[label.content];
        evalHandle.visible = false;
        graph.hideMesh();
    }
    //toggleVisibility
    tv(label: SymNode){
        let evalHandle = this.e.environment.variables[label.content].evalHandle;
        let graph = this.s.graphs[label.content];
        if(graph instanceof VecField3D){
            if(evalHandle!=undefined){
                if(!evalHandle.visible){
                    evalHandle.visible = true;
                    graph.toggleTrace();
                }else {
                    if(graph.trace == true)
                        graph.toggleTrace();
                    else
                        evalHandle.visible = false;
                }

                if(evalHandle.visible)
                    graph.showMesh();
                else
                    graph.hideMesh();
            }
            return;
        }
        if(evalHandle!=undefined)
            evalHandle.visible = !evalHandle.visible;
        if(graph!=undefined){
            if(evalHandle.visible)
                graph.showMesh();
            else
                graph.hideMesh();
        }
    }
    /**
     * queryColor
     * Queries for the color of a particular graph with
     * specified label
     */
    qc(label: SymNode){
        if(this.s.graphs[label.content]!=undefined){
            return this.s.graphs[label.content].queryColor();
        }
        else
            return -1;
    }
    /**
     * canvasResized
     *
     * Makes an active call to resize the canvas, especially useful
     * for UI drag bar updates
     */
    cr(){
        this.s.onResize();
    }
    hideAll(){
        for(let varName in this.s.graphs){
            let evalHandle = this.e.environment.variables[varName].evalHandle;
            let graph = this.s.graphs[varName];
            evalHandle.visible = false;
            graph.hideMesh();
        }
        }
}
let p: Pendulum;

$(()=>{
    let canvas:Canvas = init();

    // let gridHelper = new THREE.GridHelper(12, 12);
    // gridHelper.rotateX(Math.PI/2);
    // canvas.scene.add(gridHelper);
    //
    // let gridHelper2 = new THREE.GridHelper(12, 12);
    // gridHelper2.rotateZ(Math.PI/2);
    // canvas.scene.add(gridHelper2);
    //
    // let gridHelper3 = new THREE.GridHelper(12, 12);
    // canvas.scene.add(gridHelper3);
    //
    // let axesHelper = new THREE.AxesHelper(7);
    // canvas.scene.add(axesHelper);

    // let vector = new Vector3D("example", [1,0,0], [1,1,2]);
    // vector.constructGeometry({'color': 'lightgray'});
    // vector.generateIndices();
    // vector.populate();
    // canvas.addGraph(vector);

    // let vector1 = new Vector3D("example", [1,2,3], [-1,-1,-2]);
    // vector1.constructGeometry({'color': 'blue'});
    // vector1.generateIndices();
    // vector1.populate();
    // canvas.addGraph(vector1);

    p = new Pendulum(canvas);
    UI.load(p);
    canvas.onResize();
    // p.updateGraph("sinusoidal", (x,y)=>Math.cos(x*3+p.canvas.time));

    // let graph2 = new CartesianGraph("cosinusoidal",(x,y)=>x*y*Math.cos(y+canvas.time)/4);
    // graph2.constructGeometry({'material':'standard', 'color':'purple'});
    // graph2.generateIndices();
    // graph2.populate();
    // canvas.addGraph(graph2);

    // let graph3 = new CartesianGraph2D('sin', (x)=>Math.cos(x));
    // graph3.constructGeometry({'color':'purple'});
    // graph3.generateIndices();
    // graph3.populate();
    // canvas.addGraph(graph3)
    // cylindricalSteppedPressure(canvas);
    // graphCylindrical(canvas);
    // ode(canvas);

//@ts-ignore
//     window.Portal = Portal;
});

export {Pendulum};