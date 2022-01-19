import * as UI from './ui';
import './experiment';
import {init, Canvas, Graph, CartesianGraph} from './graphics';
import * as THREE from 'three';
import {Vector3} from "three";
import {CartesianGraph2D, colors} from "./graph";
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
    updateDefinition(label: string, definition: SymNode){
        try{
            this.core.resolveEquation(label, definition);
            let variable = this.core.environment.variables[label];
            variable.loadVisualization(this);
        }catch (e) {
            console.log(e);
            this.wipeGraph(label);
        }
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

    p = new Pendulum(canvas);
    UI.loadPendulum(p);
    UI.loadTags();
    UI.loadShelves();
    UI.loadReference();
    // p.updateGraph("sinusoidal", (x,y)=>Math.cos(x*3+p.canvas.time));

    // let graph2 = new CartesianGraph("cosinusoidal",(x,y)=>x*y*Math.cos(y+canvas.time));
    // graph2.constructGeometry({'material':'standard', 'color':'purple'});
    // graph2.generateIndices();
    // graph2.populate();
    // canvas.addGraph(graph2);
    //
    // let graph3 = new CartesianGraph2D('sin', (x)=>Math.cos(x));
    // graph3.constructGeometry({'color':'purple'});
    // graph3.generateIndices();
    // graph3.populate();
    // canvas.addGraph(graph3)
})

export {Pendulum}