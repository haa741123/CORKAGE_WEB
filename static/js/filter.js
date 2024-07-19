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
    "1점": "1",
    "2점": "2",
    "3점": "3",
    "4점": "4",
    "5점": "5"
  };
  
  $(document).ready(function () {
      // 필터 버튼 클릭 이벤트
      $(".filter-buttons .btn").on("click", function () {
          $(this).toggleClass("active");
      });
  
      // 폼 제출 이벤트
      $("#filterForm").on("submit", function (event) {
          event.preventDefault(); // Form submission을 막고 데이터를 콘솔에 출력
          let categories = ["food", "time", "price", "score"];
          let filterData = {};
          categories.forEach((category) => {
              let activeButtons = $(`.filter-buttons[data-category="${category}"] .btn.active`);
              let values = activeButtons
                  .map(function () {
                      return valueMapping[$(this).data("value")];
                  })
                  .get();
              $(`#${category}Input`).val(values.join(","));
              filterData[category] = values;
          });
  
          // 슬라이더 값을 다시 설정 (확인용)
          const $minSlider = $('#minSlider');
          const $maxSlider = $('#maxSlider');
          const $priceInput = $('#priceInput');
          $priceInput.val(`${$minSlider.val()}-${$maxSlider.val()}`);
          filterData["price"] = $priceInput.val();
  
          console.table(filterData);
          // 데이터를 서버로 전송하려면 아래 주석을 해제
          // this.submit();
      });
  
      // 초기화 아이콘 클릭 이벤트
      $("#reset_icon").on("click", function () {
          $(".filter-buttons .btn").removeClass("active");
          $("#foodInput").val("");
          $("#timeInput").val("");
          $("#priceInput").val("");
          $("#scoreInput").val("");
      });
  
      // 슬라이더 관련 코드
      $('#back_btn').on('click', function() {
          window.location.href = "/";
      });
  
      const $minSlider = $('#minSlider');
      const $maxSlider = $('#maxSlider');
      const $priceText = $('#priceText');
      const $sliderRange = $('#sliderRange');
      const $priceInput = $('#priceInput');
      const priceGap = 10000;
  
      $minSlider.on('input', updateSlider);
      $maxSlider.on('input', updateSlider);
  
      function updateSlider() {
          if (parseInt($maxSlider.val()) - parseInt($minSlider.val()) < priceGap) {
              if (this === $minSlider[0]) {
                  $minSlider.val(parseInt($maxSlider.val()) - priceGap);
              } else {
                  $maxSlider.val(parseInt($minSlider.val()) + priceGap);
              }
          }
          const minPercent = ($minSlider.val() / $minSlider.attr('max')) * 100;
          const maxPercent = 100 - ($maxSlider.val() / $maxSlider.attr('max')) * 100;
          $sliderRange.css({ left: minPercent + '%', right: maxPercent + '%' });
          const minPrice = $minSlider.val() === '0' ? '콜키지 프리' : `${$minSlider.val() / 10000}만원`;
          const maxPrice = `${$maxSlider.val() / 10000}만원`;
          $priceText.text(`${minPrice} ~ ${maxPrice}`);
  
          // priceInput에 값 설정
          $priceInput.val(`${$minSlider.val()}-${$maxSlider.val()}`);
  
          // 콘솔에 값 테이블 형식으로 출력
          console.table({
              "Min Slider Value": $minSlider.val(),
              "Max Slider Value": $maxSlider.val(),
              "Price Range Text": $priceText.text()
          });
      }
  
      // 슬라이더 초기화 후 업데이트
      updateSlider();
  });
  