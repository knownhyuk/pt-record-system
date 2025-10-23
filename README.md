# PT 기록 시스템

트레이너와 회원 간의 PT(Personal Training) 수행 날짜를 기록하고 관리하는 웹 애플리케이션입니다.

## 주요 기능

### 📅 달력 기반 일정 관리
- 월별 달력 뷰로 PT 일정을 한눈에 확인
- 특정 날짜 클릭으로 상세 정보 조회
- 일정 상태별 시각적 표시 (확인 완료/대기)

### 👥 트레이너 기능
- 회원 초대 코드 생성 및 공유
- 담당 회원 목록 관리
- PT 일정 생성 및 제안
- PT 수행 확인

### 🏃 회원 기능
- 초대 코드를 통한 간편 가입
- 담당 트레이너 정보 확인
- PT 일정 확인 및 동의
- PT 수행 통계 확인

### ✅ 상호 동의 시스템
- 트레이너와 회원 양측의 확인이 필요
- 양측이 모두 확인해야 일정이 최종 확정
- 확인 상태 실시간 업데이트

### 📱 반응형 디자인
- 데스크톱, 태블릿, 모바일 모든 기기 지원
- 모던하고 깔끔한 UI/UX
- TailwindCSS 기반 스타일링

## 기술 스택

### Frontend
- **React 18** - UI 라이브러리
- **TypeScript** - 타입 안정성
- **Vite** - 빠른 개발 환경
- **TailwindCSS** - 유틸리티 기반 스타일링
- **React Router** - 클라이언트 사이드 라우팅
- **Axios** - HTTP 클라이언트
- **date-fns** - 날짜 처리

### Backend
- **Node.js** - 런타임 환경
- **Express** - 웹 프레임워크
- **SQLite** - 경량 데이터베이스
- **better-sqlite3** - SQLite 드라이버
- **bcrypt** - 비밀번호 암호화
- **nanoid** - 고유 ID 생성

## 설치 및 실행

### 1. 의존성 설치

프로젝트 루트 디렉토리에서 다음 명령어를 실행하여 모든 의존성을 설치합니다:

```bash
npm run install:all
```

이 명령어는 루트, 클라이언트, 서버의 모든 패키지를 자동으로 설치합니다.

또는 각각 수동으로 설치할 수 있습니다:

```bash
# 루트 디렉토리 패키지 설치
npm install

# 클라이언트 패키지 설치
cd client
npm install

# 서버 패키지 설치
cd ../server
npm install
```

### 2. 개발 서버 실행

프로젝트 루트 디렉토리에서:

```bash
npm run dev
```

이 명령어는 프론트엔드와 백엔드를 동시에 실행합니다.

- 프론트엔드: http://localhost:5173
- 백엔드: http://localhost:3000

### 3. 개별 실행 (선택사항)

필요시 프론트엔드와 백엔드를 각각 실행할 수 있습니다:

```bash
# 프론트엔드만 실행
npm run dev:client

# 백엔드만 실행
npm run dev:server
```

## 사용 방법

### 트레이너 사용 가이드

1. **회원가입**
   - 회원가입 페이지에서 "트레이너" 선택
   - 이름, 이메일, 비밀번호 입력

2. **회원 초대**
   - 대시보드에서 "초대하기" 버튼 클릭
   - 생성된 초대 코드 또는 링크를 회원에게 전달

3. **PT 일정 등록**
   - 달력에서 날짜 선택
   - 회원 선택
   - "일정 추가하기" 버튼 클릭

4. **PT 확인**
   - 달력에서 해당 날짜 선택
   - 세션 목록에서 "확인하기" 버튼 클릭

### 회원 사용 가이드

1. **회원가입**
   - 트레이너로부터 받은 초대 링크 클릭 또는
   - 회원가입 페이지에서 초대 코드 입력

2. **PT 일정 확인**
   - 대시보드에서 확인 대기 중인 일정 확인
   - "확인하기" 버튼으로 일정 승인

3. **통계 확인**
   - 총 PT 세션 수
   - 확인 완료된 세션 수
   - 확인 대기 중인 세션 수

## 데이터베이스 스키마

### users (사용자)
- id: 사용자 고유 ID
- name: 이름
- email: 이메일 (고유)
- password: 암호화된 비밀번호
- role: 역할 (trainer/member)
- trainer_id: 담당 트레이너 ID (회원인 경우)
- created_at: 생성 시간

### invite_codes (초대 코드)
- id: 초대 코드 ID
- code: 초대 코드 (고유, 8자리)
- trainer_id: 트레이너 ID
- expires_at: 만료 시간
- used: 사용 여부
- created_at: 생성 시간

### pt_sessions (PT 세션)
- id: 세션 ID
- trainer_id: 트레이너 ID
- member_id: 회원 ID
- date: 날짜 (YYYY-MM-DD)
- trainer_confirmed: 트레이너 확인 여부
- member_confirmed: 회원 확인 여부
- confirmed_at: 최종 확인 시간
- created_at: 생성 시간

## API 엔드포인트

### 인증
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인

### 트레이너
- `POST /api/trainer/invite` - 초대 코드 생성
- `GET /api/trainer/:trainerId/members` - 회원 목록 조회
- `GET /api/trainer/:trainerId/sessions` - PT 세션 조회

### 회원
- `GET /api/member/:memberId/trainer` - 담당 트레이너 조회
- `GET /api/member/:memberId/sessions` - PT 세션 조회

### PT 세션
- `POST /api/pt-sessions` - PT 세션 생성
- `POST /api/pt-sessions/:sessionId/confirm-trainer` - 트레이너 확인
- `POST /api/pt-sessions/:sessionId/confirm-member` - 회원 확인

## 프로젝트 구조

```
pt-record-system/
├── client/                 # 프론트엔드
│   ├── src/
│   │   ├── components/    # 재사용 가능한 컴포넌트
│   │   ├── contexts/      # React Context
│   │   ├── pages/         # 페이지 컴포넌트
│   │   ├── types/         # TypeScript 타입 정의
│   │   ├── api/           # API 통신 로직
│   │   ├── App.tsx        # 메인 앱 컴포넌트
│   │   └── main.tsx       # 엔트리 포인트
│   ├── public/            # 정적 파일
│   └── package.json
├── server/                # 백엔드
│   ├── server.js          # Express 서버
│   ├── database.db        # SQLite 데이터베이스
│   └── package.json
├── package.json           # 루트 패키지 설정
└── README.md             # 프로젝트 문서

```

## 보안 고려사항

- 비밀번호는 bcrypt를 사용하여 해시화
- 초대 코드는 7일 후 자동 만료
- 한 번 사용된 초대 코드는 재사용 불가
- 사용자 인증 상태 로컬 스토리지 관리

## 향후 개선 계획

- [ ] JWT 기반 인증 시스템 도입
- [ ] 실시간 알림 기능 (WebSocket)
- [ ] PT 메모 및 피드백 기능
- [ ] 월별/연도별 통계 차트
- [ ] 이메일 알림 기능
- [ ] PWA (Progressive Web App) 지원
- [ ] 다크 모드 지원

## 라이선스

MIT

## 문의

문제가 발생하거나 질문이 있으시면 이슈를 등록해주세요.

