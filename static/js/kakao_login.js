const slider = document.getElementById('slider');
const dots = document.querySelectorAll('.dot');
let isScrolling = false;

// 슬라이더가 스크롤 될 때마다 인디케이터 업데이트
slider.addEventListener('scroll', function() {
    if (!isScrolling) {
        window.requestAnimationFrame(() => {
            const scrollPosition = slider.scrollLeft;
            const sliderWidth = slider.clientWidth;
            const currentIndex = Math.round(scrollPosition / sliderWidth);

            dots.forEach((dot, index) => {
                if (index === currentIndex) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });

            isScrolling = false;
        });
    }
    isScrolling = true;
});

// 첫 번째 인디케이터 활성화
dots[0].classList.add('active');






const REST_API_KEY = '6b5cc3ff382b0cb3ea15795729b3329f';

// 테스트 환경
// const REDIRECT_URI = 'http://127.0.0.1:5000/auth/kakao/callback';

// 기본 도메인에 맞춰 REDIRECT_URI 설정
const REDIRECT_URI = `${window.location.origin}/auth/kakao/callback`;

document.getElementById('kakao-login-btn').addEventListener('click', function() {
    const KAKAO_AUTH_URL = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${REST_API_KEY}&redirect_uri=${REDIRECT_URI}`;
    window.location.href = KAKAO_AUTH_URL;
});
