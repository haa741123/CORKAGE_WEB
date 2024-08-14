// Supabase 프로젝트 URL과 공개 API 키를 설정
const SUPABASE_URL = 'https://kovzqlclzpduuxejjxwf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdnpxbGNsenBkdXV4ZWpqeHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTg1NTE4NTEsImV4cCI6MjAzNDEyNzg1MX0.A4Vn0QJMKnMe4HAZnT-aEa2r0fL4jHOpKoRHmbls8fQ';

// Supabase 클라이언트 생성
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 데이터를 가져와서 HTML에 표시하는 함수
async function fetchData() {
    // 데이터베이스에서 테이블 데이터를 가져옴
    let { data, error } = await supabase
        .from('corkage')
        .select('*');

    if (error) {
        console.error('데이터 가져오기 오류:', error);
        return;
    }

    // 데이터를 표시할 요소 선택
    const dataList = document.getElementById('data-list');

    // 데이터 리스트를 HTML로 변환하여 삽입
    data.forEach(item => {
        const listItem = document.createElement('li');
        listItem.textContent = `ID: ${item.id}, Name: ${item.name},  Coordinates: ${item.coordinates}, Phone: ${item.phone}, Address: ${item.address}`;// 필요한 데이터 필드에 맞게 수정
        dataList.appendChild(listItem);
    });
}

// 페이지 로드 시 데이터 가져오기
fetchData();
