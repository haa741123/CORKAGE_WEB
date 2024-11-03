// Supabase 초기화
const supabaseUrl = "https://kovzqlclzpduuxejjxwf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdnpxbGNsenBkdXV4ZWpqeHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTg1NTE4NTEsImV4cCI6MjAzNDEyNzg1MX0.A4Vn0QJMKnMe4HAZnT-aEa2r0fL4jHOpKoRHmbls8fQ";
// Supabase 클라이언트 생성
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", async () => {

    // 아이템 리스트
    const items = [
        "이삭토스트", "메가커피", "써브웨이", "한솥도시락", "빽다방",
        "파리바게뜨", "브런치", "샌드위치", "컴포즈커피", "본죽"
    ];

    // 요소 선택
    const leftColumn = document.querySelector(".left-column");
    const rightColumn = document.querySelector(".right-column");
    const topRankingsDiv = document.querySelector(".top-rankings");
    const searchItem = document.querySelector('.search-item');
    const expandContent = document.querySelector('.expand-content');
    const loadingIndicator = document.querySelector('.loading-indicator'); // 로딩 인디케이터

    let currentIndex = 0; // 현재 인덱스 초기화
    const midIndex = Math.ceil(items.length / 2); // 중간 인덱스 계산

    // 왼쪽과 오른쪽 컬럼 초기화
    items.forEach((item, index) => {
        const li = document.createElement("li");
        li.innerHTML = `<span class="rank-number">${index + 1}</span> ${item}`;
        (index < midIndex ? leftColumn : rightColumn).appendChild(li);
    });

    // 상위 랭킹 데이터를 업데이트하는 함수
    const updateTopRanking = () => {
        const itemText = items[currentIndex];
        topRankingsDiv.innerHTML = `<span class="rank-number">${currentIndex + 1}</span> ${itemText}`;
        currentIndex = (currentIndex + 1) % items.length;
    };

    // 2.5초마다 상위 랭킹 데이터 업데이트
    setInterval(updateTopRanking, 2500);
    updateTopRanking();

    // 확장 기능 토글 함수
    window.toggleExpand = () => {
        const isExpanded = expandContent.style.display === 'block';
        expandContent.style.display = isExpanded ? 'none' : 'block';
        searchItem.style.display = isExpanded ? 'flex' : 'none';
    };



    try {
        loadingIndicator.style.display = 'block'; // 로딩 인디케이터 활성화

        // Supabase에서 콜키지 가능한 인기 맛집 데이터를 가져옵니다.
        const { data: popularRestaurants, error: popularError } = await supabase
            .from('corkage')
            .select('rating, id, coordinates, phone, address, category_name, image_url, description, tags, name')
            .order('rating', { ascending: false })
            .limit(10);

        if (popularError) throw popularError; // 에러 발생 시 예외를 던집니다.

        // 인기 맛집 리스트를 표시할 요소 선택 및 초기화
        const popularList = document.querySelector('.restaurant-grid');
        popularList.innerHTML = ''; // 기존 내용을 초기화합니다.

        // 가져온 맛집 데이터를 반복하여 화면에 추가합니다.
        popularRestaurants.forEach(restaurant => {
            // 태그 데이터를 배열로 변환합니다.
            let tagsArray = [];
            if (restaurant.tags) {
                const formattedTags = restaurant.tags
                    .replace(/^{/, '[')    // 중괄호를 대괄호로 변환
                    .replace(/}$/, ']')    // 닫는 중괄호를 대괄호로 변환
                    .replace(/\\/g, '');   // 모든 백슬래시 제거

                try {
                    tagsArray = JSON.parse(formattedTags); // 태그를 JSON 배열로 파싱합니다.
                } catch (e) {
                    console.error('태그 파싱 오류:', e.message); // 파싱 오류 발생 시 로그 출력
                }
            }

            // 태그를 HTML로 변환합니다.
            const tagsHtml = tagsArray
                .map(tag => `<span class="tag red">${tag}</span>`)
                .join('');

            // 맛집 카드 HTML 생성
            const item = `
                <article class="restaurant-card">
                    <img src="${restaurant.image_url || '/static/img/res_sample_img.jpg'}" alt="${restaurant.name}">
                    <div class="restaurant-info">
                        <h3>${restaurant.name}</h3>
                        <div class="rating">★ ${restaurant.rating}</div>
                        <div class="restaurant-tags">${tagsHtml}</div>
                        <p>${restaurant.description || '설명이 없습니다.'}</p>
                    </div>
                </article>
            `;
            popularList.insertAdjacentHTML('beforeend', item); // HTML 요소를 리스트에 추가
        });
    } catch (error) {
        console.error('인기 맛집 데이터 가져오기 오류:', error.message); // 오류 발생 시 로그 출력
    } finally {
        loadingIndicator.style.display = 'none'; // 로딩 인디케이터 숨기기
    }

    
});
