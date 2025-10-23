import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDB } from './database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 데이터베이스 초기화
initDB()
console.log('JSON 데이터베이스 초기화 완료')

const app = express()
const PORT = process.env.PORT || 3000

// CORS 설정
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}))

// JSON 파싱 미들웨어
app.use(express.json())

// 정적 파일 서빙 (프로덕션 빌드된 클라이언트)
app.use(express.static(path.join(__dirname, '../client/dist')))

// API 라우트들 (기존 server.js의 모든 라우트들)
// 여기에 기존 server.js의 모든 라우트를 복사해야 합니다

// 모든 라우트를 클라이언트로 리다이렉트 (SPA 라우팅)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'))
})

app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`)
  console.log(`http://localhost:${PORT}`)
})
