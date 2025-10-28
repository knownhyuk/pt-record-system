import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import { userDB, inviteCodeDB, ptSessionDB, commentDB, loadDB, saveDB } from './database.js'

const app = express()
const PORT = process.env.PORT || 3000

// 미들웨어 설정
app.use(cors({
  origin: ['http://localhost:5173', 'https://pt-record-system.onrender.com'],
  credentials: true
}))
app.use(express.json())

// 정적 파일 서빙 (프로덕션 빌드된 클라이언트)
const clientDistPath = process.env.NODE_ENV === 'production' 
  ? '../client/dist' 
  : '../client/dist'

console.log('정적 파일 경로:', clientDistPath)
app.use(express.static(clientDistPath))

// 데이터베이스 초기화 및 관리자 계정 확인
async function initializeDatabase() {
  try {
    const db = loadDB()
    console.log('데이터베이스 초기화 완료:', {
      users: db.users?.length || 0,
      inviteCodes: db.invite_codes?.length || 0,
      ptSessions: db.pt_sessions?.length || 0,
      comments: db.comments?.length || 0
    })

    // 관리자 계정이 없으면 생성
    const existingAdmin = userDB.findByEmail('admin@pt-record.com')
    if (!existingAdmin) {
      console.log('관리자 계정이 없습니다. 생성 중...')
      const hashedPassword = await bcrypt.hash('admin123', 10)
      const adminUser = {
        id: 1,
        name: '관리자',
        email: 'admin@pt-record.com',
        password: hashedPassword,
        role: 'admin',
        created_at: new Date().toISOString()
      }
      
      // 기존 사용자들 ID 재할당 (관리자가 ID 1을 사용하도록)
      if (db.users.length > 0) {
        db.users = db.users.map((user, index) => ({
          ...user,
          id: index + 2
        }))
        
        // 다른 테이블들의 ID도 재할당
        db.pt_sessions = db.pt_sessions.map(session => ({
          ...session,
          trainer_id: session.trainer_id === 1 ? 1 : session.trainer_id + 1,
          member_id: session.member_id === 1 ? 1 : session.member_id + 1
        }))
        
        db.comments = db.comments.map(comment => ({
          ...comment,
          user_id: comment.user_id === 1 ? 1 : comment.user_id + 1
        }))
      }
      
      // 관리자 계정을 첫 번째로 추가
      db.users.unshift(adminUser)
      db.counters.users = Math.max(db.counters.users, db.users.length)
      
      saveDB(db)
      console.log('✅ 관리자 계정이 생성되었습니다.')
      console.log('📧 이메일: admin@pt-record.com')
      console.log('🔑 비밀번호: admin123')
    } else {
      console.log('✅ 관리자 계정이 이미 존재합니다.')
    }
  } catch (error) {
    console.error('데이터베이스 초기화 실패:', error)
  }
}

// 데이터베이스 초기화 실행
await initializeDatabase()

console.log('서버 시작 준비 완료')

// ==================== 인증 API ====================

// 회원가입
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, inviteCode } = req.body

    // 필수 필드 확인
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요.' })
    }

    // 이메일 중복 확인
    const existingUser = userDB.findByEmail(email)
    if (existingUser) {
      return res.status(400).json({ error: '이미 사용 중인 이메일입니다.' })
    }

    let trainerId = null

    // 회원인 경우 초대 코드 확인
    if (role === 'member') {
      if (!inviteCode) {
        return res.status(400).json({ error: '초대 코드가 필요합니다.' })
      }

      const invite = inviteCodeDB.findByCode(inviteCode)
      console.log('초대 코드 검증:', { inviteCode, invite })
      
      if (!invite) {
        return res.status(400).json({ error: '유효하지 않은 초대 코드입니다.' })
      }

      if (invite.used) {
        return res.status(400).json({ error: '이미 사용된 초대 코드입니다.' })
      }

      const expiresAt = new Date(invite.expires_at)
      if (expiresAt < new Date()) {
        return res.status(400).json({ error: '만료된 초대 코드입니다.' })
      }

      trainerId = invite.trainer_id
      console.log('회원가입 - trainerId 설정:', { trainerId, invite })

      // 초대 코드 사용 처리
      inviteCodeDB.markAsUsed(inviteCode)
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 10)

    // 사용자 생성
    console.log('사용자 생성:', { name, email, role, trainerId })
    const user = userDB.create({
      name,
      email,
      password: hashedPassword,
      role,
      trainer_id: trainerId,
    })
    console.log('생성된 사용자:', user)

    const responseData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      trainerId: user.trainer_id,
    }
    console.log('회원가입 응답 데이터:', responseData)
    res.json(responseData)
  } catch (error) {
    console.error('회원가입 에러:', error)
    res.status(500).json({ error: '회원가입에 실패했습니다.' })
  }
})

// 로그인
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    console.log('로그인 시도:', { email })

    // 사용자 조회
    const user = userDB.findByEmail(email)
    if (!user) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' })
    }

    // 비밀번호 확인
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' })
    }

    console.log('로그인 성공:', { id: user.id, name: user.name, role: user.role, trainerId: user.trainer_id })

    // 비밀번호 제외하고 응답
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      trainerId: user.trainer_id,
    })
  } catch (error) {
    console.error('로그인 에러:', error)
    res.status(500).json({ error: '로그인에 실패했습니다.' })
  }
})

// ==================== 트레이너 API ====================

// 초대 코드 검증
app.get('/api/invite/:code', (req, res) => {
  try {
    const { code } = req.params
    console.log('초대 코드 검증 요청:', { code, url: req.url, method: req.method })

    // 데이터베이스 로드 확인
    console.log('초대 코드 검증 시작')

    const invite = inviteCodeDB.findByCode(code)
    console.log('찾은 초대 코드:', invite)
    
    if (!invite) {
      console.log('초대 코드를 찾을 수 없음:', code)
      // 모든 초대 코드 목록 출력 (디버깅용)
      const allInvites = inviteCodeDB.findAll ? inviteCodeDB.findAll() : []
      console.log('현재 모든 초대 코드:', allInvites)
      return res.status(404).json({ error: '유효하지 않은 초대 코드입니다.' })
    }

    if (invite.used) {
      console.log('이미 사용된 초대 코드:', code)
      return res.status(400).json({ error: '이미 사용된 초대 코드입니다.' })
    }

    const expiresAt = new Date(invite.expires_at)
    const now = new Date()
    console.log('만료일 확인:', { expiresAt: expiresAt.toISOString(), now: now.toISOString() })
    
    if (expiresAt < now) {
      console.log('만료된 초대 코드:', code)
      return res.status(400).json({ error: '만료된 초대 코드입니다.' })
    }

    // 트레이너 정보 조회
    const trainer = userDB.findById(invite.trainer_id)
    console.log('찾은 트레이너:', trainer)
    
    if (!trainer) {
      console.log('트레이너를 찾을 수 없음:', invite.trainer_id)
      return res.status(404).json({ error: '트레이너를 찾을 수 없습니다.' })
    }

    console.log('초대 코드 검증 성공:', { code, trainerName: trainer.name })
    res.json({
      valid: true,
      code: invite.code,
      trainerId: invite.trainer_id,
      trainerName: trainer.name,
      expiresAt: invite.expires_at,
    })
  } catch (error) {
    console.error('초대 코드 검증 에러:', error)
    console.error('에러 스택:', error.stack)
    res.status(500).json({ error: '초대 코드 검증에 실패했습니다.' })
  }
})

// 초대 코드 생성
app.post('/api/trainer/invite', (req, res) => {
  try {
    const { trainerId } = req.body
    console.log('초대 코드 생성 요청:', { trainerId, body: req.body })

    // 초대 코드 생성 (8자리)
    const code = nanoid(8)
    
    // 만료일 설정 (7일 후)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invite = inviteCodeDB.create({
      code,
      trainer_id: trainerId,
      expires_at: expiresAt.toISOString(),
    })

    res.json({
      id: invite.id,
      code: invite.code,
      trainerId: invite.trainer_id,
      expiresAt: invite.expires_at,
      used: invite.used,
      createdAt: invite.created_at,
    })
  } catch (error) {
    console.error('초대 코드 생성 에러:', error)
    res.status(500).json({ error: '초대 코드 생성에 실패했습니다.' })
  }
})

// 트레이너의 회원 목록 조회
app.get('/api/trainer/:trainerId/members', (req, res) => {
  try {
    const trainerId = parseInt(req.params.trainerId)
    console.log('회원 목록 조회 요청:', { trainerId })
    
    const members = userDB.findMembersByTrainerId(trainerId)
    console.log('조회된 회원 수:', members.length)

    const result = Array.isArray(members) ? members.map(m => ({
      id: m.id,
      name: m.name,
      email: m.email,
      trainerId: m.trainer_id,
      createdAt: m.created_at,
    })) : []

    res.json(result)
  } catch (error) {
    console.error('회원 목록 조회 에러:', error)
    res.status(500).json({ error: '회원 목록 조회에 실패했습니다.' })
  }
})

// 트레이너의 PT 세션 조회
app.get('/api/trainer/:trainerId/sessions', (req, res) => {
  try {
    const trainerId = parseInt(req.params.trainerId)
    console.log('PT 세션 조회 요청:', { trainerId })
    
    const sessions = ptSessionDB.findByTrainerId(trainerId)
    console.log('조회된 세션 수:', sessions.length)

    const result = Array.isArray(sessions) ? sessions.map(s => ({
      id: s.id,
      trainerId: s.trainer_id,
      memberId: s.member_id,
      date: s.date,
      startTime: s.start_time, // startTime 필드 추가
      trainerConfirmed: s.trainer_confirmed,
      memberConfirmed: s.member_confirmed,
      confirmedAt: s.confirmed_at,
      createdAt: s.created_at,
      memberName: s.memberName,
    })) : []

    res.json(result)
  } catch (error) {
    console.error('PT 세션 조회 에러:', error)
    res.status(500).json({ error: 'PT 세션 조회에 실패했습니다.' })
  }
})

// ==================== 회원 API ====================

// 회원의 담당 트레이너 조회
app.get('/api/member/:memberId/trainer', (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId)
    const member = userDB.findById(memberId)
    
    if (!member || !member.trainer_id) {
      return res.status(404).json({ error: '담당 트레이너를 찾을 수 없습니다.' })
    }

    const trainer = userDB.findById(member.trainer_id)
    if (!trainer) {
      return res.status(404).json({ error: '트레이너를 찾을 수 없습니다.' })
    }

    res.json({
      id: trainer.id,
      name: trainer.name,
      email: trainer.email,
      role: trainer.role,
    })
  } catch (error) {
    console.error('트레이너 조회 에러:', error)
    res.status(500).json({ error: '트레이너 조회에 실패했습니다.' })
  }
})

// 회원의 PT 세션 조회
app.get('/api/member/:memberId/sessions', (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId)
    const sessions = ptSessionDB.findByMemberId(memberId)

    res.json(sessions.map(s => ({
      id: s.id,
      trainerId: s.trainer_id,
      memberId: s.member_id,
      date: s.date,
      startTime: s.start_time,
      trainerConfirmed: s.trainer_confirmed,
      memberConfirmed: s.member_confirmed,
      confirmedAt: s.confirmed_at,
      createdAt: s.created_at,
      trainerName: s.trainerName,
    })))
  } catch (error) {
    console.error('PT 세션 조회 에러:', error)
    res.status(500).json({ error: 'PT 세션 조회에 실패했습니다.' })
  }
})

// ==================== PT 세션 API ====================

// PT 세션 생성
app.post('/api/pt-sessions', (req, res) => {
  try {
    const { trainerId, memberId, date, startTime = '09:00' } = req.body

    // 이미 같은 날짜와 시간에 같은 트레이너의 다른 세션이 있는지 확인
    const existingSession = ptSessionDB.findByTrainerDateAndTime(trainerId, date, startTime)
    if (existingSession) {
      return res.status(400).json({ 
        error: `이미 해당 날짜(${date})와 시간(${startTime})에 다른 회원의 일정이 등록되어 있습니다.`,
        conflictInfo: {
          date,
          startTime,
          existingMember: existingSession.memberName
        }
      })
    }

    // 세션 생성 (트레이너가 생성하므로 트레이너는 자동 확인)
    const session = ptSessionDB.create({
      trainer_id: trainerId,
      member_id: memberId,
      date,
      start_time: startTime,
      trainer_confirmed: true,
      member_confirmed: false,
    })

    res.json({
      id: session.id,
      trainerId: session.trainer_id,
      memberId: session.member_id,
      date: session.date,
      startTime: session.start_time,
      trainerConfirmed: session.trainer_confirmed,
      memberConfirmed: session.member_confirmed,
      confirmedAt: session.confirmed_at,
      createdAt: session.created_at,
    })
  } catch (error) {
    console.error('PT 세션 생성 에러:', error)
    res.status(500).json({ error: 'PT 세션 생성에 실패했습니다.' })
  }
})

// 반복 PT 세션 생성 (주간 반복)
app.post('/api/pt-sessions/repeat', (req, res) => {
  try {
    const { trainerId, memberId, startDate, startTime = '09:00', weeks = 4 } = req.body

    const createdSessions = []
    const failedDates = []

    // 시작 날짜부터 weeks만큼 반복
    for (let i = 0; i < weeks; i++) {
      // 날짜 계산 (7일씩 더하기)
      const date = new Date(startDate)
      date.setDate(date.getDate() + (i * 7))
      const dateStr = date.toISOString().split('T')[0]

      // 이미 같은 날짜와 시간에 같은 트레이너의 다른 세션이 있는지 확인
      const existingSession = ptSessionDB.findByTrainerDateAndTime(trainerId, dateStr, startTime)
      if (existingSession) {
        failedDates.push(dateStr)
        continue
      }

      // 세션 생성
      const session = ptSessionDB.create({
        trainer_id: trainerId,
        member_id: memberId,
        date: dateStr,
        start_time: startTime,
        trainer_confirmed: true,
        member_confirmed: false,
      })

      createdSessions.push({
        id: session.id,
        trainerId: session.trainer_id,
        memberId: session.member_id,
        date: session.date,
        startTime: session.start_time,
        trainerConfirmed: session.trainer_confirmed,
        memberConfirmed: session.member_confirmed,
        confirmedAt: session.confirmed_at,
        createdAt: session.created_at,
      })
    }

    res.json({
      success: true,
      created: createdSessions,
      failed: failedDates,
      message: `${createdSessions.length}개의 일정이 생성되었습니다.`
    })
  } catch (error) {
    console.error('반복 PT 세션 생성 에러:', error)
    res.status(500).json({ error: '반복 PT 세션 생성에 실패했습니다.' })
  }
})

// 트레이너 확인
app.post('/api/pt-sessions/:sessionId/confirm-trainer', (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId)
    const { trainerId } = req.body

    console.log('트레이너 확인 요청:', { sessionId, trainerId })

    const session = ptSessionDB.findById(sessionId)
    if (!session) {
      console.log('세션을 찾을 수 없음:', sessionId)
      return res.status(404).json({ error: '세션을 찾을 수 없습니다.' })
    }

    console.log('현재 세션 상태:', session)

    if (session.trainer_id !== trainerId) {
      return res.status(403).json({ error: '권한이 없습니다.' })
    }

    const updatedSession = ptSessionDB.update(sessionId, {
      trainer_confirmed: true,
    })

    console.log('업데이트된 세션:', updatedSession)

    res.json({
      id: updatedSession.id,
      trainerId: updatedSession.trainer_id,
      memberId: updatedSession.member_id,
      date: updatedSession.date,
      trainerConfirmed: updatedSession.trainer_confirmed,
      memberConfirmed: updatedSession.member_confirmed,
      confirmedAt: updatedSession.confirmed_at,
      createdAt: updatedSession.created_at,
    })
  } catch (error) {
    console.error('트레이너 확인 에러:', error)
    res.status(500).json({ error: '확인에 실패했습니다.' })
  }
})

// 회원 확인
app.post('/api/pt-sessions/:sessionId/confirm-member', (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId)
    const { memberId } = req.body

    console.log('회원 확인 요청:', { sessionId, memberId })

    const session = ptSessionDB.findById(sessionId)
    if (!session) {
      console.log('세션을 찾을 수 없음:', sessionId)
      return res.status(404).json({ error: '세션을 찾을 수 없습니다.' })
    }

    console.log('현재 세션 상태:', session)

    if (session.member_id !== memberId) {
      return res.status(403).json({ error: '권한이 없습니다.' })
    }

    const updatedSession = ptSessionDB.update(sessionId, {
      member_confirmed: true,
    })

    console.log('업데이트된 세션:', updatedSession)

    res.json({
      id: updatedSession.id,
      trainerId: updatedSession.trainer_id,
      memberId: updatedSession.member_id,
      date: updatedSession.date,
      trainerConfirmed: updatedSession.trainer_confirmed,
      memberConfirmed: updatedSession.member_confirmed,
      confirmedAt: updatedSession.confirmed_at,
      createdAt: updatedSession.created_at,
    })
  } catch (error) {
    console.error('회원 확인 에러:', error)
    res.status(500).json({ error: '확인에 실패했습니다.' })
  }
})

// PT 세션 삭제
// PT 세션 수정 (시간 변경)
app.put('/api/pt-sessions/:sessionId', (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId)
    const { trainerId, startTime, date } = req.body

    const session = ptSessionDB.findById(sessionId)
    if (!session) {
      return res.status(404).json({ error: '세션을 찾을 수 없습니다.' })
    }

    // 트레이너만 수정 가능
    if (session.trainer_id !== trainerId) {
      return res.status(403).json({ error: '권한이 없습니다.' })
    }

    // 날짜가 변경되는 경우 시간 중복 확인
    if (date && date !== session.date) {
      const existingSession = ptSessionDB.findByTrainerDateAndTime(trainerId, date, startTime)
      if (existingSession && existingSession.id !== sessionId) {
        return res.status(400).json({ error: '해당 날짜와 시간에 이미 다른 일정이 있습니다.' })
      }
    }

    const updateData = { start_time: startTime }
    if (date) {
      updateData.date = date
    }

    const updatedSession = ptSessionDB.update(sessionId, updateData)

    res.json({
      id: updatedSession.id,
      trainerId: updatedSession.trainer_id,
      memberId: updatedSession.member_id,
      date: updatedSession.date,
      startTime: updatedSession.start_time,
      trainerConfirmed: updatedSession.trainer_confirmed,
      memberConfirmed: updatedSession.member_confirmed,
      confirmedAt: updatedSession.confirmed_at,
      createdAt: updatedSession.created_at,
    })
  } catch (error) {
    console.error('PT 세션 수정 에러:', error)
    res.status(500).json({ error: 'PT 세션 수정에 실패했습니다.' })
  }
})

app.delete('/api/pt-sessions/:sessionId', (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId)
    const { trainerId } = req.body

    console.log('세션 삭제 요청:', { sessionId, trainerId })

    const session = ptSessionDB.findById(sessionId)
    if (!session) {
      return res.status(404).json({ error: '세션을 찾을 수 없습니다.' })
    }

    // 트레이너만 삭제 가능
    if (session.trainer_id !== trainerId) {
      return res.status(403).json({ error: '권한이 없습니다.' })
    }

    // 세션 삭제
    const deleted = ptSessionDB.delete(sessionId)
    if (deleted) {
      // 관련 코멘트도 모두 삭제
      commentDB.deleteBySessionId(sessionId)
      console.log('세션 삭제 완료:', sessionId)
      res.json({ success: true, message: 'PT 일정이 취소되었습니다.' })
    } else {
      res.status(500).json({ error: '삭제에 실패했습니다.' })
    }
  } catch (error) {
    console.error('세션 삭제 에러:', error)
    res.status(500).json({ error: 'PT 일정 취소에 실패했습니다.' })
  }
})

// 회원 삭제
app.delete('/api/members/:memberId', (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId)
    const { trainerId } = req.body

    console.log('회원 삭제 요청:', { memberId, trainerId })

    const member = userDB.findById(memberId)
    if (!member) {
      return res.status(404).json({ error: '회원을 찾을 수 없습니다.' })
    }

    // 해당 트레이너의 회원인지 확인
    if (member.trainer_id !== trainerId) {
      return res.status(403).json({ error: '권한이 없습니다.' })
    }

    // 회원의 모든 PT 세션 삭제
    const db = loadDB()
    const memberSessions = db.pt_sessions.filter(s => s.member_id === memberId)
    memberSessions.forEach(session => {
      // 세션의 코멘트도 삭제
      commentDB.deleteBySessionId(session.id)
    })
    
    // PT 세션 삭제
    db.pt_sessions = db.pt_sessions.filter(s => s.member_id !== memberId)
    
    // 회원 삭제
    const userIndex = db.users.findIndex(u => u.id === memberId)
    if (userIndex !== -1) {
      db.users.splice(userIndex, 1)
    }
    
    saveDB(db)

    res.json({ success: true, message: '회원이 삭제되었습니다.' })
  } catch (error) {
    console.error('회원 삭제 에러:', error)
    res.status(500).json({ error: '회원 삭제에 실패했습니다.' })
  }
})

// ==================== 코멘트 API ====================

// 세션의 코멘트 조회 (트레이너용 - 모든 코멘트)
app.get('/api/sessions/:sessionId/comments', (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId)
    const { role } = req.query // 'trainer' or 'member'

    let comments
    if (role === 'member') {
      // 회원은 공개 코멘트만 볼 수 있음
      comments = commentDB.findPublicBySessionId(sessionId)
    } else {
      // 트레이너는 모든 코멘트를 볼 수 있음
      comments = commentDB.findBySessionId(sessionId)
    }

    res.json(comments.map(c => ({
      id: c.id,
      sessionId: c.session_id,
      trainerId: c.trainer_id,
      content: c.content,
      isPublic: c.is_public,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    })))
  } catch (error) {
    console.error('코멘트 조회 에러:', error)
    res.status(500).json({ error: '코멘트 조회에 실패했습니다.' })
  }
})

// 코멘트 생성
app.post('/api/comments', (req, res) => {
  try {
    const { sessionId, trainerId, content, isPublic } = req.body

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: '코멘트 내용을 입력해주세요.' })
    }

    const comment = commentDB.create({
      session_id: sessionId,
      trainer_id: trainerId,
      content: content.trim(),
      is_public: isPublic,
    })

    res.json({
      id: comment.id,
      sessionId: comment.session_id,
      trainerId: comment.trainer_id,
      content: comment.content,
      isPublic: comment.is_public,
      createdAt: comment.created_at,
    })
  } catch (error) {
    console.error('코멘트 생성 에러:', error)
    res.status(500).json({ error: '코멘트 생성에 실패했습니다.' })
  }
})

// 코멘트 수정
app.put('/api/comments/:commentId', (req, res) => {
  try {
    const commentId = parseInt(req.params.commentId)
    const { content, isPublic, trainerId } = req.body

    const comment = commentDB.findById(commentId)
    if (!comment) {
      return res.status(404).json({ error: '코멘트를 찾을 수 없습니다.' })
    }

    // 본인의 코멘트만 수정 가능
    if (comment.trainer_id !== trainerId) {
      return res.status(403).json({ error: '권한이 없습니다.' })
    }

    const updatedComment = commentDB.update(commentId, {
      content: content.trim(),
      is_public: isPublic,
    })

    res.json({
      id: updatedComment.id,
      sessionId: updatedComment.session_id,
      trainerId: updatedComment.trainer_id,
      content: updatedComment.content,
      isPublic: updatedComment.is_public,
      createdAt: updatedComment.created_at,
      updatedAt: updatedComment.updated_at,
    })
  } catch (error) {
    console.error('코멘트 수정 에러:', error)
    res.status(500).json({ error: '코멘트 수정에 실패했습니다.' })
  }
})

// 코멘트 삭제
app.delete('/api/comments/:commentId', (req, res) => {
  try {
    const commentId = parseInt(req.params.commentId)
    const { trainerId } = req.body

    const comment = commentDB.findById(commentId)
    if (!comment) {
      return res.status(404).json({ error: '코멘트를 찾을 수 없습니다.' })
    }

    // 본인의 코멘트만 삭제 가능
    if (comment.trainer_id !== trainerId) {
      return res.status(403).json({ error: '권한이 없습니다.' })
    }

    commentDB.delete(commentId)
    res.json({ success: true })
  } catch (error) {
    console.error('코멘트 삭제 에러:', error)
    res.status(500).json({ error: '코멘트 삭제에 실패했습니다.' })
  }
})

// ==================== 관리자 API ====================

// 모든 사용자 조회 (관리자만)
app.get('/api/admin/users', (req, res) => {
  try {
    const { userId } = req.query
    
    // 관리자 권한 확인
    const user = userDB.findById(parseInt(userId))
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' })
    }
    
    const users = userDB.findAll()
    res.json(users)
  } catch (error) {
    console.error('사용자 조회 에러:', error)
    res.status(500).json({ error: '사용자 조회에 실패했습니다.' })
  }
})

// 모든 PT 세션 조회 (관리자만)
app.get('/api/admin/sessions', (req, res) => {
  try {
    const { userId } = req.query
    
    // 관리자 권한 확인
    const user = userDB.findById(parseInt(userId))
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' })
    }
    
    const sessions = ptSessionDB.findAll()
    res.json(sessions)
  } catch (error) {
    console.error('세션 조회 에러:', error)
    res.status(500).json({ error: '세션 조회에 실패했습니다.' })
  }
})

// 모든 코멘트 조회 (관리자만)
app.get('/api/admin/comments', (req, res) => {
  try {
    const { userId } = req.query
    
    // 관리자 권한 확인
    const user = userDB.findById(parseInt(userId))
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' })
    }
    
    const comments = commentDB.findAll()
    res.json(comments)
  } catch (error) {
    console.error('코멘트 조회 에러:', error)
    res.status(500).json({ error: '코멘트 조회에 실패했습니다.' })
  }
})

// 사용자 삭제 (관리자만)
app.delete('/api/admin/users/:userId', (req, res) => {
  try {
    const { userId } = req.params
    const { adminId } = req.body
    
    // 관리자 권한 확인
    const admin = userDB.findById(parseInt(adminId))
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' })
    }
    
    // 관리자 자신은 삭제할 수 없음
    if (parseInt(userId) === parseInt(adminId)) {
      return res.status(400).json({ error: '관리자 계정은 삭제할 수 없습니다.' })
    }
    
    // 사용자 삭제
    userDB.delete(parseInt(userId))
    
    // 관련 데이터 삭제
    ptSessionDB.deleteByUserId(parseInt(userId))
    commentDB.deleteByUserId(parseInt(userId))
    
    res.json({ success: true })
  } catch (error) {
    console.error('사용자 삭제 에러:', error)
    res.status(500).json({ error: '사용자 삭제에 실패했습니다.' })
  }
})

// PT 세션 삭제 (관리자만)
app.delete('/api/admin/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params
    const { adminId } = req.body
    
    // 관리자 권한 확인
    const admin = userDB.findById(parseInt(adminId))
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' })
    }
    
    // 세션 삭제
    ptSessionDB.delete(parseInt(sessionId))
    
    // 관련 코멘트 삭제
    commentDB.deleteBySessionId(parseInt(sessionId))
    
    res.json({ success: true })
  } catch (error) {
    console.error('세션 삭제 에러:', error)
    res.status(500).json({ error: '세션 삭제에 실패했습니다.' })
  }
})

// ==================== 관리자 API ====================

// 관리자 통계 조회
app.get('/api/admin/stats', (req, res) => {
  try {
    const db = loadDB()
    
    const stats = {
      totalUsers: db.users.length,
      totalTrainers: db.users.filter(user => user.role === 'trainer').length,
      totalMembers: db.users.filter(user => user.role === 'member').length,
      totalSessions: db.pt_sessions.length,
      pendingSessions: db.pt_sessions.filter(session => 
        !session.trainer_confirmed || !session.member_confirmed
      ).length,
      totalInviteCodes: db.invite_codes.length,
      activeInviteCodes: db.invite_codes.filter(code => 
        !code.used && new Date(code.expires_at) > new Date()
      ).length
    }
    
    res.json(stats)
  } catch (error) {
    console.error('관리자 통계 조회 오류:', error)
    res.status(500).json({ error: '통계 조회에 실패했습니다.' })
  }
})

// 전체 사용자 목록 조회
app.get('/api/admin/users', (req, res) => {
  try {
    console.log('사용자 목록 조회 요청')
    const db = loadDB()
    console.log('데이터베이스 로드 완료:', db.users ? db.users.length : 0, '명')
    
    if (!db.users) {
      return res.json([])
    }
    
    const users = db.users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      trainer_id: user.trainer_id,
      created_at: user.created_at
    }))
    
    console.log('사용자 목록 반환:', users.length, '명')
    res.json(users)
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error)
    res.status(500).json({ error: '사용자 목록 조회에 실패했습니다.', details: error.message })
  }
})

// 트레이너 목록 조회
app.get('/api/admin/trainers', (req, res) => {
  try {
    const db = loadDB()
    
    const trainers = db.users
      .filter(user => user.role === 'trainer')
      .map(trainer => {
        const memberCount = db.users.filter(user => user.trainer_id === trainer.id).length
        const sessionCount = db.pt_sessions.filter(session => session.trainer_id === trainer.id).length
        
        return {
          id: trainer.id,
          name: trainer.name,
          email: trainer.email,
          memberCount,
          sessionCount,
          created_at: trainer.created_at
        }
      })
    
    res.json(trainers)
  } catch (error) {
    console.error('트레이너 목록 조회 오류:', error)
    res.status(500).json({ error: '트레이너 목록 조회에 실패했습니다.' })
  }
})

// 회원 목록 조회
app.get('/api/admin/members', (req, res) => {
  try {
    const db = loadDB()
    
    const members = db.users
      .filter(user => user.role === 'member')
      .map(member => {
        const trainer = db.users.find(user => user.id === member.trainer_id)
        const sessionCount = db.pt_sessions.filter(session => session.member_id === member.id).length
        
        return {
          id: member.id,
          name: member.name,
          email: member.email,
          trainer: trainer ? { id: trainer.id, name: trainer.name, email: trainer.email } : null,
          sessionCount,
          created_at: member.created_at
        }
      })
    
    res.json(members)
  } catch (error) {
    console.error('회원 목록 조회 오류:', error)
    res.status(500).json({ error: '회원 목록 조회에 실패했습니다.' })
  }
})

// 최근 활동 조회
app.get('/api/admin/recent-activity', (req, res) => {
  try {
    const db = loadDB()
    
    // 최근 PT 세션들
    const recentSessions = db.pt_sessions
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)
      .map(session => {
        const trainer = db.users.find(user => user.id === session.trainer_id)
        const member = db.users.find(user => user.id === session.member_id)
        
        return {
          id: session.id,
          type: 'pt_session',
          description: `${trainer?.name || '알 수 없음'} 트레이너와 ${member?.name || '알 수 없음'} 회원의 PT 세션`,
          date: session.date,
          status: session.trainer_confirmed && session.member_confirmed ? 'confirmed' : 'pending',
          created_at: session.created_at
        }
      })
    
    // 최근 가입자들
    const recentUsers = db.users
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map(user => ({
        id: user.id,
        type: 'user_registration',
        description: `${user.name}님이 ${user.role === 'trainer' ? '트레이너' : '회원'}으로 가입했습니다.`,
        created_at: user.created_at
      }))
    
    // 최근 초대 코드 생성
    const recentInviteCodes = db.invite_codes
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map(code => {
        const trainer = db.users.find(user => user.id === code.trainer_id)
        return {
          id: code.id,
          type: 'invite_code',
          description: `${trainer?.name || '알 수 없음'} 트레이너가 초대 코드를 생성했습니다.`,
          code: code.code,
          created_at: code.created_at
        }
      })
    
    // 모든 활동을 시간순으로 정렬
    const allActivities = [...recentSessions, ...recentUsers, ...recentInviteCodes]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 20)
    
    res.json(allActivities)
  } catch (error) {
    console.error('최근 활동 조회 오류:', error)
    res.status(500).json({ error: '최근 활동 조회에 실패했습니다.' })
  }
})

// 사용자 삭제 (관리자만)
app.delete('/api/admin/users/:userId', (req, res) => {
  try {
    const { userId } = req.params
    const db = loadDB()
    
    const user = db.users.find(u => u.id === parseInt(userId))
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' })
    }
    
    // 관리자는 삭제할 수 없음
    if (user.role === 'admin') {
      return res.status(403).json({ error: '관리자 계정은 삭제할 수 없습니다.' })
    }
    
    // 관련 데이터 정리
    db.users = db.users.filter(u => u.id !== parseInt(userId))
    db.pt_sessions = db.pt_sessions.filter(session => 
      session.trainer_id !== parseInt(userId) && session.member_id !== parseInt(userId)
    )
    db.invite_codes = db.invite_codes.filter(code => code.trainer_id !== parseInt(userId))
    
    // 회원인 경우 trainer_id 정리
    db.users = db.users.map(u => 
      u.trainer_id === parseInt(userId) ? { ...u, trainer_id: null } : u
    )
    
    saveDB(db)
    
    res.json({ message: '사용자가 삭제되었습니다.' })
  } catch (error) {
    console.error('사용자 삭제 오류:', error)
    res.status(500).json({ error: '사용자 삭제에 실패했습니다.' })
  }
})

// SPA 라우팅 (모든 API 라우트 뒤에 위치)
app.get('*', async (req, res) => {
  try {
    const fs = await import('fs')
    const path = await import('path')
    const { fileURLToPath } = await import('url')
    
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const indexPath = path.join(__dirname, clientDistPath, 'index.html')
    
    console.log('SPA 라우팅 요청:', req.path)
    console.log('Index file path:', indexPath)
    console.log('Index file exists:', fs.existsSync(indexPath))
    
    if (fs.existsSync(indexPath)) {
      res.sendFile('index.html', { root: path.join(__dirname, clientDistPath) })
    } else {
      // 빌드 파일이 없을 경우 기본 HTML 응답
      res.status(200).send(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>PT Record System</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #e74c3c; }
            .info { color: #3498db; }
          </style>
        </head>
        <body>
          <h1 class="error">빌드 파일을 찾을 수 없습니다</h1>
          <p class="info">클라이언트 빌드가 완료되지 않았습니다.</p>
          <p>경로: ${indexPath}</p>
          <p>현재 디렉토리: ${__dirname}</p>
          <p>클라이언트 경로: ${clientDistPath}</p>
        </body>
        </html>
      `)
    }
  } catch (error) {
    console.error('SPA 라우팅 에러:', error)
    res.status(500).json({ error: 'SPA 라우팅에 실패했습니다.' })
  }
})

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`)
  console.log(`http://localhost:${PORT}`)
})
