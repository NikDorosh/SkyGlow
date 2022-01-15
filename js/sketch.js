import  fragmentShader  from '../shaders/fragment.js';
import Stats from '../libs/stats.js';
import { GUI } from '../libs/lil-gui/dist/lil-gui.esm.js';
const canvas = document.querySelector('#c');
const stats = Stats()
document.body.appendChild(stats.dom)
let scene,camera,renderer;
let analyser, dataArray=0;
let ContinuesTime = 0;
let gui = new GUI();
let uniforms;
var obj = {
  Start: function() {
    navigator.mediaDevices.getUserMedia( { audio: true, video: false } ).then( handleSuccess );
    var listener = new THREE.AudioListener();
    var audio = new THREE.Audio( listener );
    var fftSize = 2048;

    function handleSuccess( stream ) {
      var context = listener.context;
      var source = context.createMediaStreamSource( stream );
      audio.setNodeSource( source );
    }

    audio.gain.disconnect();//DISABLE FEEDBACK
    analyser = new THREE.AudioAnalyser(audio,fftSize)
    analyser.analyser.maxDecibels = -3;
    analyser.analyser.minDecibels = -100;
    dataArray = analyser.data;
    LowPassSpect();
    startButton.disable();
    stopButton.enable();
  },
  Stop: function(){document.location.reload();},
  NumberOfSamples:1,
}   
const startButton = gui.add( obj, 'Start' ); 	// button
const stopButton = gui.add( obj, 'Stop' ).disable(); 	// button
const folder2 = gui.addFolder( 'Lowpass' );
folder2.add(obj,'NumberOfSamples',1,50,1);
const folder3 = gui.addFolder('SomeFolder');

init();
animate();

function init() {
        camera = new THREE.OrthographicCamera(
              -1, // left
              1, // right
              1, // top
              -1, // bottom
              -1, // near,
              1, // far
        );
        scene = new THREE.Scene();
        const plane = new THREE.PlaneGeometry(2, 2);
        uniforms = {
          iSpeed: { value: 0 },
          iDate:{value:new THREE.Vector4(0.0)},
          iTime: {value: 0},
          iResolution: { value: new THREE.Vector3()},
          iMouse:{ value: new THREE.Vector2()} ,
          iScale: { value: 0 },
          iBright: { value:new THREE.Vector3(0.0,0.0,0.0) },
          iRotate:{value:new THREE.Vector3(0.34,0,0)},
          iShadows: {value: 1},
          iContinuousRotate:{value:0}
        }
        const material = new THREE.ShaderMaterial({
          uniforms: uniforms,
          fragmentShader
          });
        const mesh = new THREE.Mesh(plane, material)
        scene.add(mesh);
        renderer = new THREE.WebGLRenderer({canvas});
        renderer.setPixelRatio(window.devicePixelRatio);
        onWindowResize();
        window.addEventListener('resize',onWindowResize);

}
function onWindowResize(){
  renderer.setSize(window.innerWidth,window.innerHeight);
}      
function map_range(value, low1, high1, low2, high2) {
  return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}
function LowPassSpect(){
  let square = 0;
  let mean = 0, root = 0;
  for (let i = 0; i < folder2.controllers[0].object.NumberOfSamples; i++) {
    if(dataArray!=0)
      square += Math.pow(dataArray[i], 2);
    }
  mean = (square / folder2.controllers[0].object.NumberOfSamples);
  root = Math.sqrt(mean);
  return parseInt(root,10);
}
function animate(){
        requestAnimationFrame(animate);
        if(dataArray!=0) analyser.getFrequencyData();
        const lowpass = LowPassSpect();
        ContinuesTime += map_range(lowpass,0,160,0.0,.1);//REMAP INPUT VALUE
        uniforms.iSpeed.value = ContinuesTime;
        const bright = map_range(lowpass,0,160,0.0,.5);
        uniforms.iBright.value.set(bright); 
        uniforms['iTime'].value = performance.now()/1000;
        uniforms['iResolution'].value.set(canvas.width,canvas.height); 
        renderer.render(scene,camera);
        stats.update();
}

