/**
 * 음식점 리스트 불러오기
 * @returns
 */
async function get_res_info(latitude, longitude) {
  try {
    const response = await fetch('/api/v1/get_Nearest_Restaurants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ latitude, longitude, limit_count: 30 })
    });

    const result = await response.json();

    if (response.ok) {
      console.log("Fetched restaurants:", result.data);
      return result.data;
    } else {
      console.error("API 오류:", result.error);
      return [];
    }
  } catch (error) {
    console.error("음식점 리스트를 가져오는 중 오류 발생:", error);
    return [];
  }
}

/** 사용자 위치를 가져오는 함수 */
let getUserLocation = function () {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        userPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        await processUserLocation();
      },
      async (error) => {
        console.log("브라우저에서 위치 정보를 받아올 수 없음", error);
        console.log("Flutter에서 위치 정보를 기다리는 중...");
        await processUserLocation();
      }
    );
  } else {
    console.log(
      "브라우저 지오로케이션에 액세스할 수 없습니다. Flutter 위치를 기다리는 중..."
    );
    processUserLocation();
  }
};

// Flutter에서 전달된 위치 정보를 처리하는 함수
async function handleFlutterLocation(latitude, longitude) {
  userPosition = {
    latitude: latitude,
    longitude: longitude,
  };
  console.log("Flutter에서 제공한 사용자 위치:", userPosition);
  await processUserLocation();
}

// 위치 정보 처리 및 지도 업데이트 함수
async function processUserLocation() {
  // 로딩 화면 표시
  document.getElementById("loading-screen").style.display = "flex";

  await showUserPosition(); // 사용자 위치를 지도에 표시
  await searchPlaces();

  async function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function moveMap() {
    await delay(1000); // 1초 대기
    map.setLevel(10); // 지도를 10레벨로 유지
    await moveMyloc(); // 비동기 함수 moveMyloc 실행
  }

  await moveMap();

  // 로딩 화면 숨김
  document.getElementById("loading-screen").style.display = "none";
}

// 초기 위치 정보 요청
getUserLocation();

let markers = [];
let selectedMarker = null;
let mapContainer = document.getElementById("map");
let mapOption = {
  center: new kakao.maps.LatLng(37.606665, 127.027316),
  level: 10,
};
let map = new kakao.maps.Map(mapContainer, mapOption);
map.setMaxLevel(12);
let ps = new kakao.maps.services.Places();
let infowindow = new kakao.maps.InfoWindow({ zIndex: 1 });
let isSearchInProgress = false;
let userPosition = null; // 초기에는 null로 설정

/** 사용자 위치를 지도에 표시하는 함수 */
let showUserPosition = function () {
  if (!userPosition) return;

  let marker = new kakao.maps.Marker({
    position: new kakao.maps.LatLng(
      userPosition.latitude,
      userPosition.longitude
    ),
    image: new kakao.maps.MarkerImage(
      "/static/img/user_icon.png",
      new kakao.maps.Size(44, 49),
      { offset: new kakao.maps.Point(27, 69) }
    ),
  });
  marker.id = "user_icon";
  marker.setMap(map);
  map.setMaxLevel(12);
};

// 문서가 로드된 후 실행되는 함수
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".category").forEach((category) => {
    category.addEventListener("click", function () {
      searchPlaces(this.getAttribute("data-val"));
    });

    getUserLocation();
    loadSavedFilterResults();

    $("#my_loc_img").on("click", function () {
      if (userPosition) {
        // userPosition이 설정된 경우에만
        moveMyloc();
      } else {
        console.error("User position is not available yet.");
      }
    });
  });
});

let moveMyloc = function () {
  if (userPosition) {
    let moveLatLon = new kakao.maps.LatLng(
      userPosition.latitude,
      userPosition.longitude
    );
    map.panTo(moveLatLon);
    map.setLevel(5);
    map.setCenter(moveLatLon);
  } else {
    console.error("사용자 위치 정보를 받지 못했습니다.");
  }
};
/** 카테고리 이름에 따라 이미지 경로를 반환하는 함수 */
let getImageSrc = function (categoryName) {
  if (categoryName.includes("한식")) return "/static/img/kor_food.png";
  if (categoryName.includes("회") || categoryName.includes("돈까스"))
    return "/static/img/cutlet_sashimi.png";
  if (categoryName.includes("중식")) return "/static/img/ch_food.png";
  if (categoryName.includes("양식")) return "/static/img/fast_food.png";
  return "/static/img/cork_restaurant.jpg";
};

/** 키워드를 사용하여 장소를 검색하는 함수 */
let searchPlaces = async function (keyword) {
  if (!isSearchInProgress && userPosition) {
    isSearchInProgress = true;
    try {
      const restaurants = await get_res_info(
        userPosition.latitude,
        userPosition.longitude
      );
      console.log("Fetched restaurants:", restaurants); // 디버깅용
      displayRestaurants(restaurants, keyword);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
    } finally {
      isSearchInProgress = false;
    }
  }
};

function displayRestaurants(restaurants, keyword) {
  removeMarkers();
  let bounds = new kakao.maps.LatLngBounds();
  console.log("Displaying restaurants:", restaurants); // 디버깅용

  restaurants.forEach((place, index) => {
    if (place.x && place.y) {
      displayMarker(place, index);
      bounds.extend(new kakao.maps.LatLng(place.y, place.x));
    }
  });

  let restaurantsInfo = restaurants
    .map((place, index) => generatePlaceInfo(place, index))
    .join("");
  document.getElementById("restaurantInfo").innerHTML = restaurantsInfo;

  if (userPosition) {
    let userLatLng = new kakao.maps.LatLng(
      userPosition.latitude,
      userPosition.longitude
    );
    bounds.extend(userLatLng);
  }

  if (!bounds.isEmpty()) {
    map.setBounds(bounds);
  }

  document.getElementById("infoContainer").style.display = "block";
}

/** 장소 검색 결과를 처리하는 콜백 함수 - 수정하지마 제발 */
let placesSearchCB = function (data, status) {
  isSearchInProgress = false;

  if (status === kakao.maps.services.Status.OK) {
    removeMarkers();
    let bounds = new kakao.maps.LatLngBounds();

    // 기존 장소 검색 데이터를 처리
    let allPlacesInfo = data
      .map((place, index) => {
        displayMarker(place, index);
        bounds.extend(new kakao.maps.LatLng(place.y, place.x));
        return generatePlaceInfo(place, index);
      })
      .join("");

    // 비동기적으로 추가적인 장소 정보를 가져와 결합
    get_res_info().then((resData) => {
      console.log(resData);

      // 추가적인 장소 정보 처리
      let additionalPlacesInfo = resData
        .map((place, index) => {
          // place.id를 이용하거나, 그렇지 않은 경우 index를 사용
          let placeId = place.id ? place.id : index;

          // 필요한 경우 마커를 추가
          displayMarker(place, placeId);
          bounds.extend(new kakao.maps.LatLng(place.y, place.x));

          return generatePlaceInfo(place, placeId);
        })
        .join("");

      // 기존 장소 정보와 추가적인 장소 정보를 결합
      allPlacesInfo += additionalPlacesInfo;

      // 결합된 결과를 DOM에 삽입
      document.getElementById(
        "restaurantInfo"
      ).innerHTML = additionalPlacesInfo;

      // 유저 위치가 있으면 경계에 포함시킴
      if (userPosition) {
        let userLatLng = new kakao.maps.LatLng(
          userPosition.latitude,
          userPosition.longitude
        );
        bounds.extend(userLatLng);
      }

      // 지도에 경계 설정
      map.setBounds(bounds);
      document.getElementById("infoContainer").style.display = "block";
    });
  } else {
    console.error("검색 결과를 불러올 수 없는 상태입니다.:", status);
  }
};

/** 장소에 마커를 표시하는 함수 */
let displayMarker = function (place, index) {
  let marker = createMarker(place);

  kakao.maps.event.addListener(marker, "click", function () {
    if (selectedMarker === marker) {
      if (selectedMarker.customOverlay) {
        selectedMarker.customOverlay.setMap(null); // 오버레이를 닫음
        selectedMarker = null;
        setMarkerImage(marker, marker.originalImageSrc);
      }
    } else {
      if (selectedMarker) {
        setMarkerImage(selectedMarker, selectedMarker.originalImageSrc);
        if (selectedMarker.customOverlay) {
          selectedMarker.customOverlay.setMap(null);
        }
      }

      // 말풍선 스타일과 꼬리표를 자연스럽게 맞춤
      let content = `
        <div id="res_info_${index}" class="res_info_2" data-id="${place.id}">
  <div style="position: relative;">
          <div style="display: flex; align-items: center; padding: 7px 12px 7px 7px; background-color: #F8E9E9; border: 2px solid #EFC3C3; border-radius: 50px; box-shadow: 0px 2px 6px rgba(0,0,0,0.3);">
            <div style="margin-right: 10px;">
              <img src="${getImageSrc(
                place.category_name
              )}" style="width: 30px; height: 40px; border-radius: 50%; object-fit: cover;">
            </div>
            <div style="display: flex; flex-direction: column; text-align: left;">
              <span style="font-size: 12px; font-weight: bold; color: #D0273B;">${
                place.place_name
              }</span>
              <span style="display: inline-flex; align-items: center; justify-content: center; font-size: 8px; color: #FFFFFF; background-color: #E1707A; padding: 2px 0px; border-radius: 2px; margin-top: 2px; height: 14px;">콜키지 프리</span>
            </div>
          </div>
          <div style="position: absolute; bottom: -11px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 11px solid transparent; border-right: 11px solid transparent; border-top: 11px solid #F8E9E9; border-top-color: #EFC3C3; border-top: 11px solid #EFC3C3;"></div>
        </div>`;

      let customOverlay = new kakao.maps.CustomOverlay({
        content: content,
        position: new kakao.maps.LatLng(place.y, place.x),
        yAnchor: 1.5,
      });
      customOverlay.setMap(map);

      marker.customOverlay = customOverlay;
      // 이미지가 cork_restaurant.jpg인 경우만 click_mark.jpg로 변경
      if (marker.originalImageSrc === "/static/img/cork_restaurant.jpg") {
        setMarkerImage(marker, "/static/img/click_mark.jpg", 1.2);
      }

      document
        .getElementById(`res_info_${index}`)
        .scrollIntoView({ behavior: "smooth", block: "center" });

      selectedMarker = marker;
    }
  });

  markers.push(marker);
};

/** 마커 이미지를 설정하는 함수 */
let setMarkerImage = function (marker, imageSrc, scale = 1) {
  let imageSize = calculateMarkerSize(scale);
  let markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, {
    offset: new kakao.maps.Point(imageSize.width / 2, imageSize.height),
  });
  marker.setImage(markerImage);
};

/** 장소 정보를 바탕으로 마커를 생성하는 함수 */
let createMarker = function (place) {
  let imageSrc = getImageSrc(place.category_name);
  let imageSize = calculateMarkerSize();
  let markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, {
    offset: new kakao.maps.Point(imageSize.width / 2, imageSize.height),
  });
  let markerPosition = new kakao.maps.LatLng(place.y, place.x);

  let marker = new kakao.maps.Marker({
    map: map,
    position: markerPosition,
    image: markerImage,
  });

  marker.originalImageSrc = imageSrc;
  return marker;
};

/** 지도 레벨에 따라 마커 크기를 계산하는 함수 */
let calculateMarkerSize = function (scale = 1) {
  let level = map.getLevel();
  let size = 24 + (((48 - 24) * (10 - level)) / 9) * scale;
  return new kakao.maps.Size(size, size * 1.2);
};

/** 장소 정보를 HTML 형식으로 생성하는 함수 */
let generatePlaceInfo = function (place, index) {
  let distance = 0;
  let walkingTime = "알 수 없음";
  let drivingTime = "알 수 없음";

  if (!place.image_url) place.image_url = "/static/img/res_sample_img.jpg";

  if (userPosition) {
    distance = calculateDistance(
      userPosition.latitude,
      userPosition.longitude,
      place.y,
      place.x
    );
    walkingTime = formatTime(calculateTime(distance, 4));
    drivingTime = formatTime(calculateTime(distance, 40));
  }

  let categoryImageSrc = getImageSrc(place.category_name);

  let displayName = place.place_name.length > 10 
                      ? place.place_name.slice(0, 10) + "…" 
                      : place.place_name;

  return `
    <div id="res_info_${index}" class="res_info" data-id="${place.id}"
        data-place_name="${place.place_name}"
        data-address_name="${place.address_name}"
        data-phone="${place.phone}"
        data-distance="${distance.toFixed(2)}"
        data-walking_time="${walkingTime}"
        data-driving_time="${drivingTime}"
        data-category_name="${place.category_name}">
        <div class="row">
            <div class="col-4" style="padding-right: 1px;">
                <div class="image-container">
                    <img src="${place.image_url}" alt="${ place.place_name}" class="cover-image">
                </div>
            </div>
            <div class="col-8 info-container">
                <p class="place-name">
                    ${displayName}
                    <img src="${categoryImageSrc}" alt="${ place.category_name }" class="category-icon"> 
                    <span class="bookmark-icon">
                      <img src="/static/img/UnBookmark.png" alt="즐겨찾기 아이콘">
                    </span>
                </p>
                <div class="tag-container">
                    <span class="tag red">${place.tags}</span>
                </div>
                <p class="description">${place.description}</p>
                <p class="rating">평점: ${place.rating}</p>
            </div>
        </div>
    </div>
  `;
};

/**
 * 북마크 아이콘을 클릭하면 북마크 테이블 업데이트 (true or false)
 * @param {number} id 레스토랑 id
 */
const setBookmark = async (id, status) => {
  if (!id) {
    console.error("요소에 ID가 존재하지 않습니다.:", id);
    return;
  }

  Swal.fire({
    title: "북마크를 취소하시겠습니까?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "네",
    cancelButtonText: "아니요",
    customClass: {
      confirmButton: "swal2-confirm-btn",
      cancelButton: "swal2-cancel-btn",
    },
    buttonsStyling: false,
  }).then(async (result) => {
    if (result.isConfirmed) {

      updateBookmarkStatus(id, false);
      
      // 토스트 스타일의 알림 메시지 표시
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "북마크 상태가 변경되었습니다.",
        showConfirmButton: false,
        timer: 1500, // 1.5초 후 자동으로 사라짐
        timerProgressBar: true,
        customClass: {
          popup: "swal2-toast",
        },
      });
    }
  });
};

// 북마크 업데이트
async function updateBookmarkStatus(id, status) {
  try {
    const response = await fetch('/api/v1/update_Bookmark_Status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ restaurant_id: id, status })
    });

    const result = await response.json();

    if (response.ok) {
      console.log("북마크 상태 업데이트 성공:", result.message);
    } else {
      console.error("API 오류:", result.error);
    }
  } catch (error) {
    console.error("북마크 상태 업데이트 중 오류 발생:", error);
  }
}

function navigateToRestaurant(event) {
  let target =
    event.target.closest(".res_info") || event.target.closest(".res_info_2");
  if (target) {
    const restaurantId = target.dataset.id;
    if (restaurantId) {
      const newUrl = `/restaurant/${restaurantId}`;
      window.location.href = newUrl;
    } else {
      console.error("레스토랑 ID를 찾을 수 없습니다.");
    }
  }
}

// 이벤트 리스너 추가
document.addEventListener("click", navigateToRestaurant);

/** 지도에서 마커를 제거하는 함수 */
let removeMarkers = function () {
  markers.forEach((marker) => marker.setMap(null));
  markers = [];
  selectedMarker = null;
};

/** 두 지점 간의 거리를 계산하는 함수 */
let calculateDistance = function (lat1, lon1, lat2, lon2) {
  let R = 6371;
  let dLat = (lat2 - lat1) * (Math.PI / 180);
  let dLon = (lon2 - lon1) * (Math.PI / 180);
  let a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/** 거리와 속도를 사용해 시간을 계산하는 함수 */
let calculateTime = function (distance, speed) {
  return distance / speed;
};

/** 시간을 형식에 맞게 포맷하는 함수 */
let formatTime = function (time) {
  let hours = Math.floor(time);
  let minutes = Math.round((time - hours) * 60);
  return hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
};

// 지도의 줌 레벨이 변경될 때 마커 크기를 업데이트하는 함수
kakao.maps.event.addListener(map, "zoom_changed", updateMarkerSizes);

/** 마커 크기를 업데이트하는 함수 */
function updateMarkerSizes() {
  markers.forEach((marker) => setMarkerImage(marker, marker.originalImageSrc));
}

// 지도 위에 띄워줄 모달창 (검색 조건)
let $modal = $("#filterModal");
let $btn = $("#col_kitchen");
let $span = $(".close").first();
let $dragHandle = $(".drag-handle"); // 드래그 핸들 요소 선택자 추가
let $backgroundElements = $(
  ".map_wrap, .search-bar, .category-swiper, .res_info_swiper"
);

// 스크립트를 로드하는 함수
function loadScript(url, callback) {
  $.getScript(url, callback);
}

// 모달창을 여는 버튼 이벤트 리스너
$btn.on("click", function () {
  $modal.show();
  $backgroundElements.addClass("blur-background");
  loadScript("/static/js/filter.js");
});

// 모달 외부 클릭 시 닫기
$(window).on("click", function (e) {
  if ($(e.target).is("#filterModal")) {
    closeModal();
  }
});

// 모달창을 닫는 함수
function closeModal() {
  $modal.hide();
  $backgroundElements.removeClass("blur-background");
  $("script[src='/static/js/filter.js']").remove();
}

// 레스토랑 정보를 지우는 함수
function clearRestaurantInfo() {
  document.getElementById("restaurantInfo").innerHTML = "";
}

// 필터 적용 버튼 클릭 이벤트 리스너
$(".btn-apply").on("click", function (e) {
  e.preventDefault();

  // 필터 값 가져오기
  let maxDistance = parseFloat($("#distanceSlider").val()) || 10; // 기본값 10km
  let selectedFood = Array.from(
    $(".filter-buttons[data-category='food'] .btn.active")
  ).map((btn) => $(btn).data("value"));
  let selectedTime = Array.from(
    $(".filter-buttons[data-category='time'] .btn.active")
  ).map((btn) => $(btn).data("value"));
  let selectedScore = Array.from(
    $(".filter-buttons[data-category='score'] .btn.active")
  ).map((btn) => $(btn).data("value"));
  

  // 기존 마커와 정보 제거
  removeMarkers();
  clearRestaurantInfo();

  // 필터 적용 함수 호출
  applyFilters(maxDistance, selectedFood, selectedTime, selectedScore);

  // 모달 닫기
  closeModal();
});

// 필터 적용 함수
async function applyFilters(maxDistance, food, time, score) {
  if (!userPosition) {
    console.error("사용자 위치 정보를 받지 못했습니다.");
    return;
  }

  try {
    const restaurants = await get_res_info(
      userPosition.latitude,
      userPosition.longitude
    );
    console.log("Fetched restaurants:", restaurants); // 디버깅용

    const filteredRestaurants = restaurants.filter((restaurant) => {
      const restaurantDistance = restaurant.distance / 1000;

      return (
        restaurantDistance <= maxDistance &&
        (food.length === 0 || food.includes(restaurant.category_name)) &&
        (time.length === 0 ||
          (restaurant.opening_hours &&
            time.some((t) => restaurant.opening_hours.includes(t)))) &&
        (score.length === 0 ||
          (restaurant.rating &&
            score.includes(Math.floor(restaurant.rating).toString() + "점")))
      );
    });

    console.log("Filtered restaurants:", filteredRestaurants); // 디버깅용

    // 필터링된 결과를 로컬 스토리지에 저장
    localStorage.setItem('filteredRestaurants', JSON.stringify(filteredRestaurants));
    localStorage.setItem('filterCriteria', JSON.stringify({maxDistance, food, time, score}));

    if (filteredRestaurants.length === 0) {
      showNoResultsMessage();
    } else {
      displayRestaurants(filteredRestaurants);
      adjustMapZoom(maxDistance);
    }
  } catch (error) {
    console.error("Error fetching or filtering restaurants:", error);
    showErrorMessage("레스토랑 정보를 가져오는 중 오류가 발생했습니다.");
  }
}



// 결과가 없을 때 메시지를 표시하는 함수
function showNoResultsMessage() {
  Swal.fire({
    title: '검색 결과가 없습니다',
    text: '다른 필터 조건으로 다시 검색해 보세요.',
    icon: 'info',
    confirmButtonText: '확인'
  }).then((result) => {
    if (result.isConfirmed) {
      // 모달을 다시 열기
      $modal.show();
      $backgroundElements.addClass("blur-background");
    }
  });
}

// 에러 메시지를 표시하는 함수
function showErrorMessage(message) {
  Swal.fire({
    title: '오류',
    text: message,
    icon: 'error',
    confirmButtonText: '확인'
  });
}

// 지도 확대 레벨 조절 함수
function adjustMapZoom(maxDistance) {
  let zoomLevel;
  
  if (maxDistance <= 1) {
    zoomLevel = 5;
  } else if (maxDistance <= 3) {
    zoomLevel = 6;
  } else if (maxDistance <= 5) {
    zoomLevel = 7;
  } else if (maxDistance <= 10) {
    zoomLevel = 8;
  } else {
    zoomLevel = 9;
  }

  map.setLevel(zoomLevel);
}



let distanceSlider = document.getElementById("distanceSlider");
let distanceText = document.getElementById("distanceText");

distanceSlider.addEventListener("input", function () {
  let distance = this.value;
  distanceText.textContent = `1km ~ ${distance}km`;
});
// 지도 확대 레벨 조절 함수
function adjustMapZoom(maxDistance) {
  let zoomLevel;
  
  if (maxDistance <= 1) {
    zoomLevel = 5;
  } else if (maxDistance <= 3) {
    zoomLevel = 6;
  } else if (maxDistance <= 5) {
    zoomLevel = 7;
  } else if (maxDistance <= 10) {
    zoomLevel = 8;
  } else {
    zoomLevel = 9;
  }

  map.setLevel(zoomLevel);
}

function loadSavedFilterResults() {
  const savedRestaurants = localStorage.getItem('filteredRestaurants');
  const savedCriteria = localStorage.getItem('filterCriteria');

  if (savedRestaurants && savedCriteria) {
    const filteredRestaurants = JSON.parse(savedRestaurants);
    const {maxDistance, food, time, score} = JSON.parse(savedCriteria);

    // 필터 UI 업데이트
    $("#distanceSlider").val(maxDistance);
    $("#distanceText").text(`1km ~ ${maxDistance}km`);
    
    $(".filter-buttons[data-category='food'] .btn").removeClass('active');
    food.forEach(f => $(`.filter-buttons[data-category='food'] .btn[data-value="${f}"]`).addClass('active'));

    $(".filter-buttons[data-category='time'] .btn").removeClass('active');
    time.forEach(t => $(`.filter-buttons[data-category='time'] .btn[data-value="${t}"]`).addClass('active'));

    $(".filter-buttons[data-category='score'] .btn").removeClass('active');
    score.forEach(s => $(`.filter-buttons[data-category='score'] .btn[data-value="${s}"]`).addClass('active'));

    // 결과 표시
    if (filteredRestaurants.length > 0) {
      displayRestaurants(filteredRestaurants);
      adjustMapZoom(maxDistance);
    } else {
      showNoResultsMessage();
    }
  }
}