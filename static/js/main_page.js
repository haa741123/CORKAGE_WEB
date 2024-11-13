let latitude, longitude;
let userPosition;

// 근처 음식점 데이터를 가져오는 함수
async function fetchNearbyRestaurants() {
  try {
    const response = await fetch("/api/v1/get_Nearest_Restaurants", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ latitude, longitude, limit_count: 10 }),
    });

    if (!response.ok) {
      throw new Error("서버 응답이 실패했습니다.");
    }

    const result = await response.json();
    displayNearbyRestaurants(result.data);
  } catch (error) {
    console.error("근처 음식점 데이터를 가져오는 중 오류 발생:", error);
  }
}

function displayNearbyRestaurants(restaurants) {
  const container = $(".popular-restaurants .restaurant-list");
  container.empty();

  restaurants.forEach((restaurant) => {
    let tagsArray = [];
    if (restaurant.tags) {
      if (typeof restaurant.tags === "string") {
        try {
          tagsArray = JSON.parse(
            restaurant.tags
              .replace(/^{/, "[")
              .replace(/}$/, "]")
              .replace(/\\/g, "")
          );
        } catch (e) {
          tagsArray = restaurant.tags.split(",").map((tag) => tag.trim());
        }
      } else if (Array.isArray(restaurant.tags)) {
        tagsArray = restaurant.tags;
      } else {
        console.error("Unsupported tags format:", restaurant.tags);
      }
    }

    const tagsHtml = tagsArray
      .map((tag) => `<span class="tag red">${tag}</span>`)
      .join("");

    const item = `
        <div class="restaurant-item">
          <img src="${
            restaurant.image_url || "/static/img/res_sample_img.jpg"
          }" alt="${restaurant.place_name}">
          <p class="restaurant-name">${restaurant.place_name}</p>
          <div class="restaurant-tags">${tagsHtml}</div>
        </div>
      `;
    container.append(item);
  });
}

// 사용자 위치 정보를 처리하는 함수
async function processUserLocation() {
  if (userPosition) {
    latitude = userPosition.latitude;
    longitude = userPosition.longitude;
    try {
      await fetchNearbyRestaurants();
    } catch (error) {
      console.error("음식점 데이터를 가져오는 중 오류 발생:", error);
    }
  } else {
    console.log("사용자 위치 정보가 아직 없습니다.");
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
      }
    );
  } else {
    console.log(
      "브라우저 지오로케이션에 액세스할 수 없습니다. Flutter 위치를 기다리는 중..."
    );
  }
};

// Flutter에서 전달된 위치 정보를 처리하는 함수
async function handleFlutterLocation(lat, long) {
  userPosition = {
    latitude: lat,
    longitude: long,
  };
  console.log("Flutter에서 제공한 사용자 위치:", userPosition);
  await processUserLocation();
}

// 와인 추천 API 호출 함수
const fetchRec = async (action, uid) => {
  try {
    console.log("Fetching recommendations for:", action, uid);
    const res = await $.ajax({
      url: "/api/v1/recommendations",
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify({ message: action, user_id: uid }),
    });
    console.log("API response:", res);
    return res;
  } catch (err) {
    console.error("API 호출 실패:", err);
    console.error("Error details:", err.responseText);
    throw new Error("와인 추천 정보를 불러오는데 문제가 발생했습니다.");
  }
};

const updateWineInfo = (data) => {
  console.log("Updating wine info with data:", data);
  r = data.response;
  console.log("Wine data:", r);
  $("#drink_name").text(r.drink_name);
  $("#drink_desc").text(r.drink_desc);
  $("#wine-image").attr("src", r.image_url);
  console.log("Wine info updated");
};

// 추천된 와인 정보를 가져와서 UI 업데이트
const loadRec = async (action, uid) => {
  try {
    const data = await fetchRec(action, uid);
    updateWineInfo(data);
  } catch (err) {
    console.error(err.message);
    alert(err.message);
  }
};

// 쿠키에서 특정 값을 가져오는 함수
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(";").shift();
  }
  return null;
}

// 초기화 함수
function initializePage() {
  getUserLocation();
  const action = "rec_wine_list";
  const uid = getCookie("user_id");
  if (uid) {
    loadRec(action, uid);
    console.log("User ID from cookie:", getCookie("user_id"));
  } else {
    console.error("user_id 쿠키가 존재하지 않습니다.");
  }
}

// 페이지 로드 시 초기화
$(document).ready(initializePage);
