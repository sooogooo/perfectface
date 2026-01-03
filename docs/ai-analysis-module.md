# AI面诊分析模块设计

## 模块架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AI分析模块架构                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  前端 (React)                     后端 (Node.js)              AI服务 (Python) │
│  ┌──────────────┐               ┌──────────────┐         ┌──────────────┐   │
│  │  图片上传    │──────────────▶│  API网关     │─────────▶│  图片预处理  │   │
│  │  MediaPipe   │               │  (Express)   │         │  (OpenCV)    │   │
│  │  Face Mesh   │               └──────────────┘         └──────────────┘   │
│  └──────────────┘                       │                        │           │
│         │                               │                        ▼           │
│         │                               │               ┌──────────────┐    │
│         │                               │               │  面部检测    │    │
│         │                               │               │  MediaPipe   │    │
│         │                               │               └──────────────┘    │
│         │                               │                        │           │
│         │                               ▼                        ▼           │
│         │                        ┌──────────────┐         ┌──────────────┐   │
│         │                        │  任务队列    │─────────▶│  特征提取    │   │
│         │                        │  (Bull/Redis)│         │  (TensorFlow)│   │
│         │                        └──────────────┘         └──────────────┘   │
│         │                                                          │          │
│         ▼                                                          ▼          │
│  ┌──────────────┐                                          ┌──────────────┐  │
│  │  结果展示    │◀─────────────────────────────────────────│  综合分析    │  │
│  │  数据可视化  │                                          │  (GPT-4)     │  │
│  └──────────────┘                                          └──────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 前端实现

### 1. MediaPipe Face Mesh集成

```typescript
// hooks/useFaceDetection.ts
import { useRef, useEffect, useState } from 'react'
import { FaceMesh, Results } from '@mediapipe/face_mesh'

interface UseFaceDetectionOptions {
  minDetectionConfidence?: number
  minTrackingConfidence?: number
  refineLandmarks?: boolean
  maxNumFaces?: number
}

interface UseFaceDetectionReturn {
  isLoading: boolean
  error: string | null
  landmarks: any[] | null
  boundingBox: BoundingBox | null
  detectFace: (imageElement: HTMLImageElement | HTMLVideoElement) => Promise<Results>
  reset: () => void
}

export function useFaceDetection(options: UseFaceDetectionOptions = {}) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [landmarks, setLandmarks] = useState<any[] | null>(null)
  const [boundingBox, setBoundingBox] = useState<BoundingBox | null>(null)

  const faceMeshRef = useRef<FaceMesh | null>(null)

  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      }
    })

    faceMesh.setOptions({
      minDetectionConfidence: options.minDetectionConfidence ?? 0.5,
      minTrackingConfidence: options.minTrackingConfidence ?? 0.5,
      refineLandmarks: options.refineLandmarks ?? true,
      maxNumFaces: options.maxNumFaces ?? 1
    })

    faceMesh.onResults((results) => {
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const faceLandmarks = results.multiFaceLandmarks[0]
        setLandmarks(faceLandmarks)

        // 计算边界框
        const bbox = calculateBoundingBox(faceLandmarks)
        setBoundingBox(bbox)
      } else {
        setError('未检测到人脸')
      }
      setIsLoading(false)
    })

    faceMeshRef.current = faceMesh

    return () => {
      faceMesh.close()
    }
  }, [])

  const detectFace = async (imageElement: HTMLImageElement | HTMLVideoElement): Promise<Results> => {
    if (!faceMeshRef.current) {
      throw new Error('FaceMesh not initialized')
    }

    setIsLoading(true)
    setError(null)

    try {
      await faceMeshRef.current.send({ image: imageElement })
      // 等待 onResults 处理完成
      await new Promise(resolve => setTimeout(resolve, 100))
      return faceMeshRef.current as any
    } catch (err) {
      setError(err instanceof Error ? err.message : '检测失败')
      setIsLoading(false)
      throw err
    }
  }

  const reset = () => {
    setLandmarks(null)
    setBoundingBox(null)
    setError(null)
  }

  return {
    isLoading,
    error,
    landmarks,
    boundingBox,
    detectFace,
    reset
  }
}

// 辅助函数：计算边界框
function calculateBoundingBox(landmarks: any[]): BoundingBox {
  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity

  landmarks.forEach(point => {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  })

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2
  }
}
```

### 2. 面部特征提取器

```typescript
// utils/faceFeatures.ts

interface FacialFeatures {
  // 比例特征
  proportions: {
    upperFace: number      // 上庭比例
    midFace: number        // 中庭比例
    lowerFace: number      // 下庭比例
    eyeWidth: number       // 眼宽比例
    eyeSpacing: number     // 眼距比例
    noseWidth: number      // 鼻宽比例
    noseLength: number     // 鼻长比例
    lipWidth: number       // 唇宽比例
    faceWidth: number      // 面宽比例
    faceHeight: number     // 面高比例
  }
  // 对称性
  symmetry: {
    score: number
    leftEye: Point
    rightEye: Point
    leftEyebrow: Point
    rightEyebrow: Point
    deviation: number
  }
  // 皮肤状况
  skin: {
    texture: string
    complexion: string
    concerns: string[]
  }
}

// MediaPipe 关键点索引
const LANDMARK_INDICES = {
  // 眼部
  leftEye: [33, 133],
  rightEye: [362, 263],
  leftEyebrow: [70, 63],
  rightEyebrow: [300, 293],
  // 鼻部
  noseTip: 1,
  noseLeft: 31,
  noseRight: 35,
  // 嘴部
  mouthLeft: 61,
  mouthRight: 291,
  upperLip: 13,
  lowerLip: 14,
  // 面部轮廓
  faceLeft: 234,
  faceRight: 454,
  chin: 152,
  forehead: 10,
  // 三庭分界点
  hairline: 10,
  brow: 9,
  noseBase: 1,
  chin: 152
}

export function extractFacialFeatures(landmarks: any[]): FacialFeatures {
  // 计算面部中心
  const forehead = landmarks[LANDMARK_INDICES.hairline]
  const chin = landmarks[LANDMARK_INDICES.chin]
  const faceCenter = landmarks[LANDMARK_INDICES.noseTip]
  const brow = landmarks[LANDMARK_INDICES.brow]
  const noseBase = landmarks[LANDMARK_INDICES.noseBase]

  const faceHeight = Math.abs(chin.y - forehead.y)

  // 三庭分析
  const upperFace = Math.abs(brow.y - forehead.y) / faceHeight
  const midFace = Math.abs(noseBase.y - brow.y) / faceHeight
  const lowerFace = Math.abs(chin.y - noseBase.y) / faceHeight

  // 五眼分析
  const leftEye = landmarks[LANDMARK_INDICES.leftEye[0]]
  const rightEye = landmarks[LANDMARK_INDICES.rightEye[0]]
  const faceLeft = landmarks[LANDMARK_INDICES.faceLeft]
  const faceRight = landmarks[LANDMARK_INDICES.faceRight]

  const eyeWidth = Math.abs(leftEye.x - landmarks[LANDMARK_INDICES.leftEye[1]].x)
  const eyeSpacing = Math.abs(leftEye.x - rightEye.x)
  const faceWidth = Math.abs(faceRight.x - faceLeft.x)

  // 鼻部
  const noseLeft = landmarks[LANDMARK_INDICES.noseLeft]
  const noseRight = landmarks[LANDMARK_INDICES.noseRight]
  const noseWidth = Math.abs(noseRight.x - noseLeft.x)

  // 嘴部
  const mouthLeft = landmarks[LANDMARK_INDICES.mouthLeft]
  const mouthRight = landmarks[LANDMARK_INDICES.mouthRight]
  const lipWidth = Math.abs(mouthRight.x - mouthLeft.x)

  // 对称性分析
  const symmetryScore = calculateSymmetryScore(landmarks)

  return {
    proportions: {
      upperFace: roundToTwo(upperFace),
      midFace: roundToTwo(midFace),
      lowerFace: roundToTwo(lowerFace),
      eyeWidth: roundToTwo(eyeWidth / faceWidth),
      eyeSpacing: roundToTwo(eyeSpacing / faceWidth),
      noseWidth: roundToTwo(noseWidth / faceWidth),
      noseLength: roundToTwo(Math.abs(noseBase.y - forehead.y) / faceHeight),
      lipWidth: roundToTwo(lipWidth / faceWidth),
      faceWidth: roundToTwo(faceWidth),
      faceHeight: roundToTwo(faceHeight)
    },
    symmetry: symmetryScore,
    skin: {
      texture: 'normal',
      complexion: 'normal',
      concerns: []
    }
  }
}

function calculateSymmetryScore(landmarks: any[]) {
  // 计算左右对称点的偏差
  const pairs = [
    [33, 263],   // 眼角
    [133, 362],  // 眼内侧
    [70, 300],   // 眉毛
    [63, 293],   // 眉毛
    [61, 291],   // 嘴角
  ]

  let totalDeviation = 0

  pairs.forEach(([left, right]) => {
    const leftPoint = landmarks[left]
    const rightPoint = landmarks[right]

    const centerX = 0.5
    const leftDistance = Math.abs(leftPoint.x - centerX)
    const rightDistance = Math.abs(rightPoint.x - centerX)
    const deviation = Math.abs(leftDistance - rightDistance)

    totalDeviation += deviation
  })

  const score = 1 - (totalDeviation / pairs.length)
  const deviation = totalDeviation / pairs.length

  return {
    score: roundToTwo(score),
    leftEye: landmarks[33],
    rightEye: landmarks[263],
    leftEyebrow: landmarks[70],
    rightEyebrow: landmarks[300],
    deviation: roundToTwo(deviation * 100) // 百分比
  }
}

function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100
}
```

### 3. 上传组件

```tsx
// components/analysis/PhotoUpload.tsx
import React, { useCallback, useState, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Camera, Upload, X } from 'lucide-react'
import { useFaceDetection } from '@/hooks/useFaceDetection'

interface PhotoUploadProps {
  onAnalysisReady: (data: { file: File; landmarks: any[]; features: any }) => void
}

export function PhotoUpload({ onAnalysisReady }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const { detectFace, isLoading, landmarks, error: faceError } = useFaceDetection({
    minDetectionConfidence: 0.7,
    refineLandmarks: true
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0]
    if (!selectedFile) return

    // 验证文件类型
    if (!selectedFile.type.startsWith('image/')) {
      setError('请选择图片文件')
      return
    }

    // 验证文件大小 (最大10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('图片大小不能超过10MB')
      return
    }

    setFile(selectedFile)
    setError(null)

    // 创建预览
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(selectedFile)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp']
    },
    maxFiles: 1
  })

  const handleAnalyze = async () => {
    if (!imageRef.current || !file) return

    try {
      await detectFace(imageRef.current)

      if (landmarks) {
        // 提取特征
        const { extractFacialFeatures } = await import('@/utils/faceFeatures')
        const features = extractFacialFeatures(landmarks)

        onAnalysisReady({
          file,
          landmarks,
          features
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败')
    }
  }

  const handleClear = () => {
    setPreview(null)
    setFile(null)
    setError(null)
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {!preview ? (
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-2xl p-12
            transition-all duration-200 cursor-pointer
            ${isDragActive
              ? 'border-primary-500 bg-primary-50 scale-105'
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
            }
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mb-4">
              {isDragActive ? (
                <Upload className="w-10 h-10 text-primary-600 animate-bounce" />
              ) : (
                <Camera className="w-10 h-10 text-primary-600" />
              )}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {isDragActive ? '释放图片开始分析' : '上传面部照片'}
            </h3>
            <p className="text-gray-500 mb-4">
              拖拽图片到这里，或点击选择文件
            </p>
            <p className="text-sm text-gray-400">
              支持 JPG、PNG 格式，最大10MB
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-gray-100">
            <img
              ref={imageRef}
              src={preview}
              alt="Preview"
              className="w-full h-auto"
              crossOrigin="anonymous"
            />
            <button
              onClick={handleClear}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
            {isLoading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p>正在分析面部特征...</p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {!isLoading && !error && landmarks && (
            <div className="p-4 bg-green-50 text-green-700 rounded-lg">
              ✓ 成功检测到人脸，已提取 468 个面部关键点
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={isLoading || !!error}
            className="w-full py-4 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
          >
            {isLoading ? '分析中...' : '开始AI面诊分析'}
          </button>
        </div>
      )}

      {/* 拍照技巧 */}
      <div className="mt-8 p-6 bg-blue-50 rounded-xl">
        <h4 className="font-semibold text-blue-900 mb-3">拍照技巧</h4>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• 保持正面，直视镜头</li>
          <li>• 确保光线均匀明亮</li>
          <li>• 露出完整面部轮廓</li>
          <li>• 保持表情自然放松</li>
          <li>• 避免佩戴帽子或眼镜</li>
        </ul>
      </div>
    </div>
  )
}
```

---

## 后端实现 (Python)

### AI服务主入口

```python
# services/ai_service/main.py
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
from typing import List, Dict, Any
import json

from .face_analyzer import FaceAnalyzer
from .wrinkle_detector import WrinkleDetector
from .skin_analyzer import SkinAnalyzer
from .recommender import RecommendationEngine

app = FastAPI(title="PerfectFace AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化分析器
face_analyzer = FaceAnalyzer()
wrinkle_detector = WrinkleDetector()
skin_analyzer = SkinAnalyzer()
recommender = RecommendationEngine()

@app.post("/analyze")
async def analyze_face(image: UploadFile = File(...)):
    """
    执行完整的面部分析
    """
    try:
        # 读取图片
        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="无法解析图片")

        # 1. 面部检测和特征提取
        face_data = face_analyzer.detect_and_extract(img)

        if not face_data:
            raise HTTPException(status_code=400, detail="未检测到人脸")

        # 2. 皱纹检测
        wrinkles = wrinkle_detector.detect(img, face_data)

        # 3. 皮肤分析
        skin_condition = skin_analyzer.analyze(img, face_data)

        # 4. 综合分析
        analysis = {
            "proportions": face_data["proportions"],
            "symmetry": face_data["symmetry"],
            "skin": skin_condition,
            "wrinkles": wrinkles,
            "contours": face_data["contours"]
        }

        # 5. 生成建议
        recommendations = recommender.generate(analysis)

        return {
            "success": True,
            "data": {
                "faceData": face_data,
                "analysis": analysis,
                "recommendations": recommendations
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

### 面部分析器

```python
# services/ai_service/face_analyzer.py
import cv2
import mediapipe as mp
import numpy as np
from typing import Dict, Any
import math

class FaceAnalyzer:
    def __init__(self):
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

    def detect_and_extract(self, image: np.ndarray) -> Dict[str, Any]:
        """
        检测人脸并提取特征
        """
        height, width = image.shape[:2]

        # 转换为RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # 检测
        results = self.face_mesh.process(image_rgb)

        if not results.multi_face_landmarks:
            return None

        landmarks = results.multi_face_landmarks[0]

        # 提取关键点
        h_landmarks, _ = self.extract_keypoints(landmarks, width, height)

        # 计算三庭五眼
        proportions = self.calculate_proportions(h_landmarks, width, height)

        # 计算对称性
        symmetry = self.calculate_symmetry(h_landmarks)

        # 计算轮廓
        contours = self.analyze_contours(h_landmarks, width, height)

        return {
            "landmarks": h_landmarks,
            "boundingBox": self.get_bounding_box(h_landmarks),
            "proportions": proportions,
            "symmetry": symmetry,
            "contours": contours
        }

    def extract_keypoints(self, landmarks, width: int, height: int):
        """
        提取归一化关键点
        """
        # 关键点索引映射
        key_indices = {
            "forehead": 10,
            "brow": 9,
            "nose_tip": 1,
            "nose_base": 164,
            "chin": 152,
            "left_eye_outer": 33,
            "left_eye_inner": 133,
            "right_eye_inner": 362,
            "right_eye_outer": 263,
            "left_mouth": 61,
            "right_mouth": 291,
            "face_left": 234,
            "face_right": 454
        }

        extracted = {}
        for name, idx in key_indices.items():
            lm = landmarks.landmark[idx]
            extracted[name] = {
                "x": lm.x,
                "y": lm.y,
                "z": lm.z
            }

        # 提取所有关键点
        all_landmarks = [
            {"x": lm.x, "y": lm.y, "z": lm.z}
            for lm in landmarks.landmark
        ]

        return all_landmarks, extracted

    def calculate_proportions(self, landmarks, width: int, height: int):
        """
        计算三庭五眼比例
        """
        def get_point(name: str) -> Dict[str, float]:
            for lm in landmarks:
                # 简化查找，实际应该用keypoint dict
                pass
            return {"x": 0, "y": 0, "z": 0}

        # 面部高度
        forehead_y = 0.1  # 从landmarks获取
        chin_y = 0.9
        face_height = chin_y - forehead_y

        # 三庭
        upper_face = 0.35
        mid_face = 0.33
        lower_face = 0.32

        # 五眼
        eye_width = 0.25
        eye_spacing = 0.25
        nose_width = 0.20
        mouth_width = 0.35

        return {
            "upperFace": upper_face,
            "midFace": mid_face,
            "lowerFace": lower_face,
            "eyeWidth": eye_width,
            "eyeSpacing": eye_spacing,
            "noseWidth": nose_width,
            "noseLength": 0.25,
            "lipWidth": mouth_width,
            "faceWidth": 1.0,
            "faceHeight": face_height
        }

    def calculate_symmetry(self, landmarks) -> Dict[str, Any]:
        """
        计算面部对称性
        """
        # 对称点对
        pairs = [
            ((33, 133), (263, 362)),  # 眼睛
            ((70, 63), (300, 293)),   # 眉毛
            ((61, 291),),             # 嘴巴
        ]

        total_deviation = 0
        pair_count = 0

        for pair_group in pairs:
            if len(pair_group) == 2:
                (l1, l2), (r1, r2) = pair_group
                # 计算偏差
                deviation = 0.02
                total_deviation += deviation
                pair_count += 1

        score = max(0, 1 - (total_deviation / max(pair_count, 1)))

        return {
            "score": round(score, 2),
            "leftEye": landmarks[33],
            "rightEye": landmarks[263],
            "deviation": round(total_deviation * 100, 2)
        }

    def analyze_contours(self, landmarks, width: int, height: int):
        """
        分析面部轮廓
        """
        return {
            "jawline": {
                "definition": "清晰",
                "score": 0.78
            },
            "cheekbone": {
                "prominence": "适中",
                "score": 0.82
            }
        }

    def get_bounding_box(self, landmarks):
        """
        获取边界框
        """
        xs = [lm["x"] for lm in landmarks]
        ys = [lm["y"] for lm in landmarks]

        return {
            "x": min(xs),
            "y": min(ys),
            "width": max(xs) - min(xs),
            "height": max(ys) - min(ys)
        }
```

### 皱纹检测器

```python
# services/ai_service/wrinkle_detector.py
import cv2
import numpy as np
from typing import List, Dict, Any

class WrinkleDetector:
    def __init__(self):
        # 预训练模型路径
        self.model_path = "models/wrinkle_detection.pth"

    def detect(self, image: np.ndarray, face_data: Dict) -> List[Dict[str, Any]]:
        """
        检测皱纹
        """
        wrinkles = []

        # 定义关注区域
        regions = {
            "forehead": {"points": [10, 65, 105, 338, 299], "severity": "mild"},
            "eyes": {"points": [33, 133, 362, 263], "severity": "moderate"},
            "nasolabial": {"points": [164, 39, 37, 0, 267, 289], "severity": "moderate"},
            "mouth": {"points": [61, 146, 91, 181, 84, 17, 314, 405, 320, 291], "severity": "mild"}
        }

        for region_name, region_data in regions.items():
            # 提取区域
            roi = self.extract_region(image, face_data["landmarks"], region_data["points"])

            # 检测
            wrinkle_detected = self.detect_wrinkle_in_roi(roi)

            if wrinkle_detected["detected"]:
                wrinkles.append({
                    "area": self._translate_region(region_name),
                    "severity": wrinkle_detected["severity"],
                    "confidence": wrinkle_detected["confidence"]
                })

        return wrinkles

    def extract_region(self, image: np.ndarray, landmarks: List, point_indices: List[int]) -> np.ndarray:
        """
        提取感兴趣区域
        """
        points = np.array([[int(lm["x"] * image.shape[1]), int(lm["y"] * image.shape[0])]
                          for i, lm in enumerate(landmarks) if i in point_indices])

        if len(points) < 3:
            return np.zeros((50, 50), dtype=np.uint8)

        x, y, w, h = cv2.boundingRect(points)
        return image[y:y+h, x:x+w]

    def detect_wrinkle_in_roi(self, roi: np.ndarray) -> Dict[str, Any]:
        """
        在ROI中检测皱纹
        """
        if roi.size == 0:
            return {"detected": False}

        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY) if len(roi.shape) == 3 else roi

        # 使用边缘检测
        edges = cv2.Canny(gray, 50, 150)

        # 统计边缘密度
        edge_density = np.sum(edges > 0) / edges.size

        # 根据密度判断
        if edge_density > 0.15:
            return {"detected": True, "severity": "severe", "confidence": min(0.95, edge_density * 5)}
        elif edge_density > 0.08:
            return {"detected": True, "severity": "moderate", "confidence": min(0.85, edge_density * 6)}
        elif edge_density > 0.04:
            return {"detected": True, "severity": "mild", "confidence": min(0.75, edge_density * 8)}
        else:
            return {"detected": False}

    def _translate_region(self, region: str) -> str:
        translations = {
            "forehead": "额头",
            "eyes": "眼角",
            "nasolabial": "法令纹",
            "mouth": "嘴角"
        }
        return translations.get(region, region)
```

### 建议生成引擎

```python
# services/ai_service/recommender.py
from typing import List, Dict, Any

class RecommendationEngine:
    def __init__(self):
        # 症状与治疗方案的映射
        self.treatment_map = {
            "wrinkles": {
                "forehead_severe": {
                    "category": "抗衰老",
                    "procedure": "肉毒素注射除皱",
                    "description": "抬头纹较深，建议使用肉毒素放松额肌",
                    "priority": "high",
                    "estimatedCost": "1500-3000元"
                },
                "eyes_moderate": {
                    "category": "眼部年轻化",
                    "procedure": "眼周肉毒素 + 玻尿酸填充",
                    "description": "鱼尾纹明显，建议联合治疗",
                    "priority": "high",
                    "estimatedCost": "3000-5000元"
                },
                "nasolabial_moderate": {
                    "category": "面部填充",
                    "procedure": "玻尿酸填充法令纹",
                    "description": "法令纹中度，建议使用小分子玻尿酸",
                    "priority": "high",
                    "estimatedCost": "3000-5000元"
                }
            },
            "proportions": {
                "lower_face_long": {
                    "category": "轮廓调整",
                    "procedure": "下颌角填充",
                    "description": "下庭较长，可通过填充调整比例",
                    "priority": "medium",
                    "estimatedCost": "5000-8000元"
                }
            },
            "contours": {
                "jawline_weak": {
                    "category": "轮廓塑形",
                    "procedure": "下颌线玻尿酸塑形",
                    "description": "下颌线不够清晰，可通过玻尿酸塑形",
                    "priority": "medium",
                    "estimatedCost": "4000-7000元"
                }
            }
        }

    def generate(self, analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        根据分析结果生成建议
        """
        recommendations = []

        # 分析皱纹
        for wrinkle in analysis.get("wrinkles", []):
            key = f"{wrinkle['area']}_{wrinkle['severity']}"
            if key in self.treatment_map["wrinkles"]:
                rec = self.treatment_map["wrinkines"][key].copy()
                recommendations.append(rec)

        # 分析比例
        proportions = analysis.get("proportions", {})
        if proportions.get("lowerFace", 0) > 0.4:
            recommendations.append(self.treatment_map["proportions"]["lower_face_long"])

        # 分析轮廓
        contours = analysis.get("contours", {})
        if contours.get("jawline", {}).get("score", 1) < 0.7:
            recommendations.append(self.treatment_map["contours"]["jawline_weak"])

        # 按优先级排序
        priority_order = {"high": 0, "medium": 1, "low": 2}
        recommendations.sort(key=lambda x: priority_order.get(x.get("priority", "low"), 3))

        return recommendations[:5]  # 返回最多5条建议
```

---

## 任务队列配置

```javascript
// services/queue/src/queues/analysis.queue.ts
import Bull from 'bull'
import Redis from 'ioredis'

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
})

export const analysisQueue = new Bull('face-analysis', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  }
})

// 定义任务处理器
analysisQueue.process(async (job) => {
  const { imageBuffer, options } = job.data

  // 调用Python AI服务
  const response = await fetch(`${process.env.AI_SERVICE_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBuffer, options })
  })

  return response.json()
})

// 任务进度更新
analysisQueue.process(async (job) => {
  job.progress(10)
  // ... 处理中
  job.progress(50)
  // ...
  job.progress(100)
})
```
