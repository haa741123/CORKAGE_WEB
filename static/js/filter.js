$(document).ready(function () {
  const valueMapping = {
    한식: "ko",
    일식: "jp",
    중식: "ch",
    양식: "west",
    분식: "snack",
    오전: "am",
    점심: "noon",
    오후: "pm",
    저녁: "evening",
    심야: "night",
    "1-2만원대": "1-2",
    "3-4만원대": "3-4",
    "5만원대 이상": "5+",
  };

  $(".filter-buttons .btn").on("click", function () {
    $(this).toggleClass("active");
  });

  $("#filterForm").on("submit", function (event) {
    event.preventDefault(); // Form submission을 막고 데이터를 콘솔에 출력
    let categories = ["food", "time", "price"];
    let filterData = {};
    categories.forEach((category) => {
      let activeButtons = $(
        `.filter-buttons[data-category="${category}"] .btn.active`
      );
      let values = activeButtons
        .map(function () {
          return valueMapping[$(this).data("value")];
        })
        .get();
      $(`#${category}Input`).val(values.join(","));
      filterData[category] = values;
    });
    let radius = $("#radiusRange").val();
    filterData["radius"] = radius;

    console.table(filterData);
    // 데이터를 서버로 전송하려면 아래 주석을 해제
    // this.submit();
  });

  $("#reset_icon").on("click", function () {
    $(".filter-buttons .btn").removeClass("active");
    $("#radiusRange").val(500);
    $("#foodInput").val("");
    $("#timeInput").val("");
    $("#priceInput").val("");
  });
});
