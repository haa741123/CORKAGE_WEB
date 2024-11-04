// Supabase 초기화
const supabaseUrl = "https://kovzqlclzpduuxejjxwf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdnpxbGNsenBkdXV4ZWpqeHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTg1NTE4NTEsImV4cCI6MjAzNDEyNzg1MX0.A4Vn0QJMKnMe4HAZnT-aEa2r0fL4jHOpKoRHmbls8fQ";

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);    // Supabase 클라이언트 생성
const loadingIndicator = document.querySelector('.loading-indicator');
window.items = []; // 전역 데이터 저장용
let currIdx = 0;

/** 초기화 함수: 페이지의 주요 설정과 데이터를 로드합니다. */
const init = async() => {
    set_sch_input();
    const response = await fetch('/api/v1/popular_sch_terms');
    await set_Columns(response);
    await set_RankingUpdate();
    await get_PopularData(response);
    await get_RecentSearches();
    await displayPopularData();
};


/** 검색 입력 필드 설정 함수: 검색 입력 필드에 엔터 키 이벤트 리스너를 추가합니다. */
const set_sch_input = () => {
    const searchInput = document.querySelector('input[type="search"]');
    searchInput.value = "";  // 페이지 로드 시 검색 입력 필드를 초기화

    searchInput.addEventListener('keypress', event => {
        if (event.key === 'Enter') handleSearch(event);
    });
};

/** 검색 처리 함수: 사용자가 검색어 입력 후 엔터를 누르면 검색어를 인코딩하여 URL에 추가하고 페이지를 이동합니다. */
const handleSearch = (event) => {
    const term = event.target.value.trim();
    if (term) { window.location.href = `/search/${encodeURIComponent(term)}`;   }
};

/** 인기 검색어 */
const set_Columns = async (response) => {
    try {
        if (!response.ok) throw new Error('인기 검색어 데이터를 가져오는 중 오류 발생');
        
        const data = await response.json();
        window.items = data.popular_search_terms || []; // popular_search_terms 필드의 배열을 저장

        console.log(window.items);

        const leftCol = document.querySelector(".left-column");
        const rightCol = document.querySelector(".right-column");
        leftCol.innerHTML = '';
        rightCol.innerHTML = '';

        const midIndex = Math.ceil(window.items.length / 2);

        window.items.forEach((item, index) => {
            const li = document.createElement("li");
            li.innerHTML = `<span class="rank-number">${index + 1}</span> ${item.term}`;
            (index < midIndex ? leftCol : rightCol).appendChild(li);
        });
    } catch (error) {
        console.error('set_Columns 함수 오류:', error.message);
    }
};


/** 상위 랭킹 업데이트 함수: 상위 랭킹 표시를 설정하고 2.5초마다 업데이트합니다. */
const set_RankingUpdate = () => {
    console.log(window.items)
    if (window.items.length === 0) return; // 데이터가 없으면 실행 안 함
    
    setInterval(updateRanking, 2500);
    updateRanking();
};


/** 상위 랭킹 데이터를 업데이트하는 함수 */
const updateRanking = () => {
    if (window.items.length === 0) return;

    const item = window.items[currIdx];
    document.querySelector(".top_rankings").innerHTML = `<span class="rank-number">${currIdx + 1}</span> ${item.term}`;
    currIdx = (currIdx + 1) % window.items.length;
};


/** 확장 기능 토글 함수: 확장된 콘텐츠와 검색 항목의 표시 여부를 전환합니다. */
window.toggleExpand = () => {
    const expandContent = document.querySelector('.expand-content');
    const searchItem = document.querySelector('.search-item');
    const isExpanded = expandContent.style.display === 'block';
    expandContent.style.display = isExpanded ? 'none' : 'block';
    searchItem.style.display = isExpanded ? 'flex' : 'none';
};


/** 인기 검색어 데이터를 불러와 표시하는 함수 */
const get_PopularData = async (response) => {
    try {
        
        if (!response.ok) throw new Error('인기 검색어 데이터를 가져오는 중 오류 발생');
        
        const data = await response.json();
        const popularSearches = data.popular_search_terms;

        const leftCol = document.querySelector(".left-column");
        const rightCol = document.querySelector(".right-column");
        leftCol.innerHTML = '';
        rightCol.innerHTML = '';

        const midIndex = Math.ceil(popularSearches.length / 2);
        
        // 검색어 데이터를 컬럼에 추가
        popularSearches.forEach((search, index) => {
            const li = document.createElement("li");
            li.innerHTML = `<span class="rank-number">${index + 1}</span> ${search.term}`;
            (index < midIndex ? leftCol : rightCol).appendChild(li);
        });

    } catch (error) {
        console.error(error.message);
    }
};




/** 인기 맛집 데이터를 화면에 표시하는 함수 */
const displayPopularData = async () => {
    try {
        // Supabase에서 콜키지 가능한 인기 맛집 데이터를 비동기적으로 가져옵니다.
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
    }
};


/** 태그 데이터를 파싱하여 HTML로 변환하는 함수 */
const parseTags = (tags) => {
    if (!tags) return '';
    try {
        const formattedTags = JSON.parse(tags.replace(/^{/, '[').replace(/}$/, ']').replace(/\\/g, ''));
        return formattedTags.map(tag => `<span class="tag red">${tag}</span>`).join('');
    } catch (e) {
        console.error('태그 파싱 오류:', e.message);
        return '';
    }
};


/** 최근 검색어를 불러와 표시하는 함수 */
const get_RecentSearches = async () => {
    try {
        const response = await fetch('/api/v1/recent_searches', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('데이터 요청 실패');
        
        const searches = await response.json();
        const recentSearchesContainer = document.querySelector('.recent-searches');
        recentSearchesContainer.innerHTML = ''; // 기존 내용을 초기화

        // 검색어 데이터를 HTML로 추가
        searches.forEach(search => {
            const searchTag = document.createElement('div');
            searchTag.classList.add('tag');
            searchTag.innerHTML = `<span>${search.term}</span> ×`;

            // 태그 클릭 시 검색 페이지로 이동하는 이벤트 추가
            searchTag.addEventListener('click', () => {
                window.location.href = `/search/${encodeURIComponent(search.term)}`;
            });

            recentSearchesContainer.appendChild(searchTag);
        });
    } catch (error) {
        console.error('최근 검색어 데이터를 불러오는 중 오류 발생:', error.message);
    }
};


// 초기화 실행
init();
