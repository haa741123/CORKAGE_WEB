
/**
 * 비속어 제한 리스트를 포함한 외부 모듈
 */
import { limit_BadWords } from '/static/js/data/limit_BadWord.js';

/**
 * 사전에 정의된 질문에 대한 답변을 제공하기 위한 외부 모듈
 */
import { answers } from '/static/js/data/define_Answer.js';


/**
 * 현재 로딩 상태를 추적하는 변수.
 */
let isLoading = false;


$(document).ready(() => {
    // 페이지 로딩 시 환영 메시지 출력
    displayMessage("궁금하신 내용을 적어주시면 감사하겠습니다.", 'bot');

    // '전송' 버튼 클릭 시 메시지 전송 처리
    $('#send-button').click(() => {
        handleMessageSend();
    });

    // FAQ 카테고리 버튼 클릭 시 해당 질문을 입력창에 삽입하고 엔터 입력 시 자동 전송
    $('.faq-button').click(function() {
        const question = $(this).data('question');
        $('#user-input').val(question);
        triggerEnter();
    });

    // 입력창에서 'Enter' 키 입력 시 메시지 전송 처리
    $("#user-input").on('keypress', (event) => {
        if (event.which === 13) {  // Enter 키 확인
            event.preventDefault();
            handleMessageSend();
        }
    });

    // '고객 지원' 버튼 클릭 시 서브 버튼 표시
    $('#sup_btn').click(() => {
        $('#default_btn').hide(); // 기본 버튼 숨기기
        $('.sup_sub_btn').show(); // 서브 버튼 표시
    });
});

/**
 * 로딩 상태 관리 함수.
 * @param {Function} callback - 로딩 중 실행할 비동기 함수
 */
const withLoading = async (callback) => {
    if (!isLoading) {
        try {
            startLoading(); // 로딩 시작
            
            // 사용자가 연속으로 요청하는 것을 방지하기 위해 1초 대기
            await new Promise(resolve => setTimeout(resolve, 1000)); 
            await callback(); // 콜백 함수 실행
        } finally {
            finishLoading(); // 로딩 종료
        }
    }
};

/**
 * 유저 입력 메시지를 받아 처리하고 챗봇의 응답을 생성하는 함수.
 * (비속어 필터링, FAQ 응답, 주류 추천, 서버 요청 등)
 */
const handleMessageSend = () => {
    const userInput = $("#user-input").val().trim(); // 입력된 값 가져오기
    displayMessage(userInput, 'user'); // 유저 메시지 표시

    withLoading(async () => {
        // 입력값이 비어있을 경우 경고 메시지 출력
        if (userInput === "") {
            alert("내용을 입력해주세요.");
            return;
        }

        // 비속어 제한 리스트에 포함된 단어가 있는지 확인
        if (limit_BadWords.some(word => userInput.includes(word))) {
            alert("부적절한 단어가 포함되어 있어 전송이 불가능합니다.");
            $("#user-input").val(""); // 입력창 초기화
            return;
        }

        // '뒤로 가기'라는 입력이 있을 경우 버튼 상태 변경
        if (userInput.includes("뒤로 가기")) {  
            $('.sup_sub_btn').hide();
            $('#default_btn').show();
            $("#user-input").val(""); // 입력창 초기화
            return;
        }

        // 입력창 초기화
        $("#user-input").val("");

        // '주류 추천' 키워드가 포함된 경우 주류 추천 API 호출
        if (userInput.includes("주류 추천")) {
            const recommendation = await get_Recommend(userInput, '3692027697');
            displayMessage(recommendation.response, 'bot');
        } 
        // 미리 정의된 답변이 있는 경우 바로 출력
        else if (answers[userInput]) {
            displayMessage(answers[userInput], 'bot');
        } 
        // 서버로 입력 메시지를 전송하여 응답을 받아 출력
        else {
            const response = await sendToServer(userInput);
            displayMessage(response, 'bot');
        }
    });
};

/**
 * 로딩 시작: 로딩 아이콘을 화면에 추가하고, 로딩 상태를 true로 설정합니다.
 */
const startLoading = () => {
    const loadingIcon = $('<div id="loading-icon"><i class="fas fa-circle-notch fa-spin"></i></div>');
    $("#chat-messages").append(loadingIcon);
    isLoading = true;
};

/**
 * 로딩 종료: 로딩 아이콘을 제거하고, 로딩 상태를 false로 설정합니다.
 */
const finishLoading = () => {
    $("#loading-icon").remove();
    isLoading = false;
};

/**
 * 메시지를 화면에 표시하는 함수.
 * 유저 또는 챗봇의 메시지를 구분하여 스타일을 적용합니다.
 * @param {string} message  - 출력할 메시지
 * @param {string} sender   - 메시지의 출처 ('user' 또는 'bot')
 */
const displayMessage = (message, sender) => {
    const chatMessages = $("#chat-messages");
    
    // \n을 <br>로 변환하여 줄바꿈 처리
    const formattedMessage = message.replace(/\n/g, '<br>');
    
    const messageDiv = $('<div class="message"></div>')
        .addClass(sender)
        .html(`${sender === 'bot' ? '도우미🧑‍🏫: ' : ''}${formattedMessage}`);
    
    chatMessages.append(messageDiv);
    chatMessages.scrollTop(chatMessages.prop("scrollHeight")); // 스크롤 맨 아래로 이동
};

/**
 * 서버로 유저의 메시지를 전송하고 응답을 받는 함수 (모의 서버 응답).
 * @param {string} message      - 유저의 입력 메시지
 * @returns {Promise<string>}   - 서버로부터의 응답
 */
const sendToServer = async (message) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(`궁금하신 내용을 구체적으로 질문해주시면 더 정확한 답을 찾아볼게요~`);
        }, 500); // 0.5초 대기 후 응답
    });
};

/**
 * 주류 추천 API를 호출하여 추천 결과를 받아오는 함수.
 * @param {string} action_type  - 액션 타입 (예: '주류 추천')
 * @param {string} user_id      - 유저 ID
 * @returns {Promise<object>}   - 주류 추천 응답 데이터
 */
const get_Recommend = (action_type, user_id) => {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/api/v1/recommendations',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ message: action_type, user_id: user_id }),
            success: function(response) {
                resolve(response);
            },
            error: function(error) {
                console.error('Error:', error);
                reject(error);
            }
        });
    });
};

/**
 * 입력창에서 엔터 키를 트리거하는 함수.
 */
const triggerEnter = () => {
    const e = jQuery.Event("keypress");
    e.which = 13;
    e.keyCode = 13;
    $("#user-input").trigger(e);
};
