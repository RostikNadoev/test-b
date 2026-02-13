import React, { useState, useMemo, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics, useSphere, useBox, useCylinder } from '@react-three/cannon'
import { PerspectiveCamera, Stars, Text, Circle, Ring } from '@react-three/drei'
import '../styles/NeonPlinko.css'

// ========== НАСТРОЙКИ ДЛЯ ПОДБОРА ПОЛЕТА ==========
const LAUNCH_CONFIG = {
  current: {
    x: -0.0022,    // Смещай на микрон (0.001), чтобы не бить ровно в центр гвоздя
    vx: -0.0122,      
    vy: -0.000000001     // Стабильная скорость вниз
  },
  // Сюда впишешь значения, когда подберешь их для всех 13 лунок
  presets: {
    slot0:  { x: -0.25, vx: -0.15 },
    slot6:  { x: 0.005, vx: 0.0 }, // Центральная
    slot12: { x: 0.25,  vx: 0.15 },
  }
}

const GAME_CONFIG = {
  ballRadius: 0.045, // Увеличили с 0.028 до 0.045
  rows: 14,
  startY: 2.2, // Увеличили с 1.5 до 2.2
  horizontalSpacingMultiplier: 1.65, // Немного увеличили для лучшей видимости
  verticalSpacingMultiplier: 1.05,
  gravity: -3.2, // Немного увеличили гравитацию для более быстрого падения
  ballRestitution: 0.4,
  pixelTo3D: 0.002,
  gapToBottomPixels: 140,
  multipliers: [30, 15, 8, 3, 1.5, 0.6, 0.2, 0.6, 1.5, 3, 8, 15, 30],
  GROUP_BALL: 1,
  GROUP_STATIC: 2,
  // Добавляем коэффициент замедления в воде
  waterSlowdown: 0.15 // Сильное замедление (15% от скорости)
}

// ========== ЦВЕТА ДЛЯ ВОДЫ И ТЕКСТА (усиленная градация) ==========
const COLOR_GRADIENT = [
  { main: '#FFFFFF', emissive: '#FFFFFF' },     // Центр (индекс 6) - белый
  { main: '#CCCCFF', emissive: '#AAAAFF' },     // 5 и 7 - светло-голубой
  { main: '#9999FF', emissive: '#7777FF' },     // 4 и 8 - голубой
  { main: '#6666FF', emissive: '#4444FF' },     // 3 и 9 - синий
  { main: '#3333FF', emissive: '#2222FF' },     // 2 и 10 - темно-синий
  { main: '#1111CC', emissive: '#0000AA' },     // 1 и 11 - очень темно-синий
  { main: '#000099', emissive: '#000066' }      // 0 и 12 - почти черный синий
]

// Функция для получения цвета по индексу лунки (зеркально от центра)
const getColorBySlotIndex = (index) => {
  // Центр (индекс 6) - белый
  if (index === 6) return COLOR_GRADIENT[0]
  // Зеркальное отображение от центра
  const distanceFromCenter = Math.abs(index - 6)
  return COLOR_GRADIENT[distanceFromCenter]
}

// --- ПРЕПЯТСТВИЕ С ПУЛЬСАЦИЕЙ ---
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
      ringRef.current.material.emissiveIntensity = pulse * 2
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

// --- ВОДА С ЗАМЕДЛЕНИЕМ ШАРИКА И ГРАДИЕНТОМ ---
function WaterSurface({ width, height, position, colorIndex }) {
  const meshRef = useRef()
  const [wobble, setWobble] = useState(0)
  
  const waterColor = getColorBySlotIndex(colorIndex)
  
  // Создаем коллизию для воды
  const [ref] = useBox(() => ({
    type: 'Static', 
    isSensor: true, 
    args: [width, 0.1, 0.15],
    position: [position[0], position[1] + height / 2, position[2]],
    onCollide: (e) => {
      setWobble(1)
      // Если столкнулись с шариком
      if (e.body.mass > 0) {
        // Сильно замедляем шарик (вода)
        e.body.velocity.set(
          e.body.velocity.x * GAME_CONFIG.waterSlowdown,
          Math.abs(e.body.velocity.y) * GAME_CONFIG.waterSlowdown * 0.5, // Вверх тормашками
          e.body.velocity.z * GAME_CONFIG.waterSlowdown
        )
      }
    }
  }))
  
  useFrame((state) => {
    if (meshRef.current) {
      if (wobble > 0) {
        const time = state.clock.getElapsedTime() * 18
        meshRef.current.scale.y = 1 + Math.sin(time) * 0.15 * wobble
        setWobble(prev => Math.max(0, prev - 0.025))
      } else { meshRef.current.scale.y = 1 }
    }
  })
  
  return (
    <group>
      {/* Основная вода */}
      <mesh ref={meshRef} position={position}>
        <boxGeometry args={[width, height, 0.14]} />
        <meshStandardMaterial 
          color={waterColor.main}
          transparent 
          opacity={0.7} 
          emissive={waterColor.emissive} 
          emissiveIntensity={0.4}
        />
      </mesh>
      
      {/* Блики на воде (дополнительный слой для эффекта) */}
      <mesh position={[position[0], position[1] + height * 0.4, position[2] + 0.02]}>
        <boxGeometry args={[width * 0.8, height * 0.1, 0.01]} />
        <meshStandardMaterial 
          color="#FFFFFF" 
          transparent 
          opacity={0.2}
          emissive="#FFFFFF"
          emissiveIntensity={0.1}
        />
      </mesh>
    </group>
  )
}

// --- ШАРИК (ДЕТЕРМИНИРОВАННЫЙ) ---
function Ball({ onLand, bottomY, config }) {
  const [ref] = useSphere(() => ({
    mass: 1,
    fixedRotation: true,
    position: [LAUNCH_CONFIG.current.x, config.startY, 0],
    velocity: [LAUNCH_CONFIG.current.vx, LAUNCH_CONFIG.current.vy, 0],
    args: [config.ballRadius],
    material: { friction: 0, restitution: config.ballRestitution },
    collisionFilterGroup: config.GROUP_BALL,
    collisionFilterMask: config.GROUP_STATIC
  }))

  useFrame(() => {
    if (ref.current && ref.current.position.y < bottomY - 0.3) onLand()
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[config.ballRadius, 32, 32]} />
      <meshStandardMaterial color="#ffffff" emissive="#00f2ff" emissiveIntensity={1.2} />
    </mesh>
  )
}

function Divider({ position, args }) {
  const [ref] = useBox(() => ({ type: 'Static', position, args, collisionFilterGroup: GAME_CONFIG.GROUP_STATIC }))
  return <mesh ref={ref}><boxGeometry args={args} /><meshStandardMaterial color="white" /></mesh>
}

function SlotGeometry({ config }) {
  const { multipliers, ballRadius, rows, startY, gapToBottomPixels, pixelTo3D, horizontalSpacingMultiplier, verticalSpacingMultiplier } = config
  const spacing = (ballRadius * 2) * horizontalSpacingMultiplier
  const vs = spacing * verticalSpacingMultiplier
  const lastRowStartX = -((rows - 1) * spacing) / 2
  const lastRowEndX = ((rows - 1) * spacing) / 2
  const slotWidth = (lastRowEndX - lastRowStartX) / multipliers.length
  const bottomY = (startY - (rows - 1) * vs) - ballRadius * 2 - (gapToBottomPixels * pixelTo3D)
  const wallHeight = ballRadius * 6

  return (
    <group>
      {multipliers.map((val, i) => {
        const x = lastRowStartX + (i + 0.5) * slotWidth
        const waterHeight = wallHeight * 0.7
        const textColor = getColorBySlotIndex(i)
        
        return (
          <group key={i}>
            <Text 
              fontSize={ballRadius * 1.4} 
              fontWeight="bold" 
              position={[x, bottomY - 0.1, 0]} 
              color={textColor.main}
              emissive={textColor.emissive}
              emissiveIntensity={0.5}
            >
              x{val}
            </Text>
            <Divider position={[x + slotWidth / 2, bottomY + wallHeight / 2, 0]} args={[0.03, wallHeight, 0.15]} />
            {i === 0 && <Divider position={[x - slotWidth / 2, bottomY + wallHeight / 2, 0]} args={[0.03, wallHeight, 0.15]} />}
            <Divider position={[x, bottomY, 0]} args={[slotWidth, 0.05, 0.15]} />
            
            {/* Вода с градиентом цвета */}
            <WaterSurface 
              width={slotWidth - 0.02} 
              height={waterHeight} 
              position={[x, bottomY + waterHeight / 2 + 0.03, 0]} 
              colorIndex={i}
            />
          </group>
        )
      })}
    </group>
  )
}

function InvisibleWall({ position, args }) {
  const [ref] = useBox(() => ({ type: 'Static', position, args }))
  return <mesh ref={ref} visible={false}><boxGeometry args={args} /></mesh>
}

// --- ГЛАВНЫЙ КОМПОНЕНТ ---
const NeonPlinko = forwardRef((props, ref) => {
  const [balls, setBalls] = useState([])
  const config = GAME_CONFIG

  const dropBall = useCallback(() => setBalls(prev => [...prev, Date.now()]), [])

  // Экспортируем функцию наружу
  useImperativeHandle(ref, () => ({
    dropBall
  }))

  const { bottomY, lastRowY, pegs } = useMemo(() => {
    const { ballRadius, horizontalSpacingMultiplier, verticalSpacingMultiplier, startY, rows, gapToBottomPixels, pixelTo3D } = config
    const spacing = ballRadius * 2 * horizontalSpacingMultiplier
    const vs = spacing * verticalSpacingMultiplier
    const bY = (startY - (rows - 1) * vs) - ballRadius * 2 - (gapToBottomPixels * pixelTo3D)
    const p = []
    for (let row = 1; row < rows; row++) {
      const cols = row + 1
      for (let col = 0; col < cols; col++) {
        p.push([(col - row / 2) * spacing, startY - row * vs, 0])
      }
    }
    return { bottomY: bY, lastRowY: startY - ((rows - 1) * vs), pegs: p }
  }, [config])

  return (
    <div className="plinko-game-wrapper">
      <div className="plinko-canvas-container">
        <Canvas dpr={[1, 2]}>
          <PerspectiveCamera 
            makeDefault 
            position={[
              0,
              (GAME_CONFIG.startY + bottomY) / 2.6,
              window.innerWidth <= 360 ? 3.7 :
              window.innerWidth > 400 ? 3.1 :
              3.4
            ]}
          />
          <Stars count={80} factor={3} fade depth={50} />
          <ambientLight intensity={1.8} />
          <pointLight position={[0, 3, 3]} intensity={0.8} />
          
          <Physics 
            gravity={[0, config.gravity, 0]}
            defaultContactMaterial={{
              friction: 0,
              restitution: 0.5,
              contactEquationStiffness: 1e8,
              contactEquationRelaxation: 3
            }}
            iterations={20}
          >
            {pegs.map((pos, i) => <Peg key={i} position={pos} config={config} />)}
            <SlotGeometry config={config} />
            {balls.map(id => (
              <Ball key={id} bottomY={bottomY} config={config} onLand={() => setBalls(prev => prev.filter(b => b !== id))} />
            ))}
            <InvisibleWall position={[0, 0, 0.02]} args={[12, 12, 0.001]} />
            <InvisibleWall position={[0, 0, -0.02]} args={[12, 12, 0.001]} />
          </Physics>
        </Canvas>
      </div>
    </div>
  )
})

export default NeonPlinko