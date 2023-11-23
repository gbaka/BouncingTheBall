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

// Квант времени
const time_quantum = 0.03;


// ФЛАГИ
let playAnimation = false;
let animationIsStarted = false;
let collisionX = false;
let collisionY = false;
let animationIsComplete = false;


// ФУНКЦИИ АНИМАЦИИ И ОБНОВЛЕНИЯ ПАРАМЕТРОВ
function updateCollisions(ball) {
  const eps_v = 0.2;
  const eps_av = 0.002;
  const eps_r = 0.05;

  if (velocity_vector.length() < eps_v && angular_velocity_vector.length()<eps_av && Math.abs(ball.position.y - r)< eps_r)  {
    animationIsComplete = true;
    console.log("Animation is complete: the ball is close to the ground with low velocities");
  }

  if (ball.position.x + r > a/2) {
    if (!collisionX) {
      // множитель при моменте инерции для шара
      const alpha = 2/5;  

      x_0 = a/2 - r;
      y_0 = ball.position.y;
      z_0 = ball.position.z;
      phi_0 = ball.rotation.z;
      v_x_0 = -e_o * velocity_vector.x;
      v_y_0 = ((1 - alpha *e_p)*velocity_vector.y + alpha * (1 + e_p)*r*-angular_velocity_vector.z)/(1+alpha);
      omega_0 = -((1 + e_p)*velocity_vector.y+ (alpha -e_p)*r*-angular_velocity_vector.z) / (r*(1+alpha));
      t = 0;

      collisionX = true;

    } else if(velocity_vector.x > 0) { 
      // Если столкновение произошло, а компонента скорости по x до сих пор положительна - останавливаем анимацию
      animationIsComplete = true;
      console.log("Animation is complete: unacceptable velocity vectors after a collision")
    }

  } else {
    collisionX = false;
  }

  if (ball.position.y - r < 0){
    if (!collisionY) {
      // множитель при моменте инерции для шара
      const alpha = 2/5;  

      x_0 = ball.position.x
      y_0 = r
      z_0 = ball.position.z
      phi_0 = ball.rotation.z
      v_y_0 = -e_o * velocity_vector.y
      v_x_0 = ((1 - alpha *e_p)*velocity_vector.x + alpha * (1 +e_p)*r*-angular_velocity_vector.z)/(1+alpha)
      omega_0 = ((1 +e_p)*velocity_vector.x + (alpha -e_p)*r*-angular_velocity_vector.z) / (r*(1+alpha))
      t = 0;

      collisionY = true;

    } else if(velocity_vector.y < 0) { 
      // Если столкновение произошло, а компонента скорости по y до сих пор отрицательна - останавливаем анимацию
      animationIsComplete = true;
      console.log("Animation is complete: unacceptable velocity vectors after a collision")
    }

  } else {
    collisionY = false;
  }
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
  arrows.position.copy(ball.position);
  arrows.setDirection(velocity_vector.clone().normalize());  
  arrows.setLength(velocity_vector.length()/optimizing_coef, 2.5, 1);
}


function updateAngularVelocityArrowHelper(ball, arrows){
  const optimizing_coef = 0.5;
  arrows.position.copy(ball.position);
  arrows.setDirection(angular_velocity_vector.clone().normalize());  
  arrows.setLength(angular_velocity_vector.length()/optimizing_coef, 2.5, 1);
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


function updateVisible(controls, velocity_arrow, angular_velocity_arrow, axis) {
  velocity_arrow.visible = controls.showVelocity;
  angular_velocity_arrow.visible = controls.showAngularVelocity;
  axis.visible = controls.showAxis;
}
  

function main() {
  // СЦЕНА, КАМЕРА И РЕНДЕРЕР
  const scene = new THREE.Scene();
  let camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 10000);

  const renderer = new THREE.WebGLRenderer();
  renderer.setClearColor(new THREE.Color(0x000000));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);


  // ORBIT CONTROLS ДЛЯ ВРАЩЕНИЯ КАМЕРЫ
  const orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
  orbitControls.rotateSpeed = 1.0
  orbitControls.zoomSpeed = 1.2
  orbitControls.panSpeed = 0.8


  // ПОЛ И СТЕНА
  // Формы и материал объектов
  const n = 4;
  const groundGeometry = new THREE.PlaneGeometry(n*a, a);
  const wallGeometry = new THREE.PlaneGeometry(a,a);
  const planeMaterial = new THREE.MeshLambertMaterial({
    color: 0xAAAAAA
  });

  // Пол
  const ground = new THREE.Mesh(groundGeometry, planeMaterial);
  ground.rotation.x = -0.5 * Math.PI;
  ground.position.set(-a*(n-1)/2, 0, 0);
  ground.receiveShadow = true;

  // Стена
  const wall = new THREE.Mesh(wallGeometry, planeMaterial);
  wall.position.set(a/2, a/2,0);
  wall.rotation.y = -0.5 * Math.PI


  // МЯЧ
  // Форма и материал объекта
  const sphereGeometry = new THREE.SphereGeometry(1, 20, 20);
  sphereGeometry.faces.forEach(function(face){   // двуцветная красно-синяя сфера
      if (face.normal.y > 0) 
      face.color.setHex(0xE4181B); 
      else
      face.color.setHex(0x006AB5); 
  })

  // Мяч
  const ball = new THREE.Mesh(sphereGeometry, new THREE.MeshStandardMaterial({
    vertexColors: THREE.FaceColors // use face colors
  }));
  ball.position.x =  x_0;
  ball.position.y =  y_0;
  ball.position.z =  z_0;
  ball.castShadow = true;


  // ДОБАВЛЕНИЕ ОБЪЕКТОВ НА СЦЕНУ
  scene.add(ball)
  scene.add(ground);
  scene.add(wall)

  // ПОЗИЦИЯ КАМЕРЫ
  camera.position.set(-60, 80, 50);
  camera.lookAt(scene.position);


  // СВЕТ
  // Направленный
  const spotLight = new THREE.SpotLight(0xFFFFFF, 2, 150);
  spotLight.position.set(-1.2*a, 2.5*a, 1.3*a);
  spotLight.castShadow = true;
  spotLight.shadow.mapSize = new THREE.Vector2(2048, 2048);
  spotLight.shadow.camera.far = 130;
  spotLight.shadow.camera.near = 40;
  scene.add(spotLight);

  // Фонововый
  const light = new THREE.AmbientLight( 0x404040 ,1); 
  scene.add( light );


  // GUI
  // Параметры
  const controls = {
      initBallX: x_0,
      initBallY: y_0,
      initVelocityX: v_x_0,
      initVelocityY: v_y_0,
      initAngularVelocity: omega_0,

      mediumViscosityCoefficient: nu,
      // коэф.сохранния вертикальной компоненты скорости (упругость)
      orthogonalRestitutionCoefficient: e_o,
      // коэф.сохранния параллельной компоненты скорости (трение) 
      parallelRestitutionCoefficient: e_p,   
      ballRadius: r,
      ballMass: m,

      showAngularVelocity: true,
      showVelocity: true,
      showAxis: true
  };

  const gui = new dat.GUI();
  // Ползунки
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

  const guiVisible = gui.addFolder('visible');
  guiVisible.add(controls, "showAngularVelocity");
  guiVisible.add(controls, "showVelocity");
  guiVisible.add(controls, "showAxis");

  const parameters = {
    playButtonFunction: function() {
      animationIsStarted = true;
      playAnimation = !playAnimation;
      playButtonController.name(playAnimation ? "Пауза" : "Продолжить");
    },

    restartButtonFunction: function() {
      animationIsStarted = false;
      playAnimation = false; 
      animationIsComplete = false;
      playButtonController.name("Старт")    
    }
  };
  
  // Кнопки
  const guiAnimation = gui.addFolder('animation');
  const playButtonController =  guiAnimation .add(parameters, 'playButtonFunction').name('Старт');
  const restartButtonController =  guiAnimation .add(parameters, 'restartButtonFunction').name('Перезапустить');


  // ВСПОМОГАТЕЛЬНЫЕ ОСИ И ВЕКТОРА
  // Скорость
  const velocityArrowHelper = new THREE.ArrowHelper(velocity_vector.clone().normalize(), ball.position, velocity_vector.length(), 0x7BD34E);
  scene.add(velocityArrowHelper);

  // Угловая скорость
  const angularVelocityArrowHelper = new THREE.ArrowHelper(angular_velocity_vector.clone().normalize(), ball.position, angular_velocity_vector.length(), 0x00D5FF);
  scene.add(angularVelocityArrowHelper);

  // Оси системы координат
  const axes = new THREE.AxisHelper(20);
  scene.add(axes);


  // ЦИКЛИЧЕСКИЙ РЕНДЕРИНГ СЦЕНЫ
  renderScene();
  function renderScene() {
      if (playAnimation && !animationIsComplete) {
        t += time_quantum;
        moveBall(ball, t);     
        updateCollisions(ball);   
      }
      if (!animationIsStarted) {
        t = 0;
        reset(ball, controls); 
        updateBallCoordsBounds(guiParameters, ball);
        updateBallRadius(ball);
      }
      updateVelocityVector(t);
      updateAngularVelocityVector(t);
      updateVelocityArrowHelper(ball,velocityArrowHelper)
      updateAngularVelocityArrowHelper(ball, angularVelocityArrowHelper);
      updateVisible(controls, velocityArrowHelper, angularVelocityArrowHelper, axes);
      requestAnimationFrame(renderScene);
      orbitControls.update()
      renderer.render(scene, camera);
  }
}

