// Supabase 클라이언트 라이브러리를 불러옵니다.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Supabase 클라이언트를 초기화합니다.
const supabase = createClient(
  "https://kovzqlclzpduuxejjxwf.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdnpxbGNsenBkdXV4ZWpqeHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTg1NTE4NTEsImV4cCI6MjAzNDEyNzg1MX0.A4Vn0QJMKnMe4HAZnT-aEa2r0fL4jHOpKoRHmbls8fQ"
);

// 페이지네이션을 위한 전역 변수를 설정합니다.
let currentPage = 1;
const itemsPerPage = 6;

// 예약 정보를 가져오는 비동기 함수입니다.
async function fetchReservations(page = 1) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error, count } = await supabase
      .from("reservations")
      .select(
        "id, reservation_date, reservation_time, people_count, created_at",
        { count: "exact" }
      )
      .gte("reservation_date", thirtyDaysAgo.toISOString().split("T")[0])
      .order("created_at", { ascending: false })
      .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

    if (error) throw error;
    return { data, count };
  } catch (error) {
    console.error("예약 정보 가져오기 오류:", error);
    return { data: null, count: 0 };
  }
}

 // 기간으로 예약 검색하는 함수
 async function searchReservationsByPeriod() {
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

  if (!startDate || !endDate) {
      alert('시작 날짜와 종료 날짜를 모두 선택해주세요.');
      return;
  }

  try {
      const { data, error, count } = await supabase
          .from("reservations")
          .select("id, reservation_date, reservation_time, people_count, created_at", { count: "exact" })
          .gte("reservation_date", startDate)
          .lte("reservation_date", endDate)
          .order("created_at", { ascending: false });

      if (error) throw error;

      displayReservations(data);
      updatePagination(1, Math.ceil(count / itemsPerPage));
  } catch (error) {
      console.error("기간 검색 오류:", error);
  }
}

// 예약 정보를 화면에 표시하는 함수입니다.
function displayReservations(reservations) {
  const reservationsTableBody = document.querySelector(
    "#reservationsTable tbody"
  );
  if (!reservationsTableBody) {
    console.error("예약 정보를 표시할 테이블을 찾을 수 없습니다.");
    return;
  }

  reservationsTableBody.innerHTML = "";
  if (!reservations || reservations.length === 0) {
    reservationsTableBody.innerHTML =
      "<tr><td colspan='4'>예약 정보가 없습니다.</td></tr>";
    return;
  }

  reservations.forEach((reservation) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${reservation.reservation_date || "N/A"}</td>
      <td>${reservation.reservation_time || "N/A"}</td>
      <td>${reservation.people_count || "N/A"}</td>
      <td>${new Date(reservation.created_at).toLocaleString()}</td>
    `;
    reservationsTableBody.appendChild(row);
  });
}

// 페이지네이션 설정 함수입니다.
function setupPagination(totalItems) {
  const paginationElement = document.getElementById("pagination");
  paginationElement.innerHTML = "";

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // 이전 페이지 버튼
  const prevButton = document.createElement("button");
  prevButton.textContent = "이전";
  prevButton.disabled = currentPage === 1;
  prevButton.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      updateReservations();
    }
  });
  paginationElement.appendChild(prevButton);

  // 페이지 번호 버튼
  for (let i = 1; i <= totalPages; i++) {
    const pageLink = document.createElement("button");
    pageLink.textContent = i;
    pageLink.classList.add("page-link");
    if (i === currentPage) {
      pageLink.classList.add("active");
    }
    pageLink.addEventListener("click", () => {
      currentPage = i;
      updateReservations();
    });
    paginationElement.appendChild(pageLink);
  }

  // 다음 페이지 버튼
  const nextButton = document.createElement("button");
  nextButton.textContent = "Next";
  nextButton.disabled = currentPage === totalPages;
  nextButton.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      updateReservations();
    }
  });
  paginationElement.appendChild(nextButton);
}

// 예약 정보를 업데이트하는 함수입니다.
async function updateReservations() {
  const { data: reservations, count: totalItems } = await fetchReservations(
    currentPage
  );
  displayReservations(reservations);
  setupPagination(totalItems);
}

// 예약 차트를 생성하는 함수입니다.
async function createReservationChart() {
  const { data: rawData } = await fetchReservations();

  if (!rawData) {
    console.error("No data available for chart");
    return;
  }

  const processedData = processChartData(rawData);

  if (Object.keys(processedData).length === 0) {
    console.error("No processed data available for chart");
    return;
  }

  const labels = Object.keys(processedData);
  const data = Object.values(processedData);

  var ctx = document.getElementById("myAreaChart");

  // 기존 차트가 있다면 제거합니다.
  if (window.myChart) {
    window.myChart.destroy();
  }

  window.myChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "예약 수",
          lineTension: 0.3,
          backgroundColor: "rgba(249,180,188,0.08)",
          borderColor: "rgba(208, 39, 59, 1)",
          pointRadius: 3,
          pointBackgroundColor: "rgba(208, 39, 59, 1)",
          pointBorderColor: "rgba(208, 39, 59, 1)",
          pointHoverRadius: 3,
          pointHoverBackgroundColor: "rgba(78,115,223,1)",
          pointHoverBorderColor: "rgba(78,115,223,1)",
          pointHitRadius: 10,
          pointBorderWidth: 2,
          data: data,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      layout: {
        padding: {
          left: 10,
          right: 25,
          top: 25,
          bottom: 0,
        },
      },
      scales: {
        xAxes: [
          {
            time: { unit: "date" },
            gridLines: { display: false, drawBorder: false },
            ticks: { maxTicksLimit: 7 },
          },
        ],
        yAxes: [
          {
            ticks: {
              maxTicksLimit: 5,
              padding: 10,
              callback: function (value, index, values) {
                return number_format(value);
              },
            },
            gridLines: {
              color: "rgb(234,236,244)",
              zeroLineColor: "rgb(234,236,244)",
              drawBorder: false,
              borderDash: [2],
              zeroLineBorderDash: [2],
            },
          },
        ],
      },
      legend: { display: false },
      tooltips: {
        backgroundColor: "rgb(255,255,255)",
        bodyFontColor: "#858796",
        titleMarginBottom: 10,
        titleFontColor: "#6e707e",
        titleFontSize: 14,
        borderColor: "#dddfeb",
        borderWidth: 1,
        xPadding: 15,
        yPadding: 15,
        displayColors: false,
        intersect: false,
        mode: "index",
        caretPadding: 10,
        callbacks: {
          label: function (tooltipItem, chart) {
            var datasetLabel =
              chart.datasets[tooltipItem.datasetIndex].label || "";
            return datasetLabel + ": " + number_format(tooltipItem.yLabel);
          },
        },
      },
    },
  });
}

// 차트 데이터를 처리하는 함수입니다.
function processChartData(data) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.error("Invalid or empty data received");
    return {};
  }

  const dailyData = {};
  data.forEach((item) => {
    const date = new Date(item.reservation_date);
    const dateString = date.toISOString().split("T")[0];
    dailyData[dateString] = (dailyData[dateString] || 0) + 1;
  });

  return Object.entries(dailyData)
    .sort(([a], [b]) => new Date(a) - new Date(b))
    .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
}

// 숫자 포맷팅 함수입니다.
function number_format(number) {
  return new Intl.NumberFormat().format(number);
}

// 실시간 업데이트를 설정하는 함수입니다.
function setupRealtimeUpdates() {
  supabase
    .channel("public:reservations")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "reservations" },
      async (payload) => {
        await updateReservations();
        await createReservationChart();
        handleNewReservation(payload);
      }
    )
    .subscribe();
}

// 초기화 및 차트 생성 함수입니다.
async function initializeAndCreateChart() {
  try {
    await updateReservations();
    await createReservationChart();
    setupRealtimeUpdates();
  } catch (error) {
    console.error("초기화 중 오류 발생:", error);
  }
}

// 새 예약을 처리하는 함수입니다.
function handleNewReservation(payload) {
  const newReservation = payload.new;
  showNotificationPopup(newReservation);
}

// 알림 팝업을 표시하는 함수입니다.
function showNotificationPopup(reservation) {
  const popup = document.getElementById("alertsDropdown");
  const message = document.getElementById("notificationMessage");
  const closeButton = document.getElementById("closeNotification");

  if (!popup || !message || !closeButton) {
    console.error("알림 팝업 요소를 찾을 수 없습니다.");
    return;
  }

  message.textContent = `새로운 예약이 등록되었습니다: ${reservation.reservation_date} ${reservation.reservation_time}`;
  popup.style.display = "block";

  closeButton.onclick = function () {
    popup.style.display = "none";
  };

  // 10초 후 자동으로 팝업 닫기
  setTimeout(() => {
    popup.style.display = "none";
  }, 10000);

  // 알림 카운터 업데이트
  updateNotificationCounter(1);
}

// 알림 카운터를 업데이트하는 함수입니다.
function updateNotificationCounter(change) {
  const counter = document.querySelector("#alertsDropdown .badge-counter");
  if (counter) {
    let currentCount = parseInt(counter.textContent) || 0;
    currentCount += change;
    counter.textContent = currentCount > 0 ? currentCount : "";
    counter.style.display = currentCount > 0 ? "inline-block" : "none";
  }
}

// DOM이 로드되면 실행되는 함수입니다.
document.addEventListener("DOMContentLoaded", async function () {
  await initializeAndCreateChart();

  // 알림 닫기 버튼 이벤트 리스너
  document
    .getElementById("closeNotification")
    .addEventListener("click", function (e) {
      e.preventDefault();
      document.getElementById("notificationPopup").style.display = "none";
    });
});
