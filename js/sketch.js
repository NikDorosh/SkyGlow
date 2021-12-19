//import  fragmentShader  from '../shaders/rainbowcircle.js';
import  fragmentShader  from '../shaders/fragment.js';
import Stats from '../libs/stats.js';
import { GUI } from '../libs/lil-gui/dist/lil-gui.esm.js';
const canvas = document.querySelector('#c');
const uniforms = {
  iSpeed: { value: 0 },
  iDate:{value:new THREE.Vector4(0.0)},
  iTime: {value: 0},
  iResolution: { value: new THREE.Vector3()},
  iMouse:{ value: new THREE.Vector2()} ,
  iScale: { value: 0 },
  iBright: { value:new THREE.Vector3(0.0,0.0,0.0) },
  iRotate:{value:new THREE.Vector3(0.34,0,0)},
  iShadows: {value: 1},
  iContinuousRotate:{value:0},
  //myTexture:{value: new THREE.TextureLoader().load( "textures/white.png" )}
};
const stats = Stats()
document.body.appendChild(stats.dom)

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setPixelRatio(window.devicePixelRatio);
const scene = new THREE.Scene();
var camera = new THREE.OrthographicCamera();
var mouse = new THREE.Vector2()
document.addEventListener('mousemove', onDocumentMouseMove, false);
//Audiodataarray
var analyser, dataArray=0;
const gui = new GUI();

function init() {
        renderer.autoClearColor = false;
        camera = new THREE.OrthographicCamera(
              -1, // left
              1, // right
              1, // top
              -1, // bottom
              -1, // near,
              1, // far
        );

        const plane = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.ShaderMaterial({fragmentShader,uniforms});
        const mesh = new THREE.Mesh(plane, material)
        scene.add(mesh);

        // const plane2 = new THREE.PlaneGeometry(2, 2);
        // const material2 = new THREE.ShaderMaterial({fragmentShader1,uniforms});
        // const mesh2 = new THREE.Mesh(plane2, material2)
        // scene.add(mesh2);
}
//________________________________________________________________________________________
// ***** Setup (renderer): *****
        //gui.add( document, 'title' );
        
        var obj = {
          SphereColor: { r: 255, g: 0, b: 0 },
          ObjectColor: {r: 125, g: 34, b: 180},
          RotateX: 0.34,
          RotateY: 3.1415,
          RotateZ: 3.1415,
          ContRotate: 1,
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
          OrbitControl_x: 0,
          OrbitControl_y: 0,
          EnableOrbit: false,
          EnableShadows: false,
          NumberOfSamples:1,
          SpeedOfMotion:0.02
        }   
        
        const startButton = gui.add( obj, 'Start' ); 	// button
        const stopButton = gui.add( obj, 'Stop' ).disable(); 	// button
        const folder2 = gui.addFolder( 'Lowpass' );
        folder2.add(obj,'NumberOfSamples',1,50,1)

//---------------------------------------------------------------------
function onDocumentMouseMove(event) {
          event.preventDefault();
            //mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            //mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
          
}

function resizeRendererToDisplaySize(renderer){
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
          renderer.setSize(width, height, false);
        }
        return needResize;
}

function map_range(value, low1, high1, low2, high2) {
  return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}
//RMS FUNCTION
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
var ContinuesTime = 0;


function render(time) {
        resizeRendererToDisplaySize(renderer);
        if(dataArray!=0) analyser.getFrequencyData();
        time *= 0.001;  // convert to seconds

        const lowpass = LowPassSpect();
        const scale = map_range(lowpass,0,200,.8,.002);
        uniforms.iScale.value = scale

        ContinuesTime += map_range(lowpass,0,160,0.0,.1);//REMAP INPUT VALUE
        uniforms.iResolution.value.set(canvas.width, canvas.height, 1);
        uniforms.iSpeed.value = ContinuesTime;
        uniforms.iTime.value = time;

        uniforms.iDate.value.set(0,0,0,time)

        const bright = map_range(lowpass,0,160,0.0,.5);
        uniforms.iBright.value.set(bright); 

        uniforms.iMouse.value.set(mouse.x,mouse.y);
        renderer.render(scene, camera);
        //console.log(map_range(lowpass,0,70,0.0,.005))
        //console.log(dataArray[1]);
        stats.update()
        requestAnimationFrame(render);
}
requestAnimationFrame(render);

init();