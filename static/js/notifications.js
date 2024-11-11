document.addEventListener('DOMContentLoaded', init);

function init() {
    const loadMoreBtn = document.getElementById('load-more-btn');
    const notificationList = document.getElementById('notification-list');
    const alertMessage = document.getElementById('alert-message');

    // 추가 알림 데이터
    const moreNotifications = [
        { title: '🍷 콜키지 할인 이벤트', content: '예약 시 콜키지 비용 50% 할인!', time: '11월 9일 14:00' },
        { title: '📅 예약 확인', content: '다음 주 예약을 잊지 말고 확인하세요.', time: '11월 8일 12:00' },
        { title: '🎉 신규 앱 업데이트 안내', content: '새로운 기능이 추가되었습니다. 업데이트 후 확인해보세요.', time: '11월 7일 18:30' }
    ];

    // 알림 추가 및 안내 문구 표시
    loadMoreBtn.addEventListener('click', () => handleLoadMore(moreNotifications, notificationList, alertMessage, loadMoreBtn));
}

// 알림 추가 함수 (Fragment 사용으로 성능 최적화)
function addNotifications(notifications, notificationList) {
    const fragment = document.createDocumentFragment();
    
    notifications.forEach(notification => {
        const item = document.createElement('div');
        item.className = 'notification-item';
        item.innerHTML = `
            <h3>${notification.title}</h3>
            <p>${notification.content}</p>
            <span class="time">${notification.time}</span>
        `;
        fragment.appendChild(item);
    });

    notificationList.appendChild(fragment);
}

// 버튼 클릭 시 알림 추가 및 안내 문구 표시
function handleLoadMore(notifications, notificationList, alertMessage, loadMoreBtn) {
    addNotifications(notifications, notificationList);

    // 버튼 숨기기 및 안내 문구 표시
    loadMoreBtn.style.display = 'none';
    if (alertMessage) {
        alertMessage.style.display = 'block';
    }
}
