import * as UI from './ui';
import {init, Canvas, Graph, CartesianGraph} from './graphics';
import * as THREE from 'three';
import {
    CartesianGraph2D,
    CartesianGroup,
    ComplexCartesianGraph,
    Vector3D,
    colors,
    VecField3D,
    GroupGraph,
    ParametricSurface,
    Vector3DGroup, ParametricGroup
} from "./graph";
import {Core, Evaluable, Quantity, ResolutionError} from "./core";
import {SymNode} from "./parser";
import {cylindricalSteppedPressure} from "./program";

// Coordinator of all actions of sub-modules
class Pendulum{
    core: Core;
    canvas: Canvas;
    colorNames: string[];
    constructor(canvas: Canvas){
        this.canvas = canvas;
        this.core = new Core();
        this.colorNames = Object.keys(colors);
        //@ts-ignore
        window.Pendulum = this;
    }
    colorIndex = 0;
    rotateColor(){
        let modulo = 6;
        let colorName = this.colorNames[this.colorIndex%modulo];
        this.colorIndex++;
        return colorName;
    }
    updateGraph(label: string, evalHandle: Evaluable){
        let graph = this.canvas.graphs[label];
        let compute = evalHandle.compute.bind(evalHandle);
        let color = this.rotateColor();
        let dataInterface;
        switch (evalHandle.visType){
            case 'cartesian':
                dataInterface = (x:number,y:number)=> compute(this.canvas.time,x,y);
                if(!(graph instanceof CartesianGraph)){
                    let deleted = this.canvas.removeGraph(label);
                    if(deleted!=undefined)
                        color = deleted.color;
                }
                if(this.canvas.graphs[label]==undefined){
                    graph = new CartesianGraph(label, dataInterface);
                    graph.constructGeometry({'material':'standard', 'color':color});
                    graph.generateIndices();
                    graph.populate();
                    this.canvas.addGraph(graph);
                }else{
                    if(graph instanceof CartesianGraph){
                        graph.showMesh();
                        graph.dataInterface = dataInterface;
                        graph.populate();
                        graph.update();
                    }
                }
                break;
            case 'vector':
                let vecInterface = (x:number,y:number,z:number)=>{
                    // @ts-ignore
                    let result = <Number[]>compute(this.canvas.time, x, y, z).data;
                    let l = result.length;
                    return [(l>0)?+result[0]:0, (l>1)?+result[1]:0, (l>2)?+result[2]:0];
                };
                if(!(graph instanceof Vector3D)){
                    let deleted = this.canvas.removeGraph(label);
                    if(deleted!=undefined)
                        color = deleted.color;
                }
                if(this.canvas.graphs[label] == undefined){
                    graph = new Vector3D(label, vecInterface, ()=>[0,0,0]);
                    graph.constructGeometry({'material':'standard', 'color':color});
                    graph.populate();
                    this.canvas.addGraph(graph);
                }else{
                    if(graph instanceof Vector3D){
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
                    let result = <Number[]>compute(this.canvas.time, x, y, z).data;
                    let l = result.length;
                    return [(l>0)?+result[0]:0, (l>1)?+result[1]:0, (l>2)?+result[2]:0];
                };
                if(!(graph instanceof VecField3D)){
                    let deleted = this.canvas.removeGraph(label);
                    if(deleted!=undefined)
                        color = deleted.color;
                }
                if(this.canvas.graphs[label] == undefined){
                    graph = new VecField3D(label, dataInterface);
                    graph.constructGeometry({'material':'standard', 'color':color});
                    graph.populate();
                    this.canvas.addGraph(graph);
                }else{
                    if(graph instanceof VecField3D){
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
                    let result = <Number[]>compute(this.canvas.time, u, v).data;
                    let l = result.length;
                    return [(l>0)?+result[0]:0, (l>1)?+result[1]:0, (l>2)?+result[2]:0];
                };
                if(!(graph instanceof ParametricSurface)){
                    let deleted = this.canvas.removeGraph(label);
                    if(deleted!=undefined)
                        color = deleted.color;
                }
                if(this.canvas.graphs[label] == undefined){
                    graph = new ParametricSurface(label, dataInterface);
                    graph.constructGeometry({'material':'standard', 'color':color});
                    graph.generateIndices();
                    graph.populate();
                    this.canvas.addGraph(graph);
                }else{
                    if(graph instanceof ParametricSurface){
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
                           graph = this.groupGraph(label, CartesianGroup, graph, color,
                               evalHandle,
                               (x:number,y:number)=>
                                   (<Quantity>evalHandle.compute(this.canvas.time, x, y)).data);
                           break;
                       case 'vector':
                           graph = this.groupGraph(label, Vector3DGroup, graph, color, evalHandle,
                               (x:number,y:number)=>
                                   (<Quantity>evalHandle.compute(this.canvas.time, x, y)).data);
                           break;
                       case 'parametricSurface':
                           graph = this.groupGraph(label, ParametricGroup, graph, color, evalHandle,
                               (x:number,y:number)=>
                                   (<Quantity>evalHandle.compute(this.canvas.time, x, y)).data);
                           break;
                   }
        }
        graph.timeDependent = evalHandle.timeDependent;
        evalHandle.onUpdate(()=>graph.timeDependent = evalHandle.timeDependent);
    }

    groupGraph(label: string, A: { new(label: string, evalHandle: Evaluable, dataInteface: Function): GroupGraph },
               graph: Graph, color: string, evalHandle: Evaluable,
               dataInterface: Function):Graph{
        if(!(graph instanceof A)){
            let deleted = this.canvas.removeGraph(label);
            if(deleted!=undefined)
                color = deleted.color;
        }
        if(this.canvas.graphs[label] == undefined){
            graph = new A(label, evalHandle, dataInterface);
            graph.constructGeometry({'material':'standard', 'color':color});
            graph.populate();
            this.canvas.addGraph(graph);
        }else{
            if(graph instanceof A){
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
     * Wipes the graph with the corresponding label
     * @param label
     */
    wipeGraph(label: string){
        let graph = this.canvas.graphs[label];
        if(graph!=undefined){
            graph.hideMesh();
        }
    }

    /**
     * Deletes the graph with the corresponding label
     * @param label
     */
    deleteGraph(label: string){
        this.canvas.removeGraph(label);
    }

    getHint(statement: SymNode) {
        return this.core.guessLabel(statement);
    }
    updateDefinition(oldLabel: SymNode, label: SymNode, definition: SymNode){
        try{
            if(label == undefined) {
                if (oldLabel != undefined)
                    this.deleteDefinition(oldLabel);
                return;
            }
            if(oldLabel!=undefined &&oldLabel.content!=label.content){
                this.deleteDefinition(oldLabel);
            }
            this.wipeGraph(label.content);
            this.core.resolveEquation(label, definition);
            let variable = this.core.environment.variables[label.content];
            this.updateGraph(variable.name,variable.evalHandle);
        }catch (e) {
            console.log(e);
        }
    }
    deleteDefinition(label: SymNode){
        this.core.deleteDefinition(label.content);
        this.deleteGraph(label.content);
    }
    toggleVisibility(label: SymNode){
        let graph = this.canvas.graphs[label.content];
        if(graph!=undefined){
            if(graph.mesh.visible)
                graph.hideMesh();
            else
                graph.showMesh();
        }
    }
    /**
     * Queries for the color of a particular graph with
     * specified label
     */
    queryColor(label: SymNode){
        if(this.canvas.graphs[label.content]!=undefined){
            return this.canvas.graphs[label.content].queryColor();
        }
        else
            return -1;
    }

    /**
     * Makes an active call to resize the canvas, especially useful
     * for UI drag bar updates
     */
    canvasResized(){
        this.canvas.onResize();
    }
}
let p: Pendulum;

$(()=>{
    let canvas:Canvas = init();

    let gridHelper = new THREE.GridHelper(12, 12);
    gridHelper.rotateX(Math.PI/2);
    canvas.scene.add(gridHelper);

    let gridHelper2 = new THREE.GridHelper(12, 12);
    gridHelper2.rotateZ(Math.PI/2);
    canvas.scene.add(gridHelper2);

    let gridHelper3 = new THREE.GridHelper(12, 12);
    canvas.scene.add(gridHelper3);

    let axesHelper = new THREE.AxesHelper(7);
    canvas.scene.add(axesHelper);

    // let vector = new Vector3D("example", [1,0,0], [1,1,2]);
    // vector.constructGeometry({'color': 'lightgray'});
    // vector.generateIndices();
    // vector.populate();
    // canvas.addGraph(vector);
    //
    // let vector1 = new Vector3D("example", [1,2,3], [-1,-1,-2]);
    // vector1.constructGeometry({'color': 'blue'});
    // vector1.generateIndices();
    // vector1.populate();
    // canvas.addGraph(vector1);

    p = new Pendulum(canvas);
    UI.load(p);
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
})

export {Pendulum}