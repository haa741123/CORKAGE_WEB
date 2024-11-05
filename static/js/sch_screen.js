let items = [];
let currIdx = 0;

/** 인기 맛집 데이터 가져오기 및 표시 */
const fetchPopularRestaurants = async () => {
    try {
        // Flask API로 요청 전송
        const response = await fetch('/api/v1/popular_restaurants', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ limit: 10 })  // 제한 개수 설정
        });

        const data = await response.json();

        // 오류가 있을 경우 처리
        if (data.error) {
            throw new Error(data.error);
        }

        const popularRestaurants = data.restaurants || [];
        const popularList = document.querySelector('.restaurant-grid');
        
        // 데이터 표시
        popularList.innerHTML = popularRestaurants.map(restaurant => `
            <article class="restaurant-card">
                <img src="${restaurant.image_url || '/static/img/res_sample_img.jpg'}" alt="${restaurant.name}" loading="lazy">
                <div class="restaurant-info">
                    <h3>${restaurant.name}</h3>
                    <div class="rating">★ ${restaurant.rating}</div>
                    <div class="restaurant-tags">${parseTags(restaurant.tags)}</div>
                    <p>${restaurant.description || '설명이 없습니다.'}</p>
                </div>
            </article>
        `).join('');
    } catch (error) {
        console.error('인기 맛집 데이터 가져오기 오류:', error.message);
    }
};






/** 초기화 함수: 페이지의 주요 설정과 데이터를 로드합니다. */
const init = async () => {
    set_sch_input();
    await Promise.all([
        fetchPopularSearchTerms(),
        fetchRecentSearches(),
        fetchPopularRestaurants()
    ]);
    set_RankingUpdate();
};

/** 검색 입력 필드 설정 함수 */
const set_sch_input = () => {
    const searchInput = document.querySelector('input[type="search"]');
    searchInput.value = "";
    searchInput.addEventListener('keypress', event => {
        if (event.key === 'Enter') handleSearch(event);
    });
};

/** 검색 처리 함수 */
const handleSearch = (event) => {
    const term = event.target.value.trim();
    if (term) {
        window.location.href = `/search/${encodeURIComponent(term)}`;
    }
};

/** 인기 검색어 데이터 가져오기 */
const fetchPopularSearchTerms = async () => {
    try {
        const response = await fetch('/api/v1/popular_sch_terms');
        if (!response.ok) throw new Error('인기 검색어 데이터를 가져오는 중 오류 발생');
        const data = await response.json();
        items = data.popular_search_terms || [];
        displayPopularSearchTerms();
    } catch (error) {
        console.error('인기 검색어 데이터 가져오기 오류:', error.message);
    }
};

/** 인기 검색어 표시 */
const displayPopularSearchTerms = () => {
    const leftCol = document.querySelector(".left-column");
    const rightCol = document.querySelector(".right-column");
    leftCol.innerHTML = '';
    rightCol.innerHTML = '';

    const midIndex = Math.ceil(items.length / 2);
    items.forEach((item, index) => {
        const li = document.createElement("li");
        li.innerHTML = `<span class="rank-number">${index + 1}</span> ${item.term}`;
        (index < midIndex ? leftCol : rightCol).appendChild(li);
    });
};

/** 상위 랭킹 업데이트 함수 */
const set_RankingUpdate = () => {
    if (items.length === 0) return;
    setInterval(updateRanking, 2500);
    updateRanking();
};

/** 상위 랭킹 데이터 업데이트 */
const updateRanking = () => {
    if (items.length === 0) return;
    const item = items[currIdx];
    document.querySelector(".top_rankings").innerHTML = `<span class="rank-number">${currIdx + 1}</span> ${item.term}`;
    currIdx = (currIdx + 1) % items.length;
};

/** 확장 기능 토글 함수 */
window.toggleExpand = () => {
    const expandContent = document.querySelector('.expand-content');
    const searchItem = document.querySelector('.search-item');
    const isExpanded = expandContent.style.display === 'block';
    expandContent.style.display = isExpanded ? 'none' : 'block';
    searchItem.style.display = isExpanded ? 'flex' : 'none';
};


/** 태그 데이터 파싱 */
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

/** 최근 검색어 가져오기 및 표시 */
const fetchRecentSearches = async () => {
    try {
        const response = await fetch('/api/v1/recent_searches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) throw new Error('데이터 요청 실패');
        
        const searches = await response.json();
        const recentSearchesContainer = document.querySelector('.recent-searches');
        recentSearchesContainer.innerHTML = searches.map(search => `
            <div class="tag" onclick="window.location.href='/search/${encodeURIComponent(search.term)}'">
                <span>${search.term}</span> ×
            </div>
        `).join('');
    } catch (error) {
        console.error('최근 검색어 데이터를 불러오는 중 오류 발생:', error.message);
    }
};

// 초기화 실행
document.addEventListener('DOMContentLoaded', init);