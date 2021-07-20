import * as UI from './ui';
import './experiment';
import {init, Canvas, Graph, CartesianGraph} from './graphics';
import * as THREE from 'three';
// import {init} from "./helloworld";

$(()=>{
   let canvas:Canvas = init();
    UI.loadTags();
    UI.loadShelves();
    UI.loadReference();

    let graph = new CartesianGraph("sinusoidal");
    graph.constructGeometry({'material':'normal'});
    graph.generateIndices();
    graph.populate((x,y)=>Math.sin(x)+Math.sin(y));
    canvas.addGraph(graph);

    let graph2 = new CartesianGraph("cosinusoidal");
    graph2.constructGeometry({'material':'standard', 'color':'orange'});
    graph2.generateIndices();
    graph2.populate((x,y)=>x*x+Math.cos(y));
    canvas.addGraph(graph2);

    let axesHelper = new THREE.AxesHelper(6);
    canvas.scene.add(axesHelper);

    let gridHelper = new THREE.GridHelper(12, 12);
    gridHelper.rotateX(Math.PI/2);
    canvas.scene.add(gridHelper);

    let gridHelper2 = new THREE.GridHelper(12, 12);
    gridHelper2.rotateZ(Math.PI/2);
    canvas.scene.add(gridHelper2);

    let gridHelper3 = new THREE.GridHelper(12, 12);
    canvas.scene.add(gridHelper3);
})
