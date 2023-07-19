//07/18/2021
import * as THREE from 'three';
// @ts-ignore
window.THREE = THREE;
import {AxesHelper, GridHelper, WebGLRenderer} from "three";

import "three/examples/js/controls/OrbitControls";
import {B} from './core';
import './graph';
import {G, CG, loadRenderer} from "./graph";


/**
 * Canvas
 * Container of THREE elements for imperative manipulation of the canvas
 */
class C {
    public camera: THREE.Camera;
    public scene: THREE.Scene;
    public renderer: THREE.WebGLRenderer;
    public graphs: {[key: string]:G}={};
    public htmlElement: HTMLElement;
    public width:number;
    public height: number;
    public time: number = 0;
    public config: {perspective: boolean,
                    dpp: number};
    public gridHelper: GridHelper[] = [];
    public axesHelper: AxesHelper;

    constructor(camera: THREE.Camera, scene: THREE.Scene,
                renderer: THREE.WebGLRenderer, config: {perspective: boolean, dpp:number}, htmlElement: HTMLElement) {
        this.htmlElement = htmlElement;
        this.camera = camera;
        this.scene = scene;
        this.renderer = renderer;
        this.config = config;
        htmlElement.appendChild( renderer.domElement );
        window.addEventListener("resize", this.onResize.bind(this));
        this.al();

        // @ts-ignore
        let control = new THREE.OrbitControls(camera, renderer.domElement);
        control.addEventListener('change', this.ocu.bind(this));

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

        let gridHelper = new THREE.GridHelper(12, 12);
        gridHelper.rotateX(Math.PI/2);
        this.scene.add(gridHelper);
        this.gridHelper.push(gridHelper);

        let gridHelper2 = new THREE.GridHelper(12, 12);
        gridHelper2.rotateZ(Math.PI/2);
        this.scene.add(gridHelper2);
        this.gridHelper.push(gridHelper2);

        let gridHelper3 = new THREE.GridHelper(12, 12);
        this.scene.add(gridHelper3);
        this.gridHelper.push(gridHelper3);

        let axesHelper = new THREE.AxesHelper(7);
        this.scene.add(axesHelper);
        this.axesHelper = axesHelper;

        this.onResize();
    }

    //animate
    a(){
        this.renderer.setAnimationLoop( this.n.bind(this) );
    }

    //animation
    n(time: number ) {
        this.time = time/1000;
        for(let key in this.graphs){
            let graph: G = this.graphs[key];
            graph.ut();
        }
        this.renderer.render( this.scene, this.camera );
    }

    //addGraph
    ag(graph: G){
        graph.u();
        graph.p = this.camera.position;
        this.graphs[graph.n] = graph;
        this.scene.add(graph.s);
    }

    //removeGraph
    rg(name: string){
        let object = this.scene.getObjectByName(name);
        this.scene.remove( object );
        let graph = this.graphs[name];
        delete this.graphs[name];
        return graph
    }

    //onCameraUpdate
    ocu(){
        this.updateCameraOrientation();
    }

    /**
     * updateCameraOrientation
     * Called when orbit control changes the camera orientation;
     */
    updateCameraOrientation(){
        for(let key in this.graphs){
            this.graphs[key].uo();
        }
    }

    //onResize
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

    /**
     * attachCameraScaleListener
     * Listens for camera movements and reapply bounds accordingly
     */
    al(){
        window.addEventListener('wheel', (e)=>{
            if(!e.ctrlKey)
                return;
            let scale = new THREE.Vector3(1,1,1).applyMatrix4(this.camera.projectionMatrixInverse);
            scale.z = scale.y;
            scale.x = scale.y;
            this.updateScale(scale)
        });
    }
    getScale(){
        let scale = new THREE.Vector3(1,1,1).applyMatrix4(this.camera.projectionMatrixInverse);
        scale.z = scale.y;
        scale.x = scale.y;
        return scale;
    }
    updateScale(scale: THREE.Vector3){
        for(let key in this.graphs){
            let graph = this.graphs[key];
            graph.sb(
                [[-scale.x/2, scale.x/2],
                    [-scale.y/2, scale.y/2],
                    [-scale.z/2, scale.z/2]]);
            graph.pu();
            graph.u();
        }
    }
}

//init
function i() {

    let camera: THREE.Camera, scene: THREE.Scene, renderer: WebGLRenderer;
    // camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
    let dpp = 30;
    let htmlElement = document.getElementById("graphpanel");
    let width = htmlElement.offsetWidth;
    let height = htmlElement.offsetHeight;
    camera = new THREE.OrthographicCamera(-width/2/dpp, width/2/dpp,
            height/2/dpp, -height/2/dpp, -2000, 2000);
    camera.position.y = -12;
    //camera.position.z = 10;
    camera.lookAt(0, 0, 0);
    camera.up.set(0, 0, 1);
    //camera.up.set(0, 1, 0);

    scene = new THREE.Scene();

    const near = 7;
    const far = 25;
    const color = 'lightgray';
    scene.fog = new THREE.Fog(color, near, far);

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor( 0x000000, 0.0 );
    loadRenderer(renderer);
    renderer.localClippingEnabled = true;

    let canvas = new C(camera, scene, renderer, {perspective: true, dpp: dpp},
        document.getElementById("graphpanel"));

    canvas.a();
    return canvas;
}

function makeGraph(variable:B, type: string){

}

export {i, C, G, CG};