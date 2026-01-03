# 前端设计文档

## 页面结构

```
perfectface-web/
├── src/
│   ├── pages/              # 页面组件
│   │   ├── auth/           # 认证相关
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   └── forgot-password.tsx
│   │   ├── home/           # 首页
│   │   │   └── index.tsx
│   │   ├── analysis/       # AI分析
│   │   │   ├── upload.tsx
│   │   │   ├── analyzing.tsx
│   │   │   └── result.tsx
│   │   ├── ar-preview/     # AR预览
│   │   │   └── index.tsx
│   │   ├── doctors/        # 医生相关
│   │   │   ├── list.tsx
│   │   │   ├── [id].tsx
│   │   │   └── schedule.tsx
│   │   ├── appointments/   # 预约相关
│   │   │   ├── booking.tsx
│   │   │   ├── video-call.tsx
│   │   │   └── my-appointments.tsx
│   │   └── profile/        # 个人中心
│   │       ├── index.tsx
│   │       ├── history.tsx
│   │       └── settings.tsx
│   ├── components/         # 共享组件
│   ├── hooks/              # 自定义Hooks
│   ├── stores/             # 状态管理
│   ├── services/           # API服务
│   ├── utils/              # 工具函数
│   └── styles/             # 样式文件
```

---

## 页面设计

### 1. 首页 (Home)

**路径**: `/`

**组件结构**:
```
HomePage
├── HeroSection             # 主视觉区
├── FeaturesSection         # 功能介绍
├── HowItWorksSection       # 流程说明
├── FeaturedDoctorsSection  # 推荐医生
├── TestimonialsSection     # 用户评价
└── CTASection              # 行动召唤
```

**设计要点**:
- Hero区域展示核心价值主张
- 快速开始按钮直接进入上传页面
- 移动端优先响应式设计

---

### 2. AI分析页面

**路径**: `/analysis`

#### 2.1 上传页面

**组件结构**:
```
UploadPage
├── PageHeader
├── UploadSection
│   ├── Dropzone           # 拖拽上传区
│   ├── FilePreview        # 预览组件
│   └── UploadGuide        # 拍照指引
└── TipsSection            # 拍照技巧
```

**状态管理**:
```typescript
interface UploadState {
  file: File | null
  previewUrl: string | null
  uploadProgress: number
  uploadId: string | null
  error: string | null
}
```

#### 2.2 分析中页面

**组件结构**:
```
AnalyzingPage
├── AnalysisProgress
│   ├── ProgressRing       # 环形进度
│   ├── StageIndicator     # 阶段指示器
│   └── CurrentAction      # 当前操作文本
└── AnalysisAnimation      # 动画效果
```

**分析阶段**:
```
1. 检测面部 (15%)
2. 提取特征 (35%)
3. 分析比例 (55%)
4. 检测问题 (75%)
5. 生成建议 (100%)
```

#### 2.3 结果页面

**组件结构**:
```
ResultPage
├── ResultHeader           # 结果概览
├── FaceAnalysisCard       # 面部分析卡片
│   ├── ProportionsChart   # 比例图表
│   ├── SymmetryScore      # 对称性评分
│   ├── SkinCondition      # 皮肤状况
│   └── DetectedIssues     # 检测到的问题
├── RecommendationsList    # 建议列表
│   └── RecommendationCard
├── ActionButtons          # 操作按钮组
│   ├── BookDoctorButton
│   ├── ARPreviewButton
│   └── ShareButton
└── ComparisonCarousel     # 对比轮播
```

**数据结构**:
```typescript
interface AnalysisResult {
  id: string
  faceData: {
    landmarks: Point3D[]
    boundingBox: BoundingBox
  }
  analysis: {
    proportions: ProportionsData
    symmetry: SymmetryData
    skin: SkinData
    wrinkles: WrinkleData[]
    contours: ContourData
  }
  recommendations: Recommendation[]
}
```

---

### 3. AR预览页面

**路径**: `/ar-preview/:analysisId`

**组件结构**:
```
ARPreviewPage
├── ARCanvas               # Three.js画布
│   ├── FaceMesh           # 面部网格
│   ├── EffectOverlay      # 效果叠加层
│   └── Controls           # 3D控制
├── EffectPanel            # 效果面板
│   ├── EffectCategory     # 效果分类
│   ├── EffectSelector     # 效果选择器
│   └── IntensitySlider    # 强度滑块
├── ComparisonView         # 对比视图
│   ├── BeforeAfterSlider  # 前后对比滑块
│   └── SideBySideView     # 并排视图
└── ActionButtons
    ├── SaveButton
    ├── ShareButton
    └── BookButton
```

**Three.js场景配置**:
```typescript
interface ARSceneConfig {
  camera: {
    position: [number, number, number]
    fov: number
  }
  lighting: {
    ambient: number
    directional: {
      position: [number, number, number]
      intensity: number
    }
  }
  faceMesh: {
    wireframe: boolean
    opacity: number
  }
}
```

**效果参数**:
```typescript
interface EffectParams {
  type: 'filler' | 'botox' | 'contour'
  area: string
  intensity: number    // 0-1
  amount: number       // ml for filler
  color: string        // hex
}
```

---

### 4. 医生列表页面

**路径**: `/doctors`

**组件结构**:
```
DoctorsListPage
├── SearchBar             # 搜索栏
├── FilterPanel           # 筛选面板
│   ├── SpecialtyFilter   # 专科筛选
│   ├── LocationFilter    # 地区筛选
│   ├── RatingFilter      # 评分筛选
│   └── PriceFilter       # 价格筛选
├── DoctorsGrid           # 医生卡片网格
│   └── DoctorCard        # 医生卡片
│       ├── Avatar
│       ├── Name
│       ├── SpecialtyTags
│       ├── Rating
│       ├── Hospital
│       ├── ConsultationFee
│       └── ActionButtons
├── Pagination            # 分页组件
└── MapToggle             # 地图视图切换
```

**DoctorCard组件**:
```typescript
interface DoctorCardProps {
  doctor: {
    id: string
    name: string
    avatar: string
    specialty: string[]
    hospital: string
    experience: number
    rating: number
    reviewCount: number
    consultationFee: number
    isOnline: boolean
    isFavorite: boolean
  }
  onFavorite: (id: string) => void
  onBook: (id: string) => void
}
```

---

### 5. 医生详情页面

**路径**: `/doctors/:id`

**组件结构**:
```
DoctorDetailPage
├── DoctorHeader          # 医生头部信息
│   ├── Avatar
│   ├── BasicInfo
│   ├── Stats
│   └── Actions
├── AboutSection          # 关于医生
├── QualificationsSection # 资质认证
├── ServicesSection       # 服务项目
├── CasesGallery          # 案例展示
├── ReviewsSection        # 用户评价
│   ├── RatingSummary
│   └── ReviewList
└── BookingCTA            # 预约按钮
```

---

### 6. 预约页面

**路径**: `/appointments/book/:doctorId`

**组件结构**:
```
BookingPage
├── BookingSteps          # 预约步骤
│   ├── Step1: 选择时间
│   ├── Step2: 确认信息
│   └── Step3: 支付
├── DateTimePicker        # 日期时间选择器
│   ├── CalendarView
│   └── TimeSlotGrid
├── AppointmentSummary    # 预约摘要
│   ├── DoctorInfo
│   ├── SelectedTime
│   └── FeeBreakdown
├── NotesInput            # 备注输入
├── PaymentSection        # 支付区域
│   ├── PaymentMethodSelector
│   └── CouponInput
└── ConfirmButton         # 确认按钮
```

---

### 7. 视频面诊页面

**路径**: `/appointments/:id/video-call`

**组件结构**:
```
VideoCallPage
├── CallContainer         # 视频容器
│   ├── LocalVideo        # 本地视频
│   ├── RemoteVideo       # 远程视频
│   └── PictureInPicture  # 画中画
├── CallControls          # 通话控制
│   ├── MuteButton
│   ├── CameraButton
│   ├── ScreenShareButton
│   ├── ChatButton
│   └── EndCallButton
├── ChatPanel             # 聊天面板
│   ├── MessageList
│   └── MessageInput
├── InfoPanel             # 信息面板
│   ├── DoctorInfo
│   ├── CallTimer
│   └── RecordingStatus
└── ToolsPanel            # 工具面板
    ├── ScreenCapture
    ├── Annotation
    └── FileShare
```

---

### 8. 个人中心

**路径**: `/profile`

**组件结构**:
```
ProfilePage
├── ProfileHeader         # 个人信息头部
├── TabsNavigation        # 标签导航
│   ├── 面诊历史
│   ├── 我的预约
│   ├── 收藏医生
│   └── 设置
└── TabContent            # 标签内容
```

---

## 核心组件设计

### Button组件

```typescript
// components/ui/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  icon?: React.ReactNode
  fullWidth?: boolean
  children: React.ReactNode
  onClick?: () => void
}
```

### Input组件

```typescript
// components/ui/Input.tsx
interface InputProps {
  label?: string
  placeholder?: string
  error?: string
  helperText?: string
  disabled?: boolean
  icon?: React.ReactNode
  type?: 'text' | 'email' | 'password' | 'tel'
  value: string
  onChange: (value: string) => void
}
```

### Card组件

```typescript
// components/ui/Card.tsx
interface CardProps {
  title?: string
  subtitle?: string
  extra?: React.ReactNode
  footer?: React.ReactNode
  hoverable?: boolean
  loading?: boolean
  children: React.ReactNode
}
```

### Modal组件

```typescript
// components/ui/Modal.tsx
interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closable?: boolean
  children: React.ReactNode
  footer?: React.ReactNode
}
```

### Upload/Dropzone组件

```typescript
// components/upload/Dropzone.tsx
interface DropzoneProps {
  accept?: string[]
  maxSize?: number  // bytes
  maxFiles?: number
  multiple?: boolean
  onUpload: (files: File[]) => Promise<void>
  disabled?: boolean
}
```

### Rating组件

```typescript
// components/ui/Rating.tsx
interface RatingProps {
  value: number
  count?: number
  readonly?: boolean
  onChange?: (value: number) => void
  showCount?: boolean
}
```

### Calendar组件

```typescript
// components/ui/Calendar.tsx
interface CalendarProps {
  selectedDate: Date
  minDate?: Date
  maxDate?: Date
  disabledDates?: Date[]
  availableDates?: Date[]
  onSelect: (date: Date) => void
}
```

---

## 状态管理 (Zustand)

### 用户状态
```typescript
// stores/userStore.ts
interface UserStore {
  // 状态
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean

  // 操作
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateProfile: (data: Partial<User>) => Promise<void>
  refreshUser: () => Promise<void>
}
```

### 分析状态
```typescript
// stores/analysisStore.ts
interface AnalysisStore {
  // 状态
  currentAnalysis: AnalysisResult | null
  isAnalyzing: boolean
  progress: number
  stage: string
  history: AnalysisRecord[]

  // 操作
  startAnalysis: (file: File) => Promise<void>
  cancelAnalysis: () => void
  loadHistory: () => Promise<void>
  clearCurrent: () => void
}
```

### AR预览状态
```typescript
// stores/arStore.ts
interface ARStore {
  // 状态
  sessionId: string | null
  baseImageUrl: string | null
  appliedEffects: EffectParams[]
  isProcessing: boolean

  // 操作
  initSession: (analysisId: string) => Promise<void>
  applyEffect: (effect: EffectParams) => Promise<void>
  removeEffect: (effectId: string) => void
  updateIntensity: (effectId: string, intensity: number) => void
  resetEffects: () => void
}
```

---

## 自定义Hooks

### useAuth
```typescript
function useAuth() {
  const store = useUserStore()
  const router = useRouter()

  useEffect(() => {
    if (!store.isAuthenticated && !store.isLoading) {
      router.push('/login')
    }
  }, [store.isAuthenticated, store.isLoading])

  return store
}
```

### useAnalysis
```typescript
function useAnalysis(uploadId?: string) {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/analysis`)

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      switch (data.event) {
        case 'analysis.progress':
          setProgress(data.progress)
          setStage(data.stage)
          break
        case 'analysis.completed':
          setResult(data.result)
          break
        case 'analysis.error':
          setError(data.error)
          break
      }
    }

    return () => ws.close()
  }, [uploadId])

  return { result, progress, stage, error }
}
```

### useWebSocket
```typescript
function useWebSocket(channel: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/${channel}`)

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)

    setSocket(ws)

    return () => ws.close()
  }, [channel])

  const emit = (event: string, data: any) => {
    socket?.send(JSON.stringify({ event, data }))
  }

  const on = (event: string, callback: (data: any) => void) => {
    socket?.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data)
      if (msg.event === event) callback(msg.data)
    })
  }

  return { connected, emit, on }
}
```

### useVideoCall
```typescript
function useVideoCall(roomId: string, token: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)

  useEffect(() => {
    // WebRTC setup
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        setLocalStream(stream)
        stream.getTracks().forEach(track => pc.addTrack(track, stream))
      })

    // Handle remote stream
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0])
    }

    return () => {
      localStream?.getTracks().forEach(t => t.stop())
      pc.close()
    }
  }, [roomId, token])

  const toggleMute = () => {
    localStream?.getAudioTracks().forEach(t => {
      t.enabled = !t.enabled
      setIsMuted(!t.enabled)
    })
  }

  const toggleCamera = () => {
    localStream?.getVideoTracks().forEach(t => {
      t.enabled = !t.enabled
      setIsCameraOff(!isCameraOff)
    })
  }

  return { localStream, remoteStream, isMuted, isCameraOff, toggleMute, toggleCamera }
}
```

---

## 样式系统

### Tailwind配置
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
}
```

---

## 响应式断点

```typescript
// breakpoints.ts
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
}

// 使用示例
// className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
```
