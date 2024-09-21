// 지도를 초기화하는 함수, 위치 모달이 표시될 때 호출됩니다.
const initializeMap = function() {
    /**
     * 특정 위치에 중심을 둔 Kakao 지도를 초기화하고 마커를 설정합니다.
     */
    const mapOptions = {
        center: new kakao.maps.LatLng(37.5665, 126.9780),
        level: 3
    };
    const map = new kakao.maps.Map(document.getElementById('map'), mapOptions);

    const marker = new kakao.maps.Marker({
        position: mapOptions.center
    });
    marker.setMap(map);

    map.relayout();
    map.setCenter(mapOptions.center);
};

// 주어진 주소로 Kakao 지도를 리다이렉트하는 함수
const redirectToKakaoMap = function(address) {
    /**
     * 주어진 주소를 가지고 Kakao 지도 검색 페이지로 브라우저를 리다이렉트합니다.
     * @param {string} address - Kakao 지도에서 검색할 주소.
     */
    const webUrl = 'https://map.kakao.com/link/search/' + encodeURIComponent(address);
    window.location.href = webUrl;
};

// 이벤트 리스너를 초기화하는 함수
const initializeEventListeners = function() {
    /**
     * 모달이 표시될 때 지도를 초기화하고, 위치 버튼 클릭 시 지도 페이지로 리다이렉트합니다.
     */
    $('#locationModal').on('shown.bs.modal', initializeMap);

    document.querySelector('.custom-map-button').addEventListener('click', handleMapButtonClick);

    $('.tab-button').on('click', handleTabButtonClick);
};

// 위치 버튼 클릭 이벤트 핸들러
const handleMapButtonClick = function() {
    /**
     * 위치 버튼 클릭 시 주소를 가져와서 Kakao 지도 페이지로 리다이렉트합니다.
     */
    const address = document.getElementById('modalAddress').textContent;
    redirectToKakaoMap(address);
};

/**
 * 탭 버튼을 클릭했을 때 활성 탭을 전환합니다.
 */
const handleTabButtonClick = function() {
    
    $('.tab-button').removeClass('active');
    $('.tab-content').removeClass('active');
    $(this).addClass('active');
    const target = $(this).data('target');
    $(target).addClass('active');
};

/**
 * 슬라이더 기능을 초기화하고 터치 이벤트를 설정합니다.
 */
const initializeSlider = function() {

    let startX = 0;
    let currentTranslate = 0;
    let prevTranslate = 0;
    let currentIndex = 0;
    const slides = document.querySelectorAll('.slide');
    const slider = document.getElementById('slider');

    slider.addEventListener('touchstart', function(event) {
        startX = event.touches[0].clientX;
        prevTranslate = currentTranslate;
    });

    slider.addEventListener('touchmove', function(event) {
        const currentX = event.touches[0].clientX;
        const deltaX = currentX - startX;
        currentTranslate = prevTranslate + deltaX;
        slider.style.transform = `translateX(${currentTranslate}px)`;
    });

    slider.addEventListener('touchend', function() {
        const movedBy = currentTranslate - prevTranslate;

        if (movedBy < -100 && currentIndex < slides.length - 1) currentIndex += 1;
        if (movedBy > 100 && currentIndex > 0) currentIndex -= 1;

        setPositionByIndex();
    });

    const setPositionByIndex = function() {
        currentTranslate = currentIndex * -window.innerWidth;
        slider.style.transform = `translateX(${currentTranslate}px)`;
    };
};

// // 요소의 스크롤바를 확인하고 로그를 출력하는 함수
// const checkScrollbars = function() {
//     /**
//      * 각 요소에 대해 수평 또는 수직 스크롤바가 있는지 확인하고 콘솔에 출력합니다.
//      */
//     document.querySelectorAll('*').forEach(el => {
//         const hasHorizontalScrollbar = el.scrollWidth > el.clientWidth;
//         const hasVerticalScrollbar = el.scrollHeight > el.clientHeight;
//         if (hasHorizontalScrollbar || hasVerticalScrollbar) {
//             console.log(`Element ${el.tagName}.${el.className} has a scrollbar`);
//         }
//     });
// };

$(document).ready(function() {
    initializeEventListeners(); // Initialize all event listeners
    initializeSlider(); // Initialize slider functionality

    // 캘린더 모달이 표시될 때 다시 초기화
    $('#calendarModal').on('shown.bs.modal', function () {
        initializeCustomCalendar(); // 여기서 캘린더 로직을 초기화
    });

    // 예약 확인 처리
    $('.submit').on('click', function() {
        const selectedDate = $(".month-year").text(); // 선택된 날짜 가져오기
        const selectedPeople = $("#people").val(); // 선택된 인원 가져오기
        alert(`예약이 확인되었습니다. 날짜: ${selectedDate}, 인원: ${selectedPeople}`);
        $('#calendarModal').modal('hide'); // 모달 숨기기
    });

});


// 달력을 초기화하는 함수
function initializeCustomCalendar() {
    // 달력 및 시간 선택 초기화 로직을 여기에 추가
    // 예: 현재 달력을 현재 날짜로 초기화하거나 이전/다음 달 버튼 기능 추가
    // 필요한 경우 기존 calendar.js 파일을 통해 초기화할 수 있음
    // 달력 및 시간 선택 초기화 코드를 작성하십시오.
}
