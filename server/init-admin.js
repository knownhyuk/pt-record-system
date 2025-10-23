import bcrypt from 'bcryptjs'
import { userDB, saveDB, loadDB } from './database.js'

// 관리자 계정 초기화
async function initAdmin() {
  try {
    const db = loadDB()
    
    // 이미 admin 계정이 있는지 확인
    const existingAdmin = userDB.findByEmail('admin@pt-record.com')
    if (existingAdmin) {
      console.log('관리자 계정이 이미 존재합니다.')
      return
    }
    
    // 관리자 계정 생성
    const hashedPassword = await bcrypt.hash('admin123', 10)
    const adminUser = {
      id: 1,
      name: '관리자',
      email: 'admin@pt-record.com',
      password: hashedPassword,
      role: 'admin',
      created_at: new Date().toISOString()
    }
    
    // 사용자 ID가 1이면 기존 사용자들 ID 재할당
    if (db.users.length > 0) {
      // 기존 사용자들 ID를 2부터 시작하도록 재할당
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
    console.log('관리자 계정이 생성되었습니다.')
    console.log('이메일: admin@pt-record.com')
    console.log('비밀번호: admin123')
    
  } catch (error) {
    console.error('관리자 계정 생성 오류:', error)
  }
}

initAdmin()
