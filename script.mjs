"use strict";


// ПАРАМЕТРЫ
// ускорение свободного падения
const g = 10
// размер основания (l=n*a x  w=a) и стены (h=a x w=a)
const a = 35;
// высота мяча над землей в начальный момент
const h = 20;
// радиус мяча
let r = 4;
// начальные коордианты
let x_0 = -a/2;
let y_0 = h;
let z_0 = 0;
// компоненты начальной корости
let v_x_0 = 40;
let v_y_0 = 20;
let v_z_0 = 0;
// начальная угловая скорость
let omega_0 = 0;
// начальный угол поворота 
let phi_0 = 0;
// коэффициент вязкости среды
let nu = 0;
// коэффициенты сохранения
let e_o = 0.5;
let e_p = 0;
// масса мяча
let m = 100;
// текущий момент времени
let t = 0;
// множитель при моментне инерции шара
const alpha = 2/5;  

// Квант времени
const time_quantum = 0.02;

// Скорость воспроизведения анимации
let playback_speed = 1;


// ФЛАГИ
let playAnimation = false;
let animationIsStarted = false;
let collisionX = false;
let collisionY = false;
let animationIsComplete = false;


// ВСПОМОГАТЕЛЬНЫЕ СТРУКТУРЫ
// учет столкновений
let collisions = []
let collision_index = 0;
// абсолютно черынй материал для корректного рендеринга выборочного unrealBloom
const darkMaterial = new THREE.MeshBasicMaterial( { color: 'black' } );
const materials = {};
// отдельный слой для светящихся тел 
const BLOOM_SCENE = 1;
const bloomLayer = new THREE.Layers();
bloomLayer.set( BLOOM_SCENE );
// временная прееменная для хранения цвета тумана
let fogColor = undefined;


// ФУНКЦИИ АНИМАЦИИ И ОБНОВЛЕНИЯ ПАРАМЕТРОВ
function getCollisionVelocitiesComponents(plane_orientation, ball) {
  let collision_info;
  let velocities_components;

  switch (plane_orientation) {
    case "Vertical":
      ball.position.x = a/2-r;
      break;
    case "Horizontal":
      ball.position.y = r;
      break;
  }

  if (playback_speed > 0) { 
    collision_info = collisions[collision_index]
    if (!collision_info)  
    {
      velocities_components = getVelocitiesAfterBounce(plane_orientation);
      collision_info = {
        beforeCollision: [velocity_vector.x, velocity_vector.y, angular_velocity_vector.z],
        afterCollision: velocities_components,
        collisionPoint: [ball.position.x, ball.position.y, ball.position.z]
      }
      collisions.push(collision_info); 

    } else {
      velocities_components = collision_info["afterCollision"];
    }
    collision_index++;  

  } else {

    collision_info = collisions[collision_index-1];
    if (!collision_info)  {  // => collision_indx - 1 < 0   =>   collision_indx = 0
      velocities_components = getVelocitiesBeforeBounce(plane_orientation);

      collision_info = {
        afterCollision: [velocity_vector.x, velocity_vector.y, angular_velocity_vector.z],
        beforeCollision: velocities_components,
        collisionPoint: [ball.position.x, ball.position.y, ball.position.z]
      }
      collisions.unshift(collision_info);     

    } else {
      velocities_components = collision_info["beforeCollision"];
      collision_index--;  
    }
  }

  return [velocities_components, collision_info["collisionPoint"]];
}


function changePlaybackSpeed(controls) {
  playback_speed = controls.playbackSpeed;
}


/**
 * Функция определяет скорости после удара по скоростям до удара.
 */
function getVelocitiesAfterBounce(plane_orientation) {
  switch (plane_orientation) {
    case "Vertical":
      return [
        -e_o * velocity_vector.x, 
        ((1 - alpha *e_p)*velocity_vector.y + alpha * (1 + e_p)*r*-angular_velocity_vector.z)/(1+alpha),
        -((1 + e_p)*velocity_vector.y+ (alpha -e_p)*r*-angular_velocity_vector.z) / (r*(1+alpha))
      ];
    case "Horizontal": 
      return [
        ((1 - alpha *e_p)*velocity_vector.x + alpha * (1 +e_p)*r*-angular_velocity_vector.z)/(1+alpha),
        -e_o * velocity_vector.y,
        ((1 +e_p)*-velocity_vector.x + (alpha -e_p)*r*-angular_velocity_vector.z) / (r*(1+alpha))
      ];
  }
}


/**
 * Функция определяет скорости до удара по скоростям после удара.
 * (необходима для моделирования при обратном движении времени)
 */
function getVelocitiesBeforeBounce(plane_orientation) {
  const A_1  = alpha*(1+e_p)*r/(1+alpha);
  const A_2 = 1/(1-alpha*e_p);
  const A_3 = (1+alpha)*(1-alpha*e_p);
  const B_1 = -(1+e_p)/(r*(1+alpha));
  const B_2 = (alpha-e_p)/(1+alpha);

  const C_1 = (1-alpha*e_p)/(1+alpha);
  const C_2 = (-alpha*(1+e_p)*r)/(1+alpha);
  const D_1 = (1+e_p)/((1+alpha)*r);
  const D_2 = ((e_p-alpha)/(1+alpha));

  let omega_1;
  switch (plane_orientation) {
    case "Vertical":
      omega_1 = (angular_velocity_vector.z - B_1*(velocity_vector.y+A_1)*A_2)/B_2
      return [
        -(1/e_o)*velocity_vector.x, 
        (velocity_vector.y + A_1*omega_1)*A_2,
        omega_1
      ];
    case "Horizontal": 
      omega_1 = (D_1*velocity_vector.x-C_1*angular_velocity_vector.z)/(C_2*D_1+C_1*D_2);
      return [
        (velocity_vector.x+A_1*omega_1)*A_3,
        -(1/e_o)*velocity_vector.y, 
        omega_1
      ];
  }
}


function updateCollisions(ball) {
  const eps_v = 0.2;
  const eps_av = 0.002;
  const eps_r = 0.05;
  if (velocity_vector.length() < eps_v && angular_velocity_vector.length() < eps_av && Math.abs(ball.position.y - r) < eps_r)  {
    animationIsComplete = true;
    console.log("Animation is complete: the ball is close to the ground with low velocities");
  }
  if (ball.position.x + r > a/2) {
    console.log("collision X")
    if (!collisionX) {  
      let collision_info = getCollisionVelocitiesComponents("Vertical", ball);
      let [velocities_components, collision_point] = collision_info;
      
      [v_x_0, v_y_0, omega_0] = velocities_components;
      [x_0, y_0, z_0] = collision_point;

      phi_0 = ball.rotation.z;
      collisionX = true;
      t = 0;

    } else if(velocity_vector.x > 0) { 
      // Если столкновение произошло, а компонента скорости по x до сих пор положительна - останавливаем анимацию
      animationIsComplete = true;
      console.log("Animation is complete: unacceptable velocity vectors after a collision")
    }

  } else {
    collisionX = false;
  }

  if (ball.position.y - r < 0){
    console.log("collision Y")
    if (!collisionY) {

      let collision_info = getCollisionVelocitiesComponents("Horizontal", ball);
      let [velocities_components, collision_point] = collision_info;
    
      [v_x_0, v_y_0, omega_0] = velocities_components;
      [x_0, y_0, z_0] = collision_point;

      phi_0 = ball.rotation.z
      collisionY = true;
      t = 0;

    } else if(velocity_vector.y < 0) { 
      // Если столкновение произошло, а компонента скорости по y до сих пор отрицательна - останавливаем анимацию
      animationIsComplete = true;
      console.log("Animation is complete: unacceptable velocity vectors after a collision")
    }

  } else {
    collisionY = false;
  }
  console.log(velocity_vector.x, velocity_vector.y, angular_velocity_vector.z);
} 


function moveBall(ball, t) {
  if (nu != 0) {  
    // Случай вязкой среды
    // сила вязкого сопротивления линейно зависит от радиуса шара
    const L = 6 * Math.PI * nu * r;
    const Cy_1 = y_0 + m/L * (v_y_0 + g*m/L);
    const Cy_2 = -(v_y_0 + g*m/L)*(m/L);
    const D = g*m / L;
    // момент сил вязкого сопротивления зависит от радиуса шара через куб
    const M = nu * 8 * Math.PI * r**3; 
    const K = 5 * M / (2 * m * r**2);
  
    const y = function(t) {
      return Cy_1 - D*t + Cy_2*Math.exp(-L/m * t);
    }

    const x = function(t) {
      return (x_0 + m*v_x_0/L) - m/L * v_x_0 * Math.exp(-L/m * t);
    }

    const omega = function(t) {
      return (phi_0 + omega_0/K) - omega_0 / K * Math.exp(-K * t);
    }

    ball.position.x = x(t);
    ball.position.y = y(t);
    ball.rotation.z = omega(t);

  } else {
    // Случай невязкой среды:
    const y = function(t) {
      return -g/2 * t**2 + v_y_0 * t + y_0;
    }

    const x = function(t) {
      return v_x_0 * t + x_0;
    }

    const omega = function(t) {
      return omega_0*t+phi_0;
    }

    ball.position.x = x(t);
    ball.position.y = y(t);
    ball.rotation.z = omega(t);
  }
}


function reset(ball, controls) {
  x_0 = controls.initBallX;
  y_0 = controls.initBallY;
  z_0 = 0;

  v_x_0 = controls.initVelocityX;
  v_y_0 = controls.initVelocityY;
  v_z_0 = 0;

  phi_0 = 0;

  omega_0 = controls.initAngularVelocity;
  r = controls.ballRadius;
  nu = controls.mediumViscosityCoefficient;
  e_o = controls.orthogonalRestitutionCoefficient;
  e_p = controls.parallelRestitutionCoefficient;
  m = controls.ballMass;

  ball.position.x = x_0;
  ball.position.y = y_0; 
  ball.position.z = z_0;
  ball.rotation.z = phi_0;

  collisionX = false;
}


let velocity_vector = new THREE.Vector3(v_x_0, v_y_0, 0);
function updateVelocityVector(t) {
  if (nu!=0) {
    // Случай вязкой среды
    const L = 6*Math.PI*nu*r 
    const Cy_2 = -(v_y_0 + g*m/L)*(m/L);
    const D = g*m / L;
    velocity_vector.set(v_x_0*Math.exp(-L/m * t), -D-L/m*Cy_2*Math.exp(-L/m * t), 0)
  } else {
    // Случай невязкой среды
    velocity_vector.set(v_x_0, -g*t+v_y_0, 0)
  }
}


let angular_velocity_vector = new THREE.Vector3(0, 0, omega_0);
function updateAngularVelocityVector(t) {
  if (nu!=0) {
    // Случай вязкой среды
    const M = nu * 8 * Math.PI * r**3; 
    const K = 5 * M / (2 * m * r**2);
    angular_velocity_vector.set(0,0,omega_0 * Math.exp(-K*t));
  } 
  else {
    // Случай невязкой среды
    angular_velocity_vector.set(0,0,omega_0);
  }
}


function updateVelocityArrowHelper(ball, arrows){
  const optimizing_coef = 3;
  const head_length = 2.5;
  const head_width = 1;
  const delta = 0.001
  const vector_length = velocity_vector.length();
  arrows.position.copy(ball.position);

  if (vector_length == 0) {
    arrows.setLength(1)
    arrows.visible = false;
  }
  else if ( vector_length/optimizing_coef < head_length) {
    arrows.setLength(head_length + delta, head_length, head_width);
    arrows.setDirection(velocity_vector.clone().normalize());  
  }
  else {
    arrows.setLength(vector_length/optimizing_coef + delta, head_length, head_width);
    arrows.setDirection(velocity_vector.clone().normalize());  
  } 
}


function updateAngularVelocityArrowHelper(ball, arrows){
  const optimizing_coef = 0.5;
  const head_length = 2.5;
  const head_width = 1;
  const delta = 0.001
  const vector_length = angular_velocity_vector.length();
  arrows.position.copy(ball.position);

  if (vector_length == 0) {
    arrows.setLength(1)
    arrows.visible = false;
  }
  else if ( vector_length/optimizing_coef < head_length) {
    arrows.setLength(head_length + delta, head_length, head_width);
    arrows.setDirection(angular_velocity_vector.clone().normalize());  
  }
  else {
    arrows.setLength(vector_length/optimizing_coef + delta, head_length, head_width);
    arrows.setDirection(angular_velocity_vector.clone().normalize());  
  } 
}


function updateBallRadius(ball) {
  ball.scale.setScalar(r);
}


function updateBallCoordsBounds(guiFolder, ball) {
  guiFolder.__controllers.find(c => c.property === 'initBallX').max(a/2-r-0.5*r);
  guiFolder.__controllers.find(c => c.property === 'initBallY').min(r+0.5*r);
  if (ball.position.x > a/2-r-0.5*r) {
    // Если мяч при измененнии радиуса выходит за границу стены - сдвигаем мяч
    x_0 = a/2 -r;
    guiFolder.__controllers.find(c => c.property === 'initBallX').setValue(a/2-r-0.5*r)
  } 
  if (ball.position.y < r+0.5*r) {
    // Если мяч при измененнии радиуса выходит за границу пола - сдвигаем мяч
    y_0 = r;
    guiFolder.__controllers.find(c => c.property === 'initBallY').setValue(r+0.5*r)
  }  
}


function updatePlayButton(button) {
  if (animationIsComplete) {
    button.name("Simulation is completed")
  } 
}


function updateVisible(controls, velocity_arrow, angular_velocity_arrow, axis) {
  velocity_arrow.visible = controls.showVelocity;
  angular_velocity_arrow.visible = controls.showAngularVelocity;
  axis.visible = controls.showAxis;
}


function updatePointLight(pointLight, sphereLight, controls) {
  sphereLight.position.x = controls.pointLightX;
  sphereLight.position.y = controls.pointLightY;
  sphereLight.position.z = controls.pointLightZ;
  pointLight.position.copy(sphereLight.position);
}


/* 
* Функция задает черный материал несветящимся телам для корректного 
* применения эффекта unrelBloom к светящимся телам
**/
function darkenNonBloomed( obj ) {
  if (obj.fog) {
    fogColor = obj.fog.color;
    obj.fog.color = new THREE.Color(0,0,0);
  }   
  else if ( bloomLayer.test( obj.layers ) === false ) { // + obj.isMesh && 
    materials[ obj.uuid ] = obj.material;
    obj.material = darkMaterial;
  }
}


/* 
* Возвращает несветящимся телам исходный материал
**/
function restoreMaterial( obj ) {
  if (obj.fog) {
    obj.fog.color = fogColor;
  } 
  else if ( materials[ obj.uuid ] ) {
    obj.material = materials[ obj.uuid ];
    delete materials[ obj.uuid ];
  }
}


function main() {
  // СЦЕНF, КАМЕРА И РЕНДЕРЕР
  let camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 10000);

  const renderer = new THREE.WebGLRenderer();
  renderer.setClearColor(new THREE.Color(0x000000));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  camera.position.set(-60, 80, 50);
  camera.lookAt(scene.position);


  // ORBIT CONTROLS ДЛЯ ВРАЩЕНИЯ КАМЕРЫ
  const orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
  orbitControls.rotateSpeed = 1.0
  orbitControls.zoomSpeed = 1.2
  orbitControls.panSpeed = 0.8


  // КОМПОЗЕР И ШЕЙДЕРЫ
  const W = window.innerWidth;
  const H = window.innerHeight;
  renderer.autoClear = false;

  // Cоздание объектов композеров для bloom-эффекта и финальной постобработки 
  const bloomComposer = new THREE.EffectComposer( renderer );
  bloomComposer.renderToScreen = false;
  const finalComposer = new THREE.EffectComposer(renderer);
  bloomComposer.renderToScreen = true;

  // Создание объектов проходов постобработки 
  let clearPass = new THREE.ClearPass()

  let renderPass = new THREE.RenderPass(scene, camera)
  renderPass.clear = false

  let bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(W, H), 1.5, 0.4, 0.85 );
  bloomPass.threshold = 0.0;
  bloomPass.strength = 5;
  bloomPass.radius = 1.0;

  let outputPass = new THREE.ShaderPass(THREE.CopyShader);
  outputPass.renderToScreen = true

  const mixPass = new THREE.ShaderPass(
    new THREE.ShaderMaterial( {
        uniforms: {
            baseTexture: { value: null },
            bloomTexture: { value: bloomComposer.renderTarget2.texture }
        },
        vertexShader: document.getElementById( 'vertexshader' ).textContent,
        fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
        defines: {}
    } ), 'baseTexture'
  );
  mixPass.needsSwap = true;

  // Установка соответствующих проходов для композеров
  finalComposer.addPass(clearPass);
  finalComposer.addPass(renderPass);
  finalComposer.addPass(mixPass);
  finalComposer.addPass(outputPass);

  bloomComposer.addPass(clearPass); 
  bloomComposer.addPass(renderPass);
  bloomComposer.addPass(bloomPass);


  // ПОЛ И СТЕНА
  // Формы и материал объектов
  const envColor =  0xAAAAAA
  const planeMaterial = new THREE.MeshStandardMaterial({
    color: envColor
  });
  const n = 4;
  const groundGeometry = new THREE.PlaneGeometry(n*a, a);
  const wallGeometry = new THREE.PlaneGeometry(a,a); 

  // Пол
  const ground = new THREE.Mesh(groundGeometry, planeMaterial);
  ground.rotation.x = -0.5 * Math.PI;
  ground.position.set(-a*(n-1)/2, 0, 0);
  ground.receiveShadow = true;

  // Стена
  const wall = new THREE.Mesh(wallGeometry, planeMaterial);
  wall.position.set(a/2, a/2,0);
  wall.rotation.y = -0.5 * Math.PI
  wall.receiveShadow = true;


  // МЯЧ
  // Форма и материал мяча
  const sphereGeometry = new THREE.SphereGeometry(1, 20, 20);
  sphereGeometry.faces.forEach(function(face){   // двуцветная красно-синяя сфера
      if (face.normal.y > 0) 
      face.color.setHex(0xE4181B); 
      else
      face.color.setHex(0x006AB5); 
  })

  // Cоздание объекты и его мяча
  const ball = new THREE.Mesh(sphereGeometry, new THREE.MeshStandardMaterial({
    vertexColors: THREE.FaceColors,
  }));

  ball.position.x =  x_0;
  ball.position.y =  y_0;
  ball.position.z =  z_0;
  ball.castShadow = true;


  // ДОБАВЛЕНИЕ ОБЪЕКТОВ НА СЦЕНУ
  scene.add(ball)
  scene.add(ground);
  scene.add(wall)


  // ТУМАН
  const fColor = 0x00000;
  const fDensity = 0.00;
  const fog = new THREE.FogExp2(fColor, fDensity);
  scene.fog=fog


  // СВЕТ
  // Прожекторный
  let slColor = "#ffffff"
  let slIntensity = 0.5;
  const spotLight = new THREE.SpotLight(slColor, 2, 150);
  spotLight.position.set(-1.2*a, 2.5*a, 1.3*a);
  spotLight.castShadow = true;
  spotLight.shadow.mapSize = new THREE.Vector2(2048, 2048);
  scene.add(spotLight);

  // Фонововый
  let ambColor = "#ccffcc";
  let ambIntensity = 0.5;
  let ambientLight = new THREE.AmbientLight(ambColor ,ambIntensity); 
  scene.add( ambientLight );

  // Точечный 
  const plColor = "#ff00ff";
  const plintensity = 1.6;
  const plDistance = 100;
  const pointLight = new THREE.PointLight(plColor);
  pointLight.distance = 100;
  pointLight.castShadow = true;
  pointLight.shadow.mapSize = new THREE.Vector2(1024, 1024);
  scene.add(pointLight);

  const sphereLightGeometry = new THREE.SphereGeometry(1, 20, 20);   // маленькая сфера, связанная с точечным источником света
  const sphereLightMaterial = new THREE.MeshBasicMaterial({color: plColor});
  const sphereLight = new THREE.Mesh(sphereLightGeometry, sphereLightMaterial);
  sphereLight.position.x = a/4;
  sphereLight.position.y = a;
  sphereLight.position.z = a;
  scene.add(sphereLight);
  sphereLight.layers.enable(BLOOM_SCENE)   // добавляем объект к категории светящихся

  // Направленный
  const dlColor = "#ccffcc";
  const dlIntensity = 0.5;
  const directionalLight = new THREE.DirectionalLight(dlColor, dlIntensity);
  directionalLight.position.set(-1.2*a, 2.5*a,  -1.3*a);
  directionalLight.castShadow = true;
  directionalLight.shadow.camera.near = 1;
  directionalLight.shadow.camera.far = 130;
  directionalLight.shadow.camera.left = -20;
  directionalLight.shadow.camera.right = 100;
  directionalLight.shadow.camera.top = 20;
  directionalLight.shadow.camera.bottom = -80;
  scene.add(directionalLight);

  // Распределенный
  const alIntensity = 0.25;
  const areaLight = new THREE.RectAreaLight(envColor, alIntensity, n*a, a);
  const wallAreaLight = new THREE.RectAreaLight(envColor, alIntensity, a, a);
  areaLight.lookAt(0, 1, 0);
  areaLight.position.set(-a*(n-1)/2, 0, 0);
  wallAreaLight.lookAt(-1, 0, 0);
  wallAreaLight.position.set(a/2, a/2,0);
  scene.add(areaLight);
  scene.add(wallAreaLight);
 

  // GUI
  // Варьируемые параметры
  const controls = {
    // Параметры симуляции
    initBallX: x_0,
    initBallY: y_0,
    initVelocityX: v_x_0,
    initVelocityY: v_y_0,
    initAngularVelocity: omega_0,
    mediumViscosityCoefficient: nu, 
    orthogonalRestitutionCoefficient: e_o,  // коэф.сохранния вертикальной компоненты скорости (упругость)
    parallelRestitutionCoefficient: e_p,    // коэф.сохранния параллельной компоненты скорости (трение) 
    ballRadius: r,
    ballMass: m,

    // Отображение вспомогательной графики
    showAngularVelocity: true,
    showVelocity: true,
    showAxis: true, 
    
    // Скорость симуляции
    playbackSpeed: 1,

    // Свет
    // фоновый
    ambientColor: ambColor,
    ambientIntensity: ambIntensity,
    // прожекторный
    disableSpotlight: false, 
    spotLightColor: slColor,
    spotLightIntensity: slIntensity,
    // направленный
    disableDirectionalLight: false, 
    directionalLightColor: dlColor,
    directionaLightIntensity: dlIntensity,
    // точечный
    disablePointlight: false, 
    pointLightColor : plColor,
    pointLightIntensity : plintensity,
    pointLightDistance : plDistance,
    pointLightX: a/4,
    pointLightY: a,
    pointLightZ: a,
    // распределенный
    areaLightColor: envColor, 
    areaLightIntensity: alIntensity,

    // Туман
    fogColor: fColor,
    fogDensity: fDensity,
  };

  const gui = new dat.GUI();

  // Параметры
  const guiParameters = gui.addFolder('parameters');
  guiParameters.add(controls, 'ballMass', 50, 200).step(0.5);
  guiParameters.add(controls, 'ballRadius', 1, 5).step(0.5);
  guiParameters.add(controls, 'initBallX', -a/2, a/2-r-0.5*r).step(0.5);
  guiParameters.add(controls, 'initBallY', r+0.5*r, 1.5*a).step(0.5);
  guiParameters.add(controls, 'initVelocityX', -50, 50);
  guiParameters.add(controls, 'initVelocityY', -50, 50);
  guiParameters.add(controls, 'initAngularVelocity', -10, 10).step(0.5);
  guiParameters.add(controls, 'mediumViscosityCoefficient', 0, 5).step(0.1);
  guiParameters.add(controls, 'orthogonalRestitutionCoefficient', 0, 1).step(0.1);
  guiParameters.add(controls, 'parallelRestitutionCoefficient', -1, 1).step(0.1);

  // Анимация
  const parameters = {
    playButtonFunction: function() {
      animationIsStarted = true;
      playAnimation = !playAnimation;
      playButtonController.name(playAnimation ? "Pause" : "Continue");
    },

    restartButtonFunction: function() {
      animationIsStarted = false;
      playAnimation = false; 
      animationIsComplete = false;
      collisions = [];
      collision_index = 0;
      playButtonController.name("Start");
    }
  };

  const guiAnimation = gui.addFolder('animation');
  guiAnimation.add(controls, "playbackSpeed", -2, 2).step(0.25)
    .onChange(function() {
      if (controls.playbackSpeed == 0) {
        controls.playbackSpeed = 0.25;
      }
    }
  );
  const playButtonController =  guiAnimation .add(parameters, 'playButtonFunction').name('Start');
  guiAnimation.add(parameters, 'restartButtonFunction').name('Restart');

  // Вспомогательная графика
  const guiVisible = gui.addFolder('visible');
  guiVisible.add(controls, "showAngularVelocity");
  guiVisible.add(controls, "showVelocity");
  guiVisible.add(controls, "showAxis");

  // Свет
  const guiLight = gui.addFolder('light');
  // фоновый
  const guiAmbientLight = guiLight.addFolder('ambient');
  guiAmbientLight.addColor(controls, 'ambientColor').onChange(function (e) {
    ambientLight.color = new THREE.Color(e);
  });
  guiAmbientLight.add(controls, 'ambientIntensity', 0, 2).step(0.1).onChange(
  function updateAmbientLight(e) {
    ambientLight.intensity = e;
  });
  // прожекторный
  const guiSpotLight = guiLight.addFolder('spotLight');
  guiSpotLight.addColor(controls, 'spotLightColor').onChange(function (e) {
    spotLight.color = new THREE.Color(e);
  });
  guiSpotLight.add(controls, 'spotLightIntensity', 0, 3).onChange(function (e) {
    spotLight.intensity = e;
  });
  guiSpotLight.add(controls, 'disableSpotlight').onChange(function (e) {
    spotLight.visible = !e;
  });
  // направленный
  const guiDirectionalLight = guiLight.addFolder('directionalLight');
  guiDirectionalLight.addColor(controls, 'directionalLightColor').onChange(function (e) {
    directionalLight.color = new THREE.Color(e);
  });
  guiDirectionalLight.add(controls, 'directionaLightIntensity', 0, 3).onChange(function (e) {
    directionalLight.intensity = e;
  });
  guiDirectionalLight.add(controls, 'disableDirectionalLight').onChange(function (e) {
    directionalLight.visible = !e;
  });
  // точечный
  const guiPointLight = guiLight.addFolder('pointLight');
  guiPointLight.addColor(controls, 'pointLightColor').onChange(function (e) {
    pointLight.color = new THREE.Color(e);
    sphereLight.material.color.set(e)
  });
  guiPointLight.add(controls, 'pointLightIntensity', 0, 3).onChange(function (e) {
      pointLight.intensity = e;
      bloomPass.strength = 2+0.8*e**2;
  });
  guiPointLight.add(controls, 'pointLightDistance', 0, 100).onChange(function (e) {
      pointLight.distance = e;
  });
  guiPointLight.add(controls, "pointLightX", -4*a, a/2-1).step(0.5);
  guiPointLight.add(controls, "pointLightY", 1, 2*a).step(0.5);
  guiPointLight.add(controls, "pointLightZ", -a, a).step(0.5);
  guiPointLight.add(controls, 'disablePointlight').onChange(function (e) {
    pointLight.visible = !e;
    sphereLight.visible = !e;
  });
  // распределенный
  const guiAreaLight = guiLight.addFolder('areaLight');
  guiAreaLight.addColor(controls, 'areaLightColor').onChange(function (e) {
    areaLight.color = new THREE.Color(e);
    wallAreaLight.color = new THREE.Color(e);
    ground.material.color = new THREE.Color(e);
  });
  guiAreaLight.add(controls, 'areaLightIntensity', 0, 0.5).step(0.05).onChange(function (e) {
    areaLight.intensity = e;
    wallAreaLight.intensity = e;
  });

  // Туман
  const guiFog = guiLight.addFolder('fog');
  guiFog.addColor(controls, 'fogColor').onChange(function (e) {
    fog.color = new THREE.Color(e);
  })
  guiFog.add(controls, 'fogDensity',0, 0.02).step(0.0005).onChange(function (e) {
    fog.density = e;
  })

  // Материалы 
  const guiMaterial = gui.addFolder("materials");

  const ballMaterials = {
    "MeshStandardMaterial" : new THREE.MeshStandardMaterial({
      vertexColors: THREE.FaceColors,
    }),
    "MeshBasicMaterial" : new THREE.MeshBasicMaterial({
      vertexColors: THREE.FaceColors,
    }),
    "MeshLambertMaterial" : new THREE.MeshLambertMaterial({
      vertexColors: THREE.FaceColors,
    }), 
    "MeshPhongMaterial" : new THREE.MeshPhongMaterial({
      vertexColors: THREE.FaceColors,
    })
  }

  const environmentMaterials = {
    "MeshStandardMaterial" : new THREE.MeshStandardMaterial(),
    "MeshBasicMaterial" : new THREE.MeshBasicMaterial(),
    "MeshLambertMaterial" : new THREE.MeshLambertMaterial(), 
    "MeshPhongMaterial" : new THREE.MeshPhongMaterial()
  }

  const options = {
    ballMaterial: 'MeshStandardMaterial',
    environmentMaterial:  'MeshStandardMaterial'
  };

  guiMaterial.add(options, 'ballMaterial', ['MeshStandardMaterial', 'MeshBasicMaterial', 'MeshLambertMaterial', 'MeshPhongMaterial']).onChange(function(e) {
    ball.material = ballMaterials[e];
  });

  guiMaterial.add(options, 'environmentMaterial', ['MeshStandardMaterial', 'MeshBasicMaterial', 'MeshLambertMaterial', 'MeshPhongMaterial']).onChange(function(e) {
    const newMaterial = environmentMaterials[e];
    newMaterial.color = ground.material.color;
    ground.material = newMaterial;
    wall.material = newMaterial;
  });


  // ВСПОМОГАТЕЛЬНЫЕ ОСИ И ВЕКТОРА
  // Скорость
  const velocityArrowHelper = new THREE.ArrowHelper(velocity_vector.clone().normalize(), ball.position, velocity_vector.length(), 0x7BD34E);
  scene.add(velocityArrowHelper);

  // Угловая скорость
  const angularVelocityArrowHelper = new THREE.ArrowHelper(angular_velocity_vector.clone().normalize(), ball.position, angular_velocity_vector.length(), 0x00D5FF);
  scene.add(angularVelocityArrowHelper);

  // Оси системы координат
  const axes = new THREE.AxesHelper(20);
  scene.add(axes);


  // ЦИКЛИЧЕСКИЙ РЕНДЕРИНГ СЦЕНЫ
  function renderScene() {
      if (playAnimation && !animationIsComplete) { 
        t += playback_speed * time_quantum;
        moveBall(ball, t);     
        updateCollisions(ball);  
        changePlaybackSpeed(controls);
      }
      if (!animationIsStarted) {
        t = 0;
        reset(ball, controls); 
        updateBallCoordsBounds(guiParameters, ball);
        updateBallRadius(ball);
      }
      updatePointLight(pointLight, sphereLight, controls, ambColor);
      updateVelocityVector(t);
      updateAngularVelocityVector(t);
      updateVelocityArrowHelper(ball,velocityArrowHelper);
      updateAngularVelocityArrowHelper(ball, angularVelocityArrowHelper);
      updateVisible(controls, velocityArrowHelper, angularVelocityArrowHelper, axes);
      updatePlayButton(playButtonController)
      
      orbitControls.update()

      // рендеринг и постобработка (? : закоментировать, если не требуется использовать UnrealBloom)
      scene.traverse( darkenNonBloomed );
      bloomComposer.render()
      scene.traverse( restoreMaterial );
      finalComposer.render()

      // просто рендеринг (? : раскоментировать, если не требуется использовать UnrealBloom)
      // renderer.render(scene, camera); 

      requestAnimationFrame(renderScene);
  }
  renderScene();
}
