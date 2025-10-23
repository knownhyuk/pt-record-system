import axios from 'axios'
import type { User, Member, PTSession, InviteCode, Comment } from '../types'

// API 베이스 URL 설정
const api = axios.create({
  baseURL: '/api',
})

// 인증 관련 API
export const authAPI = {
  // 로그인
  login: async (email: string, password: string): Promise<User> => {
    const response = await api.post('/auth/login', { email, password })
    return response.data
  },

  // 회원가입
  register: async (
    name: string,
    email: string,
    password: string,
    role: 'trainer' | 'member',
    inviteCode?: string
  ): Promise<User> => {
    const response = await api.post('/auth/register', {
      name,
      email,
      password,
      role,
      inviteCode,
    })
    return response.data
  },
}

// 트레이너 관련 API
export const trainerAPI = {
  // 초대 코드 생성
  createInviteCode: async (trainerId: number): Promise<InviteCode> => {
    const response = await api.post('/trainer/invite', { trainerId })
    return response.data
  },

  // 내 회원 목록 조회
  getMembers: async (trainerId: number): Promise<Member[]> => {
    const response = await api.get(`/trainer/${trainerId}/members`)
    return response.data
  },

  // PT 세션 생성 (트레이너가 제안)
  createPTSession: async (
    trainerId: number,
    memberId: number,
    date: string,
    startTime: string = '09:00'
  ): Promise<PTSession> => {
    const response = await api.post('/pt-sessions', {
      trainerId,
      memberId,
      date,
      startTime,
    })
    return response.data
  },

  // 반복 PT 세션 생성 (주간 반복)
  createRepeatPTSession: async (
    trainerId: number,
    memberId: number,
    startDate: string,
    startTime: string,
    weeks: number
  ): Promise<{created: PTSession[], failed: string[]}> => {
    const response = await api.post('/pt-sessions/repeat', {
      trainerId,
      memberId,
      startDate,
      startTime,
      weeks,
    })
    return response.data
  },


  // 트레이너의 모든 PT 세션 조회
  getPTSessions: async (trainerId: number): Promise<PTSession[]> => {
    const response = await api.get(`/trainer/${trainerId}/sessions`)
    return response.data
  },

  // PT 세션 확인 (트레이너)
  confirmSession: async (sessionId: number, trainerId: number): Promise<PTSession> => {
    const response = await api.post(`/pt-sessions/${sessionId}/confirm-trainer`, {
      trainerId,
    })
    return response.data
  },

  // PT 세션 삭제 (트레이너)
  deleteSession: async (sessionId: number, trainerId: number): Promise<void> => {
    await api.delete(`/pt-sessions/${sessionId}`, {
      data: { trainerId }
    })
  },

  // PT 세션 수정 (시간 및 날짜 변경)
  updateSession: async (sessionId: number, trainerId: number, startTime: string, date?: string): Promise<PTSession> => {
    const response = await api.put(`/pt-sessions/${sessionId}`, {
      trainerId,
      startTime,
      date
    })
    return response.data
  },

  // 회원 삭제
  deleteMember: async (memberId: number, trainerId: number): Promise<void> => {
    await api.delete(`/members/${memberId}`, {
      data: { trainerId }
    })
  },
}

// 회원 관련 API
export const memberAPI = {
  // 회원의 PT 세션 조회
  getPTSessions: async (memberId: number): Promise<PTSession[]> => {
    const response = await api.get(`/member/${memberId}/sessions`)
    return response.data
  },

  // PT 세션 확인 (회원)
  confirmSession: async (sessionId: number, memberId: number): Promise<PTSession> => {
    const response = await api.post(`/pt-sessions/${sessionId}/confirm-member`, {
      memberId,
    })
    return response.data
  },

  // 담당 트레이너 정보 조회
  getTrainer: async (memberId: number): Promise<User> => {
    const response = await api.get(`/member/${memberId}/trainer`)
    return response.data
  },
}

// 코멘트 관련 API
export const commentAPI = {
  // 세션의 코멘트 조회
  getComments: async (sessionId: number, role: 'trainer' | 'member'): Promise<Comment[]> => {
    const response = await api.get(`/sessions/${sessionId}/comments`, {
      params: { role }
    })
    return response.data
  },

  // 코멘트 생성
  createComment: async (
    sessionId: number,
    trainerId: number,
    content: string,
    isPublic: boolean
  ): Promise<Comment> => {
    const response = await api.post('/comments', {
      sessionId,
      trainerId,
      content,
      isPublic,
    })
    return response.data
  },

  // 코멘트 수정
  updateComment: async (
    commentId: number,
    trainerId: number,
    content: string,
    isPublic: boolean
  ): Promise<Comment> => {
    const response = await api.put(`/comments/${commentId}`, {
      trainerId,
      content,
      isPublic,
    })
    return response.data
  },

  // 코멘트 삭제
  deleteComment: async (commentId: number, trainerId: number): Promise<void> => {
    await api.delete(`/comments/${commentId}`, {
      data: { trainerId }
    })
  },
}

export default api

