# 数据库设计

## 技术选型
- **数据库**: PostgreSQL 15+
- **ORM**: Prisma
- **迁移**: Prisma Migrate

---

## ER图

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    users     │     │   doctors    │     │appointments  │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id           │──┬──│ id           │◄───│ id           │
│ email        │  │  │ user_id      │     │ user_id      │
│ phone        │  │  │ license_no   │     │ doctor_id    │
│ password_hash│  │  │ specialty    │     │ scheduled_at │
│ name         │  │  │ hospital     │     │ status       │
│ avatar       │  │  │ rating       │     │ payment_id   │
│ gender       │  │  └──────────────┘     └──────────────┘
│ birth_date   │  │           │
│ created_at   │  │           │
└──────────────┘  │           │
                  │           │
                  │           ▼
                  │  ┌──────────────────┐
                  │  │ doctor_schedules │
                  │  ├──────────────────┤
                  └──│ doctor_id        │
                     │ day_of_week      │
                     │ start_time       │
                     │ end_time         │
                     └──────────────────┘

┌──────────────┐     ┌──────────────┐
│analysis_rec  │     │face_images   │
├──────────────┤     ├──────────────┤
│ id           │──┬──│ id           │
│ user_id      │  │  │ analysis_id  │
│ image_url    │◄─┘  │ url          │
│ face_data    │     │ type         │
│ analysis_res │     │ metadata     │
│ ai_suggest   │     └──────────────┘
│ created_at   │
└──────────────┘

┌──────────────┐     ┌──────────────┐
│  favorites   │     │  reviews     │
├──────────────┤     ├──────────────┤
│ user_id      │     │ id           │
│ doctor_id    │     │ user_id      │
│ created_at   │     │ doctor_id    │
└──────────────┘     │ appointment_id│
                     │ rating        │
                     │ content       │
                     │ created_at    │
                     └──────────────┘

┌──────────────┐     ┌──────────────┐
│payments      │     │notifications │
├──────────────┤     ├──────────────┤
│ id           │     │ id           │
│ user_id      │     │ user_id      │
│ appointment_id│    │ type         │
│ amount       │     │ title        │
│ method       │     │ content      │
│ status       │     │ read         │
│ transaction_id│    │ created_at   │
│ created_at   │     └──────────────┘
└──────────────┘
```

---

## Prisma Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// 用户相关
// ============================================================================

enum Gender {
  MALE
  FEMALE
  OTHER
}

enum UserRole {
  USER
  DOCTOR
  ADMIN
}

model User {
  id           String    @id @default(uuid())
  email        String    @unique
  phone        String?   @unique
  passwordHash String    @map("password_hash")
  name         String?
  avatar       String?
  gender       Gender?
  birthDate    DateTime? @map("birth_date")
  role         UserRole  @default(USER)
  isVerified   Boolean   @default(false) @map("is_verified")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  // 关联
  doctor       Doctor?
  analysisRecords AnalysisRecord[]
  appointments  Appointment[]
  favorites     Favorite[]
  reviews       Review[]
  payments      Payment[]
  notifications Notification[]

  @@map("users")
}

model Doctor {
  id              String   @id @default(uuid())
  userId          String   @unique @map("user_id")
  licenseNumber   String   @unique @map("license_number")
  specialty       String[]
  hospitalName    String?  @map("hospital_name")
  experience      Int      @default(0)
  introduction    String?  @db.Text
  consultationFee Decimal  @default(0) @map("consultation_fee") @db.Decimal(10, 2)
  rating          Decimal  @default(0) @db.Decimal(3, 2)
  reviewCount     Int      @default(0) @map("review_count")
  isVerified      Boolean  @default(false) @map("is_verified")
  isOnline        Boolean  @default(false) @map("is_online")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  // 关联
  user            User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  schedules       DoctorSchedule[]
  appointments    Appointment[]
  favorites       Favorite[]
  reviews         Review[]
  qualifications  Qualification[]

  @@map("doctors")
}

model Qualification {
  id        String   @id @default(uuid())
  doctorId  String   @map("doctor_id")
  name      String
  number    String?
  imageUrl  String?  @map("image_url")
  verified  Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at")

  // 关联
  doctor    Doctor   @relation(fields: [doctorId], references: [id], onDelete: Cascade)

  @@map("qualifications")
}

model DoctorSchedule {
  id        String   @id @default(uuid())
  doctorId  String   @map("doctor_id")
  dayOfWeek Int      @map("day_of_week") // 0=周日, 1=周一, ...
  startTime String   @map("start_time")  // HH:MM
  endTime   String   @map("end_time")    // HH:MM
  isActive  Boolean  @default(true) @map("is_active")

  // 关联
  doctor    Doctor   @relation(fields: [doctorId], references: [id], onDelete: Cascade)

  @@unique([doctorId, dayOfWeek, startTime])
  @@map("doctor_schedules")
}

// ============================================================================
// 分析相关
// ============================================================================

model AnalysisRecord {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  imageUrl        String   @map("image_url")
  thumbnailUrl    String?  @map("thumbnail_url")
  faceData        Json     @map("face_data")
  analysisResult  Json     @map("analysis_result")
  recommendations Json?
  createdAt       DateTime @default(now()) @map("created_at")

  // 关联
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  faceImages      FaceImage[]
  arPreviews      ArPreview[]
  appointments    Appointment[]

  @@map("analysis_records")
}

model FaceImage {
  id         String   @id @default(uuid())
  analysisId String   @map("analysis_id")
  url        String
  type       String   // original, processed, annotated
  metadata   Json?
  createdAt  DateTime @default(now()) @map("created_at")

  // 关联
  analysis   AnalysisRecord @relation(fields: [analysisId], references: [id], onDelete: Cascade)

  @@map("face_images")
}

model ArPreview {
  id         String   @id @default(uuid())
  analysisId String   @map("analysis_id")
  sessionId  String   @unique @map("session_id")
  effects    Json     // 存储应用的AR效果参数
  previewUrl String   @map("preview_url")
  compareUrl String?  @map("compare_url")
  createdAt  DateTime @default(now()) @map("created_at")

  // 关联
  analysis   AnalysisRecord @relation(fields: [analysisId], references: [id], onDelete: Cascade)

  @@map("ar_previews")
}

// ============================================================================
// 预约相关
// ============================================================================

enum AppointmentStatus {
  PENDING_PAYMENT
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW
}

enum AppointmentType {
  VIDEO
  OFFLINE
}

model Appointment {
  id            String             @id @default(uuid())
  userId        String             @map("user_id")
  doctorId      String             @map("doctor_id")
  analysisId    String?            @map("analysis_id")
  scheduledAt   DateTime           @map("scheduled_at")
  duration      Int                @default(30)
  status        AppointmentStatus  @default(PENDING_PAYMENT)
  type          AppointmentType    @default(VIDEO)
  notes         String?            @db.Text
  paymentId     String?            @map("payment_id")
  paymentStatus String             @default("unpaid") @map("payment_status")
  roomToken     String?            @map("room_token")
  createdAt     DateTime           @default(now()) @map("created_at")
  updatedAt     DateTime           @updatedAt @map("updated_at")
  cancelledAt   DateTime?          @map("cancelled_at")

  // 关联
  user          User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  doctor        Doctor             @relation(fields: [doctorId], references: [id], onDelete: Cascade)
  analysis      AnalysisRecord?    @relation(fields: [analysisId], references: [id])
  payment       Payment?
  review        Review?

  @@map("appointments")
}

enum PaymentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  REFUNDED
}

enum PaymentMethod {
  WECHAT
  ALIPAY
  CARD
}

model Payment {
  id             String        @id @default(uuid())
  userId         String        @map("user_id")
  appointmentId  String?       @unique @map("appointment_id")
  amount         Decimal       @db.Decimal(10, 2)
  method         PaymentMethod
  status         PaymentStatus @default(PENDING)
  transactionId  String?       @unique @map("transaction_id")
  returnUrl      String?       @map("return_url")
  createdAt      DateTime      @default(now()) @map("created_at")
  paidAt         DateTime?     @map("paid_at")

  // 关联
  user           User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  appointment    Appointment?  @relation(fields: [appointmentId], references: [id])

  @@map("payments")
}

// ============================================================================
// 评价和收藏
// ============================================================================

model Favorite {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  doctorId  String   @map("doctor_id")
  createdAt DateTime @default(now()) @map("created_at")

  // 关联
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  doctor    Doctor   @relation(fields: [doctorId], references: [id], onDelete: Cascade)

  @@unique([userId, doctorId])
  @@map("favorites")
}

model Review {
  id            String   @id @default(uuid())
  userId        String   @map("user_id")
  doctorId      String   @map("doctor_id")
  appointmentId String?  @unique @map("appointment_id")
  rating        Int      // 1-5
  content       String?  @db.Text
  createdAt     DateTime @default(now()) @map("created_at")

  // 关联
  user          User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  doctor        Doctor       @relation(fields: [doctorId], references: [id], onDelete: Cascade)
  appointment   Appointment? @relation(fields: [appointmentId], references: [id])

  @@map("reviews")
}

// ============================================================================
// 通知
// ============================================================================

enum NotificationType {
  APPOINTMENT_REMINDER
  APPOINTMENT_CONFIRMED
  APPOINTMENT_CANCELLED
  ANALYSIS_COMPLETED
  SYSTEM_MESSAGE
  PROMOTION
}

model Notification {
  id        String            @id @default(uuid())
  userId    String            @map("user_id")
  type      NotificationType
  title     String
  content   String            @db.Text
  data      Json?
  isRead    Boolean           @default(false) @map("is_read")
  readAt    DateTime?         @map("read_at")
  createdAt DateTime          @default(now()) @map("created_at")

  // 关联
  user      User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notifications")
}

// ============================================================================
// 系统配置
// ============================================================================

model SystemConfig {
  id        String   @id @default(uuid())
  key       String   @unique
  value     Json
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("system_configs")
}
```

---

## 初始数据种子

```typescript
// prisma/seed.ts

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // 创建管理员
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@perfectface.com' },
    update: {},
    create: {
      email: 'admin@perfectface.com',
      passwordHash: adminPassword,
      name: '系统管理员',
      role: 'ADMIN',
      isVerified: true,
    },
  })

  // 创建测试医生
  const doctorPassword = await bcrypt.hash('doctor123', 10)
  const doctorUser = await prisma.user.upsert({
    where: { email: 'doctor@example.com' },
    update: {},
    create: {
      email: 'doctor@example.com',
      passwordHash: doctorPassword,
      name: '王医生',
      gender: 'FEMALE',
      role: 'DOCTOR',
      isVerified: true,
      doctor: {
        create: {
          licenseNumber: 'DOC20240001',
          specialty: ['面部年轻化', '玻尿酸填充', '肉毒素注射'],
          hospitalName: '北京协和医院整形外科',
          experience: 15,
          introduction: '从事医美行业15年，擅长面部年轻化综合治疗方案',
          consultationFee: 299,
          isVerified: true,
        },
      },
    },
  })

  // 创建系统配置
  await prisma.systemConfig.upsert({
    where: { key: 'appointment.advance_reminder_hours' },
    update: {},
    create: {
      key: 'appointment.advance_reminder_hours',
      value: [24, 2],
    },
  })

  console.log('种子数据创建完成!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
```

---

## 数据库索引优化

```sql
-- 用户表索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);

-- 医生表索引
CREATE INDEX idx_doctors_specialty ON doctors USING GIN(specialty);
CREATE INDEX idx_doctors_rating ON doctors(rating DESC);
CREATE INDEX idx_doctors_is_verified ON doctors(is_verified);

-- 预约表索引
CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_doctor_date ON appointments(doctor_id, scheduled_at);

-- 分析记录索引
CREATE INDEX idx_analysis_user_id ON analysis_records(user_id);
CREATE INDEX idx_analysis_created_at ON analysis_records(created_at DESC);

-- 评价表索引
CREATE INDEX idx_reviews_doctor_id ON reviews(doctor_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- 通知表索引
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

---

## 数据备份策略

1. **每日全量备份**: 凌晨2点执行
2. **增量备份**: 每6小时一次
3. **WAL归档**: 实时归档
4. **异地备份**: 每周同步到异地存储
5. **保留策略**: 全量保留30天，增量保留7天
