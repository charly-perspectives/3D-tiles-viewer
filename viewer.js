import { 
  Scene, 
  PerspectiveCamera, 
  WebGLRenderer, 
  Clock,
  sRGBEncoding,
  Vector3,
  AmbientLight,
  MeshPhongMaterial,
  PointLight,
} from 'three';

import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { Loader3DTiles } from 'three-loader-3dtiles';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import StatsWidget from '@probe.gl/stats-widget';
const canvasParent = document.querySelector('#canvas-parent');
const statsParent = document.querySelector('#stats-widget')

const clock = new Clock();
const scene = new Scene();
const renderer = new WebGLRenderer();
renderer.outputEncoding = sRGBEncoding;
const camera = new PerspectiveCamera(
  35,
  1,
  0.01,
  1000,
);

// camera parameters
camera.fov = 80;
camera.position.x = 0;
camera.position.y = 0;
camera.position.z = 20;
camera.up.set(0,0,1);

// user parameters
let flyspeed = 100; 
let showBoundingBox = true;
let tilesetPath = 'public/cesium-example/tileset.json';

//controls initialization
let controls = new PointerLockControls(camera, canvasParent)
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let prevTime = performance.now();
const velocity = new  Vector3();
const direction = new  Vector3();
const ambientLight = new AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const pointLight = new PointLight(0xffffff, 0.5);
pointLight.position.x = 50;
pointLight.position.y = 50;
pointLight.position.z = 50;
scene.add(pointLight);
  
canvasParent.appendChild(renderer.domElement);
const threeJsStats = new Stats();
threeJsStats.domElement.style.position = 'absolute';
threeJsStats.domElement.style.top = '10px';
threeJsStats.domElement.style.left = '10px';
canvasParent.appendChild( threeJsStats.domElement );

let tilesRuntime = [];
let statsRuntime = [];

const onKeyDown = function ( event ) {

  switch ( event.code ) {

    case 'ArrowUp':
    case 'KeyW':
      moveForward = true;
      break;

    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = true;
      break;

    case 'ArrowDown':
    case 'KeyS':
      moveBackward = true;
      break;

    case 'ArrowRight':
    case 'KeyD':
      moveRight = true;
      break;

    case 'Space':
      //if ( canJump === true ) velocity.y += 350;
      //canJump = false;
      break;

  }

};

const onKeyUp = function ( event ) {

  switch ( event.code ) {

    case 'ArrowUp':
    case 'KeyW':
      moveForward = false;
      break;

    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = false;
      break;

    case 'ArrowDown':
    case 'KeyS':
      moveBackward = false;
      break;

    case 'ArrowRight':
    case 'KeyD':
      moveRight = false;
      break;

  }

};

document.addEventListener( 'keydown', onKeyDown );
document.addEventListener( 'keyup', onKeyUp );
document.addEventListener( 'click', function () { controls.lock(); });

await loadTileset(tilesetPath);

async function loadTileset( tilesetPath ) {

  let material = new MeshPhongMaterial({ color: 0xff7f50, wireframe: true, transparent: true, opacity: 1, flatShading: true });
  const result = await Loader3DTiles.load({
    url: tilesetPath,
    renderer: renderer,
    options: {
    material: material,
    throttleRequests: true, 
    maxRequests: 64,              
    updateInterval: 0.1, 
    maxConcurrency: 1, 
    maximumMemoryUsage: 160, 
    viewDistanceScale: 0.5, 
     debug: showBoundingBox,
    maximumScreenSpaceError: 260,
    }
  });

  const {model, runtime} = result;
  model.scale.set(-1,1,1);
  tilesRuntime.push(runtime);
  scene.add(model);

  if(showBoundingBox) { 
    scene.add(runtime.getTileBoxes());
  }

  let localStatsRuntime = new StatsWidget(runtime.getStats(), {container: statsParent });
  statsParent.style.visibility = 'visible';
  statsRuntime.push(localStatsRuntime);
}

function render(t) {

  const time = performance.now();
  document.getElementById("guide").innerHTML = renderer.info.render.triangles;
  if (controls.isLocked === true) {
    const delta = ( time - prevTime ) / 1000;
    
    let factor = 10.0;
    velocity.x -= velocity.x * factor * delta;
    velocity.z -= velocity.z * factor * delta;
    velocity.y -= velocity.z * factor * delta;
    direction.z = Number( moveForward ) - Number( moveBackward );
    direction.x = Number( moveRight ) - Number( moveLeft );
    direction.normalize();
    if ( moveForward || moveBackward ) velocity.z -= direction.z * flyspeed * delta;
    if ( moveLeft || moveRight ) velocity.x -= direction.x * flyspeed * delta;
    controls.moveRight(-velocity.x * delta);
    var direction2 = new  Vector3();
    camera.updateMatrixWorld();
    camera.getWorldDirection(direction2);
    var distance = -velocity.z * delta;
    controls.getObject().position.add(direction2.multiplyScalar(distance));
  }

  prevTime = time;
  const dt = clock.getDelta()

  if (tilesRuntime.length > 0 ) {
    for( let run in tilesRuntime ) {
      tilesRuntime[run].update(dt, renderer, camera);
    }
  }

  if (statsRuntime.length > 0) {
    for( let run in tilesRuntime ) {
      statsRuntime[run].update(); 
    }	  
  }

  renderer.render(scene, camera);
  threeJsStats.update();
  window.requestAnimationFrame(render);

}

onWindowResize();

function onWindowResize() {
  renderer.setSize(canvasParent.clientWidth, canvasParent.clientHeight);
  camera.aspect = canvasParent.clientWidth / canvasParent.clientHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onWindowResize)

render();



