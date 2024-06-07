document.addEventListener("DOMContentLoaded", function () {
  // 나중에 DB-서버로부터 데이터를 받아오는 함수
  function fetchReviews() {
    // 임시 데이터
    const reviews = [
      {
        user: "사용자1",
        text: "훌륭한 와인입니다. 부드러운 맛과 풍부한 향이 일품입니다.",
      },
      {
        user: "사용자2",
        text: "정말 만족스러운 선택이었습니다. 가격대비 최고의 품질입니다.",
      },
      { user: "사용자3", text: "맛이 너무 강해서 제 입맛에는 맞지 않았어요." },
    ];

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(reviews);
      }, 1000); // 1초 후에 데이터를 반환 (DB 호출을 모방)
    });
  }

  // 리뷰 데이터를 페이지에 추가하는 함수
  function displayReviews(reviews) {
    const reviewSection = document.getElementById("review-section");
    reviewSection.innerHTML = ""; // 기존 리뷰를 지움

    reviews.forEach((review) => {
      const reviewDiv = document.createElement("div");
      reviewDiv.className = "review";
      reviewDiv.innerHTML = `<p><strong>${review.user}:</strong> ${review.text}</p>`;
      reviewSection.appendChild(reviewDiv);
    });
  }

  // 페이지 로드 시 리뷰 데이터를 불러와서 표시
  fetchReviews().then((reviews) => {
    displayReviews(reviews);
  });
});
