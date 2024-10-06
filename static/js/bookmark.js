// Supabase 설정
const supabaseUrl = 'https://kovzqlclzpduuxejjxwf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdnpxbGNsenBkdXV4ZWpqeHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTg1NTE4NTEsImV4cCI6MjAzNDEyNzg1MX0.A4Vn0QJMKnMe4HAZnT-aEa2r0fL4jHOpKoRHmbls8fQ';
const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

// 페이지네이션 설정 및 상태 관리 객체
const pagination = {
    pageSize: 10,  // 페이지 당 표시할 레스토랑 수
    currentPage: 0,  // 현재 페이지
    totalItems: 0,  // 전체 레스토랑 개수
    cache: {}  // 페이지 데이터를 캐싱할 객체
};

/**
 * Supabase에서 값이 모두 존재하는 레스토랑 수를 가져오는 함수
 */
const Restaurant_Count = async () => {
    const { data, error } = await supabase
        .rpc('get_corkage_bookmarks');  // 저장된 RPC 호출

    if (error) {
        console.error('DB 에러:', error);
        return 0;
    }

    return data.length;  // 데이터의 길이를 반환
};



/**
 * Supabase에서 현재 페이지에 해당하는 데이터를 가져오는 함수
 * 지정한 컬럼만 받아오도록 수정: name, image_url, tags, description, rating, bookmark
 * @returns {Array} 현재 페이지에 해당하는 레스토랑 리스트
 */
const fetchPagedRestaurants = async (end_limit, start) => {
    const { data, error } = await supabase
        .rpc('fetch_paged_restaurants', { end_limit, start });

    if (error) {
        console.error('DB 에러:', error);
        return [];
    }

    return data;
};



/**
 * 북마크를 취소하고 레스토랑 목록에서 제거하는 함수
 * @param {number} id 레스토랑 id
 */
const removeBookmark = async (id) => {
    if (!id) {
        console.error('Invalid restaurant id:', id);
        return;
    }

    Swal.fire({
        title: '북마크를 취소하시겠습니까?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '네',
        cancelButtonText: '아니요',
        customClass: {
            confirmButton: 'swal2-confirm-btn',
            cancelButton: 'swal2-cancel-btn'
        },
        buttonsStyling: false
    }).then(async (result) => {
        if (result.isConfirmed) {
            // 북마크 상태를 false로 업데이트
            const { error } = await supabase
                .from('bookmark')  // bookmark 테이블을 업데이트
                .update({ status: false })  // status 컬럼을 false로 변경
                .eq('restaurant_id', id);

            if (error) {
                console.error('DB 에러:', error);
                return;
            }

            // 북마크 제거 후 현재 페이지 데이터 다시 가져오기
            const currentPage = pagination.currentPage;  // 현재 페이지 값 저장
            pagination.totalItems = await Restaurant_Count();  // 전체 북마크 개수 다시 카운트

            // 총 북마크 개수가 줄었으므로 마지막 페이지에서 데이터를 확인
            const totalPages = Math.ceil(pagination.totalItems / pagination.pageSize);
            if (currentPage > totalPages - 1) {
                pagination.currentPage = totalPages - 1;  // 마지막 페이지로 이동
            }

            // 리스트 및 페이지네이션을 다시 렌더링
            renderList(pagination.currentPage);
            renderPagination();

            // 토스트 스타일의 알림 메시지 표시
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: '북마크가 해지되었습니다.',
                showConfirmButton: false,
                timer: 1500,  // 1.5초 후 자동으로 사라짐
                timerProgressBar: true,
                customClass: {
                    popup: 'swal2-toast'
                }
            });
        }
    });
};






/**
 * 현재 페이지에 해당하는 레스토랑 리스트를 렌더링하는 함수
 * @param {number} page 현재 페이지 번호
 */
const renderList = async (page) => {
    const list = $('#restaurant-list');
    const count = $('.count');
    const restaurants = await fetchPagedRestaurants(pagination.pageSize, page);

    count.text(pagination.totalItems); // 레스토랑 총 개수 표시
    list.empty();
    
    const fragment = $(document.createDocumentFragment());

    console.log(restaurants);

    restaurants.forEach((restaurant, index) => {

        const item = $('<div>').addClass('restaurant-item').attr('data-id', restaurant.id);  // restaurant의 id를 data-id 속성에 추가
        const row = $('<div>').addClass('row');
        const img_col = $('<div>').addClass('col-4 col-lg-3');
        const img = $('<img>')
            .attr('src', restaurant.image_url)
            .attr('alt', restaurant.name)
            .addClass('restaurant-img')
            .attr('loading', 'lazy');
        img_col.append(img);

        const text_col = $('<div>').addClass('col-8 col-lg-9');
        const name = $('<h5>').addClass('restaurant-name').text(restaurant.name);

        const bookmark_icon = $('<span>').addClass('bookmark-icon');
        const bookmark_img = $('<img>')
            .attr('src', '/static/img/Bookmark.png')
            .attr('alt', '북마크')
            .addClass('bookmark-img')
            .on('click', function () {
                const restaurantId = $(this).closest('.restaurant-item').attr('data-id');  // 클릭한 요소의 data-id 속성을 가져옴
                removeBookmark(restaurantId);  // 해당 id로 removeBookmark 호출
            });
        bookmark_icon.append(bookmark_img);
        name.append(bookmark_icon);

        const tag_div = $('<div>').addClass('tags');

        if (typeof restaurant.tags === 'string') {
            try {
                // 잘못된 형식인 중괄호 {}를 제거하고 쉼표로 분리해서 배열로 변환
                restaurant.tags = restaurant.tags.replace(/{|}/g, '').replace(/"/g, '').split(',').map(tag => tag.trim());
            } catch (e) {
                console.error('tags 처리 오류:', e);
                restaurant.tags = []; // 오류 발생 시 빈 배열로 처리
            }
        }

        if (Array.isArray(restaurant.tags) && restaurant.tags.length > 0) {
            restaurant.tags.forEach(tag => {
                const tag_span = $('<span>')
                    .addClass('tag')
                    .addClass(tag === "콜키지 프리" ? 'red' : 'black')
                    .text(tag);
                tag_div.append(tag_span);
            });
        } else {
            const no_tag_span = $('<span>')
                .addClass('tag black')
                .text('태그 없음');
            tag_div.append(no_tag_span);
        }

        

        const description = $('<p>').addClass('description').text(`"${restaurant.description}"`);
        const rating = $('<p>').addClass('rating').text(`★ ${restaurant.rating}`);

        text_col.append(name, tag_div, description, rating);
        row.append(img_col, text_col);
        item.append(row);
        fragment.append(item);
    });

    list.append(fragment);
};



/**
 * 페이지 번호를 렌더링하는 함수
 */
const renderPagination = () => {
    const totalPages = Math.ceil(pagination.totalItems / pagination.pageSize);
    const paging_num = $('#pagination-numbers');
    
    paging_num.empty();
    const fragment = $(document.createDocumentFragment());

    for (let i = 1; i <= totalPages; i++) {
        const button = $('<button>').text(i);
        if (i === pagination.currentPage) {
            button.addClass('active');
        }
        button.on('click', () => {
            pagination.currentPage = i;
            renderList(i);
            renderPagination();
        });
        fragment.append(button);
    }

    paging_num.append(fragment);
};

/**
 * 페이지가 로드될 때 초기 렌더링을 실행하는 함수
 */
$(document).ready(async () => {
    const [totalItems] = await Promise.all([Restaurant_Count()]);
    pagination.totalItems = totalItems;
    renderList(Number(pagination.currentPage));
    renderPagination();
});
