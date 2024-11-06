// 비밀번호 해싱 함수
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 로그인 시도 횟수와 제한 시간 설정
let loginAttempts = 0;
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 30000;  // 30초 잠금

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  // 로그인 시도 횟수 확인
  if (loginAttempts >= MAX_ATTEMPTS) {
      alert("너무 많은 로그인 시도로 인해 잠시 후 다시 시도하세요.");
      return;
  }

  const loginId = document.getElementById("exampleInputEmail").value;
  const password = document.getElementById("exampleInputPassword").value;

  // 비밀번호 해싱
  const hashedPassword = await hashPassword(password);

  try {
      // 로그인 요청 전송
      const response = await fetch('/api/v1/login', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ login_id: loginId, login_passwd: hashedPassword })
      });

      const data = await response.json();

      // 서버에서 에러가 반환된 경우
      if (data.error) {
          throw new Error(data.error);
      }

      // 로그인 성공 시 사용자 정보를 sessionStorage에 저장
      sessionStorage.setItem("user", JSON.stringify(data.ownerData));
      window.location.href = "reservation_owner";
  } catch (error) {
      console.error("로그인 에러:", error.message);
      alert(`로그인 실패: ${error.message}`);
      
      // 로그인 실패 시 시도 횟수 증가
      loginAttempts += 1;

      // 최대 시도 횟수에 도달하면 잠금
      if (loginAttempts >= MAX_ATTEMPTS) {
          alert("로그인 시도가 너무 많습니다. 30초 후 다시 시도하세요.");
          setTimeout(() => {
              loginAttempts = 0;  // 잠금 해제
          }, LOCKOUT_TIME);
      }
  }
});
