const REST_API_KEY = '6b5cc3ff382b0cb3ea15795729b3329f';
const REDIRECT_URI = 'http://127.0.0.1:5000/auth/kakao/callback';

document.getElementById('kakao-login-btn').addEventListener('click', function() {
    const KAKAO_AUTH_URL = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${REST_API_KEY}&redirect_uri=${REDIRECT_URI}`;
    window.location.href = KAKAO_AUTH_URL;
});

