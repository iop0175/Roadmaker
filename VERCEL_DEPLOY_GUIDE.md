# Vercel 배포 가이드

1. [Vercel](https://vercel.com/)에 로그인하거나 회원가입합니다.
2. "New Project"를 클릭하고, GitHub 저장소를 import합니다.
3. 프로젝트 설정에서 프레임워크를 "Vite"로 자동 인식합니다.
4. 빌드 명령어: `vite build` (자동 설정됨)
5. 출력 디렉토리: `dist` (자동 설정됨)
6. 환경변수가 필요하다면 "Environment Variables"에 추가합니다.
7. "Deploy"를 클릭하면 배포가 시작됩니다.
8. 배포가 완료되면, 제공된 URL로 접속해 결과를 확인합니다.

## 로컬에서 직접 배포 명령어 실행

1. Vercel CLI 설치 (최초 1회)
   ```sh
   npm install -g vercel
   ```
2. 프로젝트 루트에서 아래 명령어 실행
   ```sh
   vercel
   ```
   또는
   ```sh
   vercel --prod
   ```
3. 안내에 따라 설정을 완료하면 배포 URL이 생성됩니다.

---

- 자세한 내용은 [Vercel 공식 문서](https://vercel.com/docs)를 참고하세요.
