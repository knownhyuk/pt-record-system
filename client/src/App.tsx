import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import TrainerDashboard from './pages/TrainerDashboard'
import MemberDashboard from './pages/MemberDashboard'
import { AuthContext } from './contexts/AuthContext'
import type { User } from './types'

function App() {
  // 로그인 상태 관리
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // 페이지 로드 시 로컬 스토리지에서 사용자 정보 복원
  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    console.log('앱 시작 - 저장된 사용자 정보:', savedUser)
    
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        console.log('파싱된 사용자 정보:', userData)
        setUser(userData)
      } catch (error) {
        console.error('사용자 정보 파싱 실패:', error)
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  // 로그인 함수
  const login = (userData: User) => {
    console.log('로그인 함수 호출:', userData)
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    console.log('사용자 정보 저장 완료')
  }

  // 로그아웃 함수
  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <Router>
        <Routes>
          {/* 로그인하지 않은 경우 */}
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/register/:inviteCode?" element={!user ? <Register /> : <Navigate to="/" />} />

          {/* 로그인한 경우 */}
          <Route
            path="/"
            element={
              user ? (
                user.role === 'trainer' ? (
                  <TrainerDashboard />
                ) : (
                  <MemberDashboard />
                )
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* 기본 경로 */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  )
}

export default App

