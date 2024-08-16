let markers = [];
let selectedMarker = null;
let mapContainer = document.getElementById("map");
let mapOption = {
  center: new kakao.maps.LatLng(37.606665, 127.027316),
  level: 12,
};
let map = new kakao.maps.Map(mapContainer, mapOption);  
let ps = new kakao.maps.services.Places();
let infowindow = new kakao.maps.InfoWindow({ zIndex: 1 });
let isSearchInProgress = false;
let userPosition = null;  // 초기에는 null로 설정

// 문서가 로드된 후 실행되는 함수
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.category').forEach(category => {
    category.addEventListener('click', function () {
      searchPlaces(this.getAttribute('data-val'));
    });
    getUserLocation();

    $('#my_loc_img').on('click', function() {
        if (userPosition) {  // userPosition이 설정된 경우에만 moveMyloc 호출
            moveMyloc();  
        } else {
            console.error("User position is not available yet.");
        }
    });
  });
});

/** 사용자의 현재 위치로 지도를 이동시키는 함수 */
let moveMyloc = function() {
  if (userPosition) {
    let moveLatLon = new kakao.maps.LatLng(userPosition.latitude, userPosition.longitude);
    map.panTo(moveLatLon);  // 부드럽게 지도 이동
  } else {
    console.error("User position is not available.");
  }
}

/** 카테고리 이름에 따라 이미지 경로를 반환하는 함수 */
let getImageSrc = function(categoryName) {
  if (categoryName.includes("한식")) return "/static/img/kor_food.png";
  if (categoryName.includes("회") || categoryName.includes("돈까스"))
    return "/static/img/cutlet_sashimi.png";
  if (categoryName.includes("중식")) return "/static/img/ch_food.png";
  if (categoryName.includes("양식")) return "/static/img/fast_food.png";
  return "/static/img/cork_restaurant.jpg";
}

/** 키워드를 사용하여 장소를 검색하는 함수 */
let searchPlaces = function(keyword) {
  if (!isSearchInProgress) {
    isSearchInProgress = true;
    ps.keywordSearch(keyword, placesSearchCB);
  }
}

/** 장소 검색 결과를 처리하는 콜백 함수 - 수정하지마 제발 */
let placesSearchCB = function(data, status) {
  isSearchInProgress = false;
  if (status === kakao.maps.services.Status.OK) {
    removeMarkers();
    let bounds = new kakao.maps.LatLngBounds();
    let allPlacesInfo = data
      .map((place, index) => {
        displayMarker(place, index);
        bounds.extend(new kakao.maps.LatLng(place.y, place.x));
        return generatePlaceInfo(place, index);
      })
      .join("");

    if (userPosition) {
      let userLatLng = new kakao.maps.LatLng(
        userPosition.latitude,
        userPosition.longitude
      );
      bounds.extend(userLatLng);
    }

    map.setBounds(bounds);
    document.getElementById("restaurantInfo").innerHTML = allPlacesInfo;
    document.getElementById("infoContainer").style.display = "block";
  } else {
    console.error("Places search callback failed with status:", status);
  }
}

/** 장소에 마커를 표시하는 함수 - 수정하지마 제발*/
let displayMarker = function(place, index) {
  let marker = createMarker(place);
  kakao.maps.event.addListener(marker, "click", function () {
    if (selectedMarker) {
      setMarkerImage(selectedMarker, marker.originalImageSrc);
      if (selectedMarker.customOverlay) {
        selectedMarker.customOverlay.setMap(null);
      }
    }

    let content = `<div style="padding:5px;z-index:1;background-color:white;border:1px solid black;border-radius:5px;font-size:12px;">${place.place_name}</div>`;
    let customOverlay = new kakao.maps.CustomOverlay({
      content: content,
      position: new kakao.maps.LatLng(place.y, place.x),
      yAnchor: 1.5,
    });
    customOverlay.setMap(map);

    marker.customOverlay = customOverlay;
    setMarkerImage(marker, "/static/img/click_mark.jpg", 1.2);

    document
      .getElementById(`res_info_${index}`)
      .scrollIntoView({ behavior: "smooth", block: "center" });
    selectedMarker = marker;
  });

  markers.push(marker);
}

/** 마커 이미지를 설정하는 함수 */
let setMarkerImage = function(marker, imageSrc, scale = 1) {
  let imageSize = calculateMarkerSize(scale);
  let markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, {
    offset: new kakao.maps.Point(imageSize.width / 2, imageSize.height),
  });
  marker.setImage(markerImage);
}

/** 장소 정보를 바탕으로 마커를 생성하는 함수 */
let createMarker = function(place) {
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
}

/** 지도 레벨에 따라 마커 크기를 계산하는 함수 */
let calculateMarkerSize = function(scale = 1) {
  let level = map.getLevel();
  let size = 24 + (((48 - 24) * (10 - level)) / 9) * scale;
  return new kakao.maps.Size(size, size * 1.2);
}

/** 장소 정보를 HTML 형식으로 생성하는 함수 */
let generatePlaceInfo = function(place, index) {
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

  return `
    <div id="res_info_${index}" class="res_info" 
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
                    <img src="${place.image_url}" alt="${
    place.place_name
  }" class="cover-image">
                </div>
            </div>
            <div class="col-8 info-container">
                <p class="place-name">
                    <img src="${categoryImageSrc}" alt="${
    place.category_name
  }" class="category-icon"> 
                    ${place.place_name}
                    <span class="bookmark-icon">
                      <img src="/static/img/Bookmark.png" alt="즐겨찾기 아이콘">
                    </span>
                </p>
                <div class="tag-container">
                    <span class="tag red">콜키지 프리</span>
                    <span class="tag black">3병 제한</span>
                </div>
                <p class="description">"숙성된 자연산 사시미와 스시를 즐길..."</p>
                <p class="rating">평점: 4.5</p>
            </div>
        </div>
    </div>
  `;
}

// 장소 정보 클릭 시 상세 페이지로 이동하는 함수
document.addEventListener('click', function (event) {
  let target = event.target.closest('.res_info');

  if (target) {
    let placeName = target.getAttribute("data-place_name");
    let addressName = target.getAttribute("data-address_name");
    let phone = target.getAttribute("data-phone");
    let distance = target.getAttribute("data-distance");
    let walkingTime = target.getAttribute("data-walking_time");
    let drivingTime = target.getAttribute("data-driving_time");
    let categoryName = target.getAttribute("data-category_name");
    window.location.href = `/details?place_name=${encodeURIComponent(
      placeName
    )}&address_name=${encodeURIComponent(
      addressName
    )}&phone=${encodeURIComponent(phone)}&distance=${encodeURIComponent(
      distance
    )}&walking_time=${encodeURIComponent(
      walkingTime
    )}&driving_time=${encodeURIComponent(
      drivingTime
    )}&category_name=${encodeURIComponent(categoryName)}`;
  }
});

/** 지도에서 마커를 제거하는 함수 */
let removeMarkers = function() {
  markers.forEach(marker => marker.setMap(null));
  markers = [];
  selectedMarker = null;
}

/** 두 지점 간의 거리를 계산하는 함수 */
let calculateDistance = function(lat1, lon1, lat2, lon2) {
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
}

/** 거리와 속도를 사용해 시간을 계산하는 함수 */
let calculateTime = function(distance, speed) {
  return distance / speed;
}

/** 시간을 형식에 맞게 포맷하는 함수 */
let formatTime = function(time) {
  let hours = Math.floor(time);
  let minutes = Math.round((time - hours) * 60);
  return hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
}

/** 사용자 위치를 가져오는 함수 */
let getUserLocation = function() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        console.log("User position set:", userPosition);
        showUserPosition();  // 위치가 설정된 후 마커 표시
        moveMyloc();  // 위치가 설정된 후 지도를 이동
        searchPlaces("돈까스");
      },
      (error) => {
        console.error("위치 정보를 받아오는데 실패했습니다.", error);
        searchPlaces("돈까스");
      }
    );
  } else {
    console.log("Cannot access browser geolocation. Waiting for Flutter location...");
  }
}

// 플러터에서 전달된 위치 정보를 처리하는 함수
function handleFlutterLocation(latitude, longitude) {
  userPosition = {
    latitude: latitude,
    longitude: longitude,
  };
  console.log("Flutter provided user position:", userPosition);
  showUserPosition();  // 위치가 설정된 후 마커 표시
  moveMyloc();  // 위치가 설정된 후 지도를 이동
  searchPlaces("돈까스");
}


/** 사용자 위치를 지도에 표시하는 함수 */
let showUserPosition = function() {
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
}

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
$btn.on("click", function() {
  $modal.show();
  $backgroundElements.addClass('blur-background');
  loadScript("/static/js/filter.js");
});

// 모달창을 닫는 함수
function closeModal() {
  $modal.hide();
  $backgroundElements.removeClass('blur-background');
  $("script[src='/static/js/filter.js']").remove();
}
