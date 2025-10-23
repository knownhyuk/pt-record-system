import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { memberAPI } from '../api'
import Calendar from '../components/Calendar'
import CommentSection from '../components/CommentSection'
import type { PTSession, User } from '../types'

function MemberDashboard() {
  const { user, logout } = useAuth()
  const [sessions, setSessions] = useState<PTSession[]>([])
  const [trainer, setTrainer] = useState<User | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  // 데이터 로드
  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      const [sessionsData, trainerData] = await Promise.all([
        memberAPI.getPTSessions(user!.id),
        memberAPI.getTrainer(user!.id),
      ])
      setSessions(sessionsData)
      setTrainer(trainerData)
    } catch (error) {
      console.error('데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 회원 확인
  const handleConfirmSession = async (sessionId: number) => {
    try {
      await memberAPI.confirmSession(sessionId, user!.id)
      await loadData()
      alert('PT 일정을 확인했습니다.')
    } catch (error) {
      console.error('확인 실패:', error)
      alert('확인에 실패했습니다.')
    }
  }

  // 선택된 날짜의 세션들
  const selectedDateSessions = selectedDate
    ? sessions.filter(s => s.date === format(selectedDate, 'yyyy-MM-dd'))
    : []

  // 확인 대기 중인 세션
  const pendingSessions = sessions.filter(s => !s.memberConfirmed)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 - 안드로이드 머티리얼 디자인 */}
      <header className="sticky top-0 z-50 bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              {/* 메인 아이콘 - 머티리얼 디자인 */}
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-2xl text-white">💪</span>
              </div>
              
              {/* 제목과 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h1 className="text-2xl font-medium text-gray-900 truncate">
                    회원 대시보드
                  </h1>
                  <div className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-md">
                    ACTIVE
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  안녕하세요, <span className="font-medium text-gray-900">{user?.name}</span>님! 오늘도 화이팅! 💪
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                  <span>{sessions.length}개의 일정</span>
                  <span>•</span>
                  <span>{sessions.filter(s => s.trainerConfirmed && s.memberConfirmed).length}개 완료</span>
                </div>
              </div>
            </div>
            
            {/* 로그아웃 버튼 - 머티리얼 디자인 */}
            <button
              onClick={logout}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors duration-200 w-full sm:w-auto"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* 왼쪽: 달력 */}
          <div className="lg:col-span-2">
            <Calendar
              sessions={sessions}
              onDateClick={setSelectedDate}
              selectedDate={selectedDate}
            />
          </div>

          {/* 오른쪽: 사이드바 */}
          <div className="space-y-6">
            {/* 담당 트레이너 정보 */}
            <div className="backdrop-blur-xl bg-white/80 rounded-3xl shadow-2xl p-6 border border-gray-200/50 card-hover">
              <h2 className="text-xl font-bold text-gray-900 mb-4">담당 트레이너</h2>
              {trainer ? (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">👨‍🏫</span>
                    <div className="font-medium text-gray-900 text-lg">{trainer.name}</div>
                  </div>
                  <div className="text-sm text-gray-600">{trainer.email}</div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  트레이너 정보를 불러올 수 없습니다.
                </p>
              )}
            </div>

            {/* 확인 대기 중인 일정 */}
            {pendingSessions.length > 0 && (
              <div className="backdrop-blur-xl bg-white/80 rounded-3xl shadow-2xl p-6 border border-gray-200/50 card-hover">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  확인 대기 일정
                  <span className="ml-2 text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    {pendingSessions.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {pendingSessions.map(session => (
                    <div
                      key={session.id}
                      className="border-2 border-green-300 bg-green-50 rounded-lg p-4"
                    >
                      <div className="font-medium text-gray-900 mb-2">
                        {format(new Date(session.date), 'M월 d일')}
                        <span className="ml-2 text-blue-600 font-semibold">
                          🕐 {session.startTime}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        트레이너: {session.trainerName}
                      </div>
                      <button
                        onClick={() => handleConfirmSession(session.id)}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-2xl text-sm font-semibold hover:shadow-lg transition-all duration-200 active:scale-95 shadow-md"
                      >
                        ✓ 확인하기
                      </button>
                      
                      {/* 확인 대기 중에도 공개 코멘트 표시 */}
                      <div className="mt-3 pt-3 border-t border-yellow-200">
                        <CommentSection
                          sessionId={session.id}
                          trainerId={trainer?.id || 0}
                          role="member"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 선택한 날짜의 세션 */}
            {selectedDate && selectedDateSessions.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {format(selectedDate, 'M월 d일')} 일정
                </h2>
                <div className="space-y-3">
                  {selectedDateSessions.map(session => (
                    <div
                      key={session.id}
                      className={`rounded-lg p-4 ${
                        session.trainerConfirmed && session.memberConfirmed
                          ? 'border-2 border-green-300 bg-green-50'
                          : 'border-2 border-yellow-300 bg-yellow-50'
                      }`}
                    >
                      <div className="font-medium text-gray-900 mb-3 flex items-center justify-between">
                        <div>
                          <div>PT 세션</div>
                          <div className="text-sm text-blue-600 font-semibold mt-1">
                            🕐 {session.startTime}
                          </div>
                        </div>
                        {session.trainerConfirmed && session.memberConfirmed && (
                          <span className="text-green-700 text-sm font-bold">✓ 완료</span>
                        )}
                      </div>
                      <div className="space-y-2 text-sm mb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${
                              session.trainerConfirmed ? 'bg-green-500' : 'bg-gray-300'
                            }`}></span>
                            <span className="text-gray-700 font-medium">트레이너 확인</span>
                          </div>
                          {session.trainerConfirmed ? (
                            <span className="text-green-600 text-xs">✓ 완료</span>
                          ) : (
                            <span className="text-gray-500 text-xs">대기중</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${
                              session.memberConfirmed ? 'bg-green-500' : 'bg-gray-300'
                            }`}></span>
                            <span className="text-gray-700 font-medium">내 확인</span>
                          </div>
                          {session.memberConfirmed ? (
                            <span className="text-green-600 text-xs">✓ 완료</span>
                          ) : (
                            <span className="text-yellow-600 text-xs">⏳ 확인 필요</span>
                          )}
                        </div>
                      </div>
                      {!session.memberConfirmed && (
                        <button
                          onClick={() => handleConfirmSession(session.id)}
                          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3.5 rounded-2xl text-sm font-semibold hover:shadow-xl transition-all duration-200 active:scale-95 shadow-lg"
                        >
                          ✓ 내가 확인하기
                        </button>
                      )}
                      {session.trainerConfirmed && session.memberConfirmed && (
                        <div className="text-center text-sm text-green-700 bg-green-100 py-2 rounded-lg font-medium">
                          ✓ 양측 모두 확인 완료!
                        </div>
                      )}
                      
                      {/* 코멘트 섹션 (공개 코멘트만 표시) */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <CommentSection
                          sessionId={session.id}
                          trainerId={trainer?.id || 0}
                          role="member"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 통계 */}
            <div className="backdrop-blur-xl bg-white/80 rounded-3xl shadow-2xl p-6 border border-gray-200/50 card-hover">
              <h2 className="text-xl font-bold text-gray-900 mb-4">PT 통계</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">총 세션</span>
                  <span className="font-bold text-gray-900 text-lg">{sessions.length}회</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-gray-600">확인 완료</span>
                  <span className="font-bold text-green-700 text-lg">
                    {sessions.filter(s => s.trainerConfirmed && s.memberConfirmed).length}회
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                  <span className="text-gray-600">확인 대기</span>
                  <span className="font-bold text-yellow-700 text-lg">
                    {pendingSessions.length}회
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MemberDashboard

