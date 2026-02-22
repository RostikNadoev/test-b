import React, { useState, useMemo, useRef, useCallback, forwardRef, useImperativeHandle, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics, useSphere, useBox, useCylinder } from '@react-three/cannon'
import { PerspectiveCamera, Stars, Text, Circle, Ring } from '@react-three/drei'

// ========== КОНФИГУРАЦИЯ ==========
const LAUNCH_CONFIG = {
  current: { x: -0.07474, vx: 0.27202, vy: -0.000000001 },
}

const GAME_CONFIG = {
  ballRadius: 0.045, 
  rows: 14,
  startY: 2.2, 
  horizontalSpacingMultiplier: 1.65, 
  verticalSpacingMultiplier: 1.05,
  gravity: -3.8, 
  ballRestitution: 0.3,
  pixelTo3D: 0.002,
  gapToBottomPixels: 140,
  multipliers: [30, 15, 8, 3, 1.5, 0.6, 0.2, 0.6, 1.5, 3, 8, 15, 30],
  GROUP_BALL: 1,
  GROUP_STATIC: 2
}

const COLOR_GRADIENT = [
  { main: '#FFFFFF', emissive: '#60A5FA' },
  { main: '#BFDBFE', emissive: '#3B82F6' },
  { main: '#93C5FD', emissive: '#2563EB' },
  { main: '#60A5FA', emissive: '#1D4ED8' },
  { main: '#3B82F6', emissive: '#1E40AF' },
  { main: '#2563EB', emissive: '#1E3A8A' },
  { main: '#1D4ED8', emissive: '#23346d' }
]

const getColorBySlotIndex = (index) => {
  const centerIndex = 6;
  const dist = Math.abs(index - centerIndex);
  return COLOR_GRADIENT[dist] || COLOR_GRADIENT[COLOR_GRADIENT.length - 1];
}

// ========== ПРЕПЯТСТВИЕ ==========
function Peg({ position, config }) {
  const ringRef = useRef()
  const [pulse, setPulse] = useState(0)
  const pegRadius = config.ballRadius * 0.45

  useCylinder(() => ({
    type: 'Static',
    position,
    args: [pegRadius, pegRadius, 0.1, 16],
    rotation: [Math.PI / 2, 0, 0],
    collisionFilterGroup: GAME_CONFIG.GROUP_STATIC,
    onCollide: () => setPulse(1)
  }))

  useFrame(() => {
    if (ringRef.current && pulse > 0) {
      ringRef.current.visible = true
      const s = 1 + (1 - pulse) * 3.5
      ringRef.current.scale.set(s, s, s)
      ringRef.current.material.opacity = pulse
      setPulse(prev => Math.max(0, prev - 0.05))
    } else if (ringRef.current) {
      ringRef.current.visible = false
    }
  })

  return (
    <group position={position}>
      <Circle args={[pegRadius, 32]}>
        <meshStandardMaterial color="#555" emissive="white" emissiveIntensity={0.2} />
      </Circle>
      <Ring ref={ringRef} args={[pegRadius * 0.8, pegRadius * 1.2, 32]} visible={false}>
        <meshStandardMaterial color="#00f2ff" transparent emissive="#00f2ff" depthWrite={false} />
      </Ring>
    </group>
  )
}

// ========== КНОПКА-ЛУНКА ==========
function IndividualSlot({ index, val, x, bottomY, slotWidth, config, onHit }) {
  const [impact, setImpact] = useState(0)
  const slotColor = getColorBySlotIndex(index)

  const [ref] = useBox(() => ({
    type: 'Static',
    position: [x, bottomY, 0],
    args: [slotWidth * 0.96, 0.12, 0.4], 
    collisionFilterGroup: GAME_CONFIG.GROUP_STATIC,
    onCollide: (e) => {
      setImpact(1.0);
      // Достаем ID именно того шарика, который коснулся
      const ballId = e.body.userData?.id;
      if (onHit && ballId) onHit(val, ballId);
    }
  }))

  useFrame((_, delta) => {
    if (impact > 0) {
      setImpact(prev => Math.max(0, prev - delta * 2.0))
    }
  })

  const currentY = bottomY - (impact * 0.03);

  return (
    <group>
      <Text 
        fontSize={config.ballRadius * 1.1} 
        fontWeight="bold" 
        position={[x, currentY + 0.079, 0.09]} 
        color="black"
      >
        x{val}
      </Text>

      <mesh ref={ref} position={[x, currentY, 0]}>
        <boxGeometry args={[slotWidth * 0.94, 0.12, 0.25]} />
        <meshStandardMaterial 
          color={slotColor.main} 
          emissive={slotColor.emissive}
          emissiveIntensity={0.2 + impact * 8}
        />
      </mesh>

      <pointLight 
        position={[x, currentY + 0.2, 0.15]}
        color={slotColor.emissive} 
        intensity={impact * 3}
        distance={0.4}
      />
    </group>
  )
}

// ========== ШАРИК ==========
function Ball({ id, config }) {
  const [ref] = useSphere(() => ({
    mass: 1,
    fixedRotation: true,
    position: [LAUNCH_CONFIG.current.x, config.startY, 0],
    velocity: [LAUNCH_CONFIG.current.vx, LAUNCH_CONFIG.current.vy, 0],
    args: [config.ballRadius],
    material: { friction: 0.1, restitution: config.ballRestitution },
    collisionFilterGroup: config.GROUP_BALL,
    collisionFilterMask: config.GROUP_STATIC,
    userData: { id } // Передаем ID внутрь физического тела!
  }))

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[config.ballRadius, 24, 24]} />
      <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={3} />
    </mesh>
  )
}

// ========== СЕТКА СЛОТОВ ==========
function SlotGeometry({ config, bottomY, onBallLand }) {
  const { multipliers, ballRadius, rows, horizontalSpacingMultiplier } = config
  const spacing = (ballRadius * 2) * horizontalSpacingMultiplier
  const lastRowStartX = -((rows - 1) * spacing) / 2
  const lastRowEndX = ((rows - 1) * spacing) / 2
  const totalWidth = lastRowEndX - lastRowStartX
  const slotWidth = totalWidth / multipliers.length

  return (
    <group>
      {multipliers.map((val, i) => (
        <IndividualSlot 
          key={i} 
          index={i} 
          val={val} 
          x={lastRowStartX + (i + 0.5) * slotWidth}
          bottomY={bottomY} 
          slotWidth={slotWidth} 
          config={config}
          onHit={onBallLand}
        />
      ))}
    </group>
  )
}

function InvisibleWall({ position, args }) {
  const [ref] = useBox(() => ({ type: 'Static', position, args }))
  return <mesh ref={ref} visible={false}><boxGeometry args={args} /></mesh>
}

// Зона для "улетевших" шариков (множитель 0)
function KillZone({ bottomY, onMiss }) {
  const [ref] = useBox(() => ({
    type: 'Static',
    position: [0, bottomY - 0.8, 0], 
    args: [20, 0.5, 5],
    collisionFilterGroup: GAME_CONFIG.GROUP_STATIC,
    onCollide: (e) => {
      const ballId = e.body.userData?.id;
      if (onMiss && ballId) onMiss(0, ballId); 
    }
  }))
  return <mesh ref={ref} visible={false}><boxGeometry args={[20, 0.5, 5]} /></mesh>
}

// ========== ГЛАВНЫЙ КОМПОНЕНТ ==========
const NeonPlinko = forwardRef((props, ref) => {
  const { onBallLand, gameState } = props;
  const [balls, setBalls] = useState([])
  const processedBalls = useRef(new Set()) 
  const config = GAME_CONFIG

  // Используем Ref для коллбэка, чтобы физика всегда видела актуальную ставку из PlinkoScreen
  const latestOnBallLand = useRef(onBallLand);
  useEffect(() => {
    latestOnBallLand.current = onBallLand;
  }, [onBallLand]);

  const dropBall = useCallback(() => {
    const newId = Date.now() + Math.random(); // Надежный уникальный ID
    setBalls(prev => [...prev, newId])
  }, [])

  useImperativeHandle(ref, () => ({ dropBall }))

  const { bottomY, pegs, centerViewY } = useMemo(() => {
    const { ballRadius, horizontalSpacingMultiplier, verticalSpacingMultiplier, startY, rows } = config
    const spacing = (ballRadius * 2) * horizontalSpacingMultiplier
    const vs = spacing * verticalSpacingMultiplier

    const p = []
    let lastY = startY
    for (let row = 1; row < rows; row++) {
      const rowY = startY - row * vs
      lastY = rowY
      const cols = row + 1
      for (let col = 0; col < cols; col++) {
        p.push([(col - row / 2) * spacing, rowY, 0])
      }
    }

    const bY = lastY - 0.2 
    const cY = (startY + bY) / 2

    return { bottomY: bY, pegs: p, centerViewY: cY }
  }, [config])

  // Обработчик касания
  const handleBallHit = useCallback((multiplier, ballId) => {
    if (!ballId || processedBalls.current.has(ballId)) return; 
    processedBalls.current.add(ballId); 
    
    // 1. УДАЛЯЕМ шарик со сцены
    setBalls(prev => prev.filter(id => id !== ballId));

    // 2. Вызываем обновление счета
    if (latestOnBallLand.current) {
      latestOnBallLand.current(multiplier);
    }
  }, []);

  // Очистка при финише/заборе денег
  useEffect(() => {
    if (gameState === 'idle') {
      setBalls([]);
      processedBalls.current.clear();
    }
  }, [gameState]);

  return (
    <div className="plinko-game-wrapper" style={{ width: '100%', height: '100%', minHeight: '500px' }}>
      <Canvas dpr={[1, 2]} gl={{ antialias: true, toneMappingExposure: 1.5 }}>
        <PerspectiveCamera 
          makeDefault 
          position={[
            0, 
            centerViewY - 0.3, 
            window.innerWidth <= 350 ? 3.7 : (window.innerWidth <= 393 ? 3.4 : 3.2)
          ]} 
          fov={50}
        />
        <Stars count={100} factor={4} fade depth={50} />
        <ambientLight intensity={1.2} />
        <pointLight position={[0, 5, 5]} intensity={2} />
        
        <Physics 
          gravity={[0, config.gravity, 0]}
          defaultContactMaterial={{ friction: 0, restitution: 0.5 }}
        >
          {pegs.map((pos, i) => <Peg key={i} position={pos} config={config} />)}
          <SlotGeometry 
            config={config} 
            bottomY={bottomY} 
            onBallLand={handleBallHit} 
          />
          <KillZone bottomY={bottomY} onMiss={handleBallHit} />
          
          {/* Передаем ID в компонент шарика */}
          {balls.map(id => <Ball key={id} id={id} config={config} />)}
          
          <InvisibleWall position={[0, 0, 0.05]} args={[10, 10, 0.01]} />
          <InvisibleWall position={[0, 0, -0.05]} args={[10, 10, 0.01]} />
        </Physics>
      </Canvas>
    </div>
  )
})

export default NeonPlinko