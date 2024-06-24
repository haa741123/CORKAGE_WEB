/**
 * 로딩 상태 관리
 */
let isLoading = false;


/**
 * 비속어 제한 리스트
 */
import { limit_BadWords } from '/static/js/limit_BadWord.js';



$(document).ready(function() {
    // 전송 버튼 클릭 시 
    $('#send-button').click(function() {
        if (!isLoading) {
            sendMessage();
        }
    });

    // 카테고리 버튼을 클릭 시 입력창에 입력되고 엔터 클릭
    $('.faq-button').click(function() {
        if (!isLoading) {
            const question = $(this).data('question');
            $('#user-input').val(question);
            var e = jQuery.Event("keypress");
            e.which = 13; // Enter 키의 ASCII 코드
            e.keyCode = 13;
            $("#user-input").trigger(e);
        }
    });
    
    // 입력창에서 엔터 입력시 
    $("#user-input").on('keypress', function(event) {
        if (!isLoading && event.which === 13) {
            event.preventDefault();
            sendMessage();
        }
    });
});




/**
 * 메시지 전송 및 관리
 */
function sendMessage() {
    const userInput = $("#user-input").val().trim();
    if (userInput === "") {
        alert("내용을 입력해주세요.");
        return;
    }

    const isForbidden = limit_BadWords.some(word => userInput.includes(word));
    if (isForbidden) {
        alert("부적절한 단어가 포함되어 있어 전송이 불가능합니다.");
        return;
    }

    displayMessage(userInput, 'user');  // 유저 메시지 표시
    $("#user-input").val(""); // 입력 필드 초기화
    startLoading(); // 로딩 상태 시작

    // 서버에 메시지를 보내고 응답을 받는 함수
    sendToServer(userInput).then(response => {
        displayMessage(response, 'bot');    // 챗봇 메시지 표시
        finishLoading();                    // 로딩 상태 종료
    }).catch(error => {
        alert("메시지 전송에 실패했습니다.");
        finishLoading();                    // 로딩 상태 종료
    });
}



/**
 * 로딩 상태 시작
 */
function startLoading() {
    // 로딩 아이콘
    const loadingIcon = $('<div id="loading-icon"><i class="fas fa-circle-notch fa-spin"></i></div>');
    $("#chat-messages").append(loadingIcon);
    isLoading = true;
}

/**
 * 로딩 상태 종료
 */
function finishLoading() {
    $("#loading-icon").remove();
    isLoading = false;
}




/**
 * 메시지 표시 (유저, 챗봇)
 */
function displayMessage(message, sender) {
    const chatMessages = $("#chat-messages");
    const messageDiv = $('<div class="message"></div>').addClass(sender).text(`${sender === 'bot' ? '챗봇: ' : ''}${message}`);
    chatMessages.append(messageDiv);
    chatMessages.scrollTop(chatMessages.prop("scrollHeight"));
}


/**
 * 서버에 유저가 작성한 메시지 전송
 */
async function sendToServer(message) {
    // 서버로 메시지를 전송하고 응답을 기다리는 비동기 함수
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(`${message}`);  // 응답
        }, 500);    // 0.5초
    });
}