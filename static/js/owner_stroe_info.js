
import { specialChar } from '/static/js/data/specialChar.js';

// 페이지 로드 시 인증 체크
$(document).ready(function() {
    // 권한 체크 
    checkAuthentication();


    // 추가 버튼과 모달 요소
    const menuModal = new bootstrap.Modal($('#menuModal')[0]);
    $('#addMenuButton').on('click', function() {
        menuModal.show();
    });


    // 이미지 업로드 시 미리보기 
    const menuImageInput = document.getElementById('menuImage');
    menuImageInput.addEventListener('change', previewImage);

    
    $('#menuForm').on('submit', (event) => {
        event.preventDefault(); // 기본 폼 제출 방지

        // 폼 데이터 수집
        const menuName = $('#menuName').val().trim(); // 공백 제거
        const menuImage = $('#menuImage')[0].files[0]; // 파일 선택
        const menuDescription = $('#menuDescription').val();
        const menuPrice = $('#menuPrice').val();

        // 이미지 형식 검사
        const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        
        if (menuImage && !validImageTypes.includes(menuImage.type)) {
            alert('이미지 파일은 PNG, JPG 또는 JPEG 형식만 허용됩니다.');
            return; // 잘못된 형식의 이미지일 경우 제출 중단
        }

        // 세션 스토리지에서 사용자 정보 가져오기
        const userData = sessionStorage.getItem('user');
        const user_id = userData ? JSON.parse(userData).login_id : '';

        if (!user_id) {
            console.error('세션 스토리지에 사용자 정보가 없습니다.');
            return; // 유저 정보가 없다면 더 이상 진행하지 않음
        }
        
        // 공백 및 특수문자를 '_'로 대체하는 함수
        const ch_specialChar = (name) => {
            let sanitized = name;
            specialChar.forEach(char => {
                sanitized = sanitized.split(char).join('_'); // 각 특수문자를 '_'로 대체
            });
            return sanitized;
        };

        // 이미지 파일의 새로운 이름을 설정
        let renamedFile;
        if (menuImage) {
            const sanitizedMenuName = ch_specialChar(menuName); // 메뉴 이름 정제
            const newFileName = `${sanitizedMenuName}${menuImage.name.slice(menuImage.name.lastIndexOf('.'))}`; // 메뉴 이름으로 파일명 변경
            renamedFile = new File([menuImage], newFileName, { type: menuImage.type });
        }

        // FormData 생성 및 값 추가
        const formData = new FormData();
        formData.append('menuName', menuName);  
        if (renamedFile) {
            formData.append('menuImage', renamedFile);  
        }
        formData.append('menuDescription', menuDescription);  
        formData.append('menuPrice', menuPrice);  
        formData.append('user_id', user_id);

        // FormData를 객체로 변환하여 console.table로 출력
        const formObject = Array.from(formData.entries()).reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
        }, {});

        console.table(formObject);  // 테이블 형식으로 출력

        // AJAX 요청
        $.ajax({
            url: '/api/v1/set_menu', 
            type: 'POST',
            data: formData,
            contentType: false, // multipart/form-data로 전송
            processData: false, // jQuery가 데이터를 처리하지 않도록 설정
            success: (response) => {
                alert('메뉴가 성공적으로 저장되었습니다!');
                console.log(response);
                menuModal.hide();  // 모달을 닫는 코드
            },
            error: (jqXHR, textStatus, errorThrown) => {
                alert('메뉴 저장에 실패했습니다. 다시 시도해 주세요.');
                console.error("Status:", textStatus);
                console.error("Error Thrown:", errorThrown);
                console.error("Response Text:", jqXHR.responseText);
            }
        });
    });

});


// 페이지 로드 시 실행되는 함수
function checkAuthentication() {
    const user = sessionStorage.getItem("user");
    if (!user) {
        window.location.href = "login_owner"; // 실제 로그인 페이지 URL로 변경하세요
    }
}



function previewImage(event) {
    const fileInput = event.target;

    // 파일이 선택되었는지 확인
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const preview = $('#menuImagePreview');
        const form = $('#menuForm');

        // 파일 형식 확인
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.attr('src', e.target.result);
                preview.show();  // 이미지 미리보기 표시
            };
            reader.readAsDataURL(file);
        } else {
            // 이미지가 아닌 경우 경고 메시지 표시
            alert('이미지 파일을 업로드해야 합니다.');
            $("#menuImage").val('');
            preview.hide(); // 미리보기 초기화
        }
    }
}

