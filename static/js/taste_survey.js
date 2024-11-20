// 슬라이더의 스크롤 위치에 따라 인디케이터 업데이트
const slider = document.getElementById('slider');
const dots = document.querySelectorAll('.dot');
const nextButton = document.getElementById('next-btn');
let isScrolling = false;

// 선택된 옵션 버튼을 저장할 배열
const selectedOptions = [];

// SweetAlert2 경고 메시지 함수
const showAlert = (icon, title, text) => {
    Swal.fire({ icon, title, text });
};

// 최적화된 슬라이더 스크롤 인디케이터 업데이트
let debounceTimeout; // 디바운스 타임아웃 변수
let previousIndex = 0; // 이전 인덱스 저장 변수
const sliderWidth = slider.clientWidth; // 슬라이더 너비 캐싱

// 옵션 버튼 요소들을 캐싱
const buttons = document.querySelectorAll('.option-button');

// 슬라이더 스크롤 이벤트 핸들러
const onScroll = () => {
    const scrollPosition = slider.scrollLeft; // 현재 스크롤 위치
    const currentIndex = Math.round(scrollPosition / sliderWidth); // 현재 인덱스 계산

    // 인덱스가 변경되었을 때만 업데이트 수행
    if (currentIndex !== previousIndex) {
        // 모든 도트의 'active' 클래스 토글
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });

        // 다음 버튼의 텍스트 업데이트
        nextButton.textContent = currentIndex === dots.length - 1 ? '완료' : '다음';

        previousIndex = currentIndex; // 이전 인덱스 업데이트
    }

    isScrolling = false; // 스크롤 플래그 초기화
};

// 스크롤 이벤트에 디바운스 적용
slider.addEventListener('scroll', () => {
    if (!isScrolling) {
        window.requestAnimationFrame(onScroll);
    }
    isScrolling = true;
});

// 첫 번째 도트를 활성화 상태로 초기화
dots[0].classList.add('active');

// 옵션 버튼 클릭 시 'selected' 클래스 추가
buttons.forEach((button) => {
    button.addEventListener('click', function () {
        buttons.forEach(btn => btn.classList.remove('selected')); // 모든 버튼에서 'selected' 제거
        this.classList.add('selected'); // 클릭된 버튼에 'selected' 추가

        // 선택된 옵션 저장 (질문별로 구분)
        const questionIndex = Math.round(slider.scrollLeft / sliderWidth);
        selectedOptions[questionIndex] = this.textContent;

        // 첫 번째 질문(주류 종류) 선택 후 두 번째 질문 업데이트
        if (questionIndex === 0) {
            updateSecondScreen(selectedOptions[0]);
        }
    });
});

// 다음 버튼 클릭 시 처리 로직 추가
nextButton.addEventListener('click', function () {
    const currentIndex = Math.round(slider.scrollLeft / slider.clientWidth);

    // 옵션이 선택되지 않았을 경우 경고 메시지 출력 및 화면 이동 차단
    if (!selectedOptions[currentIndex]) {
        showAlert('warning', '선호하는\n 주류를 선택해주세요', '');
        $("html, body").removeClass("swal2-shown swal2-height-auto");   // 다른 디자인까지 영향을 미치는 현상이 있어 이건 그대로 둬야됨...
        return;
    }

    if (nextButton.textContent === '완료') {
        
        let ConnChar = '';
        if (selectedOptions[0] === "와인" || selectedOptions[0] === "칵테일") {
            ConnChar = '한'
        } else if (selectedOptions[0] === "진" || selectedOptions[0] === "위스키" || selectedOptions[0] === "보드카") {
            ConnChar = '의'
        } else if (selectedOptions[0] === "맥주") {
            ConnChar = '이 높은'
        }

        console.log(`${selectedOptions[1]}${ConnChar} ${selectedOptions[0]}`);  // 사용자 취향 기반의 주류 추천을 해주기 위해 조사 결과를 바탕으로 글을 생성함
        set_User_Taste(selectedOptions[1], ConnChar);

        if (selectedOptions[0] && selectedOptions[0].length > 0) {
            // window.location.href = `/drink_survey/${encodeURIComponent(selectedOptions[0])}`;
        } else {
            showAlert('warning', '선호하는\n 주류를 선택해주세요', '');
            $("html, body").removeClass("swal2-shown swal2-height-auto");   // 다른 디자인까지 영향을 미치는 현상이 있어 이건 그대로 둬야됨...
            return;
        }
            
    } else {
        slider.scrollBy({ left: slider.clientWidth, behavior: 'smooth' });
    }
});

// 주류 취향 업데이트
async function set_User_Taste(fav_taste, ConnChar = '') {
    console.log(fav_taste)
    try {
        const response = await fetch('/api/v1/set_user_taste', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', 
            body: JSON.stringify({ fav_taste: fav_taste })    
        });

        const result = await response.json();
        console.log('좋아하는 맛 저장 완료:', result);
        
        return result;
    } catch (error) {
        throw error;
    }
}

/** 
 * 첫 번째 질문에서 선택한 주류에 따라 두 번째 질문(당도)을 업데이트하는 함수 
 */
function updateSecondScreen(selectedDrink) {
    const secondQuestion = document.getElementById('second-question');
    const secondOptions = document.getElementById('second-options');
    
    secondQuestion.textContent = "어떤 맛을 가장 중요하게 생각하시나요?";
    
    switch (selectedDrink) {
        case '와인':
            secondOptions.innerHTML = `
                <button class="option-button">드라이</button>
                <button class="option-button">미디엄</button>
                <button class="option-button">스위트</button>
                <button class="option-button">모르겠어요</button>`;
            break;
        case '칵테일':
            secondOptions.innerHTML = `
                <button class="option-button">드라이</button>
                <button class="option-button">스위트</button>
                <button class="option-button">모르겠어요</button>`;
            break;
        case '맥주':
            secondOptions.innerHTML = `
                <button class="option-button">풍미</button>
                <button class="option-button">탄산</button>
                <button class="option-button">홉</button>
                <button class="option-button">모르겠어요</button>`;
            break;
        case '위스키':
            secondOptions.innerHTML = `
                <button class="option-button">달콤함</button>
                <button class="option-button">스모크향</button>
                <button class="option-button">매운맛</button>
                <button class="option-button">감칠맛</button>
                <button class="option-button">쓴맛</button>
                <button class="option-button">모르겠어요</button>`;
            break;
        case '보드카':
        case '진':
            secondOptions.innerHTML = `
                <button class="option-button">달콤함</button>
                <button class="option-button">스모크향</button>
                <button class="option-button">매운맛</button>
                <button class="option-button">감칠맛</button>
                <button class="option-button">쓴맛</button>
                <button class="option-button">모르겠어요</button>`;
            break;
        default:
            secondOptions.innerHTML = `
                <button class="option-button">드라이</button>
                <button class="option-button">미디엄</button>
                <button class="option-button">스위트</button>`;
    }

    // 새로 생성된 버튼에도 클릭 이벤트 리스너 추가 필요
    document.querySelectorAll('.option-button').forEach(button => {
        button.addEventListener('click', function () {
            document.querySelectorAll('.option-button').forEach(btn => btn.classList.remove('selected'));
            this.classList.add('selected');
            
            const questionIndex = Math.round(slider.scrollLeft / slider.clientWidth);
            selectedOptions[questionIndex] = this.textContent;
        });
    });
}

// document.addEventListener('touchmove', function(event) {
//     if (event.touches.length > 1 || event.scale && event.scale !== 1) {
//         event.preventDefault();
//     }
// }, { passive: false });
