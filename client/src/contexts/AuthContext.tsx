import { createContext, useContext } from 'react'
import type { User } from '../types'

// 인증 컨텍스트 타입 정의
interface AuthContextType {
  user: User | null
  login: (user: User) => void
  logout: () => void
}

// 인증 컨텍스트 생성
export const AuthContext = createContext<AuthContextType | undefined>(undefined)

// 인증 컨텍스트 사용을 위한 커스텀 훅
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

