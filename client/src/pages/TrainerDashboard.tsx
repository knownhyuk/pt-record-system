import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { trainerAPI } from '../api'
import Calendar from '../components/Calendar'
import CommentSection from '../components/CommentSection'
import type { Member, PTSession } from '../types'

function TrainerDashboard() {
  const { user, logout } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [sessions, setSessions] = useState<PTSession[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedMember, setSelectedMember] = useState<number | null>(null)
  const [selectedTime, setSelectedTime] = useState<string>('09:00') // 시작 시간 추가
  const [inviteCode, setInviteCode] = useState<string>('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showRepeatModal, setShowRepeatModal] = useState(false) // 반복 등록 모달
  const [repeatWeeks, setRepeatWeeks] = useState<number>(4) // 반복 주 수
  const [editingSession, setEditingSession] = useState<PTSession | null>(null) // 수정 중인 세션
  const [editTime, setEditTime] = useState<string>('09:00') // 수정할 시간
  const [editDate, setEditDate] = useState<string>('') // 수정할 날짜
  const [showDeleteModal, setShowDeleteModal] = useState(false) // 회원 삭제 모달
  const [memberToDelete, setMemberToDelete] = useState<{id: number, name: string} | null>(null) // 삭제할 회원
  const [deleteConfirmation, setDeleteConfirmation] = useState<string>('') // 삭제 확인 텍스트
  const [showAllSessions, setShowAllSessions] = useState(false) // 전체 일정 보기 모드

  // 데이터 로드
  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      const [membersData, sessionsData] = await Promise.all([
        trainerAPI.getMembers(user!.id),
        trainerAPI.getPTSessions(user!.id),
      ])
      setMembers(membersData)
      setSessions(sessionsData)
    } catch (error) {
      console.error('데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 초대 코드 생성
  const handleCreateInviteCode = async () => {
    try {
      const invite = await trainerAPI.createInviteCode(user!.id)
      setInviteCode(invite.code)
      setShowInviteModal(true)
    } catch (error) {
      console.error('초대 코드 생성 실패:', error)
      alert('초대 코드 생성에 실패했습니다.')
    }
  }

  // PT 세션 추가
  const handleAddSession = async () => {
    if (!selectedDate || !selectedMember) {
      alert('날짜와 회원을 선택해주세요.')
      return
    }

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      await trainerAPI.createPTSession(user!.id, selectedMember, dateStr, selectedTime)
      await loadData()
      alert('PT 일정이 추가되었습니다. 회원의 확인을 기다립니다.')
      // 같은 회원에게 계속 일정 추가할 수 있도록 회원 선택은 유지
      // setSelectedDate(null)
      // setSelectedMember(null)
    } catch (error: any) {
      console.error('PT 세션 추가 실패:', error)
      if (error.response?.data?.error) {
        alert(error.response.data.error)
      } else {
        alert('PT 일정 추가에 실패했습니다.')
      }
    }
  }

  // 반복 일정 추가
  const handleRepeatSession = async () => {
    if (!selectedDate || !selectedMember || repeatWeeks < 1) {
      alert('날짜, 회원, 반복 주 수를 확인해주세요.')
      return
    }

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const result = await trainerAPI.createRepeatPTSession(
        user!.id, 
        selectedMember, 
        dateStr, 
        selectedTime, 
        repeatWeeks
      )
      await loadData()
      setShowRepeatModal(false)
      
      if (result.failed && result.failed.length > 0) {
        alert(`${result.created.length}개의 일정이 추가되었습니다.\n\n중복으로 인해 ${result.failed.length}개 일정은 건너뛰었습니다.`)
      } else {
        alert(`${repeatWeeks}주간 반복 일정이 모두 추가되었습니다!`)
      }
    } catch (error: any) {
      console.error('반복 일정 추가 실패:', error)
      if (error.response?.data?.error) {
        alert(error.response.data.error)
      } else {
        alert('반복 일정 추가에 실패했습니다.')
      }
    }
  }

  // 트레이너 확인
  const handleConfirmSession = async (sessionId: number) => {
    try {
      await trainerAPI.confirmSession(sessionId, user!.id)
      await loadData()
      alert('PT 일정을 확인했습니다.')
    } catch (error) {
      console.error('확인 실패:', error)
      alert('확인에 실패했습니다.')
    }
  }

  // PT 세션 삭제
  const handleDeleteSession = async (sessionId: number, memberName: string) => {
    if (!confirm(`${memberName}님의 PT 일정을 취소하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
      return
    }

    try {
      await trainerAPI.deleteSession(sessionId, user!.id)
      await loadData()
      alert('PT 일정이 취소되었습니다.')
    } catch (error) {
      console.error('일정 취소 실패:', error)
      alert('일정 취소에 실패했습니다.')
    }
  }

  // 일정 수정 (시간 및 날짜 변경)
  const handleUpdateSession = async () => {
    if (!editingSession) return

    try {
      await trainerAPI.updateSession(editingSession.id, user!.id, editTime, editDate)
      await loadData()
      setEditingSession(null)
      alert('일정이 변경되었습니다.')
    } catch (error) {
      console.error('일정 수정 실패:', error)
      alert('일정 수정에 실패했습니다.')
    }
  }

  // 수정 모달 열기
  const openEditModal = (session: PTSession) => {
    setEditingSession(session)
    setEditTime(session.startTime)
    setEditDate(session.date)
  }

  // 회원 삭제 모달 열기
  const openDeleteModal = (memberId: number, memberName: string) => {
    setMemberToDelete({ id: memberId, name: memberName })
    setDeleteConfirmation('')
    setShowDeleteModal(true)
  }

  // 회원 삭제 실행
  const handleDeleteMember = async () => {
    if (!memberToDelete) return

    // 확인 텍스트가 정확한지 검증
    if (deleteConfirmation !== memberToDelete.name) {
      alert('회원 이름을 정확히 입력해주세요.')
      return
    }

    try {
      await trainerAPI.deleteMember(memberToDelete.id, user!.id)
      await loadData()
      setSelectedMember(null)
      setShowDeleteModal(false)
      setMemberToDelete(null)
      setDeleteConfirmation('')
      alert('회원이 삭제되었습니다.')
    } catch (error) {
      console.error('회원 삭제 실패:', error)
      alert('회원 삭제에 실패했습니다.')
    }
  }

  // 전체 일정 보기 토글
  const toggleAllSessions = () => {
    setShowAllSessions(!showAllSessions)
    if (!showAllSessions) {
      setSelectedMember(null) // 전체 보기일 때는 특정 회원 선택 해제
    }
  }

  // 선택된 날짜의 모든 세션 가져오기
  const getSessionsForSelectedDate = () => {
    if (!selectedDate) return []
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    return sessions.filter(session => session.date === dateStr)
  }

  // 선택된 회원의 세션들 (회원별 필터링)
  const filteredSessions = selectedMember
    ? sessions.filter(s => s.memberId === selectedMember)
    : sessions

  // 선택된 날짜의 세션들
  const selectedDateSessions = selectedDate
    ? filteredSessions.filter(s => s.date === format(selectedDate, 'yyyy-MM-dd'))
    : []

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
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-2xl text-white">💪</span>
              </div>
              
              {/* 제목과 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h1 className="text-2xl font-medium text-gray-900 truncate">
                    트레이너 대시보드
                  </h1>
                  <div className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-md">
                    PRO
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  안녕하세요, <span className="font-medium text-gray-900">{user?.name}</span>님
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                  <span>{members.length}명의 회원</span>
                  <span>•</span>
                  <span>{sessions.length}개의 일정</span>
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
            {/* 캘린더 헤더 - 선택된 회원 표시 */}
            {selectedMember && (
              <div className="backdrop-blur-xl bg-white/80 rounded-2xl shadow-lg p-4 mb-4 border border-blue-200/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">현재 보고 있는 캘린더</p>
                    <p className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {members.find(m => m.id === selectedMember)?.name}님의 일정
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedMember(null)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
                  >
                    전체 보기
                  </button>
                </div>
              </div>
            )}
            {!selectedMember && members.length > 0 && (
              <div className="backdrop-blur-xl bg-gradient-to-br from-blue-50/80 to-indigo-50/80 rounded-2xl shadow-lg p-4 mb-4 border border-blue-200/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                      <span className="text-xl">📅</span>
                    </div>
                    <div>
                      <p className="text-sm text-blue-900 font-semibold">전체 회원 일정 보기</p>
                      <p className="text-xs text-blue-700/80">회원을 선택하면 해당 회원의 일정만 볼 수 있습니다</p>
                    </div>
                  </div>
                  <button
                    onClick={toggleAllSessions}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 ${
                      showAllSessions
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-white/80 text-blue-700 hover:bg-blue-50 border border-blue-200'
                    }`}
                  >
                    {showAllSessions ? '개별 보기' : '전체 보기'}
                  </button>
                </div>
              </div>
            )}
            <Calendar
              sessions={filteredSessions}
              onDateClick={setSelectedDate}
              selectedDate={selectedDate}
            />
          </div>

          {/* 오른쪽: 사이드바 */}
          <div className="space-y-6">
            {/* 회원 관리 */}
            <div className="backdrop-blur-xl bg-white/80 rounded-3xl shadow-2xl p-6 border border-gray-200/50 card-hover">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  회원 목록
                  {members.length > 0 && (
                    <span className="ml-2 text-sm bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
                      {members.length}명
                    </span>
                  )}
                </h2>
                <button
                  onClick={handleCreateInviteCode}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full text-sm font-medium hover:shadow-lg transition-all duration-200 active:scale-95 shadow-md"
                >
                  + 초대
                </button>
              </div>
              
              {members.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  아직 회원이 없습니다.<br />
                  초대 코드를 생성하여 회원을 초대하세요.
                </p>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-3">
                    📋 회원을 선택하면 해당 회원의 일정만 표시됩니다
                  </p>
                  <div className="space-y-2">
                    {members.map(member => {
                      const memberSessionCount = sessions.filter(s => s.memberId === member.id).length
                      const confirmedCount = sessions.filter(
                        s => s.memberId === member.id && s.trainerConfirmed && s.memberConfirmed
                      ).length
                      
                      return (
                        <div
                          key={member.id}
                          className={`w-full rounded-2xl transition-all duration-200 ${
                            selectedMember === member.id
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg scale-[1.02]'
                              : 'bg-gray-50/80 hover:bg-gray-100/80 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-center justify-between p-4">
                            <button
                              onClick={() => setSelectedMember(member.id)}
                              className="flex-1 text-left"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className={`font-medium ${
                                    selectedMember === member.id ? 'text-white' : 'text-gray-900'
                                  }`}>
                                    {member.name}
                                  </div>
                                  <div className={`text-xs mt-1 ${
                                    selectedMember === member.id ? 'text-primary-100' : 'text-gray-500'
                                  }`}>
                                    PT {confirmedCount}/{memberSessionCount}회 완료
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {memberSessionCount > 0 && (
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      selectedMember === member.id 
                                        ? 'bg-white/20 text-white' 
                                        : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      {memberSessionCount}
                                    </span>
                                  )}
                                  {selectedMember === member.id && (
                                    <span className="text-white text-lg">✓</span>
                                  )}
                                </div>
                              </div>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                openDeleteModal(member.id, member.name)
                              }}
                              className={`ml-2 p-2 rounded-lg transition-colors ${
                                selectedMember === member.id
                                  ? 'hover:bg-white/20 text-white'
                                  : 'hover:bg-red-100 text-red-600'
                              }`}
                              title="회원 삭제"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {selectedMember && (
                    <button
                      onClick={() => setSelectedMember(null)}
                      className="mt-3 w-full bg-gray-100 text-gray-700 py-2 rounded-full text-sm font-medium hover:bg-gray-200 transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
                    >
                      전체 회원 일정 보기
                    </button>
                  )}
                </>
              )}
            </div>

            {/* PT 일정 추가 */}
            {selectedDate && (
              <div className="backdrop-blur-xl bg-white/80 rounded-3xl shadow-2xl p-6 border border-gray-200/50 card-hover">
                <h2 className="text-xl font-bold text-gray-900 mb-4">PT 일정 추가</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">선택한 날짜</p>
                    <p className="font-medium text-gray-900">
                      {format(selectedDate, 'yyyy년 M월 d일')}
                    </p>
                  </div>
                  
                  {selectedMember ? (
                    <>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">선택한 회원</p>
                        <p className="font-medium text-gray-900">
                          {members.find(m => m.id === selectedMember)?.name}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-600 mb-2">시작 시간</p>
                        <select
                          value={selectedTime}
                          onChange={(e) => setSelectedTime(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                        >
                          {Array.from({ length: 16 }, (_, i) => {
                            const hour = 6 + i
                            const formatTime = (h: number, m: string) => {
                              if (h < 12) return `오전 ${h}시${m === ':30' ? ' 30분' : ''}`
                              if (h === 12) return `오후 ${h}시${m === ':30' ? ' 30분' : ''}`
                              return `오후 ${h - 12}시${m === ':30' ? ' 30분' : ''}`
                            }
                            return [
                              <option key={`${hour}:00`} value={`${hour.toString().padStart(2, '0')}:00`}>
                                {formatTime(hour, ':00')}
                              </option>,
                              <option key={`${hour}:30`} value={`${hour.toString().padStart(2, '0')}:30`}>
                                {formatTime(hour, ':30')}
                              </option>
                            ]
                          }).flat()}
                        </select>
                      </div>
                      
                      <button
                        onClick={handleAddSession}
                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-2xl font-semibold hover:shadow-xl transition-all duration-200 active:scale-95 shadow-lg"
                      >
                        ✓ 일정 추가하기
                      </button>
                      
                      <button
                        onClick={() => setShowRepeatModal(true)}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 rounded-2xl font-semibold hover:shadow-xl transition-all duration-200 active:scale-95 shadow-lg"
                      >
                        🔁 반복 일정 추가하기
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedDate(null)
                          setSelectedMember(null)
                        }}
                        className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                      >
                        선택 취소
                      </button>
                    </>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                      <p className="text-yellow-800 font-medium mb-2">
                        👆 위에서 회원을 선택해주세요
                      </p>
                      <p className="text-sm text-yellow-700">
                        회원을 선택하면 일정을 추가할 수 있습니다
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 선택한 날짜의 세션 */}
            {selectedDate && (
              <div className="backdrop-blur-xl bg-white/80 rounded-3xl shadow-2xl p-6 border border-gray-200/50 card-hover">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {format(selectedDate, 'M월 d일')} 일정
                  {showAllSessions && (
                    <span className="ml-2 text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      전체 보기
                    </span>
                  )}
                </h2>
                
                {showAllSessions ? (
                  // 전체 일정 보기 모드
                  <div className="space-y-3">
                    {getSessionsForSelectedDate().length > 0 ? (
                      getSessionsForSelectedDate().map(session => (
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
                          <div>{session.memberName}</div>
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
                            <span className="text-gray-700 font-medium">회원 확인</span>
                          </div>
                          {session.memberConfirmed ? (
                            <span className="text-green-600 text-xs">✓ 완료</span>
                          ) : (
                            <span className="text-yellow-600 text-xs">⏳ 회원 확인 대기</span>
                          )}
                        </div>
                      </div>
                      {!session.trainerConfirmed && (
                        <button
                          onClick={() => handleConfirmSession(session.id)}
                          className="mt-2 w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-md"
                        >
                          내가 확인하기
                        </button>
                      )}
                      {session.trainerConfirmed && !session.memberConfirmed && (
                        <div className="mt-2 text-center text-sm text-yellow-700 bg-yellow-100 py-2 rounded-lg">
                          회원이 확인하면 최종 완료됩니다
                        </div>
                      )}
                      {session.trainerConfirmed && session.memberConfirmed && (
                        <div className="mt-2 text-center text-sm text-green-700 bg-green-100 py-2 rounded-lg font-medium">
                          ✓ 양측 모두 확인 완료!
                        </div>
                      )}
                      
                      {/* 일정 수정/취소 버튼 */}
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => openEditModal(session)}
                          className="flex-1 bg-blue-100 text-blue-700 py-2 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          일정 수정
                        </button>
                        <button
                          onClick={() => handleDeleteSession(session.id, session.memberName || '')}
                          className="flex-1 bg-red-100 text-red-700 py-2 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          일정 취소
                        </button>
                      </div>
                      
                      {/* 코멘트 섹션 */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <CommentSection
                          sessionId={session.id}
                          trainerId={user!.id}
                          role="trainer"
                        />
                      </div>
                    </div>
                  ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-2xl">📅</span>
                        </div>
                        <p className="font-medium">이 날짜에는 일정이 없습니다</p>
                        <p className="text-sm mt-1">회원을 선택하여 일정을 추가해보세요</p>
                      </div>
                    )}
                  </div>
                ) : (
                  // 개별 회원 보기 모드 (기존 로직)
                  <div className="space-y-3">
                    {selectedDateSessions.length > 0 ? (
                      selectedDateSessions.map(session => (
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
                              <div>{session.memberName}</div>
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
                                <span className="text-gray-700 font-medium">회원 확인</span>
                              </div>
                              {session.memberConfirmed ? (
                                <span className="text-green-600 text-xs">✓ 완료</span>
                              ) : (
                                <span className="text-yellow-600 text-xs">⏳ 회원 확인 대기</span>
                              )}
                            </div>
                          </div>
                          {!session.trainerConfirmed && (
                            <button
                              onClick={() => handleConfirmSession(session.id)}
                              className="mt-2 w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-md"
                            >
                              내가 확인하기
                            </button>
                          )}
                          {session.trainerConfirmed && !session.memberConfirmed && (
                            <div className="mt-2 text-center text-sm text-yellow-700 bg-yellow-100 py-2 rounded-lg">
                              회원이 확인하면 최종 완료됩니다
                            </div>
                          )}
                          {session.trainerConfirmed && session.memberConfirmed && (
                            <div className="mt-2 text-center text-sm text-green-700 bg-green-100 py-2 rounded-lg font-medium">
                              ✓ 양측 모두 확인 완료!
                            </div>
                          )}
                          
                          {/* 일정 수정/취소 버튼 */}
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => openEditModal(session)}
                              className="flex-1 bg-blue-100 text-blue-700 py-2 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors flex items-center justify-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              일정 수정
                            </button>
                            <button
                              onClick={() => handleDeleteSession(session.id, session.memberName || '')}
                              className="flex-1 bg-red-100 text-red-700 py-2 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              일정 취소
                            </button>
                          </div>
                          
                          {/* 코멘트 섹션 */}
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <CommentSection
                              sessionId={session.id}
                              trainerId={user!.id}
                              role="trainer"
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-2xl">📅</span>
                        </div>
                        <p className="font-medium">이 날짜에는 일정이 없습니다</p>
                        <p className="text-sm mt-1">회원을 선택하여 일정을 추가해보세요</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 반복 일정 모달 - Apple 스타일 */}
      {showRepeatModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="backdrop-blur-2xl bg-white/90 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-200/50 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <span className="text-2xl">🔁</span>
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                반복 일정 추가
              </h3>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 mb-6 border border-purple-200/50">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">회원:</span>
                  <span className="font-semibold text-gray-900">
                    {members.find(m => m.id === selectedMember)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">시작 날짜:</span>
                  <span className="font-semibold text-gray-900">
                    {selectedDate && format(selectedDate, 'yyyy년 M월 d일')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">시간:</span>
                  <span className="font-semibold text-gray-900">{selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">요일:</span>
                  <span className="font-semibold text-gray-900">
                    {selectedDate && format(selectedDate, 'EEEE')}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                몇 주간 반복하시겠습니까?
              </label>
              <input
                type="number"
                min="1"
                max="52"
                value={repeatWeeks}
                onChange={(e) => setRepeatWeeks(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-sm"
              />
              <p className="text-xs text-gray-500 mt-2">
                매주 {selectedDate && format(selectedDate, 'EEEE')} {selectedTime}에 총 {repeatWeeks}회 일정이 생성됩니다.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowRepeatModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-2xl font-semibold hover:bg-gray-300 transition-all duration-200 active:scale-95"
              >
                취소
              </button>
              <button
                onClick={handleRepeatSession}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 rounded-2xl font-semibold hover:shadow-xl transition-all duration-200 active:scale-95"
              >
                추가하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 일정 수정 모달 - Apple 스타일 */}
      {editingSession && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="backdrop-blur-2xl bg-white/90 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-200/50 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <span className="text-2xl">✏️</span>
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                일정 수정
              </h3>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6 border border-blue-200/50">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">회원:</span>
                  <span className="font-semibold text-gray-900">{editingSession.memberName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">현재 날짜:</span>
                  <span className="font-semibold text-gray-900">
                    {format(new Date(editingSession.date), 'yyyy년 M월 d일')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">현재 시간:</span>
                  <span className="font-semibold text-blue-600">{editingSession.startTime}</span>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                새로운 날짜 선택
              </label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm mb-4"
              />
              
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                새로운 시간 선택
              </label>
              <select
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
              >
                {Array.from({ length: 16 }, (_, i) => {
                  const hour = 6 + i
                  const formatTime = (h: number, m: string) => {
                    if (h < 12) return `오전 ${h}시${m === ':30' ? ' 30분' : ''}`
                    if (h === 12) return `오후 ${h}시${m === ':30' ? ' 30분' : ''}`
                    return `오후 ${h - 12}시${m === ':30' ? ' 30분' : ''}`
                  }
                  return [
                    <option key={`${hour}:00`} value={`${hour.toString().padStart(2, '0')}:00`}>
                      {formatTime(hour, ':00')}
                    </option>,
                    <option key={`${hour}:30`} value={`${hour.toString().padStart(2, '0')}:30`}>
                      {formatTime(hour, ':30')}
                    </option>
                  ]
                }).flat()}
              </select>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setEditingSession(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-2xl font-semibold hover:bg-gray-300 transition-all duration-200 active:scale-95"
              >
                취소
              </button>
              <button
                onClick={handleUpdateSession}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-2xl font-semibold hover:shadow-xl transition-all duration-200 active:scale-95"
              >
                수정하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 회원 삭제 확인 모달 - Apple 스타일 */}
      {showDeleteModal && memberToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="backdrop-blur-2xl bg-white/95 rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-red-200/50 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                회원 삭제 확인
              </h3>
            </div>
            
            <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6 mb-6 border border-red-200/50">
              <div className="text-center">
                <div className="text-lg font-bold text-red-900 mb-2">
                  {memberToDelete.name}님을 삭제하시겠습니까?
                </div>
                <div className="text-sm text-red-700 space-y-1">
                  <p>• 해당 회원의 모든 PT 일정이 삭제됩니다</p>
                  <p>• 관련 코멘트도 모두 삭제됩니다</p>
                  <p>• 이 작업은 되돌릴 수 없습니다</p>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                삭제를 확인하려면 회원 이름을 정확히 입력하세요:
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder={memberToDelete.name}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white shadow-sm"
              />
              <p className="text-xs text-gray-500 mt-2">
                정확히 "<span className="font-semibold text-red-600">{memberToDelete.name}</span>"를 입력해주세요
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setMemberToDelete(null)
                  setDeleteConfirmation('')
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-2xl font-semibold hover:bg-gray-300 transition-all duration-200 active:scale-95"
              >
                취소
              </button>
              <button
                onClick={handleDeleteMember}
                disabled={deleteConfirmation !== memberToDelete.name}
                className={`flex-1 py-3 rounded-2xl font-semibold transition-all duration-200 active:scale-95 ${
                  deleteConfirmation === memberToDelete.name
                    ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white hover:shadow-xl'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 초대 코드 모달 - Apple 스타일 */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="backdrop-blur-2xl bg-white/90 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-200/50 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <span className="text-2xl">🎫</span>
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                회원 초대
              </h3>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6 border border-blue-200/50">
              <p className="text-xs text-gray-600 mb-2 text-center">초대 코드</p>
              <p className="text-center text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-wider">
                {inviteCode}
              </p>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              아래 링크를 회원에게 공유하세요:
            </p>
            
            <div className="bg-gray-100 rounded-2xl p-4 mb-6 break-all text-sm font-mono text-gray-700">
              {window.location.origin}/register/{inviteCode}
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/register/${inviteCode}`)
                  alert('링크가 클립보드에 복사되었습니다!')
                }}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-2xl font-semibold hover:shadow-xl transition-all duration-200 active:scale-95 shadow-lg"
              >
                📋 링크 복사하기
              </button>
              <button
                onClick={() => setShowInviteModal(false)}
                className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-medium hover:bg-gray-200 transition-all duration-200 active:scale-95"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default TrainerDashboard

