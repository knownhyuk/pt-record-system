import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { PTSession } from '../types'

interface CalendarProps {
  sessions: PTSession[]
  onDateClick: (date: Date) => void
  selectedDate?: Date | null
}

function Calendar({ sessions, onDateClick, selectedDate }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // 현재 달의 시작일과 종료일
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  
  // 달력에 표시할 전체 날짜 범위 (주 단위로 맞추기)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  
  // 표시할 모든 날짜
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // 이전 달로 이동
  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  // 다음 달로 이동
  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  // 특정 날짜의 세션 정보 가져오기
  const getSessionsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return sessions.filter(session => session.date === dateStr)
  }

  // 세션 상태에 따른 스타일 결정
  const getSessionStatus = (dateSessions: PTSession[]) => {
    if (dateSessions.length === 0) return null
    
    // 모두 확인된 세션
    const allConfirmed = dateSessions.every(s => s.trainerConfirmed && s.memberConfirmed)
    if (allConfirmed) return 'confirmed'
    
    // 확인 대기 중인 세션
    const hasPending = dateSessions.some(s => !s.trainerConfirmed || !s.memberConfirmed)
    if (hasPending) return 'pending'
    
    return null
  }

  return (
    <div className="backdrop-blur-xl bg-white/80 rounded-3xl shadow-2xl p-6 border border-gray-200/50 card-hover">
      {/* 달력 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={prevMonth}
          className="p-3 hover:bg-gray-100 rounded-full transition-all duration-200 active:scale-90 focus:outline-none focus:bg-gray-200"
          aria-label="이전 달"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          {format(currentMonth, 'yyyy년 M월', { locale: ko })}
        </h2>
        
        <button
          onClick={nextMonth}
          className="p-3 hover:bg-gray-100 rounded-full transition-all duration-200 active:scale-90 focus:outline-none focus:bg-gray-200"
          aria-label="다음 달"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
        {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
          <div
            key={day}
            className={`text-center text-sm font-semibold py-2 ${
              idx === 0 ? 'text-red-600' : idx === 6 ? 'text-blue-600' : 'text-gray-700'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isSelected = selectedDate && isSameDay(day, selectedDate)
          const dateSessions = getSessionsForDate(day)
          const sessionStatus = getSessionStatus(dateSessions)
          const isToday = isSameDay(day, new Date())
          
          return (
            <button
              key={day.toString()}
              onClick={() => onDateClick(day)}
              className={`
                relative p-1 sm:p-2 rounded-2xl transition-all duration-200 min-h-[80px] sm:min-h-[100px] flex flex-col items-start
                ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-900'}
                ${isSelected ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg scale-105' : 'hover:bg-gray-100/80 active:scale-95'}
                ${isToday && !isSelected ? 'bg-blue-100 font-bold ring-2 ring-blue-300' : ''}
              `}
            >
              {/* 날짜 숫자 */}
              <div className={`text-sm sm:text-base font-semibold mb-1 ${isSelected ? 'text-white' : ''}`}>
                {format(day, 'd')}
              </div>
              
              {/* 세션 정보 표시 (회원명 + 시간) */}
              {dateSessions.length > 0 && (
                <div className="w-full space-y-0.5 mt-2">
                  {dateSessions.slice(0, 3).map((session, idx) => (
                    <div
                      key={session.id}
                      className={`text-xs px-1 py-0.5 rounded truncate ${
                        isSelected 
                          ? 'bg-white/20 text-white' 
                          : sessionStatus === 'confirmed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                      title={`${session.memberName} - ${session.startTime}`}
                    >
                      <div className="truncate text-center">{session.memberName}</div>
                      <div className="font-semibold text-center">{session.startTime}</div>
                    </div>
                  ))}
                  {dateSessions.length > 3 && (
                    <div className={`text-xs text-center ${isSelected ? 'text-white' : 'text-gray-600'}`}>
                      +{dateSessions.length - 3}
                    </div>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* 범례 */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-gray-600">확인 완료</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span className="text-gray-600">확인 대기</span>
        </div>
      </div>
    </div>
  )
}

export default Calendar

