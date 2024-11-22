// function makeCall() {
//     window.location.href = "tel:123-456-7890";
// }


// 사용자 데이터를 JSON 형태로 정의
const userData = {
    name: "이정현",
    upcomingReservations: 3,
    reservations: [
      {
        date: "2024.09.13 (금) 오후 12:00",
        people: 2,
        restaurant: {
          name: "스시쥬고야",
          description: "十五夜, 달이 가장 밝은 날의 명랑하고 즐거운 밤 한토리출신 두 셰프의 히로아키에 이은 두번째 스시야",
          image: "/static/img/cutlet_sashimi.png",
          phone: "010-1234-5678"
        }
      }
    ],
    scraps: [
      "/static/img/profile.JPEG",
      "/static/img/profile.JPEG",
      "/static/img/profile.JPEG",
      "/static/img/profile.JPEG",
      "/static/img/profile.JPEG"
    ]
  };
  
  // 사용자 정보를 HTML에 반영
  function populateUserData() {
    // 사용자 이름 업데이트
    document.querySelector(".profile-wrapper h2").textContent = `${userData.name}님`;
  
    // 다가오는 예약 수 업데이트
    document.querySelector(".incomming p").textContent = userData.upcomingReservations;
  
    // 예약 정보 업데이트
    const reservation = userData.reservations[0];
    if (reservation) {
      document.querySelector(".reservation-date-header").innerHTML = `
        <img src="/static/img/Date_today.png" alt="달력" class="date-icon" />
        ${reservation.date}
        <img src="/static/img/Profile.svg" alt="인원" class="person-icon" />
        ${reservation.people}명
      `;
  
      const restaurantInfo = document.querySelector(".restaurant-info");
      restaurantInfo.querySelector(".restaurant-logo").src = reservation.restaurant.image;
      restaurantInfo.querySelector(".restaurant-details h4").textContent = reservation.restaurant.name;
      restaurantInfo.querySelector(".description").textContent = reservation.restaurant.description;
  
      // 전화하기 버튼 클릭 이벤트 추가
      restaurantInfo.querySelector("button.edit-profile-btn").onclick = () => {
        alert(`매장 전화번호: ${reservation.restaurant.phone}`);
      };
    }
  
    // 스크랩 이미지 업데이트
    const scrapImagesContainer = document.querySelector(".scrap-images");
    scrapImagesContainer.innerHTML = ""; // 기존 내용 초기화
    userData.scraps.forEach((scrap) => {
      const imgElement = document.createElement("img");
      imgElement.src = scrap;
      imgElement.alt = "스크랩 이미지";
      imgElement.classList.add("scrap-img");
      scrapImagesContainer.appendChild(imgElement);
    });
  }
  
  // 페이지 로드 시 데이터 채우기
  document.addEventListener("DOMContentLoaded", populateUserData);