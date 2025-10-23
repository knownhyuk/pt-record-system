// 사용자 타입 (트레이너 또는 회원)
export interface User {
  id: number
  name: string
  email: string
  role: 'trainer' | 'member'
  trainerId?: number // 회원의 경우 담당 트레이너 ID
}

// 회원 정보 (트레이너가 보는 회원 목록)
export interface Member {
  id: number
  name: string
  email: string
  trainerId: number
  createdAt: string
}

// PT 세션 기록
export interface PTSession {
  id: number
  trainerId: number
  memberId: number
  date: string // YYYY-MM-DD 형식
  startTime: string // HH:mm 형식 (예: "09:00", "14:30")
  trainerConfirmed: boolean // 트레이너 확인 여부
  memberConfirmed: boolean // 회원 확인 여부
  confirmedAt?: string // 양측 확인 완료 시간
  createdAt: string
  memberName?: string // 조인된 회원 이름
  trainerName?: string // 조인된 트레이너 이름
}

// 초대 코드
export interface InviteCode {
  id: number
  code: string
  trainerId: number
  expiresAt: string
  used: boolean
  createdAt: string
}

// 코멘트
export interface Comment {
  id: number
  sessionId: number
  trainerId: number
  content: string
  isPublic: boolean // true: 공개 (회원이 볼 수 있음), false: 비공개 (트레이너만)
  createdAt: string
  updatedAt?: string
}

