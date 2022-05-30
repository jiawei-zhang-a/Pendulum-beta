import * as UI from './ui';
import './benchmarks.ts';
import {init, Canvas, Graph, CartesianGraph} from './graphics';
import * as THREE from 'three';
import {Vector3} from "three";
import {CartesianGraph2D, Vector3D, colors} from "./graph";
import {Core, ResolutionError} from "./core";
import {SymNode} from "./parser";
// import {init} from "./helloworld";

// Coordinator of all actions of sub-modules
class Pendulum{
    core: Core;
    canvas: Canvas;
    colorNames: string[];
    constructor(canvas: Canvas){
        this.canvas = canvas;
        this.core = new Core();
        this.colorNames = Object.keys(colors);
    }
    colorIndex = 0;
    rotateColor(){
        let modulo = 6;
        let colorName = this.colorNames[this.colorIndex%modulo];
        this.colorIndex++;
        return colorName;
    }
    updateGraph(label: string, dataInterface: (x: number, y: number) => number){
        let graph = this.canvas.graphs[label];
        if(graph==undefined){
            graph = new CartesianGraph(label,dataInterface);
            graph.constructGeometry({'material':'standard', 'color':this.rotateColor()});
            graph.generateIndices();
            graph.populate();
            this.canvas.addGraph(graph);
        }else{
            if(graph instanceof CartesianGraph){
                graph.mesh.visible = true;
                graph.dataInterface = dataInterface;
                graph.populate();
            }
        }
    }

    /**
     * Wipes the graph with the corresponding label
     * @param label
     */
    wipeGraph(label: string){
        let graph = this.canvas.graphs[label];
        if(graph!=undefined){
            graph.mesh.visible = false;
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
    updateDefinition(label: SymNode, definition: SymNode){
        try{
            if(label == undefined)
                return;
            this.core.resolveEquation(label, definition);
            let variable = this.core.environment.variables[label.content];
            variable.loadVisualization(this);
        }catch (e) {
            console.log(e);
            this.wipeGraph(label.content);
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

    let vector = new Vector3D("example", [1,0,0], [1,1,2]);
    vector.constructGeometry({'color': 'lightgray'});
    vector.generateIndices();
    vector.populate();
    canvas.addGraph(vector);

    let vector1 = new Vector3D("example", [1,2,3], [-1,-1,-2]);
    vector1.constructGeometry({'color': 'blue'});
    vector1.generateIndices();
    vector1.populate();
    canvas.addGraph(vector1);

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
})

export {Pendulum}