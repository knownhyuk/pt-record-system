import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DB_FILE = join(__dirname, 'database.json')

// 데이터베이스 초기 구조
const initialDB = {
  users: [],
  invite_codes: [],
  pt_sessions: [],
  comments: [],
  counters: {
    users: 0,
    invite_codes: 0,
    pt_sessions: 0,
    comments: 0
  }
}

// 데이터베이스 읽기
export function loadDB() {
  try {
    if (!existsSync(DB_FILE)) {
      writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2))
      return initialDB
    }
    const data = readFileSync(DB_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('데이터베이스 읽기 오류:', error)
    return initialDB
  }
}

// 데이터베이스 저장
export function saveDB(db) {
  try {
    writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
  } catch (error) {
    console.error('데이터베이스 저장 오류:', error)
  }
}

// 사용자 관련 함수
export const userDB = {
  findByEmail(email) {
    const db = loadDB()
    return db.users.find(u => u.email === email)
  },

  findById(id) {
    const db = loadDB()
    return db.users.find(u => u.id === id)
  },

  create(userData) {
    const db = loadDB()
    const newUser = {
      id: ++db.counters.users,
      ...userData,
      created_at: new Date().toISOString()
    }
    db.users.push(newUser)
    saveDB(db)
    return newUser
  },

  findMembersByTrainerId(trainerId) {
    const db = loadDB()
    const users = db.users || []
    return users.filter(u => u.role === 'member' && u.trainer_id === trainerId)
  },

  findAll() {
    const db = loadDB()
    return db.users
  },

  delete(id) {
    const db = loadDB()
    db.users = db.users.filter(u => u.id !== id)
    saveDB(db)
  }
}

// 초대 코드 관련 함수
export const inviteCodeDB = {
  findByCode(code) {
    const db = loadDB()
    return db.invite_codes.find(ic => ic.code === code)
  },

  create(codeData) {
    const db = loadDB()
    const newCode = {
      id: ++db.counters.invite_codes,
      ...codeData,
      used: false,
      created_at: new Date().toISOString()
    }
    console.log('초대 코드 생성:', { codeData, newCode })
    db.invite_codes.push(newCode)
    saveDB(db)
    return newCode
  },

  markAsUsed(code) {
    const db = loadDB()
    const invite = db.invite_codes.find(ic => ic.code === code)
    if (invite) {
      invite.used = true
      saveDB(db)
    }
  },

  findAll() {
    const db = loadDB()
    return db.invite_codes || []
  }
}

// PT 세션 관련 함수
export const ptSessionDB = {
  findByTrainerId(trainerId) {
    const db = loadDB()
    const sessions = db.pt_sessions || []
    const users = db.users || []
    
    return sessions
      .filter(s => s.trainer_id === trainerId)
      .map(session => {
        const member = users.find(u => u.id === session.member_id)
        return {
          id: session.id,
          trainer_id: session.trainer_id,
          member_id: session.member_id,
          date: session.date,
          start_time: session.start_time || '09:00', // 기본값 설정
          trainer_confirmed: session.trainer_confirmed,
          member_confirmed: session.member_confirmed,
          confirmed_at: session.confirmed_at,
          created_at: session.created_at,
          memberName: member ? member.name : 'Unknown'
        }
      })
      .sort((a, b) => {
        const dateCompare = new Date(b.date) - new Date(a.date)
        if (dateCompare !== 0) return dateCompare
        // 같은 날짜면 시간순 정렬
        return (a.start_time || '').localeCompare(b.start_time || '')
      })
  },

  findByMemberId(memberId) {
    const db = loadDB()
    return db.pt_sessions
      .filter(s => s.member_id === memberId)
      .map(session => {
        const trainer = db.users.find(u => u.id === session.trainer_id)
        return {
          id: session.id,
          trainer_id: session.trainer_id,
          member_id: session.member_id,
          date: session.date,
          start_time: session.start_time || '09:00', // 기본값 설정
          trainer_confirmed: session.trainer_confirmed,
          member_confirmed: session.member_confirmed,
          confirmed_at: session.confirmed_at,
          created_at: session.created_at,
          trainerName: trainer ? trainer.name : 'Unknown'
        }
      })
      .sort((a, b) => {
        const dateCompare = new Date(b.date) - new Date(a.date)
        if (dateCompare !== 0) return dateCompare
        // 같은 날짜면 시간순 정렬
        return (a.start_time || '').localeCompare(b.start_time || '')
      })
  },

  findById(id) {
    const db = loadDB()
    return db.pt_sessions.find(s => s.id === id)
  },

  findByTrainerMemberDate(trainerId, memberId, date, startTime = null) {
    const db = loadDB()
    // startTime이 제공되면 시간까지 비교, 아니면 날짜만 비교
    if (startTime) {
      return db.pt_sessions.find(
        s => s.trainer_id === trainerId && s.member_id === memberId && s.date === date && s.start_time === startTime
      )
    }
    return db.pt_sessions.find(
      s => s.trainer_id === trainerId && s.member_id === memberId && s.date === date
    )
  },

  // 같은 트레이너의 특정 날짜/시간에 등록된 세션 찾기
  findByTrainerDateAndTime(trainerId, date, startTime) {
    const db = loadDB()
    const session = db.pt_sessions.find(
      s => s.trainer_id === trainerId && s.date === date && s.start_time === startTime
    )
    
    if (session) {
      // 회원 이름도 함께 반환
      const member = db.users.find(u => u.id === session.member_id)
      return {
        ...session,
        memberName: member ? member.name : 'Unknown'
      }
    }
    return null
  },

  create(sessionData) {
    const db = loadDB()
    const newSession = {
      id: ++db.counters.pt_sessions,
      ...sessionData,
      trainer_confirmed: sessionData.trainer_confirmed || false,
      member_confirmed: sessionData.member_confirmed || false,
      confirmed_at: null,
      created_at: new Date().toISOString()
    }
    db.pt_sessions.push(newSession)
    saveDB(db)
    return newSession
  },

  update(id, updates) {
    const db = loadDB()
    const index = db.pt_sessions.findIndex(s => s.id === id)
    if (index !== -1) {
      db.pt_sessions[index] = { ...db.pt_sessions[index], ...updates }
      
      // 양측 모두 확인했는지 체크
      const session = db.pt_sessions[index]
      if (session.trainer_confirmed && session.member_confirmed && !session.confirmed_at) {
        db.pt_sessions[index].confirmed_at = new Date().toISOString()
      }
      
      saveDB(db)
      return db.pt_sessions[index]
    }
    return null
  },

  delete(id) {
    const db = loadDB()
    const index = db.pt_sessions.findIndex(s => s.id === id)
    if (index !== -1) {
      db.pt_sessions.splice(index, 1)
      saveDB(db)
      return true
    }
    return false
  },

  findAll() {
    const db = loadDB()
    return db.pt_sessions.map(session => {
      const trainer = db.users.find(u => u.id === session.trainer_id)
      const member = db.users.find(u => u.id === session.member_id)
      return {
        ...session,
        trainerName: trainer ? trainer.name : 'Unknown',
        memberName: member ? member.name : 'Unknown'
      }
    })
  },

  deleteByUserId(userId) {
    const db = loadDB()
    db.pt_sessions = db.pt_sessions.filter(s => s.trainer_id !== userId && s.member_id !== userId)
    saveDB(db)
  }
}

// 코멘트 관련 함수
export const commentDB = {
  findBySessionId(sessionId) {
    const db = loadDB()
    return db.comments
      .filter(c => c.session_id === sessionId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  },

  findPublicBySessionId(sessionId) {
    const db = loadDB()
    return db.comments
      .filter(c => c.session_id === sessionId && c.is_public === true)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  },

  findById(id) {
    const db = loadDB()
    return db.comments.find(c => c.id === id)
  },

  create(commentData) {
    const db = loadDB()
    const newComment = {
      id: ++db.counters.comments,
      ...commentData,
      created_at: new Date().toISOString()
    }
    db.comments.push(newComment)
    saveDB(db)
    return newComment
  },

  update(id, updates) {
    const db = loadDB()
    const index = db.comments.findIndex(c => c.id === id)
    if (index !== -1) {
      db.comments[index] = { 
        ...db.comments[index], 
        ...updates,
        updated_at: new Date().toISOString()
      }
      saveDB(db)
      return db.comments[index]
    }
    return null
  },

  delete(id) {
    const db = loadDB()
    const index = db.comments.findIndex(c => c.id === id)
    if (index !== -1) {
      db.comments.splice(index, 1)
      saveDB(db)
      return true
    }
    return false
  },

  deleteBySessionId(sessionId) {
    const db = loadDB()
    const beforeCount = db.comments.length
    db.comments = db.comments.filter(c => c.session_id !== sessionId)
    const deletedCount = beforeCount - db.comments.length
    if (deletedCount > 0) {
      saveDB(db)
      console.log(`세션 ${sessionId}의 코멘트 ${deletedCount}개 삭제됨`)
    }
    return deletedCount
  },

  findAll() {
    const db = loadDB()
    return db.comments.map(comment => {
      const user = db.users.find(u => u.id === comment.user_id)
      const session = db.pt_sessions.find(s => s.id === comment.session_id)
      return {
        ...comment,
        userName: user ? user.name : 'Unknown',
        sessionDate: session ? session.date : 'Unknown'
      }
    })
  },

  deleteByUserId(userId) {
    const db = loadDB()
    db.comments = db.comments.filter(c => c.user_id !== userId)
    saveDB(db)
  }
}

// 데이터베이스 초기화
console.log('JSON 데이터베이스 초기화 완료')

