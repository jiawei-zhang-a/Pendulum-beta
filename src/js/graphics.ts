//07/18/2021
import * as THREE from 'three';
// @ts-ignore
window.THREE = THREE;
import {WebGLRenderer} from "three";

import "three/examples/js/controls/OrbitControls";
import {Variable} from './core';
import './graph';
import {Graph, CartesianGraph} from "./graph";


/**
 * Container of THREE elements for imperative manipulation of the canvas
 */
class Canvas{
    public camera: THREE.Camera;
    public scene: THREE.Scene;
    public renderer: THREE.WebGLRenderer;
    public graphs: {[key: string]:Graph}={};
    public htmlElement: HTMLElement;
    public width:number;
    public height: number;
    public time: number = 0;
    public config: {perspective: boolean,
                    dpp: number};

    constructor(camera: THREE.Camera, scene: THREE.Scene,
                renderer: THREE.WebGLRenderer, config: {perspective: boolean, dpp:number}, htmlElement: HTMLElement) {
        this.htmlElement = htmlElement;
        this.camera = camera;
        this.scene = scene;
        this.renderer = renderer;
        this.config = config;
        htmlElement.appendChild( renderer.domElement );
        window.addEventListener("resize", this.onResize.bind(this));
        this.onResize();
    }

    animate(){
        this.renderer.setAnimationLoop( this.animation.bind(this) );
    }

    animation( time: number ) {
        this.time = time/200;
        for(let key in this.graphs){
            let graph: Graph = this.graphs[key];
            graph.updateTime();
        }
        this.renderer.render( this.scene, this.camera );
    }

    addGraph(graph: Graph){
        graph.update();
        graph.cameraPosition = this.camera.position;
        this.graphs[graph.name] = graph;
        this.scene.add(graph.mesh);
    }

    removeGraph(name: string){
        let object = this.scene.getObjectByName(name);
        this.scene.remove( object );
        let graph = this.graphs[name];
        delete this.graphs[name];
        return graph
    }

    /**
     * Called when orbit control changes the camera orientation;
     */
    updateCameraOrientation(){
        for(let key in this.graphs){
            this.graphs[key].updateOrientation();
        }
    }

    onResize() {
        this.width = this.htmlElement.offsetWidth;
        this.height = this.htmlElement.offsetHeight;
        // $(this.htmlElement).outerWidth(this.width);
        // $(this.htmlElement).outerHeight(this.height);
        this.renderer.setSize(this.width, this.height);
        if (this.camera instanceof THREE.PerspectiveCamera) {
            this.camera.aspect = this.width / this.height;
            this.camera.updateProjectionMatrix();
        }
        if (this.camera instanceof THREE.OrthographicCamera) {
            this.camera.left = -this.width/2/this.config.dpp;
            this.camera.right = this.width/2/this.config.dpp;
            this.camera.bottom = -this.height/2/this.config.dpp;
            this.camera.top = this.height/2/this.config.dpp;
            this.camera.updateProjectionMatrix();
        }
    }
}

function init() {

    let camera: THREE.Camera, scene: THREE.Scene, renderer: WebGLRenderer;
    //camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
    let dpp = 30;
    let htmlElement = document.getElementById("graphpanel");
    let width = htmlElement.offsetWidth;
    let height = htmlElement.offsetHeight
    camera = new THREE.OrthographicCamera(-width/2/dpp, width/2/dpp,
            height/2/dpp, -height/2/dpp, 0.1, 2000);
    camera.position.y = -12;
    //camera.position.z = 10;
    camera.lookAt(0, 0, 0);
    camera.up.set(0, 0, 1);
    //camera.up.set(0, 1, 0);


    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.localClippingEnabled = true;

    let canvas = new Canvas(camera, scene, renderer, {perspective: true, dpp: dpp},
        document.getElementById("graphpanel"));

    // @ts-ignore
    let control = new THREE.OrbitControls(camera, renderer.domElement);
    control.addEventListener('change', ()=>canvas.updateCameraOrientation());

    // new OrbitalControlUpdater(tr, canvas);
    let light1 = new THREE.DirectionalLight(0xffffff, 0.5);
    light1.position.set(0, 0, 5);
    scene.add(light1);
    let light2 = new THREE.DirectionalLight(0xffffff, 0.5);
    light2.position.set(0, 0, -5);
    scene.add(light2);
    let light3 = new THREE.AmbientLight(0xffffff, 0.5);
    light3.position.set(0, -5, 0);
    scene.add(light3);

    canvas.animate();
    return canvas;
}

function makeGraph(variable:Variable, type: string){

}

export {init, Canvas, Graph, CartesianGraph};