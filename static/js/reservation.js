function initializeMap() {
    let mapOption = {
        center: new kakao.maps.LatLng(37.5665, 126.9780),
        level: 3
    };
    let map = new kakao.maps.Map(document.getElementById('map'), mapOption);

    let marker = new kakao.maps.Marker({
        position: mapOption.center
    });
    marker.setMap(map);

    map.relayout();
    map.setCenter(mapOption.center);
}

function redirectToKakaoMap(address) {
    let webUrl = 'https://map.kakao.com/link/search/' + encodeURIComponent(address);
    window.location = webUrl;
}

$(document).ready(function() {
    $('#locationModal').on('shown.bs.modal', initializeMap);

    document.querySelector('.custom-map-button').addEventListener('click', function() {
        redirectToKakaoMap(document.getElementById('modalAddress').textContent);
    });
});
