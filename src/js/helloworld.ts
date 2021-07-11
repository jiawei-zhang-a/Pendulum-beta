// @ts-ignore
import * as THREE from 'three';
import {WebGLRenderer} from "three";

let camera: THREE.Camera, scene: THREE.Scene, renderer: WebGLRenderer;
let geometry: THREE.BoxGeometry, material, mesh: THREE.Mesh;

function init() {

    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 10 );
    camera.position.z = 1;

    scene = new THREE.Scene();

    geometry = new THREE.BoxGeometry( 0.5, 0.5, 0.5 );
    material = new THREE.MeshNormalMaterial();

    mesh = new THREE.Mesh( geometry, material );
    scene.add( mesh );

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setAnimationLoop( animation );
    document.getElementById("graphpanel").appendChild( renderer.domElement );

}

function animation( time: number ) {

    mesh.rotation.x = time /1000;
    mesh.rotation.y = time / 1000;
    mesh.scale.set(Math.cos(time/3000),Math.cos(time/4000), Math.cos(time/1000));
    renderer.render( scene, camera );

}

export {init};