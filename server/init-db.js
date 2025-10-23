// 데이터베이스 초기화 스크립트
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DB_FILE = join(__dirname, 'database.json')

console.log('📦 데이터베이스 업데이트 중...')

if (existsSync(DB_FILE)) {
  const data = JSON.parse(readFileSync(DB_FILE, 'utf-8'))
  
  // comments 필드가 없으면 추가
  if (!data.comments) {
    data.comments = []
    console.log('✅ comments 테이블 추가됨')
  }
  
  // counters.comments가 없으면 추가
  if (!data.counters.comments) {
    data.counters.comments = 0
    console.log('✅ comments 카운터 추가됨')
  }
  
  writeFileSync(DB_FILE, JSON.stringify(data, null, 2))
  console.log('✅ 데이터베이스 업데이트 완료!')
} else {
  console.log('⚠️  데이터베이스 파일이 없습니다. 서버를 시작하면 자동으로 생성됩니다.')
}

