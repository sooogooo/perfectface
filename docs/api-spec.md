# API 接口规范

## 基础信息

**Base URL**: `https://api.perfectface.com/v1`
**认证方式**: Bearer Token (JWT)
**响应格式**: JSON

---

## 通用响应格式

### 成功响应
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": { ... }
  }
}
```

---

## 认证相关 API

### POST /auth/register
用户注册

**Request Body:**
```json
{
  "email": "user@example.com",
  "phone": "13800138000",
  "password": "SecurePass123!",
  "name": "张三",
  "gender": "female",
  "birthDate": "1995-06-15"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "张三",
      "avatar": null
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 900
    }
  }
}
```

### POST /auth/login
用户登录

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

### POST /auth/refresh
刷新 Token

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### POST /auth/logout
登出 (需要认证)

### POST /auth/verify-email
验证邮箱

**Request Body:**
```json
{
  "token": "verification_token_from_email"
}
```

---

## 用户相关 API

### GET /users/profile
获取当前用户信息 (需要认证)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "张三",
    "avatar": "https://cdn.perfectface.com/avatars/xxx.jpg",
    "gender": "female",
    "birthDate": "1995-06-15",
    "createdAt": "2024-01-15T08:00:00Z"
  }
}
```

### PUT /users/profile
更新用户信息 (需要认证)

**Request Body:**
```json
{
  "name": "李四",
  "gender": "male",
  "birthDate": "1992-03-20"
}
```

### POST /users/avatar
上传头像 (需要认证)

**Request:** `multipart/form-data`
```
avatar: <file>
```

### GET /users/history
获取面诊历史 (需要认证)

**Query Parameters:**
- `page`: 页码 (默认 1)
- `limit`: 每页数量 (默认 10)
- `type`: 分析类型 (all/ai/doctor)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "uuid",
        "type": "ai_analysis",
        "thumbnail": "https://cdn.perfectface.com/analysis/xxx-thumb.jpg",
        "createdAt": "2024-01-20T10:30:00Z",
        "summary": {
          "skinCondition": "良好",
          "mainConcerns": ["眼角细纹", "法令纹"]
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

### GET /users/favorites
获取收藏列表 (需要认证)

### POST /users/favorites/:doctorId
收藏医生 (需要认证)

### DELETE /users/favorites/:doctorId
取消收藏 (需要认证)

---

## 医生相关 API

### GET /doctors
获取医生列表

**Query Parameters:**
- `page`: 页码 (默认 1)
- `limit`: 每页数量 (默认 10)
- `specialty`: 专科 (如: facial/contour/injection)
- `region`: 地区
- `rating`: 最低评分
- `search`: 搜索关键词

**Response (200):**
```json
{
  "success": true,
  "data": {
    "doctors": [
      {
        "id": "uuid",
        "name": "王医生",
        "avatar": "https://cdn.perfectface.com/doctors/xxx.jpg",
        "specialty": ["面部年轻化", "玻尿酸填充"],
        "hospital": "北京协和医院",
        "experience": 15,
        "rating": 4.8,
        "reviewCount": 326,
        "consultationFee": 299,
        "isOnline": true
      }
    ],
    "pagination": { ... }
  }
}
```

### GET /doctors/:id
获取医生详情

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "王医生",
    "avatar": "https://cdn.perfectface.com/doctors/xxx.jpg",
    "specialty": ["面部年轻化", "玻尿酸填充"],
    "hospital": "北京协和医院",
    "experience": 15,
    "rating": 4.8,
    "reviewCount": 326,
    "consultationFee": 299,
    "introduction": "从事医美行业15年...",
    "qualifications": [
      {
        "name": "执业医师资格证",
        "number": "XXX",
        "verified": true
      }
    ],
    "caseImages": [
      "https://cdn.perfectface.com/cases/xxx-1.jpg",
      "https://cdn.perfectface.com/cases/xxx-2.jpg"
    ],
    "isOnline": true,
    "isFavorite": false
  }
}
```

### GET /doctors/:id/schedule
获取医生可预约时段

**Query Parameters:**
- `date`: 日期 (YYYY-MM-DD)
- `duration`: 预约时长(分钟) (默认 30)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "date": "2024-02-01",
    "slots": [
      { "time": "09:00", "available": true },
      { "time": "09:30", "available": true },
      { "time": "10:00", "available": false },
      { "time": "10:30", "available": true }
    ]
  }
}
```

### GET /doctors/:id/reviews
获取医生评价

**Query Parameters:**
- `page`: 页码
- `limit`: 每页数量

**Response (200):**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "uuid",
        "userName": "李女士",
        "avatar": "https://cdn.perfectface.com/avatars/xxx.jpg",
        "rating": 5,
        "content": "王医生非常专业...",
        "createdAt": "2024-01-15T08:00:00Z"
      }
    ],
    "summary": {
      "totalReviews": 326,
      "rating5": 280,
      "rating4": 40,
      "rating3": 5,
      "rating2": 1,
      "rating1": 0
    }
  }
}
```

---

## AI分析 API

### POST /analysis/upload
上传照片进行分析

**Request:** `multipart/form-data`
```
image: <file>
type: "face"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "uploadId": "uuid",
    "imageUrl": "https://cdn.perfectface.com/uploads/xxx.jpg",
    "status": "processing"
  }
}
```

### POST /analysis/analyze
执行AI分析

**Request Body:**
```json
{
  "uploadId": "uuid",
  "options": {
    "includeSymmetry": true,
    "includeProportions": true,
    "includeWrinkles": true,
    "includeContours": true
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "completed",
    "faceData": {
      "landmarks": [
        { "x": 100, "y": 150, "z": 0 },
        { "x": 102, "y": 152, "z": 1 }
      ],
      "boundingBox": {
        "x": 50,
        "y": 80,
        "width": 200,
        "height": 250
      }
    },
    "analysis": {
      "proportions": {
        "upperFace": 0.35,
        "midFace": 0.33,
        "lowerFace": 0.32,
        "eyeWidth": 0.25,
        "noseWidth": 0.20,
        "mouthWidth": 0.35
      },
      "symmetry": {
        "score": 0.85,
        "leftEye": { "x": 120, "y": 140 },
        "rightEye": { "x": 180, "y": 142 },
        "deviation": 2.3
      },
      "skin": {
        "condition": "良好",
        "texture": "细腻",
        "elasticity": "正常",
        "concerns": ["T区油光", "轻微暗沉"]
      },
      "wrinkles": [
        {
          "area": "眼角",
          "severity": "mild",
          "confidence": 0.82
        },
        {
          "area": "法令纹",
          "severity": "moderate",
          "confidence": 0.75
        }
      ],
      "contours": {
        "jawline": { "definition": "清晰", "score": 0.78 },
        "cheekbone": { "prominence": "适中", "score": 0.82 }
      }
    },
    "recommendations": [
      {
        "category": "抗衰老",
        "procedure": "玻尿酸填充法令纹",
        "description": "您的法令纹中度明显，建议使用小分子玻尿酸...",
        "priority": "high",
        "estimatedCost": "3000-5000元"
      },
      {
        "category": "皮肤护理",
        "procedure": "水光针",
        "description": "改善皮肤暗沉和T区油光...",
        "priority": "medium",
        "estimatedCost": "800-1500元"
      }
    ],
    "createdAt": "2024-01-20T10:30:00Z"
  }
}
```

### GET /analysis/result/:id
获取分析结果

**Response:** 同上

### GET /analysis/history
获取分析历史 (需要认证)

### DELETE /analysis/:id
删除分析记录 (需要认证)

---

## AR预览 API

### POST /ar/initialize
初始化AR会话

**Request Body:**
```json
{
  "analysisId": "uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "faceMeshUrl": "https://cdn.perfectface.com/mesh/xxx.json",
    "baseImageUrl": "https://cdn.perfectface.com/uploads/xxx.jpg"
  }
}
```

### POST /ar/apply-effect
应用AR效果

**Request Body:**
```json
{
  "sessionId": "uuid",
  "effect": {
    "type": "fill_nasolabial",
    "intensity": 0.6,
    "area": { "left": true, "right": true }
  }
}
```

**效果类型列表:**
```json
{
  "effects": [
    { "id": "fill_nasolabial", "name": "法令纹填充", "category": "filler" },
    { "id": "fill_marionette", "name": "木偶纹填充", "category": "filler" },
    { "id": "fill_lips", "name": "丰唇", "category": "filler" },
    { "id": "fill_forehead", "name": "额头填充", "category": "filler" },
    { "id": "botox_forehead", "name": "抬头纹肉毒素", "category": "botox" },
    { "id": "botox_eyes", "name": "鱼尾纹肉毒素", "category": "botox" },
    { "id": "contour_jaw", "name": "下颌线调整", "category": "contour" },
    { "id": "contour_nose", "name": "鼻部调整", "category": "contour" },
    { "id": "contour_cheek", "name": "颧骨调整", "category": "contour" }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "previewUrl": "https://cdn.perfectface.com/previews/xxx.jpg",
    "appliedEffects": [...]
  }
}
```

### POST /ar/compare
生成对比图

**Request Body:**
```json
{
  "sessionId": "uuid",
  "layout": "side_by_side"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "compareUrl": "https://cdn.perfectface.com/compares/xxx.jpg"
  }
}
```

---

## 预约相关 API

### GET /appointments/available
查询可预约时段

**Query Parameters:**
- `doctorId`: 医生ID
- `startDate`: 开始日期
- `endDate`: 结束日期
- `duration`: 预约时长(分钟)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "doctor": {
      "id": "uuid",
      "name": "王医生"
    },
    "availability": [
      {
        "date": "2024-02-01",
        "dayOfWeek": "周四",
        "slots": [
          { "time": "09:00", "available": true },
          { "time": "09:30", "available": true }
        ]
      }
    ]
  }
}
```

### POST /appointments
创建预约

**Request Body:**
```json
{
  "doctorId": "uuid",
  "scheduledAt": "2024-02-01T09:00:00Z",
  "duration": 30,
  "type": "video",
  "notes": "想咨询玻尿酸填充",
  "analysisId": "uuid"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "doctor": {
      "id": "uuid",
      "name": "王医生",
      "avatar": "..."
    },
    "scheduledAt": "2024-02-01T09:00:00Z",
    "duration": 30,
    "status": "pending_payment",
    "totalFee": 299,
    "paymentId": "pay_xxx",
    "expiresAt": "2024-01-25T09:00:00Z"
  }
}
```

### GET /appointments
获取我的预约列表 (需要认证)

**Query Parameters:**
- `status`: 状态过滤 (pending/confirmed/completed/cancelled)
- `page`: 页码

**Response (200):**
```json
{
  "success": true,
  "data": {
    "appointments": [
      {
        "id": "uuid",
        "doctor": {
          "id": "uuid",
          "name": "王医生",
          "avatar": "..."
        },
        "scheduledAt": "2024-02-01T09:00:00Z",
        "duration": 30,
        "status": "confirmed",
        "type": "video"
      }
    ]
  }
}
```

### GET /appointments/:id
获取预约详情

### PUT /appointments/:id/reschedule
改期预约

**Request Body:**
```json
{
  "newScheduledAt": "2024-02-02T10:00:00Z"
}
```

### DELETE /appointments/:id
取消预约

### POST /appointments/:id/payment
支付预约

**Request Body:**
```json
{
  "method": "wechat",
  "returnUrl": "https://app.perfectface.com/payment/return"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "paymentId": "pay_xxx",
    "paymentUrl": "https://pay.weixin.qq.com/...",
    "qrCode": "https://api.perfectface.com/qrcodes/pay_xxx.png"
  }
}
```

---

## 视频面诊 API

### GET /video/token
获取视频通话令牌

**Query Parameters:**
- `appointmentId`: 预约ID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "roomId": "room_xxx",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresAt": "2024-02-01T09:30:00Z",
    "serverUrl": "wss://rtc.perfectface.com"
  }
}
```

### POST /video/feedback
提交面诊反馈

**Request Body:**
```json
{
  "appointmentId": "uuid",
  "rating": 5,
  "comment": "医生很专业，解答详细"
}
```

---

## WebSocket 事件

### 连接
```
wss://api.perfectface.com/ws
```

### 认证
```json
{
  "event": "auth",
  "data": {
    "token": "jwt_token"
  }
}
```

### 服务器事件

#### analysis.progress
分析进度更新
```json
{
  "event": "analysis.progress",
  "data": {
    "analysisId": "uuid",
    "progress": 60,
    "stage": "analyzing_symmetry"
  }
}
```

#### analysis.completed
分析完成
```json
{
  "event": "analysis.completed",
  "data": {
    "analysisId": "uuid",
    "result": { ... }
  }
}
```

#### appointment.reminder
预约提醒
```json
{
  "event": "appointment.reminder",
  "data": {
    "appointmentId": "uuid",
    "scheduledAt": "2024-02-01T09:00:00Z",
    "minutesUntil": 30,
    "doctor": {
      "name": "王医生",
      "avatar": "..."
    }
  }
}
```

---

## 错误代码

| 代码 | 说明 |
|------|------|
| `AUTH_INVALID_TOKEN` | 无效的认证令牌 |
| `AUTH_TOKEN_EXPIRED` | 令牌已过期 |
| `AUTH_INSUFFICIENT_PERMISSIONS` | 权限不足 |
| `USER_NOT_FOUND` | 用户不存在 |
| `USER_EMAIL_EXISTS` | 邮箱已被注册 |
| `DOCTOR_NOT_FOUND` | 医生不存在 |
| `DOCTOR_NOT_AVAILABLE` | 医生不可预约 |
| `APPOINTMENT_NOT_FOUND` | 预约不存在 |
| `APPOINTMENT_TIME_UNAVAILABLE` | 预约时段不可用 |
| `ANALYSIS_INVALID_IMAGE` | 无效的图片 |
| `ANALYSIS_NO_FACE_DETECTED` | 未检测到人脸 |
| `PAYMENT_FAILED` | 支付失败 |
| `RATE_LIMIT_EXCEEDED` | 请求过于频繁 |
| `VALIDATION_ERROR` | 数据验证失败 |
| `INTERNAL_SERVER_ERROR` | 服务器内部错误 |
