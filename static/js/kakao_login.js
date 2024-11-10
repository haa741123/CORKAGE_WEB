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
