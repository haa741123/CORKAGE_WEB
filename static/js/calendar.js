document.addEventListener('DOMContentLoaded', function () {
    const calendarBody = document.querySelector('.calendar tbody');
    const monthYearDisplay = document.querySelector('.month-year');
    const prevMonthButton = document.querySelector('.prev-month');
    const nextMonthButton = document.querySelector('.next-month');
    const timeButtons = document.querySelectorAll('.time-picker button');
    const peopleInput = document.getElementById('people');
    let currentDate = new Date();
    let selectedDate = null;
    let selectedTime = null;
    let selectedPeople = 1;  // 기본값 1명

    /**
     * 공휴일 데이터 가져오기
     * @param {number} year - 년도
     * @param {number} month - 월 (0부터 시작)
     * @returns {Promise<Array>} - 주어진 년도와 월의 공휴일 리스트
     */
    const get_Holidays = async function(year, month) {
        try {
            const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/KR`);
            const holidays = await response.json();
            return holidays.filter(holiday => new Date(holiday.date).getMonth() === month);
        } catch (error) {
            console.error('공휴일 데이터를 가져오는 중 오류 발생:', error);
            return [];
        }
    };

    /**
     * 예약 불가일 데이터 생성 (예: 매주 월요일 예약 불가)
     * @param {number} year - 년도
     * @param {number} month - 월 (0부터 시작)
     * @returns {Array<Date>} - 주어진 년도와 월의 예약 불가일 리스트
     */
    const get_UnavailableDates = function(year, month) {
        let unavailableDates = [];
        let date = new Date(year, month, 1);

        while (date.getMonth() === month) {
            if (date.getDay() === 1) { // 월요일
                unavailableDates.push(new Date(date));
            }
            date.setDate(date.getDate() + 1);
        }
        return unavailableDates;
    };

    /**
     * 달력 생성 및 렌더링
     * @param {Date} date - 현재 선택된 날짜
     */
    const get_Calendar = async function(date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        monthYearDisplay.textContent = `${year}년 ${month + 1}월`;
        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();

        let holidays = await get_Holidays(year, month);

        // 기존 캘린더 클리어
        calendarBody.innerHTML = ''; // Clear previous calendar

        let row = document.createElement('tr');
        for (let i = 0; i < firstDay; i++) {
            row.appendChild(document.createElement('td'));
        }

        for (let day = 1; day <= lastDate; day++) {
            let cell = document.createElement('td');
            let currentDay = new Date(year, month, day);
            cell.textContent = day;

            let holiday = holidays.find(holiday => new Date(holiday.date).getDate() === day);

            if (holiday) {
                cell.classList.add('holiday');
                cell.title = holiday.localName;  // 휴일 이름에 대한 도구 설명
                let holidayName = document.createElement('div');
                holidayName.textContent = holiday.localName;
                holidayName.style.fontSize = '10px';  // 글자 크기
                holidayName.style.color = '#d9534f'; // 공휴일 색상
                cell.appendChild(holidayName);
            }

            if (!cell.classList.contains('disabled')) { // 'disabled' 클래스를 제거하고 선택 가능하게 변경
                cell.addEventListener('click', function () {
                    calendarBody.querySelectorAll('td').forEach(td => td.classList.remove('selected'));
                    cell.classList.add('selected');
                    selectedDate = currentDay;
                });
            }

            row.appendChild(cell);
            if ((firstDay + day) % 7 === 0 || day === lastDate) {
                calendarBody.appendChild(row);
                row = document.createElement('tr');
            }
        }
    };

    // 이전/다음 달로 이동
    prevMonthButton.addEventListener('click', function () {
        currentDate.setMonth(currentDate.getMonth() - 1);
        get_Calendar(currentDate);
    });

    nextMonthButton.addEventListener('click', function () {
        currentDate.setMonth(currentDate.getMonth() + 1);
        get_Calendar(currentDate);
    });

    // 시간 선택
    timeButtons.forEach(button => {
        button.addEventListener('click', function () {
            timeButtons.forEach(btn => btn.classList.remove('selected'));
            this.classList.add('selected');
            selectedTime = this.textContent;
        });
    });

    // 인원수 입력 처리
    peopleInput.addEventListener('input', function () {
        selectedPeople = this.value;
    });

    // 예약 제출
    document.querySelector('.submit').addEventListener('click', function () {
        if (selectedDate && selectedTime && selectedPeople > 0) {
            console.log(`예약 정보 - 날짜: ${selectedDate.toLocaleDateString()}, 시간: ${selectedTime}, 인원수: ${selectedPeople}`);
            // 여기에 서버로 데이터를 전송하는 코드를 추가할 수 있습니다.
        } else {
            console.error('날짜, 시간, 인원수를 모두 선택해주세요.');
        }
    });

    get_Calendar(currentDate);
});
