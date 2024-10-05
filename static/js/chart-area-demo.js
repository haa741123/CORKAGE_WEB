// Supabase 설정
const supabaseUrl = 'https://kovzqlclzpduuxejjxwf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdnpxbGNsenBkdXV4ZWpqeHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTg1NTE4NTEsImV4cCI6MjAzNDEyNzg1MX0.A4Vn0QJMKnMe4HAZnT-aEa2r0fL4jHOpKoRHmbls8fQ';
const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

let currentPage = 1;
const itemsPerPage = 6;

/**
 * 예약 정보를 가져오는 비동기 함수
 * @param {number} page - 현재 페이지 번호
 * @param {string} startDate - 시작 날짜 (옵션)
 * @param {string} endDate - 종료 날짜 (옵션)
 * @returns {Promise<{data: object[], count: number}>} - 예약 데이터와 총 항목 수
 */
const fetchReservations = async (page = 1, startDate = null, endDate = null) => {
  try {
    const query = supabase
      .from("reservations")
      .select("id, reservation_date, reservation_time, people_count, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

    if (startDate && endDate) {
      query.gte("reservation_date", startDate).lte("reservation_date", endDate);
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query.gte("reservation_date", thirtyDaysAgo.toISOString().split("T")[0]);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    console.log(data);
    return { data, count };
  } catch (error) {
    console.error("예약 정보 가져오기 오류:", error);
    return { data: null, count: 0 };
  }
};

/**
 * 예약 정보를 화면에 표시하는 함수
 * @param {object[]} reservations - 예약 데이터 배열
 */
const showReservations = (reservations) => {
  const $tableBody = $("#reservationsTable tbody");
  $tableBody.empty();

  if (!reservations || reservations.length === 0) {
    $tableBody.append("<tr><td colspan='4'>예약 정보가 없습니다.</td></tr>");
    return;
  }

  reservations.forEach((reservation) => {
    const row = `
      <tr>
        <td>${reservation.reservation_date || "N/A"}</td>
        <td>${reservation.reservation_time || "N/A"}</td>
        <td>${reservation.people_count || "N/A"}</td>
        <td>${new Date(reservation.created_at).toLocaleString()}</td>
      </tr>`;
    $tableBody.append(row);
  });
};


/**
 * 페이징
 * @param {*} totalItems 
 * @returns 
 */
const setPagination = (totalItems) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (window.totalPages === totalPages) return;
  window.totalPages = totalPages;

  const $paginationEl = $("#pagination");
  $paginationEl.empty();

  const createButton = (text, isActive, onClick, isDisabled = false) => {
    const buttonClass = isActive
      ? 'btn btn-primary mx-1 active'  // 선택된 페이지의 스타일
      : 'btn btn-outline-primary mx-1'; // 일반 페이지 스타일

    const $button = $("<button>")
      .addClass(buttonClass)
      .text(text)
      .on("click", onClick);
    
    if (isDisabled) {
      $button.prop("disabled", true); // 비활성화 처리
    }

    return $button;
  };

  // 이전 버튼 (1페이지에서는 비활성화 및 outline 스타일 적용)
  const $prevButton = createButton("이전", false, () => {
    if (currentPage > 1) {
      currentPage--;
      updateReservations();
      setPagination(totalItems); // 버튼 스타일 재설정
    }
  }, currentPage === 1); // 첫 페이지일 때 비활성화
  $paginationEl.append($prevButton);

  // 페이지 번호 버튼
  for (let i = 1; i <= totalPages; i++) {
    const isActive = i === currentPage;
    const $pageLink = createButton(i, isActive, () => {
      currentPage = i;
      updateReservations();
      setPagination(totalItems); // 버튼 스타일 재설정

      // 클릭 후, 기존의 active와 btn-primary 클래스를 제거하고, 클릭한 버튼에 추가
      $("#pagination .btn").removeClass("active btn-primary").addClass("btn-outline-primary");
      $pageLink.removeClass("btn-outline-primary").addClass("btn-primary active");
    });

    $paginationEl.append($pageLink);
  }

  // 다음 버튼 (마지막 페이지에서는 비활성화 및 outline 스타일 적용)
  const $nextButton = createButton("다음", false, () => {
    if (currentPage < totalPages) {
      currentPage++;
      updateReservations();
      setPagination(totalItems); // 버튼 스타일 재설정
    }
  }, currentPage === totalPages); // 마지막 페이지일 때 비활성화
  $paginationEl.append($nextButton);

  // 이전 버튼 색상 설정
  if (currentPage === 1) {
    $prevButton.removeClass("btn-primary").addClass("btn-outline-primary");
    $nextButton.removeClass("btn-outline-primary").addClass("btn-primary");
  } 
  // 마지막 페이지일 경우 다음 버튼 색상 설정
  else if (currentPage === totalPages) {
    $prevButton.removeClass("btn-outline-primary").addClass("btn-primary");
    $nextButton.removeClass("btn-primary").addClass("btn-outline-primary");
  } 
  // 중간 페이지일 경우
  else {
    $prevButton.removeClass("btn-outline-primary").addClass("btn-primary");
    $nextButton.removeClass("btn-outline-primary").addClass("btn-primary");
  }
};










/**
 * 예약 정보 업데이트 함수
 * @returns {Promise<void>}
 */
const updateReservations = async (startDate = null, endDate = null) => {
  const { data: reservations, count: totalItems } = await fetchReservations(currentPage, startDate, endDate);
  showReservations(reservations);
  setPagination(totalItems);
};

/**
 * 차트 업데이트 함수
 * @returns {Promise<void>}
 */
const updateChart = async () => {
  const { data: rawData } = await fetchReservations();
  if (!rawData) return console.error("차트 데이터를 불러올 수 없습니다.");
  const processedData = processChartData(rawData);
  if (!Object.keys(processedData).length) return console.error("처리된 차트 데이터가 없습니다.");

  const labels = Object.keys(processedData);
  const data = Object.values(processedData);
  const ctx = $("#myAreaChart")[0];

  if (window.myChart) window.myChart.destroy();

  window.myChart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets: [{ label: "예약 수", data }] },
    options: { maintainAspectRatio: false }
  });
};

/**
 * 기간으로 예약을 검색하는 함수
 * @returns {Promise<void>}
 */
const searchByPeriod = async () => {
  const dateRange = $('#dateRange').val();
  const [startDate, endDate] = dateRange.split(' - ');

  if (!startDate || !endDate) {
    alert('시작 날짜와 종료 날짜를 모두 선택해주세요.');
    return;
  }

  await updateReservations(startDate, endDate);
};


/**
 * 차트 데이터를 처리하는 함수
 * @param {object[]} data - 예약 데이터 배열
 * @returns {object} 날짜별 예약 수 데이터
 */
const processChartData = (data) => {
  return data.reduce((acc, { reservation_date }) => {
    const date = new Date(reservation_date).toISOString().split("T")[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});
};

/**
 * 초기화 함수
 * @returns {Promise<void>}
 */
const initialize = async () => {
  try {
    await updateReservations();
    await updateChart();

    $('#dateRange').daterangepicker({
      locale: {
        format: 'YYYY-MM-DD',
        customRangeLabel: '직접 선택'  // 'Custom Range'를 '직접 선택'으로 변경
      },
      startDate: moment().startOf('month'),  // 이번 달의 첫째 날
      endDate: moment().endOf('month'),      // 이번 달의 마지막 날
      ranges: {
        '이번 주': [moment().startOf('week'), moment().endOf('week')],       // 이번 주
        '저번 주': [moment().subtract(1, 'weeks').startOf('week'), moment().subtract(1, 'weeks').endOf('week')], // 저번 주
        '이번 달': [moment().startOf('month'), moment().endOf('month')],     // 이번 달
        '저번 달': [moment().subtract(1, 'months').startOf('month'), moment().subtract(1, 'months').endOf('month')] // 저번 달
      }
    });
    
    
    

    
  } catch (error) {
    console.error("초기화 오류:", error);
  }
};

// DOM 로드 완료 시 초기화 실행
$(document).ready(initialize);
