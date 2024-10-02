// Supabase 설정
// Supabase 초기화 함수
const supabaseUrl = 'https://kovzqlclzpduuxejjxwf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdnpxbGNsenBkdXV4ZWpqeHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTg1NTE4NTEsImV4cCI6MjAzNDEyNzg1MX0.A4Vn0QJMKnMe4HAZnT-aEa2r0fL4jHOpKoRHmbls8fQ';
const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

// 페이지네이션 설정 및 상태 관리 객체
const pagination = {
    pageSize: 10,  // 페이지 당 표시할 레스토랑 수
    currentPage: 1,  // 현재 페이지
    totalItems: 0  // 전체 레스토랑 개수
};

/**
 * Supabase에서 총 레스토랑 수를 가져오는 함수
 */
const Restaurant_Count = async () => {
    const { count, error } = await supabase
        .from('restaurants')
        .select('*', { count: 'exact', head: true });
    
    if (error) {
        console.error('Error fetching total count:', error);
        return 0;
    }

    return count;
};

/**
 * Supabase에서 현재 페이지에 해당하는 데이터를 가져오는 함수
 * @returns {Array} 현재 페이지에 해당하는 레스토랑 리스트
 */
const fetchPagedRestaurants = async () => {
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    const end = start + pagination.pageSize - 1;

    const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .range(start, end);

    if (error) {
        console.error('Error fetching restaurants:', error);
        return [];
    }

    return data;
};

/**
 * 북마크를 취소하고 레스토랑 목록에서 제거하는 함수
 * @param {number} id 레스토랑 id
 */
const removeBookmark = async (id) => {
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
            const { error } = await supabase
                .from('restaurants')
                .update({ bookmark: false })
                .eq('id', id);

            if (error) {
                console.error('Error removing bookmark:', error);
                return;
            }

            renderList(); 
            renderPagination(); 
        }
    });
};

/**
 * 현재 페이지에 해당하는 레스토랑 리스트를 렌더링하는 함수
 */
const renderList = async () => {
    const list = $('#restaurant-list');
    const count = $('.count');
    const restaurants = await fetchPagedRestaurants();

    count.text(pagination.totalItems); // 레스토랑 총 개수 표시
    list.empty();
    
    const fragment = $(document.createDocumentFragment());

    restaurants.forEach((restaurant, index) => {
        const item = $('<div>').addClass('restaurant-item');
        const row = $('<div>').addClass('row');
        const img_col = $('<div>').addClass('col-4 col-lg-3');
        const img = $('<img>')
            .attr('src', restaurant.image)
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
            .on('click', () => removeBookmark(restaurant.id)); 
        bookmark_icon.append(bookmark_img);
        name.append(bookmark_icon);

        const tag_div = $('<div>').addClass('tags');
        restaurant.tags.forEach(tag => {
            const tag_span = $('<span>')
                .addClass('tag')
                .addClass(tag === "콜키지 프리" ? 'red' : 'black')
                .text(tag);
            tag_div.append(tag_span);
        });

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
            renderList();
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
    pagination.totalItems = await Restaurant_Count();  // 총 레스토랑 개수 가져오기
    renderList();
    renderPagination();
});
