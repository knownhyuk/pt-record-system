import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { authAPI } from '../api'
import { useAuth } from '../contexts/AuthContext'

function Register() {
  const { inviteCode: urlInviteCode } = useParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<'trainer' | 'member'>(urlInviteCode ? 'member' : 'trainer')
  const [inviteCode, setInviteCode] = useState(urlInviteCode || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [inviteValidating, setInviteValidating] = useState(false)
  const [inviteInfo, setInviteInfo] = useState<any>(null)
  
  const { login } = useAuth()
  const navigate = useNavigate()

  // 초대 코드 검증
  useEffect(() => {
    if (urlInviteCode) {
      setInviteValidating(true)
      fetch(`/api/invite/${urlInviteCode}`)
        .then(res => res.json())
        .then(data => {
          if (data.valid) {
            setInviteInfo(data)
            setError('')
          } else {
            setError(data.error || '유효하지 않은 초대 코드입니다.')
          }
        })
        .catch(err => {
          console.error('초대 코드 검증 실패:', err)
          setError('초대 코드 검증에 실패했습니다.')
        })
        .finally(() => {
          setInviteValidating(false)
        })
    }
  }, [urlInviteCode])

  // 회원가입 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 비밀번호 확인
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    // 회원의 경우 초대 코드 필수
    if (role === 'member' && !inviteCode) {
      setError('회원 가입은 트레이너의 초대 코드가 필요합니다.')
      return
    }

    setLoading(true)

    try {
      const user = await authAPI.register(name, email, password, role, inviteCode)
      console.log('회원가입 성공:', user)
      login(user)
      alert('회원가입이 완료되었습니다!')
      navigate('/')
    } catch (err: any) {
      console.error('회원가입 실패:', err)
      setError(err.response?.data?.error || '회원가입에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/50 px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md w-full space-y-8">
        {/* 헤더 */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl">
              <span className="text-5xl">💪</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            PT Record
          </h1>
          <p className="text-gray-500 text-sm">새로운 계정을 만들어보세요</p>
        </div>

        {/* 회원가입 폼 */}
        <div className="backdrop-blur-xl bg-white/80 rounded-3xl shadow-2xl p-8 border border-gray-200/50">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">회원가입</h2>
          
          {/* 초대 코드 검증 중 */}
          {inviteValidating && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-blue-700">초대 코드를 검증하는 중...</span>
              </div>
            </div>
          )}

          {/* 초대 코드 정보 */}
          {inviteInfo && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center mb-2">
                <span className="text-green-600 mr-2">✅</span>
                <span className="text-green-700 font-medium">유효한 초대 코드입니다</span>
              </div>
              <p className="text-green-600 text-sm">
                <strong>{inviteInfo.trainerName}</strong> 트레이너님의 초대를 받았습니다.
              </p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 역할 선택 (초대 코드가 없을 때만) */}
            {!urlInviteCode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  가입 유형
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setRole('trainer')}
                    className={`flex-1 py-3 px-4 rounded-2xl font-medium transition-all duration-200 ${
                      role === 'trainer'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95'
                    }`}
                  >
                    👨‍🏫 트레이너
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('member')}
                    className={`flex-1 py-3 px-4 rounded-2xl font-medium transition-all duration-200 ${
                      role === 'member'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95'
                    }`}
                  >
                    💪 회원
                  </button>
                </div>
              </div>
            )}

            {/* 이름 입력 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                이름
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="홍길동"
              />
            </div>

            {/* 이메일 입력 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                이메일
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="your@email.com"
              />
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>

            {/* 초대 코드 (회원일 경우) */}
            {role === 'member' && (
              <div>
                <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-2">
                  초대 코드
                </label>
                <input
                  id="inviteCode"
                  type="text"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="트레이너로부터 받은 초대 코드"
                  readOnly={!!urlInviteCode}
                />
                <p className="mt-2 text-sm text-gray-500">
                  트레이너로부터 초대 코드를 받아 입력해주세요.
                </p>
              </div>
            )}

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* 가입 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-2xl font-semibold hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? '가입 중...' : '가입하기'}
            </button>
          </form>

          {/* 로그인 링크 */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              이미 계정이 있으신가요?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                로그인
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register

