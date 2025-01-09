import * as THREE from 'three';
import { OBJLoader, UnrealBloomPass, RenderPass, EffectComposer, ShaderPass, FXAAShader, Lensflare, LensflareElement, OrbitControls, MapControls, AfterimagePass, FBXLoader, MTLLoader, OutputPass } from 'three/examples/jsm/Addons.js';

// scene
const scene = new THREE.Scene();
//camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 7, 10)

//renderer
const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)
//control
const controls = new OrbitControls(camera, renderer.domElement);
controls.autoRotate = true
controls.autoRotateSpeed = 10
controls.enableDamping = true
controls.dampingFactor = 0.25
controls.enablePan = false
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
    const starCount = 1000
    const starGeometry = new THREE.BufferGeometry();
    const starPosition = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
        starPosition[i * 3] = (Math.random() - 0.5) * 100
        starPosition[i * 3 + 1] = (Math.random() - 0.5) * 100
        starPosition[i * 3 + 2] = (Math.random() - 0.5) * 100
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPosition, 3))
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.1,
    })
    const starField = new THREE.Points(starGeometry, starMaterial)
    scene.add(starField)

    const lineGroup = new THREE.Group()
    const COLORS = ['#FF0000', '#FFA500', '#FFFF00', '#00FF00', '#FFFFFF', '#0000FF']
    // random red, orange, yellow, green, white and blue
    const points = [];
    for (let i = 0; i < starCount; i++) {
        points.push(new THREE.Vector3(starPosition[i * 3], starPosition[i * 3 + 1], starPosition[i * 3 + 2]));
        points.push(new THREE.Vector3(starPosition[i * 3] + 1, starPosition[i * 3 + 1] - 0.5, starPosition[i * 3 + 2]+1));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        // random number from 0 to COLORS.size

        const material = new THREE.LineBasicMaterial({
            color: COLORS[Math.floor(Math.random() * COLORS.length)]
        });
        const line = new THREE.Line(geometry, material);
        lineGroup.add(line);
    }
    scene.add(lineGroup);

    return { starField, lineGroup }
}
const { starField, lineGroup } = createStarField()



// animate
let orbitAngle = 0
const radius = 3;
function animate() {
    composer.render()
    if (banana) {
        orbitAngle += 0.01
        banana.position.x = star.position.x + radius * Math.cos(orbitAngle)
        banana.position.y = star.position.y + radius * Math.sin(orbitAngle)
        banana.rotation.x += 0.010
        banana.rotation.y += 0.014
    }

    // Animate the stars
    const starPositions = starField.geometry.attributes.position;
    for (let i = 0; i < starPositions.count; i++) {
        const x = starPositions.getX(i);
        const y = starPositions.getY(i);
        const z = starPositions.getZ(i);
        starPositions.setX(i, x < -50 ? 50 : x - 0.1);
        starPositions.setY(i, y > 50 ? -50 : y + 0.05);
        starPositions.setZ(i, z < -50 ? 50 : z - 0.1);

        const line = lineGroup.children[i]
        const points = line.geometry.attributes.position.array;
        points[0] = starPositions.getX(i);
        points[1] = starPositions.getY(i);
        points[2] = starPositions.getZ(i);
        points[3] = starPositions.getX(i) + 4;
        points[4] = starPositions.getY(i) - 2;
        points[5] = starPositions.getZ(i) + 4;
        line.geometry.attributes.position.needsUpdate = true;

    }
    starPositions.needsUpdate = true;
    controls.update()

}
renderer.setAnimationLoop(animate)
