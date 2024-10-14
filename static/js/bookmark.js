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

    restaurants.forEach((restaurant) => {
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
                const restaurantId = $(this).closest('.restaurant-item').attr('data-id');
                removeBookmark(restaurantId);
            });
        bookmark_icon.append(bookmark_img);
        name.append(bookmark_icon);
    
        const tag_div = $('<div>').addClass('tags');
        // 태그 처리 로직 생략...
    
        const description = $('<p>').addClass('description').text(`"${restaurant.description}"`);
        const rating = $('<p>').addClass('rating').text(`★ ${restaurant.rating}`);
    
        // row 구성
        text_col.append(name, tag_div, description, rating);
        row.append(img_col, text_col);
        item.append(row);
    
        // 메모 버튼과 입력란을 restaurant-item 안에 추가
        const memoContainer = $('<div>').addClass('memo-container').css('display', 'flex');  // flex를 사용해 메모 버튼과 저장 버튼을 나란히 배치
    
        // restaurants.memo가 존재하면 그 내용을, 없으면 빈 문자열을 넣음
        const memoContent = restaurant.memo ? restaurant.memo : '';  // 메모가 있으면 내용 가져오기
        const memoInput = $('<textarea>').addClass('memo-input')
            .attr('placeholder', '메모를 입력하세요')
            .val(memoContent)  // 메모 내용이 있으면 넣고 없으면 빈 입력란
            .css('flex', '1')  // 입력란을 flex-grow로 화면 전체 너비에 맞게 설정
            .toggle(!!memoContent);  // 메모가 있으면 표시, 없으면 숨김 처리
        
        const saveMemoButton = $('<button>').addClass('save-memo-btn').text('저장').toggle(!!memoContent);  // 저장 버튼도 처음엔 숨김 처리
    
        // 메모가 있으면 height 55px, 없으면 height 0으로 설정
        memoContainer.css('height', memoContent ? '55px' : '0');
    
        // 메모 버튼 클릭 시 메모 입력란과 저장 버튼 표시/숨김 토글
        const memoButton = $('<button>').addClass('memo-btn').text('메모를 남겨보세요');
        memoButton.on('click', function () {
            memoInput.toggle();
            saveMemoButton.toggle();  // 저장 버튼도 함께 토글
            const newHeight = memoInput.is(':visible') ? '55px' : '0';  // 메모 입력란이 보이면 height 55px, 숨기면 0
            memoContainer.css('height', newHeight);
        });
    
        // 저장 버튼 클릭 시 메모를 업데이트하는 로직
        saveMemoButton.on('click', function () {
            const restaurantId = item.attr('data-id');
            const memoContent = memoInput.val();  // 입력된 메모 내용 가져오기
            updateMemo(restaurantId, memoContent);  // 메모 업데이트 함수 호출
        });
    
        // 메모 입력란과 저장 버튼을 컨테이너에 추가
        memoContainer.append(memoInput, saveMemoButton);
        item.append(memoButton, memoContainer);
    
        fragment.append(item);
    });
    
    
    list.append(fragment);
    
};


/**
 * 메모를 업데이트하는 함수
 * @param {number} restaurantId 레스토랑 id
 * @param {string} memoContent 메모 내용
 */
const updateMemo = async (restaurantId, memoContent) => {
    if (!restaurantId || !memoContent) {
        console.error('메모 내용이 존재하지 않음:', restaurantId, memoContent);
        return;
    }

    const { data, error } = await supabase
        .from('bookmark')  // 'bookmark' 테이블을 업데이트
        .update({ memo: memoContent })  // 'memo' 컬럼에 메모 내용을 업데이트
        .eq('restaurant_id', restaurantId);  // 특정 레스토랑의 id에 해당하는 행을 업데이트

    if (error) {
        console.error('메모 업데이트 실패:', error);
        return;
    }

    // 업데이트 성공 시 알림 메시지 표시
    Swal.fire({
        icon: 'success',
        title: '메모가 업데이트되었습니다.',
        showConfirmButton: false,
        timer: 1500,  // 1.5초 후 자동으로 사라짐
        timerProgressBar: true,
        customClass: {
            popup: 'swal2-toast'
        }
    });
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
