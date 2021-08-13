import * as UI from './ui';
import './experiment';
import {init, Canvas, Graph, CartesianGraph} from './graphics';
import * as THREE from 'three';
import {Vector3} from "three";
import {CartesianGraph2D} from "./graph";
// import {init} from "./helloworld";

$(()=>{
    let canvas:Canvas = init();
    UI.loadTags();
    UI.loadShelves();
    UI.loadReference();

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

    let graph = new CartesianGraph("sinusoidal",
        (x,y)=>Math.cos(x*3+canvas.time));
    graph.constructGeometry({'material':'standard', 'color':'purple'});
    graph.generateIndices();
    graph.populate();
    canvas.addGraph(graph);

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
