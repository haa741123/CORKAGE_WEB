$(document).ready(async function () {
    try {
        // Flask에서 인기 맛집 리스트 가져오기
        const popularResponse = await $.ajax({
            url: '/api/v1/main_page',
            type: 'POST',
            data: { type: 'popular' }, // 인기 맛집 리스트를 구분하기 위한 파라미터
            dataType: 'json'
        });

        const popularRestaurants = popularResponse.data;
        const popularList = $('.popular-restaurants:first .restaurant-list');
        popularList.empty();

        popularRestaurants.forEach(restaurant => {
            let tagsArray = [];
            if (restaurant.tags) {
                const formattedTags = restaurant.tags
                    .replace(/^{/, '[')
                    .replace(/}$/, ']')
                    .replace(/\\/g, '');

                try {
                    tagsArray = JSON.parse(formattedTags);
                } catch (e) {
                    console.error('tags를 파싱하는 중 오류 발생:', e.message);
                }
            }

            const tagsHtml = tagsArray
                .map(tag => `<span class="tag red">${tag}</span>`)
                .join('');

            const item = `
                <div class="restaurant-item">
                    <img src="${restaurant.image_url || '/static/img/res_sample_img.jpg'}" alt="${restaurant.name}">
                    <p class="restaurant-name">${restaurant.name}</p>
                    <div class="restaurant-tags">${tagsHtml}</div>
                </div>
            `;
            popularList.append(item);
        });
    } catch (error) {
        console.error('인기 맛집 데이터를 가져오는 중 오류 발생:', error.message);
    }

    try {
        // Flask에서 유저들의 BEST픽 가져오기
        const bestResponse = await $.ajax({
            url: '/api/v1/main_page',
            type: 'POST',
            data: { type: 'best' }, // 유저들의 BEST픽을 구분하기 위한 파라미터
            dataType: 'json'
        });

        const bestRestaurants = bestResponse.data;
        const bestList = $('.popular-restaurants:last .restaurant-list');
        bestList.empty();

        bestRestaurants.forEach(restaurant => {
            let tagsArray = [];
            if (restaurant.tags) {
                const formattedTags = restaurant.tags
                    .replace(/^{/, '[')
                    .replace(/}$/, ']')
                    .replace(/\\/g, '');

                try {
                    tagsArray = JSON.parse(formattedTags);
                } catch (e) {
                    console.error('tags를 파싱하는 중 오류 발생:', e.message);
                }
            }

            const tagsHtml = tagsArray
                .map(tag => `<span class="tag red">${tag}</span>`)
                .join('');

            const item = `
                <div class="restaurant-item">
                    <img src="${restaurant.image_url || '/static/img/res_sample_img.jpg'}" alt="${restaurant.name}">
                    <p class="restaurant-name">${restaurant.name}</p>
                    <div class="restaurant-tags">${tagsHtml}</div>
                </div>
            `;
            bestList.append(item);
        });
    } catch (bestError) {
        console.error('유저 추천 음식점을 가져오는 중 오류 발생:', bestError.message);
    }
});








// 와인 추천 API 호출 함수
const fetchRec = async (action, uid) => {
    try {
        const res = await $.ajax({
            url: '/api/v1/recommendations',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ message: action, user_id: uid })
        });
        return res;
    } catch (err) {
        console.error('API 호출 실패:', err);
        throw new Error('와인 추천 정보를 불러오는데 문제가 발생했습니다.');
    }
};

// 추천된 와인 정보를 업데이트하는 함수
const updateWineInfo = (data) => {
    r = data.response;
    $('#drink_name').text(r.drink_name);
    $('#drink_desc').text(r.drink_desc);
    // $('#wine_rating').html(`⭐ <strong>${r.rating}</strong>`);
    $('#wine-image').attr('src', r.image_url);
};

// 추천된 와인 정보를 가져와서 UI 업데이트
const loadRec = async (action, uid) => {
    try {
        const data = await fetchRec(action, uid);
        updateWineInfo(data);
    } catch (err) {
        console.error(err.message);
        alert(err.message);
    }
};

// 쿠키에서 특정 값을 가져오는 함수
const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    return parts.length === 2 ? parts.pop().split(';').shift() : null;
};

$(document).ready(() => {
    const action = 'rec_wine_list';
    const uid = getCookie('user_id');
    if (uid) {
        loadRec(action, uid);
    } else {
        console.error("user_id 쿠키가 존재하지 않습니다.");
    }
});


