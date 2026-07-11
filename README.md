# FairwayGMS — 골프장 캐디 배정 관리 시스템 (Frontend)

관리자/매니저 **PC 웹**과 캐디 **모바일 PWA**가 하나의 SPA 안에서 레이아웃·라우터·권한 가드로 분리된 Vue 3 프론트엔드입니다.

골프장 실무 경험 기반의 **1인 개발 프로젝트**로, 기능과 함께 **Vercel 자동 배포 파이프라인 구축·운영 경험**에 초점을 두었습니다.
현재도 지속적으로 화면 보완과 UI/UX 리팩토링을 진행 중입니다.

---

## 배포 링크

| 구분 | 링크 |
|---|---|
| 서비스 | https://fairway-gms-fe.vercel.app |
| API 문서 (Swagger UI) | https://fairway-gms.duckdns.org/swagger-ui.html |

## 테스트 계정

| 구분 | 이메일 | 비밀번호 |
|---|---|---|
| 관리자 | admin1234@fwgms.com | Admin123! |
| 매니저 | manager1@fwgms.com | test1234! |
| 캐디 | caddy1@fwgms.com | test1234! |

---

## 기술 스택

| 분류 | 기술 |
|---|---|
| 프레임워크 | Vue 3 (Composition API, `<script setup>`) |
| 빌드 도구 | Vite |
| 상태 관리 | Pinia |
| 라우팅 | Vue Router |
| HTTP 클라이언트 | Axios (HttpOnly 쿠키 인증, `withCredentials`) |
| 푸시 알림 | Firebase (FCM) |
| 차트 | ApexCharts + vue3-apexcharts |
| PWA | vite-plugin-pwa (workbox, standalone 설치형) |
| 배포 | Vercel — main push 시 자동 배포 |

---

## 화면 구성

3개 역할이 하나의 SPA 안에서 레이아웃과 라우터로 분리됩니다.

| 역할 | 경로 | 레이아웃 |
|---|---|---|
| 관리자 (ADMIN) / 매니저 (MANAGER) | `/admin/*` | 좌측 아코디언 사이드바 (PC) |
| 캐디 (CADDY) | `/caddy/*` | BottomNav 하단 탭 (모바일 PWA) |

- 라우터 가드가 `requiresAuth` + 역할 메타로 접근을 제어하고, 승인 대기(PENDING) 계정은 안내 페이지로 차단
- 사이드바 메뉴도 역할별로 필터링 — ADMIN 전용 카테고리는 매니저에게 숨김

---

## 핵심 구현 포인트

### 토큰을 만지지 않는 인증
- JWT는 **HttpOnly Cookie**로만 오가며 프론트는 저장/파싱하지 않음 (XSS 토큰 탈취 원천 차단)
- 401 응답 시 Refresh 재발급 → 원 요청 재시도. 재발급 중 도착한 요청은 **큐에 보관 후 일괄 재시도**로 중복 갱신 방지
- 카카오 소셜 로그인: 백엔드 리다이렉트의 `status`(login/pending/signup/error)로 콜백 페이지에서 분기

### ADMIN 골프장 컨텍스트
- ADMIN이 상단에서 골프장을 선택하면 Axios 인터셉터가 모든 요청에 `X-Selected-Golf-Course-Id` 헤더를 자동 주입
- MANAGER/CADDY는 서버가 JWT 소속 골프장으로 처리 — 프론트는 골프장 ID를 신뢰 경로로 보내지 않음

### 캐디 모바일 PWA
- standalone 설치형, 정적 자원 precache (배정·알림은 실시간성 때문에 런타임 캐싱 제외)
- FCM 백그라운드 푸시: 서비스 워커(`firebase-messaging-sw.js`)는 **빌드 시 .env 값으로 자동 생성** — 워커는 번들러를 거치지 않아 env를 못 읽는 문제를 vite 플러그인으로 해결

### 관리자 화면 공통화
- `AdminTable`(컬럼 정의+슬롯) / `AppPagination` / `StatsCards`(아이콘·진행률 통계 카드) 공용 컴포넌트
- 대시보드: 배정률 진행바 + 미배정 경고 배너 + **주간 배정 추이 차트**(최근 7일 병렬 조회) + 빠른 작업
- 전역 폴리시 시트로 전 화면의 카드 그림자/hover/정렬을 일괄 관리

---

## 실행 방법

### 사전 요구사항

- Node.js 20+
- 백엔드 로컬 실행 (기본 `http://localhost:8080`) — [fairway-gms-be](https://github.com/soyoung-v/fairway-gms-be)

### 1. 환경변수 설정

```bash
cp .env.example .env.local
```

```properties
VITE_API_BASE_URL=http://localhost:8080
# Firebase(FCM) 값은 Firebase 콘솔의 웹 앱 설정에서 복사 — 미설정 시 푸시만 비활성
```

> `VITE_*` 값은 빌드 결과물에 포함되는 클라이언트 공개 설정입니다 (비밀키 아님).

### 2. 개발 서버 / 빌드

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ + PWA 서비스워커 생성
```

---

## 배포 (Vercel)

- GitHub main 브랜치 push → Vercel 자동 빌드·배포
- 환경변수는 Vercel 대시보드에서 관리 (`VITE_API_BASE_URL=https://fairway-gms.duckdns.org` 외 Firebase 설정)
- 백엔드는 GitHub Actions → AWS ECR → EC2 자동 배포 (백엔드 README 참고)

## 관련 저장소

| 구분 | 저장소 |
|---|---|
| Backend (Spring Boot) | https://github.com/soyoung-v/fairway-gms-be |
