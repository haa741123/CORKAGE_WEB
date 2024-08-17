// Supabase 프로젝트 URL과 공개 API 키를 설정
const SUPABASE_URL = 'https://kovzqlclzpduuxejjxwf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdnpxbGNsenBkdXV4ZWpqeHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTg1NTE4NTEsImV4cCI6MjAzNDEyNzg1MX0.A4Vn0QJMKnMe4HAZnT-aEa2r0fL4jHOpKoRHmbls8fQ';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 데이터베이스에서 데이터를 가져오는 함수
async function fetchData() {
    try {
        const { data, error } = await supabase.from('corkage').select('*');

        if (error) {
            throw error;
        }

        // 데이터를 성공적으로 가져온 후, 표시하는 함수 호출
        renderDataList(data);
    } catch (error) {
        console.error('데이터 가져오기 오류:', error);
        alert('데이터를 가져오는 중 오류가 발생했습니다. 나중에 다시 시도해주세요.');
    } finally {
        // 로딩이 끝났음을 표시 (로딩 표시 제거)
        toggleLoadingIndicator(false);
    }
}



// 데이터를 HTML 리스트로 렌더링하는 함수
function renderDataList(data) {
    const dataList = document.getElementById('data-list');
    dataList.innerHTML = ''; // 기존 리스트 초기화

    if (data.length === 0) {
        dataList.textContent = '데이터가 없습니다.';
        return;
    }

    data.forEach(item => {
        const listItem = document.createElement('li');
        listItem.textContent = `ID: ${item.id}, Name: ${item.name}, Coordinates: ${item.coordinates}, Phone: ${item.phone}, Address: ${item.address}`;
        dataList.appendChild(listItem);
    });
}



// 로딩 인디케이터를 토글하는 함수
function toggleLoadingIndicator(isLoading) {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (isLoading) {
        loadingIndicator.style.display = 'block';
    } else {
        loadingIndicator.style.display = 'none';
    }
}



// 페이지 로드 시 데이터 가져오기
document.addEventListener('DOMContentLoaded', () => {
    toggleLoadingIndicator(true); // 로딩 표시
    fetchData();
});
