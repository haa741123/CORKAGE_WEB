// 특수문자 모음집
import { specialChar } from '/static/js/data/specialChar.js';

// 페이지 로드 시 인증 체크
$(document).ready(function() {
    // 권한 체크 
    checkAuthentication();
    updateMenuList();


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

        // 입력 유효성 검사
        if (!menuName) {
            alert('메뉴 이름을 입력해 주세요.');
            $('#menuName').focus();
            return; // 메뉴 이름이 비어있으면 제출 중단
        }
        if (!menuDescription) {
            alert('메뉴 설명을 입력해 주세요.');
            $('#menuDescription').focus();
            return; // 메뉴 설명이 비어있으면 제출 중단
        }
        if (!menuPrice || isNaN(menuPrice)) {
            alert('유효한 메뉴 가격을 입력해 주세요.');
            $('#menuPrice').focus();
            return; // 메뉴 가격이 비어있거나 숫자가 아니면 제출 중단
        }

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
                console.log(response);
                menuModal.hide();  // 모달을 닫는 코드

                // 메뉴 리스트 업데이트
                updateMenuList();
                alert('메뉴가 성공적으로 저장되었습니다!');
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

// 메뉴 리스트를 업데이트하는 함수
const updateMenuList = () => {

    // 세션 스토리지에서 사용자 정보 가져오기
    const userData = sessionStorage.getItem('user');
    const user_id = userData ? JSON.parse(userData).login_id : '';

    if (!user_id) {
        console.error('세션 스토리지에 사용자 정보가 없습니다.');
        alert('로그인 정보가 없습니다. 다시 로그인 해 주세요.');
        return; // 유저 정보가 없다면 더 이상 진행하지 않음
    }

    console.log(user_id)

    // 요청할 때 같이 보낼 값
    const requestData = { user_id };

    
    $.ajax({
        url: '/api/v1/get_menu',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(requestData),
        success: (data) => {
            // 데이터가 정상적으로 받아지면 menuList에 표시
            const menuList = $('#menuList');
            menuList.empty(); // 기존 메뉴 리스트 비우기
    
            data.forEach(menu => {
                // Windows 경로 구분자를 슬래시로 변경
                menu.image_url = menu.image_url ? menu.image_url.replace(/\\/g, '/') : '';
    
                console.log(menu.image_url);
                const menuItem = `
                    <div class="menu-item">
                        <img src="${menu.image_url}" alt="${menu.name}" class="menu-image" />
                        <div class="menu-name">${menu.name}</div>
                        <div class="menu-description">${menu.description}</div>
                        <div class="menu-price">${menu.price} 원</div>
                    </div>
                `;
                menuList.append(menuItem);
            });
        },
        error: (jqXHR, textStatus, errorThrown) => {
            alert('메뉴 정보를 가져오는 데 실패했습니다. 다시 시도해 주세요.');
            console.error("Status:", textStatus);
            console.error("Error Thrown:", errorThrown);
            console.error("Response Text:", jqXHR.responseText);
        }
    });
    
};