import * as THREE from 'three';
import { OBJLoader, UnrealBloomPass, RenderPass, EffectComposer, ShaderPass, FXAAShader, Lensflare, LensflareElement, OrbitControls, MapControls, AfterimagePass, FBXLoader, MTLLoader, OutputPass } from 'three/examples/jsm/Addons.js';

// scene
const scene = new THREE.Scene();
//camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.updateProjectionMatrix()
camera.position.set(0, 7, 10)

//renderer
const renderer = new THREE.WebGLRenderer({ precision: "highp" })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)
//control
const controls = new OrbitControls(camera, renderer.domElement);
controls.autoRotate = true
controls.autoRotateSpeed = 1
controls.enableDamping = true
controls.enableRotate = true
controls.update()


//composer  & pass
const composer = new EffectComposer(renderer)
const renderPass = new RenderPass(scene, camera)
composer.addPass(renderPass)

//fxaa pass
const fxaaPass = new ShaderPass(FXAAShader)
const pixelRatio = renderer.getPixelRatio()
fxaaPass.material.uniforms['resolution'].value.set(1 / (window.innerWidth * pixelRatio * 1.25), 1 / (window.innerHeight * pixelRatio * 1.25))
composer.addPass(fxaaPass)


//bloom
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.5,
    0.1,
    0
)
composer.addPass(bloomPass)
const outputPass = new OutputPass();
composer.addPass(outputPass)

// banana
let banana
const objLoader = new OBJLoader();
const mtlLoader = new MTLLoader();
const textureLoader = new THREE.TextureLoader();

mtlLoader.load('./models/banana/source/export_banana.mtl', (materials) => {
    materials.preload()
    objLoader.setMaterials(materials)
    objLoader.load('./models/banana/source/export_banana.obj',
        function (object) {
            const texture = textureLoader.load('./models/banana/textures/Diffuse.png');
            object.traverse(function (child) {
                if (child.isMesh) {
                    child.material.map = texture
                    child.material.needsUpdate = true;
                    child.layers.set(0);
                }
            });
            banana = object
            scene.add(object)
        }
    )
}
)
// TODO: import mita


// the sun
const starGeometry = new THREE.SphereGeometry(0.5, 24, 24)
const starMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0xffd700,
    emissiveIntensity: 2,
    depthWrite: false,
})
const star = new THREE.Mesh(starGeometry, starMaterial)
star.position.set(0, 0, 0)
scene.add(star)

// sun light
const sunlight = new THREE.PointLight(0xffd700, 15, 0)
sunlight.position.set(0, 0, 0)
sunlight.layers.set(0)

// ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.05);
scene.add(ambientLight);

// lens flare
const textureFlare = textureLoader.load('./models/lensflare/textures/lensflare3.png')
const lensflare = new Lensflare()
lensflare.addElement(new LensflareElement(textureFlare, 30, 0.7, sunlight.color));
lensflare.addElement(new LensflareElement(textureFlare, 40, 0.9, sunlight.color));
lensflare.addElement(new LensflareElement(textureFlare, 25, 1, sunlight.color));
sunlight.add(lensflare)
scene.add(sunlight)

// background stars
function createStarField() {
    const starCount = 1000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
        starPositions[i * 3] = (Math.random() - 0.5) * 100;
        starPositions[i * 3 + 1] = (Math.random() - 0.5) * 100;
        starPositions[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.1,
    });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // Create lines connecting stars
    const linePositions = new Float32Array(starCount * 6); // 2 points per line (start and end)
    const COLORS = ['#FF0000', '#FFA500', '#FFFF00', '#00FF00', '#FFFFFF', '#0000FF'];
    const lineColors = new Float32Array(starCount * 6); // RGB per vertex
    for (let i = 0; i < starCount; i++) {
        const x = starPositions[i * 3];
        const y = starPositions[i * 3 + 1];
        const z = starPositions[i * 3 + 2];

        // Start point
        linePositions[i * 6] = x;
        linePositions[i * 6 + 1] = y;
        linePositions[i * 6 + 2] = z;

        // End point with some offset
        linePositions[i * 6 + 3] = x + 1;
        linePositions[i * 6 + 4] = y - 0.5;
        linePositions[i * 6 + 5] = z + 1;

        // Assign colors
        const color = new THREE.Color(COLORS[Math.floor(Math.random() * COLORS.length)]);
        lineColors.set([color.r, color.g, color.b, color.r, color.g, color.b], i * 6);
    }

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
        vertexColors: true, // Use vertex colors
    });

    const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lineSegments);

    return { starField, lineSegments };
}

const { starField, lineSegments } = createStarField();



// animate
let orbitAngle = 0
const radius = 3;
function animate() {
    camera.updateMatrixWorld()
    controls.update()
    composer.render()
    if (banana) {
        orbitAngle += 0.01
        banana.position.x = star.position.x + radius * Math.cos(orbitAngle)
        banana.position.y = star.position.y + radius * Math.sin(orbitAngle)
        banana.rotation.x += 0.010
        banana.rotation.y += 0.014
    }

    const starPositions = starField.geometry.attributes.position;
    const linePositions = lineSegments.geometry.attributes.position;

    for (let i = 0; i < starPositions.count; i++) {
        const x = starPositions.getX(i);
        const y = starPositions.getY(i);
        const z = starPositions.getZ(i);

        // Update star positions
        starPositions.setX(i, x < -50 ? 50 : x - 0.1);
        starPositions.setY(i, y > 50 ? -50 : y + 0.05);
        starPositions.setZ(i, z < -50 ? 50 : z - 0.1);

        // Update line positions
        linePositions.setXYZ(i * 2, x, y, z); // Start point
        linePositions.setXYZ(i * 2 + 1, x + 5, y - 2.5, z + 5); // End point
    }

    starPositions.needsUpdate = true;
    linePositions.needsUpdate = true;
}
renderer.setAnimationLoop(animate)
