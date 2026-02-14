import React, { useState, useMemo, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics, useSphere, useBox, useCylinder } from '@react-three/cannon'
import { PerspectiveCamera, Stars, Text, Circle, Ring } from '@react-three/drei'

// ========== КОНФИГУРАЦИЯ ==========
const LAUNCH_CONFIG = {
  current: { x: -0.001, vx: -0.0112, vy: -0.000000001 },
}

const GAME_CONFIG = {
  ballRadius: 0.045, 
  rows: 14,
  startY: 2.2, 
  horizontalSpacingMultiplier: 1.65, 
  verticalSpacingMultiplier: 1.05,
  gravity: -3.2, 
  ballRestitution: 0.4,
  pixelTo3D: 0.002,
  gapToBottomPixels: 140,
  multipliers: [30, 15, 8, 3, 1.5, 0.6, 0.2, 0.6, 1.5, 3, 8, 15, 30],
  GROUP_BALL: 1,
  GROUP_STATIC: 2
}

const COLOR_GRADIENT = [
  { main: '#FFFFFF', emissive: '#FFFFFF' },     
  { main: '#CCCCFF', emissive: '#AAAAFF' },     
  { main: '#9999FF', emissive: '#7777FF' },     
  { main: '#6666FF', emissive: '#4444FF' },     
  { main: '#3333FF', emissive: '#2222FF' },     
  { main: '#1111CC', emissive: '#0000AA' },     
  { main: '#000099', emissive: '#000066' }      
]

const getColorBySlotIndex = (index) => {
  if (index === 6) return COLOR_GRADIENT[0]
  const distanceFromCenter = Math.abs(index - 6)
  return COLOR_GRADIENT[distanceFromCenter]
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
      ringRef.current.material.emissiveIntensity = pulse * 10
      setPulse(prev => Math.max(0, prev - 0.05))
    } else if (ringRef.current) {
      ringRef.current.visible = false
    }
  })

  return (
    <group position={position}>
      <Circle args={[pegRadius, 32]}>
        <meshStandardMaterial color="white" />
      </Circle>
      <Ring ref={ringRef} args={[pegRadius * 0.8, pegRadius * 1.2, 32]} visible={false}>
        <meshStandardMaterial color="#00f2ff" transparent emissive="#00f2ff" depthWrite={false} />
      </Ring>
    </group>
  )
}

// ========== ВОДА ==========
function WaterSurface({ width, height, position, colorIndex, impact }) {
  const meshRef = useRef()
  const waterColor = getColorBySlotIndex(colorIndex)
  
  useFrame(() => {
    if (meshRef.current) {
      // Сделал свечение воды ярче при попадании
      meshRef.current.material.emissiveIntensity = 1.0 + impact * 60 
      meshRef.current.position.y = position[1] + impact * 0.08
    }
  })
  
  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[width, height, 0.14]} />
      <meshStandardMaterial 
        color={waterColor.main}
        transparent 
        opacity={0.5} 
        emissive={waterColor.emissive} 
      />
    </mesh>
  )
}

// ========== ЛУНКА ==========
function IndividualSlot({ index, val, x, bottomY, wallHeight, slotWidth, config }) {
  const [impact, setImpact] = useState(0)
  const textColor = getColorBySlotIndex(index)
  const textRef = useRef()
  const lightRef = useRef() // Ссылка для вспышки
  const lastBallUuid = useRef(null)

  const [floorRef] = useBox(() => ({
    type: 'Static',
    position: [x, bottomY, 0],
    args: [slotWidth, 0.2, 0.4], 
    collisionFilterGroup: GAME_CONFIG.GROUP_STATIC,
    onCollide: (e) => {
      if (e.body.uuid !== lastBallUuid.current) {
        lastBallUuid.current = e.body.uuid
        setImpact(1.2) // Увеличил импульс
      }
    }
  }))

  useFrame((_, delta) => {
    if (impact > 0) {
      setImpact(prev => Math.max(0, prev - delta * 2.0)) // Сделал затухание чуть быстрее/реще
    }
    if (textRef.current) {
      const scale = 1 + impact * 0.5
      textRef.current.scale.set(scale, scale, 1)
    }
    if (lightRef.current) {
      // Интенсивность вспышки в цвет воды
      lightRef.current.intensity = impact * 20
    }
  })

  return (
    <group>
      <Text 
        ref={textRef}
        fontSize={config.ballRadius * 1.5} 
        fontWeight="bold" 
        position={[x, bottomY - 0.15, 0.05]} 
        color={textColor.main}
        emissive={textColor.emissive}
        emissiveIntensity={0.5 + impact * 80} // Текст вспыхивает ярче
      >
        x{val}
      </Text>

      {/* Вспышка света того же цвета, что и вода */}
      <pointLight 
        ref={lightRef} 
        position={[x, bottomY + 0.2, 0.1]} 
        color={textColor.emissive} 
        distance={1}
      />

      <Divider position={[x + slotWidth / 2, bottomY + wallHeight / 2, 0]} args={[0.02, wallHeight, 0.15]} />
      {index === 0 && (
        <Divider position={[x - slotWidth / 2, bottomY + wallHeight / 2, 0]} args={[0.02, wallHeight, 0.15]} />
      )}
      <mesh ref={floorRef}>
        <boxGeometry args={[slotWidth, 0.05, 0.15]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <WaterSurface 
        width={slotWidth - 0.01} 
        height={wallHeight * 0.6} 
        position={[x, bottomY + (wallHeight * 0.6) / 2 + 0.03, 0]} 
        colorIndex={index}
        impact={impact}
      />
    </group>
  )
}

// ========== ШАРИК ==========
function Ball({ onLand, bottomY, config }) {
  const [ref] = useSphere(() => ({
    mass: 1,
    fixedRotation: true,
    position: [LAUNCH_CONFIG.current.x, config.startY, 0],
    velocity: [LAUNCH_CONFIG.current.vx, LAUNCH_CONFIG.current.vy, 0],
    args: [config.ballRadius],
    material: { friction: 0.1, restitution: config.ballRestitution },
    collisionFilterGroup: config.GROUP_BALL,
    collisionFilterMask: config.GROUP_STATIC
  }))

  useFrame(() => {
    if (ref.current && ref.current.position.y < bottomY - 0.6) {
        onLand()
    }
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[config.ballRadius, 24, 24]} />
      <meshStandardMaterial color="#ffffff" emissive="#00f2ff" emissiveIntensity={5} />
    </mesh>
  )
}

function Divider({ position, args }) {
  const [ref] = useBox(() => ({ type: 'Static', position, args, collisionFilterGroup: GAME_CONFIG.GROUP_STATIC }))
  return <mesh ref={ref}><boxGeometry args={args} /><meshStandardMaterial color="white" /></mesh>
}

function SlotGeometry({ config, bottomY }) {
  const { multipliers, ballRadius, rows, horizontalSpacingMultiplier } = config
  const spacing = (ballRadius * 2) * horizontalSpacingMultiplier
  const lastRowStartX = -((rows - 1) * spacing) / 2
  const lastRowEndX = ((rows - 1) * spacing) / 2
  const slotWidth = (lastRowEndX - lastRowStartX) / multipliers.length
  const wallHeight = ballRadius * 5

  return (
    <group>
      {multipliers.map((val, i) => (
        <IndividualSlot 
          key={i} index={i} val={val} 
          x={lastRowStartX + (i + 0.5) * slotWidth}
          bottomY={bottomY} wallHeight={wallHeight} 
          slotWidth={slotWidth} config={config} 
        />
      ))}
    </group>
  )
}

function InvisibleWall({ position, args }) {
  const [ref] = useBox(() => ({ type: 'Static', position, args }))
  return <mesh ref={ref} visible={false}><boxGeometry args={args} /></mesh>
}

// ========== ГЛАВНЫЙ КОМПОНЕНТ ==========
const NeonPlinko = forwardRef((props, ref) => {
  const [balls, setBalls] = useState([])
  const config = GAME_CONFIG

  const dropBall = useCallback(() => {
    setBalls([Date.now()])
  }, [])

  useImperativeHandle(ref, () => ({ dropBall }))

  const { bottomY, pegs, centerViewY } = useMemo(() => {
    const { ballRadius, horizontalSpacingMultiplier, verticalSpacingMultiplier, startY, rows, gapToBottomPixels, pixelTo3D } = config
    const spacing = ballRadius * 2 * horizontalSpacingMultiplier
    const vs = spacing * verticalSpacingMultiplier
    const bY = (startY - (rows - 1) * vs) - ballRadius * 2 - (gapToBottomPixels * pixelTo3D)
    const cY = (startY + bY) / 2

    const p = []
    for (let row = 1; row < rows; row++) {
      const cols = row + 1
      for (let col = 0; col < cols; col++) {
        p.push([(col - row / 2) * spacing, startY - row * vs, 0])
      }
    }
    return { bottomY: bY, pegs: p, centerViewY: cY }
  }, [config])

  return (
    <div className="plinko-game-wrapper" style={{ width: '100%', height: '100%', minHeight: '500px' }}>
      <div className="plinko-canvas-container" style={{ width: '100%', height: '100%' }}>
        <Canvas 
          dpr={[1, 2]} 
          gl={{ antialias: true, toneMappingExposure: 1.5 }}
        >
          <PerspectiveCamera 
            makeDefault 
            position={[0, centerViewY - 0.3, window.innerWidth <= 383 ? 3.6 : 3.2]} 
            fov={50}
          />
          
          <Stars count={100} factor={4} fade depth={50} />
          <ambientLight intensity={1} />
          <pointLight position={[0, 5, 5]} intensity={1.5} />
          
          <Physics 
            gravity={[0, config.gravity, 0]}
            defaultContactMaterial={{ friction: 0, restitution: 0.5 }}
          >
            {pegs.map((pos, i) => <Peg key={i} position={pos} config={config} />)}
            <SlotGeometry config={config} bottomY={bottomY} />
            
            {balls.map(id => (
              <Ball 
                key={id} 
                bottomY={bottomY} 
                config={config} 
                onLand={() => setBalls([])} 
              />
            ))}

            <InvisibleWall position={[0, 0, 0.05]} args={[10, 10, 0.01]} />
            <InvisibleWall position={[0, 0, -0.05]} args={[10, 10, 0.01]} />
          </Physics>
        </Canvas>
      </div>
    </div>
  )
})

export default NeonPlinko