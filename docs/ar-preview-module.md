# AR预览功能架构设计

## 模块概述

AR预览功能允许用户在真实面部照片上叠加医美效果的3D预览，帮助用户直观了解医美项目的预期效果。

---

## 技术架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AR预览模块架构                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐               │
│  │  Three.js    │────▶│  Effect      │────▶│  Render      │               │
│  │  3D Engine   │     │  Processor   │     │  Pipeline    │               │
│  └──────────────┘     └──────────────┘     └──────────────┘               │
│         │                    │                     │                       │
│         │                    ▼                     │                       │
│         │            ┌──────────────┐              │                       │
│         │            │  Effect      │              │                       │
│         │            │  Library     │              │                       │
│         │            │  (填充/肉毒)  │              │                       │
│         │            └──────────────┘              │                       │
│         │                                         │                       │
│         ▼                                         ▼                       │
│  ┌──────────────┐                         ┌──────────────┐                │
│  │  Face Mesh   │─────────────────────────▶│  Comparison  │                │
│  │  Mapping     │                         │  Generator   │                │
│  └──────────────┘                         └──────────────┘                │
│         │                                                                 │
│         ▼                                                                 │
│  ┌──────────────┐                                                         │
│  │  Canvas      │                                                         │
│  │  Renderer    │                                                         │
│  └──────────────┘                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Three.js 场景设置

### 基础场景配置

```typescript
// components/ar/ARScene.tsx
import React, { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html, useTexture } from '@react-three/drei'
import * as THREE from 'three'

interface ARSceneProps {
  baseImageUrl: string
  faceLandmarks: Point3D[]
  effects: EffectParams[]
  onEffectChange?: (effect: EffectParams) => void
}

export function ARScene({ baseImageUrl, faceLandmarks, effects }: ARSceneProps) {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 2], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        className="bg-transparent"
      >
        <SceneContent
          baseImageUrl={baseImageUrl}
          faceLandmarks={faceLandmarks}
          effects={effects}
        />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 2 - 0.3}
          maxPolarAngle={Math.PI / 2 + 0.3}
        />
        <Lights />
      </Canvas>

      {/* UI Controls */}
      <EffectControls effects={effects} />
    </div>
  )
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />
    </>
  )
}

function SceneContent({ baseImageUrl, faceLandmarks, effects }: SceneContentProps) {
  const { scene, camera } = useThree()
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  // 加载基础图片
  useEffect(() => {
    new THREE.TextureLoader().load(baseImageUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      setTexture(tex)
    })
  }, [baseImageUrl])

  // 创建面部网格
  const faceMesh = useMemo(() => {
    if (!faceLandmarks || faceLandmarks.length === 0) return null

    const geometry = new THREE.BufferGeometry()
    const vertices: number[] = []
    const indices: number[] = []

    // MediaPipe Face Mesh 三角形索引
    const FACE_MESH_TRIANGLES = getFaceMeshTriangles()

    // 添加顶点
    faceLandmarks.forEach((point) => {
      vertices.push(point.x * 2 - 1, -(point.y * 2 - 1), point.z * 0.1)
    })

    // 添加索引
    FACE_MESH_TRIANGLES.forEach((tri) => {
      indices.push(tri[0], tri[1], tri[2])
    })

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()

    return geometry
  }, [faceLandmarks])

  return (
    <group>
      {/* 基础面部 */}
      {faceMesh && (
        <mesh geometry={faceMesh} position={[0, 0, 0]}>
          <meshStandardMaterial
            map={texture}
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* 效果叠加层 */}
      <EffectOverlay effects={effects} landmarks={faceLandmarks} />

      {/* 网格辅助线 (开发模式) */}
      {/* <WireframeOverlay geometry={faceMesh} /> */}
    </group>
  )
}

// 效果叠加组件
function EffectOverlay({ effects, landmarks }: EffectOverlayProps) {
  return (
    <group>
      {effects.map((effect) => (
        <EffectRenderer
          key={`${effect.type}-${effect.area}`}
          effect={effect}
          landmarks={landmarks}
        />
      ))}
    </group>
  )
}

// 单个效果渲染器
function EffectRenderer({ effect, landmarks }: { effect: EffectParams; landmarks: Point3D[] }) {
  const geometry = useMemo(() => {
    return createEffectGeometry(effect, landmarks)
  }, [effect, landmarks])

  if (!geometry) return null

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={effect.color || '#ffb6c1'}
        transparent
        opacity={effect.intensity * 0.5}
        side={THREE.DoubleSide}
        emissive={effect.color || '#ffb6c1'}
        emissiveIntensity={0.2}
      />
    </mesh>
  )
}
```

### 效果几何体生成器

```typescript
// utils/ar/effectGeometry.ts

interface EffectParams {
  type: 'filler' | 'botox' | 'contour'
  area: string
  intensity: number    // 0-1
  amount?: number      // ml for filler
  color?: string       // hex
}

export function createEffectGeometry(effect: EffectParams, landmarks: Point3D[]): THREE.BufferGeometry | null {
  const regionLandmarks = getRegionLandmarks(effect.area, landmarks)

  if (!regionLandmarks || regionLandmarks.length < 3) {
    return null
  }

  const geometry = new THREE.BufferGeometry()

  switch (effect.type) {
    case 'filler':
      return createFillerGeometry(regionLandmarks, effect)
    case 'botox':
      return createBotoxGeometry(regionLandmarks, effect)
    case 'contour':
      return createContourGeometry(regionLandmarks, effect)
    default:
      return null
  }
}

// 法令纹填充
function createFillerGeometry(landmarks: Point3D[], effect: EffectParams): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  const vertices: number[] = []
  const indices: number[] = []

  // 创建平滑曲线穿过关键点
  const curve = new THREE.CatmullRomCurve3(
    landmarks.map(p => new THREE.Vector3(p.x * 2 - 1, -(p.y * 2 - 1), p.z * 0.1))
  )

  // 沿曲线创建管道
  const tubeGeometry = new THREE.TubeGeometry(curve, 64, effect.intensity * 0.02, 8, false)

  return tubeGeometry
}

// 肉毒素效果
function createBotoxGeometry(landmarks: Point3D[], effect: EffectParams): THREE.BufferGeometry {
  // 创建圆形区域表示注射范围
  const center = landmarks.reduce((acc, p) => ({
    x: acc.x + p.x / landmarks.length,
    y: acc.y + p.y / landmarks.length,
    z: acc.z + p.z / landmarks.length
  }), { x: 0, y: 0, z: 0 })

  const radius = effect.intensity * 0.1
  const circleGeometry = new THREE.CircleGeometry(radius, 32)

  // 定位到面部
  circleGeometry.translate(
    center.x * 2 - 1,
    -(center.y * 2 - 1),
    center.z * 0.1
  )

  return circleGeometry
}

// 轮廓调整
function createContourGeometry(landmarks: Point3D[], effect: EffectParams): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  const vertices: number[] = []

  // 沿着轮廓线创建平滑曲线
  const points = landmarks.map(p =>
    new THREE.Vector3(p.x * 2 - 1, -(p.y * 2 - 1), p.z * 0.1 + effect.intensity * 0.05)
  )

  const curve = new THREE.CatmullRomCurve3(points)
  const tubeGeometry = new THREE.TubeGeometry(curve, 100, effect.intensity * 0.015, 8, false)

  return tubeGeometry
}

// 获取区域关键点
function getRegionLandmarks(area: string, allLandmarks: Point3D[]): Point3D[] {
  // MediaPipe Face Mesh 区域定义
  const regions: Record<string, number[]> = {
    // 法令纹
    'nasolabial_left': [205, 207, 50, 205, 207, 50, 135, 169, 170, 171, 200, 201],
    'nasolabial_right': [425, 427, 280, 425, 427, 280, 364, 398, 399, 400, 429, 430],

    // 额头
    'forehead': [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],

    // 鱼尾纹
    'crow_feet_left': [33, 133, 157, 158, 159, 160, 161, 246, 130, 25, 110, 24, 23, 22, 26, 112, 243],
    'crow_feet_right': [362, 263, 387, 388, 389, 390, 391, 466, 359, 330, 286, 258, 257, 256, 260, 341, 463],

    // 嘴角
    'mouth_left': [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291],
    'mouth_right': [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291],

    // 下颌线
    'jawline_left': [234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152],
    'jawline_right': [454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152],

    // 唇部
    'lips': [61, 146, 91, 181, 84, 17, 314, 405, 320, 291],

    // 鼻部
    'nose': [1, 2, 98, 97, 327, 326, 4, 5, 279, 278, 360, 363, 354, 19, 94, 125]
  }

  const indices = regions[area] || []

  return indices
    .map(i => allLandmarks[i])
    .filter(Boolean)
}

// MediaPipe Face Mesh 三角形索引 (简化版，实际应使用完整数据)
function getFaceMeshTriangles(): number[][] {
  // 这是一个简化版本，实际应该从MediaPipe获取完整的三角形拓扑
  // 完整数据包含约1500个三角形
  return [
    [127, 34, 139], [139, 34, 110], [110, 34, 99],
    [99, 34, 140], [140, 34, 99],
    // ... 更多三角形
  ]
}
```

---

## AR预览组件

### 主预览组件

```tsx
// components/ar/ARPreview.tsx
import React, { useState, useCallback } from 'react'
import { ARScene } from './ARScene'
import { EffectPanel } from './EffectPanel'
import { ComparisonSlider } from './ComparisonSlider'
import { useARStore } from '@/stores/arStore'

interface ARPreviewProps {
  analysisId: string
  baseImageUrl: string
  faceLandmarks: Point3D[]
}

export function ARPreview({ analysisId, baseImageUrl, faceLandmarks }: ARPreviewProps) {
  const [showComparison, setShowComparison] = useState(false)
  const [selectedEffects, setSelectedEffects] = useState<EffectParams[]>([])

  const handleEffectToggle = useCallback((effect: EffectParams) => {
    setSelectedEffects(prev => {
      const exists = prev.find(e => e.type === effect.type && e.area === effect.area)
      if (exists) {
        return prev.filter(e => e !== exists)
      } else {
        return [...prev, effect]
      }
    })
  }, [])

  const handleEffectIntensityChange = useCallback((effectIndex: number, intensity: number) => {
    setSelectedEffects(prev => {
      const updated = [...prev]
      updated[effectIndex] = { ...updated[effectIndex], intensity }
      return updated
    })
  }, [])

  const handleGenerateCompare = useCallback(async () => {
    setShowComparison(true)
    // 调用API生成对比图
    // const compareUrl = await generateComparison(sessionId, selectedEffects)
  }, [selectedEffects])

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 主预览区 */}
      <div className="flex-1 relative">
        <ARScene
          baseImageUrl={baseImageUrl}
          faceLandmarks={faceLandmarks}
          effects={selectedEffects}
        />

        {/* 对比滑块 */}
        {showComparison && (
          <ComparisonSlider
            beforeImage={baseImageUrl}
            afterImage="" // 从API获取
            onClose={() => setShowComparison(false)}
          />
        )}

        {/* 操作按钮 */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4">
          <button
            onClick={handleGenerateCompare}
            className="px-6 py-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow"
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              对比效果
            </span>
          </button>

          <button
            onClick={() => {/* 保存 */}}
            className="px-6 py-3 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-colors"
          >
            保存预览
          </button>

          <button
            onClick={() => {/* 预约 */}}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            预约医生
          </button>
        </div>
      </div>

      {/* 效果面板 */}
      <EffectPanel
        selectedEffects={selectedEffects}
        onEffectToggle={handleEffectToggle}
        onIntensityChange={handleEffectIntensityChange}
      />
    </div>
  )
}
```

### 效果面板组件

```tsx
// components/ar/EffectPanel.tsx
import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Palette } from 'lucide-react'

interface EffectPanelProps {
  selectedEffects: EffectParams[]
  onEffectToggle: (effect: EffectParams) => void
  onIntensityChange: (index: number, intensity: number) => void
}

// 可用效果库
const EFFECT_LIBRARY = {
  filler: [
    { id: 'nasolabial', name: '法令纹填充', area: 'nasolabial_left', defaultAmount: 1 },
    { id: 'marionette', name: '木偶纹填充', area: 'mouth_left', defaultAmount: 0.5 },
    { id: 'lips', name: '丰唇', area: 'lips', defaultAmount: 0.3 },
    { id: 'forehead', name: '额头填充', area: 'forehead', defaultAmount: 2 },
    { id: 'temple', name: '太阳穴填充', area: 'temple', defaultAmount: 1 }
  ],
  botox: [
    { id: 'forehead', name: '抬头纹', area: 'forehead', defaultAmount: 20 },
    { id: 'eyes', name: '鱼尾纹', area: 'crow_feet_left', defaultAmount: 10 },
    { id: 'glabella', name: '眉间纹', area: 'glabella', defaultAmount: 20 },
    { id: 'bunny', name: '兔纹', area: 'nose', defaultAmount: 5 }
  ],
  contour: [
    { id: 'jawline', name: '下颌线', area: 'jawline_left', defaultAmount: 0 },
    { id: 'nose', name: '鼻部', area: 'nose', defaultAmount: 0 },
    { id: 'cheek', name: '颧骨', area: 'cheek', defaultAmount: 0 },
    { id: 'chin', name: '下巴', area: 'chin', defaultAmount: 0 }
  ]
}

export function EffectPanel({ selectedEffects, onEffectToggle, onIntensityChange }: EffectPanelProps) {
  const [activeCategory, setActiveCategory] = useState<'filler' | 'botox' | 'contour'>('filler')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['filler']))

  const toggleSection = (category: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const isEffectActive = (type: string, area: string) => {
    return selectedEffects.some(e => e.type === type && e.area === area)
  }

  const getEffectIntensity = (type: string, area: string) => {
    const effect = selectedEffects.find(e => e.type === type && e.area === area)
    return effect?.intensity || 0.5
  }

  return (
    <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">效果调节</h2>
        <p className="text-sm text-gray-500">选择效果并调节强度</p>
      </div>

      {/* 填充类 */}
      <EffectSection
        title="填充类"
        icon="💉"
        expanded={expandedSections.has('filler')}
        onToggle={() => toggleSection('filler')}
      >
        {EFFECT_LIBRARY.filler.map(effect => (
          <EffectItem
            key={effect.id}
            name={effect.name}
            active={isEffectActive('filler', effect.area)}
            intensity={getEffectIntensity('filler', effect.area)}
            onToggle={() => onEffectToggle({
              type: 'filler',
              area: effect.area,
              intensity: 0.5,
              amount: effect.defaultAmount
            })}
            onIntensityChange={(intensity) => {
              const idx = selectedEffects.findIndex(e => e.type === 'filler' && e.area === effect.area)
              if (idx >= 0) onIntensityChange(idx, intensity)
            }}
          />
        ))}
      </EffectSection>

      {/* 肉毒素 */}
      <EffectSection
        title="肉毒素"
        icon="🎯"
        expanded={expandedSections.has('botox')}
        onToggle={() => toggleSection('botox')}
      >
        {EFFECT_LIBRARY.botox.map(effect => (
          <EffectItem
            key={effect.id}
            name={effect.name}
            active={isEffectActive('botox', effect.area)}
            intensity={getEffectIntensity('botox', effect.area)}
            onToggle={() => onEffectToggle({
              type: 'botox',
              area: effect.area,
              intensity: 0.5
            })}
            onIntensityChange={(intensity) => {
              const idx = selectedEffects.findIndex(e => e.type === 'botox' && e.area === effect.area)
              if (idx >= 0) onIntensityChange(idx, intensity)
            }}
          />
        ))}
      </EffectSection>

      {/* 轮廓类 */}
      <EffectSection
        title="轮廓调整"
        icon="✨"
        expanded={expandedSections.has('contour')}
        onToggle={() => toggleSection('contour')}
      >
        {EFFECT_LIBRARY.contour.map(effect => (
          <EffectItem
            key={effect.id}
            name={effect.name}
            active={isEffectActive('contour', effect.area)}
            intensity={getEffectIntensity('contour', effect.area)}
            onToggle={() => onEffectToggle({
              type: 'contour',
              area: effect.area,
              intensity: 0.5
            })}
            onIntensityChange={(intensity) => {
              const idx = selectedEffects.findIndex(e => e.type === 'contour' && e.area === effect.area)
              if (idx >= 0) onIntensityChange(idx, intensity)
            }}
          />
        ))}
      </EffectSection>

      {/* 已选效果汇总 */}
      {selectedEffects.length > 0 && (
        <div className="p-6 border-t border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">已选择 {selectedEffects.length} 项</h3>
          <div className="space-y-2">
            {selectedEffects.map((effect, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  {effect.type === 'filler' && '💉'}
                  {effect.type === 'botox' && '🎯'}
                  {effect.type === 'contour' && '✨'}
                  {effect.area}
                </span>
                <span className="text-gray-500">{Math.round(effect.intensity * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// 效果分类组件
function EffectSection({ title, icon, expanded, onToggle, children }: {
  title: string
  icon: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-gray-200">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900">{icon} {title}</span>
        {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      {expanded && (
        <div className="px-6 pb-4 space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}

// 单个效果项
function EffectItem({ name, active, intensity, onToggle, onIntensityChange }: {
  name: string
  active: boolean
  intensity: number
  onToggle: () => void
  onIntensityChange: (value: number) => void
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-800">{name}</span>
        <button
          onClick={onToggle}
          className={`
            w-12 h-6 rounded-full transition-colors
            ${active ? 'bg-primary-600' : 'bg-gray-300'}
          `}
        >
          <div className={`
            w-5 h-5 bg-white rounded-full shadow transition-transform
            ${active ? 'translate-x-6' : 'translate-x-0.5'}
          `} />
        </button>
      </div>
      {active && (
        <div className="space-y-1">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={intensity}
            onChange={(e) => onIntensityChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>轻微</span>
            <span>中等</span>
            <span>明显</span>
          </div>
        </div>
      )}
    </div>
  )
}
```

### 对比滑块组件

```tsx
// components/ar/ComparisonSlider.tsx
import React, { useState, useRef } from 'react'

interface ComparisonSliderProps {
  beforeImage: string
  afterImage: string
  onClose: () => void
}

export function ComparisonSlider({ beforeImage, afterImage, onClose }: ComparisonSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const position = (x / rect.width) * 100
    setSliderPosition(Math.max(0, Math.min(100, position)))
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 bg-black/50 flex items-center justify-center"
      onMouseMove={handleMouseMove}
      onClick={onClose}
    >
      <div
        className="relative w-3/4 max-w-4xl aspect-[3/4] bg-white rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Before Image */}
        <img
          src={beforeImage}
          alt="Before"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* After Image (clipped) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img
            src={afterImage}
            alt="After"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ left: `-${100 - sliderPosition}%` }}
          />
        </div>

        {/* Slider Handle */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 text-white rounded-full text-sm">
          原始
        </div>
        <div className="absolute top-4 right-4 px-3 py-1 bg-primary-600 text-white rounded-full text-sm">
          效果
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
```

---

## 后端API支持

```typescript
// services/api/src/routes/ar.routes.ts
import Router from 'express'
import { ARService } from '../services/ar.service'

const router = Router()
const arService = new ARService()

// 初始化AR会话
router.post('/initialize', async (req, res) => {
  const { analysisId } = req.body
  const result = await arService.initializeSession(req.user.id, analysisId)
  res.json(result)
})

// 应用效果
router.post('/apply-effect', async (req, res) => {
  const { sessionId, effect } = req.body
  const result = await arService.applyEffect(sessionId, effect)
  res.json(result)
})

// 生成对比图
router.post('/generate-comparison', async (req, res) => {
  const { sessionId, layout } = req.body
  const result = await arService.generateComparison(sessionId, layout)
  res.json(result)
})

// 保存预览
router.post('/save', async (req, res) => {
  const { sessionId, name } = req.body
  const result = await arService.savePreview(req.user.id, sessionId, name)
  res.json(result)
})

export default router
```

---

## 性能优化

1. **几何体缓存**: 缓存常用效果几何体，避免重复计算
2. **材质共享**: 相同效果共享材质实例
3. **LOD**: 根据设备性能调整几何体细节
4. **Web Worker**: 将计算密集型任务移至Worker
5. **纹理压缩**: 使用压缩纹理减少内存占用

```typescript
// utils/ar/performance.ts
export class ARPerformanceManager {
  private lodLevel: 'low' | 'medium' | 'high' = 'medium'
  private geometryCache = new Map<string, THREE.BufferGeometry>()

  detectLOD() {
    const gpu = navigator.gpu
    const memory = (performance as any).memory

    if (gpu || memory?.jsHeapSizeLimit > 2000000000) {
      this.lodLevel = 'high'
    } else if (memory?.jsHeapSizeLimit > 1000000000) {
      this.lodLevel = 'medium'
    } else {
      this.lodLevel = 'low'
    }
  }

  getGeometryResolution() {
    switch (this.lodLevel) {
      case 'high': return 64
      case 'medium': return 32
      case 'low': return 16
    }
  }
}
```
