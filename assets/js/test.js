// 마커를 담을 배열입니다
var markers = [];

var mapContainer = document.getElementById('map'), // 지도를 표시할 div 
    mapOption = {
        center: new kakao.maps.LatLng(37.566826, 126.9786567), // 지도의 중심좌표
        level: 2 // 지도의 확대 레벨
    };  

// 지도를 생성합니다    
var map = new kakao.maps.Map(mapContainer, mapOption); 

// 장소 검색 객체를 생성합니다
var ps = new kakao.maps.services.Places();  

// 검색 결과 목록이나 마커를 클릭했을 때 장소명을 표출할 인포윈도우를 생성합니다
var infowindow = new kakao.maps.InfoWindow({zIndex:1});

// 키워드로 장소를 검색합니다
searchPlaces();

// 키워드 검색을 요청하는 함수입니다
function searchPlaces() {

    var keyword = document.getElementById('keyword').value;

    if (!keyword.replace(/^\s+|\s+$/g, '')) {
        alert('키워드를 입력해주세요!');
        return false;
    }

    // 장소검색 객체를 통해 키워드로 장소검색을 요청합니다
    ps.keywordSearch( keyword, placesSearchCB); 
}

// 장소검색이 완료됐을 때 호출되는 콜백함수 입니다
function placesSearchCB(data, status, pagination) {
    if (status === kakao.maps.services.Status.OK) {

        // 키워드 검색 결과 기준 음식점 정보 
        
        searchData = data;
        // 음식점 정보 보내기
        

        // 정상적으로 검색이 완료됐으면
        // 검색 목록과 마커를 표출합니다
        displayPlaces(data);

        // 페이지 번호를 표출합니다
        displayPagination(pagination);

    } else if (status === kakao.maps.services.Status.ZERO_RESULT) {

        alert('검색 결과가 존재하지 않습니다.');
        return;

    } else if (status === kakao.maps.services.Status.ERROR) {

        alert('검색 결과 중 오류가 발생했습니다.');
        return;

    } 

}

// 검색 결과 목록과 마커를 표출하는 함수입니다
function displayPlaces(places) {

    var listEl = document.getElementById('placesList'), 
    menuEl = document.getElementById('menu_wrap'),
    fragment = document.createDocumentFragment(), 
    bounds = new kakao.maps.LatLngBounds(), 
    listStr = '';
    
    // 검색 결과 목록에 추가된 항목들을 제거합니다
    removeAllChildNods(listEl);

    // 지도에 표시되고 있는 마커를 제거합니다
    removeMarker();
    
    for ( var i=0; i<places.length; i++ ) {

        // 마커를 생성하고 지도에 표시합니다
        var placePosition = new kakao.maps.LatLng(places[i].y, places[i].x),
            marker = addMarker(placePosition, i), 
            itemEl = getListItem(i, places[i]); // 검색 결과 항목 Element를 생성합니다
        
            
        useSearchData(marker, "marker");
        // 검색된 장소 위치를 기준으로 지도 범위를 재설정하기위해
        // LatLngBounds 객체에 좌표를 추가합니다
        bounds.extend(placePosition);

        // 마커와 검색결과 항목에 mouseover 했을때
        // 해당 장소에 인포윈도우에 장소명을 표시합니다
        // mouseout 했을 때는 인포윈도우를 닫습니다
        (function(marker, title) {
            kakao.maps.event.addListener(marker, 'mouseover', function() {
                displayInfowindow(marker, title);
            });

            kakao.maps.event.addListener(marker, 'mouseout', function() {
                infowindow.close();
            });

            itemEl.onmouseover =  function () {
                displayInfowindow(marker, title);
            };

            itemEl.onmouseout =  function () {
                infowindow.close();
            };
        })(marker, places[i].place_name);

        fragment.appendChild(itemEl);
    }

    // 검색결과 항목들을 검색결과 목록 Element에 추가합니다
    listEl.appendChild(fragment);
    menuEl.scrollTop = 0;

    // 검색된 장소 위치를 기준으로 지도 범위를 재설정합니다
    map.setBounds(bounds);

}

// 검색결과 항목을 Element로 반환하는 함수입니다
function getListItem(index, places) {

    var el = document.createElement('li'),
    itemStr = '<span class="markerbg marker_' + (index+1) + '"></span>' +
                '<div class="info">' +
                '   <h5>' + places.place_name + '</h5>';

    if (places.road_address_name) {
        itemStr += '    <span>' + places.road_address_name + '</span>' +
                    '   <span class="jibun gray">' +  places.address_name  + '</span>';
    } else {
        itemStr += '    <span>' +  places.address_name  + '</span>'; 
    }
                 
      itemStr += '  <span class="tel">' + places.phone  + '</span>' +
                '</div>';           

    el.innerHTML = itemStr;
    el.className = 'item';

    return el;
}

// 마커를 생성하고 지도 위에 마커를 표시하는 함수입니다
function addMarker(position, idx, title) {
    var imageSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_number_blue.png', // 마커 이미지 url, 스프라이트 이미지를 씁니다
        imageSize = new kakao.maps.Size(36, 37),  // 마커 이미지의 크기
        imgOptions =  {
            spriteSize : new kakao.maps.Size(36, 691), // 스프라이트 이미지의 크기
            spriteOrigin : new kakao.maps.Point(0, (idx*46)+10), // 스프라이트 이미지 중 사용할 영역의 좌상단 좌표
            offset: new kakao.maps.Point(13, 37) // 마커 좌표에 일치시킬 이미지 내에서의 좌표
        },
        markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, imgOptions),
            marker = new kakao.maps.Marker({
            position: position, // 마커의 위치
            image: markerImage 
        });

    marker.setMap(map); // 지도 위에 마커를 표출합니다
    markers.push(marker);  // 배열에 생성된 마커를 추가합니다

    return marker;
}

// 지도 위에 표시되고 있는 마커를 모두 제거합니다
function removeMarker() {
    for ( var i = 0; i < markers.length; i++ ) {
        markers[i].setMap(null);
    }   
    markers = [];
}

// 검색결과 목록 하단에 페이지번호를 표시는 함수입니다
function displayPagination(pagination) {
    var paginationEl = document.getElementById('pagination'),
        fragment = document.createDocumentFragment(),
        i; 

    // 기존에 추가된 페이지번호를 삭제합니다
    while (paginationEl.hasChildNodes()) {
        paginationEl.removeChild (paginationEl.lastChild);
    }

    for (i=1; i<=pagination.last; i++) {
        var el = document.createElement('a');
        el.href = "#";
        el.innerHTML = i;

        if (i===pagination.current) {
            el.className = 'on';
        } else {
            el.onclick = (function(i) {
                return function() {
                    pagination.gotoPage(i);
                }
            })(i);
        }

        fragment.appendChild(el);
    }
    paginationEl.appendChild(fragment);
}

// 검색결과 목록 또는 마커를 클릭했을 때 호출되는 함수입니다
// 인포윈도우에 장소명을 표시합니다
function displayInfowindow(marker, title) {
    var content = '<div style="padding:5px;z-index:1;">' + title + '</div>';

    infowindow.setContent(content);
    infowindow.open(map, marker);
}

 // 검색결과 목록의 자식 Element를 제거하는 함수입니다
function removeAllChildNods(el) {   
    while (el.hasChildNodes()) {
        el.removeChild (el.lastChild);
    }
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
    marker.setMap(map);

    
}

// 사용자의 위치를 받아와 변수에 저장
UserLocation();


// 사용자의 현재 위치를 중심으로 반경 10km의 원을 생성하는 함수
function drawCircle() {
    // 원의 중심 좌표는 유저의 현재 위치
    let circleCenter = new kakao.maps.LatLng(userPosition.latitude, userPosition.longitude); 
    let circleRadius = 10000; // 원의 반지름 (10km를 미터 단위로 설정)
    let circleOptions = {
        center: circleCenter, // 원의 중심 좌표 설정
        radius: circleRadius, // 원의 반지름 설정
        strokeWeight: 2, // 선의 두께 설정
        strokeColor: '#FF0000', // 선의 색상 설정 (빨간색)
        strokeOpacity: 0.8, // 선의 투명도 설정
        strokeStyle: 'solid', // 선의 스타일 설정
        fillColor: '#FF0000', // 원의 채우기 색상 설정 (빨간색)
        fillOpacity: 0.3 // 원의 채우기 투명도 설정
    };

    // 지도에 원을 그립니다.
    let circle = new kakao.maps.Circle(circleOptions);
    circle.setMap(map);

    useSearchData(circle, "circle")
    
}

// 사용자의 위치를 받아와 변수에 저장하고, 원을 그립니다.
function UserLocationAndDrawCircle() {
    // 위치 정보를 받아온 후에 원을 그립니다.
    function success(position) {
        // 사용자의 현재 위치 정보를 변수에 저장
        userPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        };

        // 사용자의 현재 위치를 중심으로 반경 10km의 원을 그립니다.
        drawCircle();
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

// 사용자의 위치를 받아와 변수에 저장하고, 원을 그립니다.
UserLocationAndDrawCircle();










function checkMarkersInCircle(circle, markers) {
    // 원 안에 있는 마커들을 저장할 배열
    let markersInsideCircle = [];

    console.log(markers);

    // 모든 마커들을 순회하면서 원 안에 있는지 확인
    markers.forEach((marker, index) => {
        // 마커의 위치를 가져옴
        let markerPosition = marker.getPosition();

        // 원 안에 있는지 여부를 판단
        let isInsideCircle = kakao.maps.geometry.isPointInCircle(markerPosition, circle);

        // 콘솔에 출력
        console.log(`마커 ${index}: ${isInsideCircle ? '원 안에 있음' : '원 밖에 있음'}`);

        // 원 안에 있는 마커라면 배열에 추가
        if (isInsideCircle) {
            markersInsideCircle.push(marker);
        }
    });

    // 결과를 반환
    return markersInsideCircle;
}

function useSearchData(Data, type) {
    if (type === "marker") {
        let marker_info = Data;
        console.log(marker_info);

    }

    if (type === "circle") {
        let circle_info = Data;
        console.log(circle_info);

        // 음식점 마커들을 원 안에 있는지 확인하고 결과를 콘솔에 출력
        let markersInsideCircle = checkMarkersInCircle(circle_info, marker_info);
        console.log('원 안에 있는 마커들:', markersInsideCircle);
    }
}

// UTM 좌표를 위경도로 변환하는 함수
function utmToLatLng(utmX, utmY) {
    var utmProjection = "EPSG:5179";
    var wgs84Projection = "EPSG:4326";
    var utmCoordinates = [utmX, utmY];
    var wgs84Coordinates = proj4(utmProjection, wgs84Projection, utmCoordinates);
    return {
        latitude: wgs84Coordinates[1],
        longitude: wgs84Coordinates[0]
    };
}
