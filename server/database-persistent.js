import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Render의 Persistent Disk 경로 사용
const PERSISTENT_DIR = process.env.NODE_ENV === 'production' 
  ? '/opt/render/project/persistent' 
  : __dirname

// 디렉토리가 없으면 생성
if (!existsSync(PERSISTENT_DIR)) {
  mkdirSync(PERSISTENT_DIR, { recursive: true })
}

const DB_FILE = join(PERSISTENT_DIR, 'database.json')

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
      console.log('새로운 데이터베이스 파일 생성:', DB_FILE)
      return initialDB
    }
    const data = readFileSync(DB_FILE, 'utf-8')
    const db = JSON.parse(data)
    console.log('데이터베이스 로드 완료:', {
      users: db.users?.length || 0,
      inviteCodes: db.invite_codes?.length || 0,
      ptSessions: db.pt_sessions?.length || 0,
      comments: db.comments?.length || 0
    })
    return db
  } catch (error) {
    console.error('데이터베이스 읽기 오류:', error)
    return initialDB
  }
}

// 데이터베이스 저장
export function saveDB(db) {
  try {
    writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
    console.log('데이터베이스 저장 완료:', DB_FILE)
  } catch (error) {
    console.error('데이터베이스 저장 오류:', error)
  }
}

// 사용자 관련 함수들
export const userDB = {
  findByEmail(email) {
    const db = loadDB()
    return db.users.find(user => user.email === email) || null
  },

  findById(id) {
    const db = loadDB()
    return db.users.find(user => user.id === id) || null
  },

  create(userData) {
    const db = loadDB()
    const newId = ++db.counters.users
    const newUser = {
      id: newId,
      ...userData,
      created_at: new Date().toISOString()
    }
    db.users.push(newUser)
    saveDB(db)
    return newUser
  },

  getAll() {
    const db = loadDB()
    return db.users
  },

  getByRole(role) {
    const db = loadDB()
    return db.users.filter(user => user.role === role)
  },

  delete(id) {
    const db = loadDB()
    db.users = db.users.filter(user => user.id !== id)
    saveDB(db)
  }
}

// 초대 코드 관련 함수들
export const inviteCodeDB = {
  create(codeData) {
    const db = loadDB()
    const newId = ++db.counters.invite_codes
    const newCode = {
      id: newId,
      ...codeData,
      used: false,
      created_at: new Date().toISOString()
    }
    db.invite_codes.push(newCode)
    saveDB(db)
    return newCode
  },

  findByCode(code) {
    const db = loadDB()
    return db.invite_codes.find(invite => invite.code === code) || null
  },

  markAsUsed(code) {
    const db = loadDB()
    const invite = db.invite_codes.find(invite => invite.code === code)
    if (invite) {
      invite.used = true
      saveDB(db)
    }
  },

  getByTrainerId(trainerId) {
    const db = loadDB()
    return db.invite_codes.filter(invite => invite.trainer_id === trainerId)
  }
}

// PT 세션 관련 함수들
export const ptSessionDB = {
  create(sessionData) {
    const db = loadDB()
    const newId = ++db.counters.pt_sessions
    const newSession = {
      id: newId,
      ...sessionData,
      trainer_confirmed: false,
      member_confirmed: false,
      created_at: new Date().toISOString()
    }
    db.pt_sessions.push(newSession)
    saveDB(db)
    return newSession
  },

  findByTrainerId(trainerId) {
    const db = loadDB()
    return db.pt_sessions.filter(session => session.trainer_id === trainerId)
  },

  findByMemberId(memberId) {
    const db = loadDB()
    return db.pt_sessions.filter(session => session.member_id === memberId)
  },

  findById(id) {
    const db = loadDB()
    return db.pt_sessions.find(session => session.id === id) || null
  },

  findByTrainerDateAndTime(trainerId, date, startTime) {
    const db = loadDB()
    return db.pt_sessions.find(session => 
      session.trainer_id === trainerId && 
      session.date === date && 
      session.start_time === startTime
    ) || null
  },

  update(id, updateData) {
    const db = loadDB()
    const sessionIndex = db.pt_sessions.findIndex(session => session.id === id)
    if (sessionIndex !== -1) {
      db.pt_sessions[sessionIndex] = { ...db.pt_sessions[sessionIndex], ...updateData }
      saveDB(db)
      return db.pt_sessions[sessionIndex]
    }
    return null
  },

  updateConfirmation(sessionId, type, confirmed) {
    const db = loadDB()
    const session = db.pt_sessions.find(s => s.id === sessionId)
    if (session) {
      if (type === 'trainer') {
        session.trainer_confirmed = confirmed
      } else {
        session.member_confirmed = confirmed
      }
      saveDB(db)
    }
  },

  findAll() {
    const db = loadDB()
    return db.pt_sessions
  },

  deleteByUserId(userId) {
    const db = loadDB()
    db.pt_sessions = db.pt_sessions.filter(session => 
      session.trainer_id !== userId && session.member_id !== userId
    )
    saveDB(db)
  },

  delete(id) {
    const db = loadDB()
    db.pt_sessions = db.pt_sessions.filter(session => session.id !== id)
    saveDB(db)
  }
}

// 댓글 관련 함수들
export const commentDB = {
  create(commentData) {
    const db = loadDB()
    const newId = ++db.counters.comments
    const newComment = {
      id: newId,
      ...commentData,
      created_at: new Date().toISOString()
    }
    db.comments.push(newComment)
    saveDB(db)
    return newComment
  },

  getBySessionId(sessionId) {
    const db = loadDB()
    return db.comments.filter(comment => comment.session_id === sessionId)
  },

  delete(id) {
    const db = loadDB()
    db.comments = db.comments.filter(comment => comment.id !== id)
    saveDB(db)
  }
}
