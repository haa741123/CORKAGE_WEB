// 마커를 담을 배열
var markers = [];

var mapContainer = document.getElementById('map'), // 지도를 표시할 div 
    mapOption = {
        center: new kakao.maps.LatLng(37.606665, 127.027316), // 지도의 중심좌표
        level: 3 // 지도의 확대 레벨
    };  

// 지도를 생성합니다    
var map = new kakao.maps.Map(mapContainer, mapOption); 

// 장소 검색 객체를 생성합니다
var ps = new kakao.maps.services.Places();  



// 검색 결과 목록이나 마커를 클릭했을 때 장소명을 표출할 인포윈도우를 생성합니다
var infowindow = new kakao.maps.InfoWindow({zIndex:1});


// 키워드로 장소를 검색합니다
ps.keywordSearch('콜키지 무료', placesSearchCB); 

document.addEventListener('DOMContentLoaded', function() {
    // 모든 카테고리 요소에 대한 참조를 가져옵니다.
    const categoryElements = document.querySelectorAll('.category');

    // 각 카테고리 요소에 대해 클릭 이벤트 리스너를 추가합니다.
    categoryElements.forEach(function(element) {
        element.addEventListener('click', function() {
            // 클릭된 요소의 data-val 속성 값을 읽어옵니다.
            const categoryValue = this.getAttribute('data-val');

            // 읽어온 값을 ps.keywordSearch 함수에 전달합니다.
            ps.keywordSearch(categoryValue, placesSearchCB);
        });
    });
});

// 키워드 검색 완료 시 호출되는 콜백함수 입니다
function placesSearchCB (data, status, pagination) {
    if (status === kakao.maps.services.Status.OK) {
        
        // 기존에 생성된 마커 제거
        removeMarkers();

        // 음식점 정보
        console.group("음식점 정보");
        console.log(data);
        console.groupEnd;
        // 검색된 장소 위치를 기준으로 지도 범위를 재설정하기위해
        // LatLngBounds 객체에 좌표를 추가합니다
        let bounds = new kakao.maps.LatLngBounds();

        for (let i=0; i<data.length; i++) {
            displayMarker(data[i]);    
            bounds.extend(new kakao.maps.LatLng(data[i].y, data[i].x));
        }       

        // 검색된 장소 위치를 기준으로 지도 범위를 재설정합니다
        map.setBounds(bounds);
    } 
}

// 지도에 마커를 표시하는 함수입니다
function displayMarker(place) {
    
    
    // 마커를 생성하고 지도에 표시합니다
    let marker = new kakao.maps.Marker({
        map: map,
        position: new kakao.maps.LatLng(place.y, place.x) 
    });

    // 마커에 클릭이벤트를 등록합니다
    kakao.maps.event.addListener(marker, 'click', function() {
        // 마커를 클릭하면 장소명이 인포윈도우에 표출됩니다
        infowindow.setContent('<div style="padding:5px;font-size:12px;">' + place.place_name + '</div>');
        infowindow.open(map, marker);
    });
    // 생성된 마커를 배열에 추가
    markers.push(marker);
}

// 지도에서 모든 마커를 제거하는 함수
function removeMarkers() {
    for (let i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
    // 마커 배열을 비웁니다
    markers = [];
}




// 현재 위치를 저장할 변수
let userPosition;

// 위치 정보를 받아오는 함수
function UserLocation() {
    // 위치 정보를 받아오는데 성공했을 때 실행될 콜백 함수
    function success(position) {
        // 사용자의 현재 위치 정보를 변수에 저장
        userPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        };
        console.log('사용자 위치:', userPosition);

        
        // 위치에 이미지를 표시
        showUserPosition();
        
        
    }

    // 위치 정보를 받아오는데 실패했을 때 실행될 콜백 함수
    function error() {
        console.error('위치 정보를 받아오는데 실패했습니다.');
    }

    // 위치 정보를 요청
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(success, error);
    } else {
        console.error('Geolocation is not supported by this browser');
    }


    
}

// 사용자의 위치에 이미지를 표시하는 함수
function showUserPosition() {
    // 사용자의 현재 위치에 이미지를 표시할 변수
    let imageSrc = '/assets/img/user_icon.png'; // 이미지 경로
    let imageSize = new kakao.maps.Size(64, 69); // 이미지 크기
    let imageOption = { offset: new kakao.maps.Point(27, 69) }; // 이미지 옵션
      
    // 사용자의 현재 위치에 마커 이미지를 생성
    let markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);
    let markerPosition = new kakao.maps.LatLng(userPosition.latitude, userPosition.longitude);
    
    // 마커를 생성하고 지도 위에 표시
    let marker = new kakao.maps.Marker({
        position: markerPosition, 
        image: markerImage
    });
    marker.id = "user_icon";
    marker.setMap(map);
    
    console.log(marker.getPosition());

    
    map.setMaxLevel(12);
}


UserLocation();








