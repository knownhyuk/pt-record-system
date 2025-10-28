import pkg from 'pg'
const { Pool } = pkg
import bcrypt from 'bcryptjs'

// PostgreSQL 연결 풀 생성
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

// 데이터베이스 초기화
export async function initDatabase() {
  try {
    // 테이블 생성
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'trainer', 'member')),
        trainer_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS invite_codes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        trainer_id INTEGER NOT NULL REFERENCES users(id),
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pt_sessions (
        id SERIAL PRIMARY KEY,
        trainer_id INTEGER NOT NULL REFERENCES users(id),
        member_id INTEGER NOT NULL REFERENCES users(id),
        date DATE NOT NULL,
        start_time VARCHAR(10) NOT NULL,
        end_time VARCHAR(10) NOT NULL,
        trainer_confirmed BOOLEAN DEFAULT FALSE,
        member_confirmed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES pt_sessions(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        is_public BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 관리자 계정 확인 및 생성
    const adminResult = await pool.query('SELECT * FROM users WHERE email = $1', ['admin@pt-record.com'])
    
    if (adminResult.rows.length === 0) {
      console.log('관리자 계정이 없습니다. 생성 중...')
      const hashedPassword = await bcrypt.hash('admin123', 10)
      
      await pool.query(`
        INSERT INTO users (name, email, password, role, created_at)
        VALUES ($1, $2, $3, $4, $5)
      `, ['관리자', 'admin@pt-record.com', hashedPassword, 'admin', new Date().toISOString()])
      
      console.log('✅ 관리자 계정이 생성되었습니다.')
      console.log('📧 이메일: admin@pt-record.com')
      console.log('🔑 비밀번호: admin123')
    } else {
      console.log('✅ 관리자 계정이 이미 존재합니다.')
    }

    console.log('데이터베이스 초기화 완료')
  } catch (error) {
    console.error('데이터베이스 초기화 오류:', error)
    throw error
  }
}

// 사용자 관련 함수들
export const userDB = {
  async findByEmail(email) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    return result.rows[0] || null
  },

  async findById(id) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id])
    return result.rows[0] || null
  },

  async create(userData) {
    const { name, email, password, role, trainerId } = userData
    const hashedPassword = await bcrypt.hash(password, 10)
    
    const result = await pool.query(`
      INSERT INTO users (name, email, password, role, trainer_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, email, hashedPassword, role, trainerId, new Date().toISOString()])
    
    return result.rows[0]
  },

  async getAll() {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC')
    return result.rows
  },

  async getByRole(role) {
    const result = await pool.query('SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC', [role])
    return result.rows
  },

  async delete(id) {
    await pool.query('DELETE FROM users WHERE id = $1', [id])
  }
}

// 초대 코드 관련 함수들
export const inviteCodeDB = {
  async create(codeData) {
    const { code, trainerId, expiresAt } = codeData
    const result = await pool.query(`
      INSERT INTO invite_codes (code, trainer_id, expires_at, created_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [code, trainerId, expiresAt, new Date().toISOString()])
    
    return result.rows[0]
  },

  async findByCode(code) {
    const result = await pool.query('SELECT * FROM invite_codes WHERE code = $1', [code])
    return result.rows[0] || null
  },

  async markAsUsed(code) {
    await pool.query('UPDATE invite_codes SET used = TRUE WHERE code = $1', [code])
  },

  async getByTrainerId(trainerId) {
    const result = await pool.query('SELECT * FROM invite_codes WHERE trainer_id = $1 ORDER BY created_at DESC', [trainerId])
    return result.rows
  }
}

// PT 세션 관련 함수들
export const sessionDB = {
  async create(sessionData) {
    const { trainerId, memberId, date, startTime, endTime } = sessionData
    const result = await pool.query(`
      INSERT INTO pt_sessions (trainer_id, member_id, date, start_time, end_time, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [trainerId, memberId, date, startTime, endTime, new Date().toISOString()])
    
    return result.rows[0]
  },

  async getByTrainerId(trainerId) {
    const result = await pool.query(`
      SELECT s.*, 
             t.name as trainer_name,
             m.name as member_name
      FROM pt_sessions s
      JOIN users t ON s.trainer_id = t.id
      JOIN users m ON s.member_id = m.id
      WHERE s.trainer_id = $1
      ORDER BY s.date DESC, s.start_time DESC
    `, [trainerId])
    
    return result.rows
  },

  async getByMemberId(memberId) {
    const result = await pool.query(`
      SELECT s.*, 
             t.name as trainer_name,
             m.name as member_name
      FROM pt_sessions s
      JOIN users t ON s.trainer_id = t.id
      JOIN users m ON s.member_id = m.id
      WHERE s.member_id = $1
      ORDER BY s.date DESC, s.start_time DESC
    `, [memberId])
    
    return result.rows
  },

  async updateConfirmation(sessionId, type, confirmed) {
    const field = type === 'trainer' ? 'trainer_confirmed' : 'member_confirmed'
    await pool.query(`UPDATE pt_sessions SET ${field} = $1 WHERE id = $2`, [confirmed, sessionId])
  },

  async findById(id) {
    const result = await pool.query(`
      SELECT s.*, 
             t.name as trainer_name,
             m.name as member_name
      FROM pt_sessions s
      JOIN users t ON s.trainer_id = t.id
      JOIN users m ON s.member_id = m.id
      WHERE s.id = $1
    `, [id])
    
    return result.rows[0] || null
  },

  async findByTrainerDateAndTime(trainerId, date, startTime) {
    const result = await pool.query(`
      SELECT * FROM pt_sessions 
      WHERE trainer_id = $1 AND date = $2 AND start_time = $3
    `, [trainerId, date, startTime])
    
    return result.rows[0] || null
  },

  async update(id, updateData) {
    const { trainerId, memberId, date, startTime, endTime, trainerConfirmed, memberConfirmed } = updateData
    
    const setClause = []
    const values = []
    let paramCount = 1
    
    if (trainerId !== undefined) {
      setClause.push(`trainer_id = $${paramCount++}`)
      values.push(trainerId)
    }
    if (memberId !== undefined) {
      setClause.push(`member_id = $${paramCount++}`)
      values.push(memberId)
    }
    if (date !== undefined) {
      setClause.push(`date = $${paramCount++}`)
      values.push(date)
    }
    if (startTime !== undefined) {
      setClause.push(`start_time = $${paramCount++}`)
      values.push(startTime)
    }
    if (endTime !== undefined) {
      setClause.push(`end_time = $${paramCount++}`)
      values.push(endTime)
    }
    if (trainerConfirmed !== undefined) {
      setClause.push(`trainer_confirmed = $${paramCount++}`)
      values.push(trainerConfirmed)
    }
    if (memberConfirmed !== undefined) {
      setClause.push(`member_confirmed = $${paramCount++}`)
      values.push(memberConfirmed)
    }
    
    values.push(id)
    
    const result = await pool.query(`
      UPDATE pt_sessions 
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values)
    
    return result.rows[0]
  },

  async findAll() {
    const result = await pool.query(`
      SELECT s.*, 
             t.name as trainer_name,
             m.name as member_name
      FROM pt_sessions s
      JOIN users t ON s.trainer_id = t.id
      JOIN users m ON s.member_id = m.id
      ORDER BY s.date DESC, s.start_time DESC
    `)
    
    return result.rows
  },

  async deleteByUserId(userId) {
    await pool.query('DELETE FROM pt_sessions WHERE trainer_id = $1 OR member_id = $1', [userId])
  },

  async delete(id) {
    await pool.query('DELETE FROM pt_sessions WHERE id = $1', [id])
  }
}

// 댓글 관련 함수들
export const commentDB = {
  async create(commentData) {
    const { sessionId, userId, content, isPublic } = commentData
    const result = await pool.query(`
      INSERT INTO comments (session_id, user_id, content, is_public, created_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [sessionId, userId, content, isPublic, new Date().toISOString()])
    
    return result.rows[0]
  },

  async getBySessionId(sessionId) {
    const result = await pool.query(`
      SELECT c.*, u.name as user_name, u.role as user_role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.session_id = $1
      ORDER BY c.created_at ASC
    `, [sessionId])
    
    return result.rows
  },

  async delete(id) {
    await pool.query('DELETE FROM comments WHERE id = $1', [id])
  }
}

export default pool
