/**
 * 로딩 상태 관리
 */
let isLoading = false;

/**
 * 비속어 제한 리스트
 */
import { limit_BadWords } from '/static/js/data/limit_BadWord.js';

/**
 * 미리 정의된 답변
 */
import {answers} from '/static/js/data/define_Answer.js';

$(document).ready(() => {
    // 전송 버튼 클릭 시 
    $('#send-button').click(() => {
        handleMessageSend();
    });

    // 카테고리 버튼을 클릭 시 입력창에 입력되고 엔터 클릭
    $('.faq-button').click(function() {
        const question = $(this).data('question');
        $('#user-input').val(question);
        triggerEnter();
    });

    // 입력창에서 엔터 입력 시 
    $("#user-input").on('keypress', (event) => {
        if (event.which === 13) {
            event.preventDefault();
            handleMessageSend();
        }
    });

    // '고객 지원' 버튼 클릭 시
    $('#sup_btn').click(() => {
        $('#default_btn').hide();
        $('.sup_sub_btn').show();
    });
});

/**
 * 로딩 상태 관리 함수
 */
const withLoading = async (callback) => {
    if (!isLoading) {
        try {
            startLoading();
            
            // 1초 동안 로딩 유지 (사용자가 계속 요청하는 것을 방지하기 위해 1초 설정)
            await new Promise(resolve => setTimeout(resolve, 1000)); 
            await callback();
        } finally {
            finishLoading();
        }
    }
};

/**
 * 메시지 전송 및 관리
 */
const handleMessageSend = () => {
    const userInput = $("#user-input").val().trim();
    displayMessage(userInput, 'user');

    withLoading(async () => {
        
    
        if (userInput === "") {
            alert("내용을 입력해주세요.");
            return;
        }

        if (limit_BadWords.some(word => userInput.includes(word))) {
            alert("부적절한 단어가 포함되어 있어 전송이 불가능합니다.");
            $("#user-input").val("");
            return;
        }

        if (userInput.includes("뒤로 가기")) {  
            $('.sup_sub_btn').hide();
            $('#default_btn').show();
            $("#user-input").val("");
            return;
        }

        
        $("#user-input").val("");

        if (userInput.includes("주류 추천")) {
            const recommendation = await get_Recommend(userInput, '3692027697');
            displayMessage(recommendation.response, 'bot');
        } else if (answers[userInput]) {
            displayMessage(answers[userInput], 'bot');
        } else {
            const response = await sendToServer(userInput);
            displayMessage(response, 'bot');
        }
    });
};


/**
 * 로딩 상태 시작
 */
const startLoading = () => {
    const loadingIcon = $('<div id="loading-icon"><i class="fas fa-circle-notch fa-spin"></i></div>');
    $("#chat-messages").append(loadingIcon);
    isLoading = true;
};

/**
 * 로딩 상태 종료
 */
const finishLoading = () => {
    $("#loading-icon").remove();
    isLoading = false;
};

/**
 * 메시지 표시 (유저, 챗봇)
 */
const displayMessage = (message, sender) => {
    const chatMessages = $("#chat-messages");
    const messageDiv = $('<div class="message"></div>').addClass(sender).text(`${sender === 'bot' ? '도우미😀: ' : ''}${message}`);
    chatMessages.append(messageDiv);
    chatMessages.scrollTop(chatMessages.prop("scrollHeight"));
};

/**
 * 서버에 유저가 작성한 메시지 전송
 */
const sendToServer = async (message) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(`${message}`);
        }, 500);
    });
};

/**
 * 주류 추천 결과
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
 * 입력창에서 엔터 트리거
 */
const triggerEnter = () => {
    const e = jQuery.Event("keypress");
    e.which = 13;
    e.keyCode = 13;
    $("#user-input").trigger(e);
};
