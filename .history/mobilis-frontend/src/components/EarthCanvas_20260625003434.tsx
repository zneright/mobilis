import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useVisitorStore } from '../../store/visitorStore';

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        THREE: any;
    }
}

// ─── SHOOTING STAR (METEORITE) ──────────────────────────────────────────────
export const ShootingStar = ({ delay = 0 }: { delay?: number }) => {
    const [startX] = useState(() => Math.random() * 100 + 20);
    const [startY] = useState(() => Math.random() * 50 - 20);
    const [repeatDelay] = useState(() => Math.random() * 7 + 3);

    return (
        <motion.div
            className="absolute pointer-events-none z-0 flex items-center justify-end"
            style={{
                top: `${startY}vh`,
                left: `${startX}vw`,
                width: "180px",
                height: "2px",
                background:
                    "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.6) 50%, rgba(255,255,255,1) 100%)",
                transformOrigin: "right",
            }}
            initial={{ x: 0, y: 0, opacity: 0, rotate: -45 }}
            animate={{ x: -1500, y: 1500, opacity: [0, 1, 1, 0] }}
            transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: delay,
                ease: "linear",
                repeatDelay: repeatDelay,
            }}
        >
            <div className="w-[4px] h-[4px] bg-white rounded-full shadow-[0_0_15px_4px_rgba(255,255,255,0.8)]" />
        </motion.div>
    );
};

// ─── 3D EARTH (Three.js) ─────────────────────────────────────────────────
export const EarthCanvas = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const animRef = useRef<number>(0);
    const theme = useVisitorStore((state) => state.theme);
    const isLight = theme === 'light';

    useEffect(() => {
        if (!mountRef.current) return;
        const currentMount = mountRef.current;

        const initThree = () => {
            const THREE = window.THREE;
            const container = currentMount;

            // Wipe out any duplicate Earths from React Strict Mode
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }

            const W = container.clientWidth;
            const H = container.clientHeight;

            const renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true,
            });
            renderer.setSize(W, H);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setClearColor(0x000000, 0);
            container.appendChild(renderer.domElement);

            container.style.cursor = "grab";

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
            camera.position.z = 3.6;

            const globeGroup = new THREE.Group();
            scene.add(globeGroup);

            // ── EARTH TEXTURE ──────────────────────────────────────────
            const texCanvas = document.createElement("canvas");
            texCanvas.width = 1024;
            texCanvas.height = 512;
            const ctx = texCanvas.getContext("2d")!;

            // Adjust Ocean Color based on theme
            const oceanGrad = ctx.createLinearGradient(0, 0, 0, 512);
            if (isLight) {
                oceanGrad.addColorStop(0, "#3b82f6");
                oceanGrad.addColorStop(0.5, "#2563eb");
                oceanGrad.addColorStop(1, "#1d4ed8");
            } else {
                oceanGrad.addColorStop(0, "#0d1a3a");
                oceanGrad.addColorStop(0.5, "#0a2050");
                oceanGrad.addColorStop(1, "#061228");
            }
            ctx.fillStyle = oceanGrad;
            ctx.fillRect(0, 0, 1024, 512);

            const landMasses = [
                { x: 200, y: 180, rx: 60, ry: 100, rot: -0.3 },
                { x: 220, y: 320, rx: 45, ry: 80, rot: 0.2 },
                { x: 530, y: 170, rx: 55, ry: 70, rot: 0.1 },
                { x: 545, y: 310, rx: 50, ry: 90, rot: 0 },
                { x: 700, y: 150, rx: 130, ry: 90, rot: -0.1 },
                { x: 790, y: 340, rx: 55, ry: 40, rot: 0.2 },
            ];
            landMasses.forEach(({ x, y, rx, ry, rot }) => {
                ctx.fillStyle = isLight ? "#22c55e" : "#1a5c32";
                ctx.beginPath();
                ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = isLight ? "#16a34a" : "#217a42";
                ctx.beginPath();
                ctx.ellipse(x - 5, y - 5, rx * 0.75, ry * 0.75, rot, 0, Math.PI * 2);
                ctx.fill();
            });

            // Clouds
            const pG = ctx.createRadialGradient(512, 0, 0, 512, 0, 90);
            pG.addColorStop(0, "rgba(255,255,255,0.85)");
            pG.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = pG;
            ctx.fillRect(0, 0, 1024, 90);

            ctx.fillStyle = "rgba(255,255,255,0.15)";
            for (let i = 0; i < 25; i++) {
                ctx.beginPath();
                ctx.ellipse(
                    Math.random() * 1024,
                    Math.random() * 512,
                    50 + Math.random() * 90,
                    10 + Math.random() * 20,
                    Math.random() * 0.6,
                    0,
                    Math.PI * 2,
                );
                ctx.fill();
            }
            const texture = new THREE.CanvasTexture(texCanvas);

            // ── NIGHT LIGHTS (Only visible heavily in dark mode) ──────
            const nightC = document.createElement("canvas");
            nightC.width = 1024;
            nightC.height = 512;
            const nCtx = nightC.getContext("2d")!;
            nCtx.fillStyle = "#000";
            nCtx.fillRect(0, 0, 1024, 512);

            if (!isLight) {
                [
                    [200, 170], [215, 325], [530, 160], [700, 145], [740, 200],
                    [680, 170], [790, 340], [550, 310], [600, 180], [460, 175],
                ].forEach(([cx, cy]) => {
                    const g = nCtx.createRadialGradient(cx, cy, 0, cx, cy, 45);
                    g.addColorStop(0, "rgba(176,38,255,0.9)"); // Purple city lights to match theme
                    g.addColorStop(0.4, "rgba(176,38,255,0.3)");
                    g.addColorStop(1, "rgba(176,38,255,0)");
                    nCtx.fillStyle = g;
                    nCtx.beginPath();
                    nCtx.arc(cx, cy, 45, 0, Math.PI * 2);
                    nCtx.fill();
                });
            }
            const nightTex = new THREE.CanvasTexture(nightC);

            const geo = new THREE.SphereGeometry(1, 64, 64);
            const mat = new THREE.MeshPhongMaterial({
                map: texture,
                emissiveMap: nightTex,
                emissive: new THREE.Color(0xffffff),
                emissiveIntensity: isLight ? 0 : 0.8,
                specular: new THREE.Color(0x3366ff),
                shininess: 25,
            });
            const earth = new THREE.Mesh(geo, mat);
            globeGroup.add(earth);

            // ── GLOBAL NETWORK OVERLAY ────────────────────────────────
            const networkGroup = new THREE.Group();
            const numNodes = 35;
            const nodes: any[] = [];
            const nodeGeo = new THREE.SphereGeometry(0.012, 8, 8);
            const nodeMat = new THREE.MeshBasicMaterial({ color: isLight ? 0x22c55e : 0x00FF66 });

            for (let i = 0; i < numNodes; i++) {
                const v = new THREE.Vector3(
                    Math.random() - 0.5,
                    Math.random() - 0.5,
                    Math.random() - 0.5,
                ).normalize().multiplyScalar(1.01);
                nodes.push(v);
                const mesh = new THREE.Mesh(nodeGeo, nodeMat);
                mesh.position.copy(v);
                networkGroup.add(mesh);
            }

            const lineMat = new THREE.LineBasicMaterial({
                color: isLight ? 0x7c3aed : 0xB026FF,
                transparent: true,
                opacity: 0.4,
            });

            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    if (nodes[i].distanceTo(nodes[j]) < 0.75) {
                        const mid = nodes[i].clone().add(nodes[j]).multiplyScalar(0.5).normalize().multiplyScalar(1.12);
                        const curve = new THREE.QuadraticBezierCurve3(nodes[i], mid, nodes[j]);
                        const points = curve.getPoints(12);
                        const curveGeo = new THREE.BufferGeometry().setFromPoints(points);
                        networkGroup.add(new THREE.Line(curveGeo, lineMat));
                    }
                }
            }
            globeGroup.add(networkGroup);

            // ── ATMOSPHERE ────────────────────────────────────────────
            const atmMesh = new THREE.Mesh(
                new THREE.SphereGeometry(1.05, 64, 64),
                new THREE.MeshPhongMaterial({
                    color: isLight ? 0x60a5fa : 0x4488ff,
                    transparent: true,
                    opacity: 0.15,
                }),
            );
            globeGroup.add(atmMesh);

            // ── ORBITAL RING ───────────────────────────────────────────
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(1.3, 0.004, 2, 120),
                new THREE.MeshBasicMaterial({
                    color: isLight ? 0x7c3aed : 0xB026FF,
                    transparent: true,
                    opacity: 0.35,
                }),
            );
            ring.rotation.x = Math.PI * 0.35;
            scene.add(ring);

            // ── ORBITING TOKEN ──────────────────────────
            const tokenC = document.createElement("canvas");
            tokenC.width = 128;
            tokenC.height = 128;
            const tCtx = tokenC.getContext("2d")!;

            tCtx.fillStyle = isLight ? "#22c55e" : "#00FF66";
            tCtx.beginPath();
            tCtx.arc(64, 64, 45, 0, Math.PI * 2);
            tCtx.fill();
            tCtx.fillStyle = "#fff";
            tCtx.font = "bold 50px sans-serif";
            tCtx.textAlign = "center";
            tCtx.textBaseline = "middle";
            tCtx.fillText("RB", 64, 64);

            const tokenTex = new THREE.CanvasTexture(tokenC);
            tokenTex.needsUpdate = true;
            const tokenSprite = new THREE.Sprite(
                new THREE.SpriteMaterial({ map: tokenTex, transparent: true }),
            );
            tokenSprite.scale.set(0.4, 0.4, 1);
            scene.add(tokenSprite);

            // ── LIGHTING ───────────────────────────────────────────────
            scene.add(new THREE.AmbientLight(isLight ? 0xffffff : 0x334466, isLight ? 1 : 0.6));
            const sun = new THREE.DirectionalLight(0xffffff, 1.2);
            sun.position.set(5, 3, 5);
            scene.add(sun);

            // ── CONTROLS & ANIMATION ────────────────────────────────────
            let isDragging = false;
            let previousMousePosition = { x: 0, y: 0 };

            container.addEventListener("mousedown", (e) => {
                isDragging = true;
                container.style.cursor = "grabbing";
                previousMousePosition = { x: e.clientX, y: e.clientY };
            });
            window.addEventListener("mousemove", (e) => {
                if (isDragging) {
                    const deltaX = e.clientX - previousMousePosition.x;
                    const deltaY = e.clientY - previousMousePosition.y;
                    globeGroup.rotation.y += deltaX * 0.005;
                    globeGroup.rotation.x += deltaY * 0.005;
                    globeGroup.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globeGroup.rotation.x));
                    previousMousePosition = { x: e.clientX, y: e.clientY };
                }
            });
            window.addEventListener("mouseup", () => {
                isDragging = false;
                container.style.cursor = "grab";
            });

            const onResize = () => {
                const W2 = container.clientWidth, H2 = container.clientHeight;
                camera.aspect = W2 / H2;
                camera.updateProjectionMatrix();
                renderer.setSize(W2, H2);
            };
            window.addEventListener("resize", onResize);

            let t = 0;
            const animate = () => {
                animRef.current = requestAnimationFrame(animate);
                t += 0.005;

                if (!isDragging) {
                    globeGroup.rotation.y += 0.002;
                }

                const orbitTilt = Math.PI * 0.35, orbitR = 1.3;
                tokenSprite.position.set(
                    orbitR * Math.cos(t),
                    orbitR * Math.sin(t) * Math.sin(orbitTilt),
                    orbitR * Math.sin(t) * Math.cos(orbitTilt),
                );
                ring.material.opacity = 0.25 + 0.1 * Math.sin(t * 2);

                renderer.render(scene, camera);
            };
            animate();

            (container as HTMLDivElement & { _cleanup?: () => void })._cleanup = () => {
                cancelAnimationFrame(animRef.current);
                window.removeEventListener("resize", onResize);
                renderer.dispose();
                if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
            };
        };

        if (window.THREE) {
            initThree();
        } else {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
            script.async = true;
            script.onload = initThree;
            document.head.appendChild(script);
        }

        return () => { (currentMount as HTMLDivElement & { _cleanup?: () => void })?._cleanup?.(); };
    }, [isLight]); // Re-run when theme changes

    return (
        <div className="relative w-full aspect-square max-w-[500px]">
            <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                    background: isLight ? "radial-gradient(circle,rgba(59,130,246,0.1) 0%,transparent 60%)" : "radial-gradient(circle,rgba(176,38,255,0.15) 0%,rgba(0,255,102,0.08) 50%,transparent 70%)",
                    filter: "blur(20px)",
                    transform: "scale(1.2)",
                }}
            />
            <div ref={mountRef} className="w-full h-full" />
        </div>
    );
};