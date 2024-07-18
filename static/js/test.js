var markers = [];
var selectedMarker = null;
var mapContainer = document.getElementById('map');
var mapOption = {
  center: new kakao.maps.LatLng(37.606665, 127.027316),
  level: 3,
};

var map = new kakao.maps.Map(mapContainer, mapOption);
var ps = new kakao.maps.services.Places();
var infowindow = new kakao.maps.InfoWindow({ zIndex: 1 });

let isSearchInProgress = false;

function searchPlaces(keyword) {
  if (!isSearchInProgress) {
    isSearchInProgress = true;
    ps.keywordSearch(keyword, placesSearchCB);
  }
}

$(document).ready(function () {
  $(".category").on("click", function () {
    const categoryValue = $(this).data("val");
    searchPlaces(categoryValue);
  });

  // 초기 검색 실행은 위치가 확인된 후로 이동
});

function placesSearchCB(data, status, pagination) {
  isSearchInProgress = false;

  if (status === kakao.maps.services.Status.OK) {
    removeMarkers();
    let bounds = new kakao.maps.LatLngBounds();

    var allPlacesInfo = "";

    for (let i = 0; i < data.length; i++) {
      displayMarker(data[i], i);
      bounds.extend(new kakao.maps.LatLng(data[i].y, data[i].x));
      allPlacesInfo += generatePlaceInfo(data[i], i);
    }

    if (userPosition && userPosition.latitude && userPosition.longitude) {
      let userLatLng = new kakao.maps.LatLng(userPosition.latitude, userPosition.longitude);
      bounds.extend(userLatLng);
    }

    map.setBounds(bounds);
    $("#restaurantInfo").html(allPlacesInfo);
    $("#infoContainer").show();
  } else {
    console.error("Places search callback failed with status:", status);
  }
}

function displayMarker(place, index) {
  let marker = createMarker(place);

  kakao.maps.event.addListener(marker, "click", function () {
    if (selectedMarker) {
      resetMarkerImage(selectedMarker);
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
    changeMarkerImage(marker);

    let resInfoElement = document.getElementById(`res_info_${index}`);
    if (resInfoElement) {
      resInfoElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    selectedMarker = marker;
  });

  markers.push(marker);
}

function changeMarkerImage(marker) {
  let clickedImageSrc = "/static/img/click_mark.jpg";

  let imageSize = calculateMarkerSize();
  let clickedImageSize = new kakao.maps.Size(imageSize.width * 1.2, imageSize.height * 1.2);
  let imageOption = {
    offset: new kakao.maps.Point(clickedImageSize.width / 2, clickedImageSize.height),
  };

  let markerImage = new kakao.maps.MarkerImage(clickedImageSrc, clickedImageSize, imageOption);
  marker.setImage(markerImage);
}

function resetMarkerImage(marker) {
  let originalImageSrc = marker.originalImageSrc;
  let imageSize = calculateMarkerSize();
  let imageOption = {
    offset: new kakao.maps.Point(imageSize.width / 2, imageSize.height),
  };

  let markerImage = new kakao.maps.MarkerImage(originalImageSrc, imageSize, imageOption);
  marker.setImage(markerImage);
}

function createMarker(place) {
  let imageSrc = "/static/img/cork_restaurant.jpg";
  
  if (place.category_name.includes("한식")) {
    imageSrc = "/static/img/kor_food.png";
  } else if (place.category_name.includes("회") || place.category_name.includes("돈까스")) {
    imageSrc = "/static/img/cutlet_sashimi.png";
  } else if (place.category_name.includes("중식")) {
    imageSrc = "/static/img/ch_food.png";
  } else if (place.category_name.includes("양식")) {
    imageSrc = "/static/img/fast_food.png";
  }

  let imageSize = calculateMarkerSize();
  let imageOption = {
    offset: new kakao.maps.Point(imageSize.width / 2, imageSize.height),
  };

  let markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);
  let markerPosition = new kakao.maps.LatLng(place.y, place.x);

  let marker = new kakao.maps.Marker({
    map: map,
    position: markerPosition,
    image: markerImage,
  });

  marker.originalImageSrc = imageSrc;

  return marker;
}

function calculateMarkerSize() {
  let level = map.getLevel();
  let minSize = 24;
  let maxSize = 48;
  let size = minSize + ((maxSize - minSize) * (10 - level)) / 9;
  return new kakao.maps.Size(size, size * 1.2);
}

function generatePlaceInfo(place, index) {
  var distance = 0;
  var walkingTime = "알 수 없음";
  var drivingTime = "알 수 없음";

  if (userPosition && userPosition.latitude && userPosition.longitude) {
    distance = calculateDistance(userPosition.latitude, userPosition.longitude, place.y, place.x);
    walkingTime = formatTime(calculateTime(distance, 4));
    drivingTime = formatTime(calculateTime(distance, 40));
  }

  var infoHTML = `
      <div id="res_info_${index}" class="res_info" style="padding: 5px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9; max-width: 100%; box-sizing: border-box; margin-bottom: 10px;">
          <p style="margin: 0; font-weight: bold; font-size: 16px;">${place.place_name}</p>
          <p style="margin: 5px 0; color: #555;"><strong>위치:</strong> ${place.address_name}</p>
          <p style="margin: 5px 0; color: #555;"><strong>전화번호:</strong> ${place.phone}</p>
          <p style="margin: 5px 0; color: #555;">
              <strong>거리:</strong> ${distance.toFixed(2)} km 
              <span style="font-size: 12px; color: #777;">
                  ( 도보: ${walkingTime}, 차량: ${drivingTime} )
              </span>
          </p>
          <p class="res_loc" style="margin: 5px 0; color: #555;"><strong>업종:</strong> ${place.category_name}</p>
      </div>
    `;

  return infoHTML;
}

$(document).ready(function () {
  $("#restaurantInfo").on("click", ".res_info", function () {
    // 클릭 시 높이 변경 기능 제거
  });
});

function removeMarkers() {
  for (let i = 0; i < markers.length; i++) {
    markers[i].setMap(null);
  }
  markers = [];
  selectedMarker = null;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * (Math.PI / 180);
  var dLon = (lon2 - lon1) * (Math.PI / 180);
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return d;
}

function calculateTime(distance, speed) {
  return distance / speed;
}

function formatTime(time) {
  var hours = Math.floor(time);
  var minutes = Math.round((time - hours) * 60);
  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  } else {
    return `${minutes}분`;
  }
}

let userPosition;

function UserLocation() {
  function success(position) {
    userPosition = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };

    showUserPosition();
    searchPlaces("돈까스");
  }

  function error() {
    console.error("위치 정보를 받아오는데 실패했습니다.");
    searchPlaces("돈까스");
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(success, error);
  } else {
    console.error("이 브라우저는 지오로케이션을 지원하지 않습니다.");
    searchPlaces("돈까스");
  }
}

function showUserPosition() {
  let imageSrc = "/static/img/user_icon.png";
  let imageSize = new kakao.maps.Size(44, 49);
  let imageOption = { offset: new kakao.maps.Point(27, 69) };

  let markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);
  let markerPosition = new kakao.maps.LatLng(userPosition.latitude, userPosition.longitude);

  let marker = new kakao.maps.Marker({
    position: markerPosition,
    image: markerImage,
  });
  marker.id = "user_icon";
  marker.setMap(map);

  map.setMaxLevel(12);
}

kakao.maps.event.addListener(map, "zoom_changed", function () {
  updateMarkerSizes();
});

function updateMarkerSizes() {
  for (let i = 0; i < markers.length; i++) {
    let marker = markers[i];
    let imageSrc = marker.originalImageSrc;
    let imageSize = calculateMarkerSize();
    let imageOption = {
      offset: new kakao.maps.Point(imageSize.width / 2, imageSize.height),
    };

    let markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);
    marker.setImage(markerImage);
  }
}

UserLocation();
