# 智能医美面诊平台 - 架构设计文档

## 1. 项目概述

**项目名称**: PerfectFace - 智能医美面诊平台

**核心功能**:
- 面部特征AI分析
- 个性化医美建议
- AR效果预览
- 在线预约面诊
- 医生-患者匹配系统

---

## 2. 技术栈

### 前端
| 技术 | 用途 |
|------|------|
| React 18 | 核心框架 |
| TypeScript | 类型安全 |
| Vite | 构建工具 |
| TailwindCSS | 样式系统 |
| Three.js / React Three Fiber | AR预览3D渲染 |
| @tensorflow/tfjs | 前端AI模型推理 |
| @mediapipe/face_mesh | 面部关键点检测 |
| React Router v6 | 路由管理 |
| Zustand / Jotai | 状态管理 |
| React Query | 服务端状态管理 |
| Socket.io-client | 实时通信(视频面诊) |

### 后端
| 技术 | 用途 |
|------|------|
| Node.js + Express | API服务 |
| TypeScript | 类型安全 |
| PostgreSQL + Prisma | 数据库ORM |
| Redis | 缓存/会话 |
| JWT | 认证 |
| Socket.io | WebSocket服务 |
| Python FastAPI | AI分析服务 |
| MinIO / S3 | 文件存储 |

### AI/ML
| 技术 | 用途 |
|------|------|
| MediaPipe Face Mesh | 面部关键点检测 |
| OpenCV | 图像处理 |
| scikit-learn | 特征分析 |
| TensorFlow | 深度学习模型 |
| GPT-4 API | 智能建议生成 |

---

## 3. 系统架构

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                              客户端层 (React Web App)                          │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  面诊分析    │  │  AR预览      │  │  预约管理    │  │  个人中心    │      │
│  │  模块        │  │  模块        │  │  模块        │  │  模块        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │                  │             │
│         └──────────────────┴──────────────────┴──────────────────┘             │
│                                    │                                          │
│                           ┌────────▼────────┐                                 │
│                           │  API Client     │                                 │
│                           │  (axios/fetch)  │                                 │
│                           └────────┬────────┘                                 │
└────────────────────────────────────┼───────────────────────────────────────────┘
                                     │
                                     ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                              API网关层 (Express Gateway)                       │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  认证中间件  │  │  限流中间件  │  │  日志中间件  │  │  错误处理    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                              微服务层                                          │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  用户服务    │  │  医生服务    │  │  预约服务    │  │  分析服务    │      │
│  │  (Node.js)   │  │  (Node.js)   │  │  (Node.js)   │  │  (Python)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │                  │             │
│         └──────────────────┴──────────────────┴──────────────────┘             │
│                                    │                                          │
│                           ┌────────▼────────┐                                 │
│                           │  数据访问层     │                                 │
│                           │  (Prisma ORM)   │                                 │
│                           └────────┬────────┘                                 │
└────────────────────────────────────┼───────────────────────────────────────────┘
                                     │
                                     ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                              数据层                                            │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ PostgreSQL   │  │  Redis       │  │  MinIO/S3    │  │  WebSocket   │      │
│  │  (主数据库)  │  │  (缓存)      │  │  (文件存储)  │  │  (实时通信)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. 核心模块设计

### 4.1 用户模块

**功能**:
- 用户注册/登录 (邮箱/手机/第三方)
- 个人资料管理
- 面诊历史记录
- 收藏管理
- 消息通知

**API端点**:
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/users/profile
PUT    /api/users/profile
GET    /api/users/history
```

---

### 4.2 医生模块

**功能**:
- 医生注册/认证
- 医生资料 (资质、专长、案例)
- 排班管理
- 评价系统
- 在线状态

**API端点**:
```
GET    /api/doctors
GET    /api/doctors/:id
GET    /api/doctors/:id/schedule
GET    /api/doctors/:id/reviews
POST   /api/doctors/:id/book
```

---

### 4.3 AI面诊分析模块

**流程**:
```
1. 用户上传面部照片
2. 前端使用 MediaPipe 检测面部关键点 (468点)
3. 提取面部特征参数
4. 发送到后端AI服务
5. Python服务进行深度分析
6. 返回个性化建议
```

**分析维度**:
- 面部比例分析 (三庭五眼)
- 对称性分析
- 皱纹检测
- 轮廓分析
- 问题区域识别

**API端点**:
```
POST   /api/analysis/upload
POST   /api/analysis/analyze
GET    /api/analysis/result/:id
POST   /api/analysis/feedback
```

---

### 4.4 AR预览模块

**技术实现**:
```
1. 使用 MediaPipe Face Mesh 获取面部网格
2. Three.js 创建 3D 场景
3. 将面部网格映射到 3D 模型
4. 叠加医美效果 (填充、轮廓调整等)
5. 实时渲染预览
```

**预览项目**:
- 玻尿酸填充效果
- 肉毒素效果
- 下颌线调整
- 鼻部整形效果
- 丰唇效果

---

### 4.5 预约面诊模块

**功能**:
- 医生筛选 (按地区、专长)
- 可预约时段展示
- 在线预约
- 视频面诊 (WebRTC)
- 预约管理 (取消/改期)
- 支付集成

**API端点**:
```
GET    /api/appointments/available
POST   /api/appointments/create
GET    /api/appointments/:id
PUT    /api/appointments/:id/cancel
POST   /api/appointments/:id/payment
POST   /api/appointments/:id/video-call
```

---

## 5. 数据库设计

### 用户表 (users)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  avatar_url VARCHAR(500),
  gender VARCHAR(10),
  birth_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 医生表 (doctors)
```sql
CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  license_number VARCHAR(100) UNIQUE NOT NULL,
  specialty VARCHAR(100)[],
  experience_years INTEGER,
  hospital_name VARCHAR(200),
  introduction TEXT,
  consultation_fee DECIMAL(10,2),
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 面诊记录表 (analysis_records)
```sql
CREATE TABLE analysis_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  image_url VARCHAR(500) NOT NULL,
  face_data JSONB NOT NULL,
  analysis_result JSONB NOT NULL,
  recommendations JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 预约表 (appointments)
```sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  doctor_id UUID REFERENCES doctors(id),
  scheduled_at TIMESTAMP NOT NULL,
  duration INTEGER DEFAULT 30,
  status VARCHAR(20) DEFAULT 'pending',
  payment_status VARCHAR(20) DEFAULT 'unpaid',
  payment_id VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 6. 安全设计

### 认证流程
```
1. JWT Token 认证
2. Access Token (15分钟) + Refresh Token (7天)
3. HttpOnly Cookie 存储
4. Token 轮换机制
```

### 数据安全
- 敏感数据加密存储
- 图片水印处理
- HTTPS 强制
- CORS 策略配置
- Rate Limiting

### 隐私保护
- GDPR 合规
- 用户数据可删除
- 图片数据定期清理
- 隐私协议明确

---

## 7. 部署架构

### 开发环境
```
- Docker Compose 本地开发
- 热重载配置
- Mock 数据服务
```

### 生产环境
```
- 前端: Vercel / Netlify
- 后端: AWS ECS / 阿里云 ECS
- 数据库: AWS RDS PostgreSQL
- 文件存储: AWS S3 / 阿里云 OSS
- CDN: CloudFlare
- 负载均衡: Nginx / ALB
```

---

## 8. 开发阶段规划

### Phase 1: 基础框架 (2-3周)
- 项目脚手架搭建
- 数据库设计与迁移
- 用户认证系统
- 基础UI组件库

### Phase 2: AI分析模块 (3-4周)
- MediaPipe 集成
- 面部特征提取
- Python AI服务开发
- 分析结果展示

### Phase 3: AR预览模块 (3-4周)
- Three.js 3D场景搭建
- 面部网格映射
- 效果参数调节
- 实时渲染优化

### Phase 4: 预约面诊模块 (2-3周)
- 医生管理后台
- 预约系统
- 支付集成
- 视频面诊功能

### Phase 5: 测试与优化 (2周)
- 单元测试
- 集成测试
- 性能优化
- 安全审计

---

## 9. 成本估算 (月度)

| 服务 | 预计月成本 |
|------|-----------|
| 服务器 (ECS) | ¥500-1000 |
| 数据库 (RDS) | ¥300-500 |
| 存储 (S3/OSS) | ¥100-300 |
| CDN | ¥200-400 |
| AI API调用 | ¥500-2000 |
| **总计** | **¥1600-4200** |
