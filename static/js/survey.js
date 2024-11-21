

// X 버튼 클릭 시 안내 문구 숨김
document.getElementById("close-guide").addEventListener("click", () => {
    document.getElementById("guide").style.display = "none";
});

// 음료 종류를 나타내는 노드와 노드 간의 관계를 나타내는 링크
const data = {
    nodes: [
        { id: "맥주" }, { id: "라거" }, { id: "페일에일" }, { id: "스타우트" }, { id: "IPA" }, { id: "필스너" }, { id: "포터" },
        { id: "와인" }, { id: "레드와인" }, { id: "화이트와인" }, { id: "로제" }, { id: "스파클링와인" }, { id: "디저트와인" },
        { id: "칵테일" }, { id: "마티니" }, { id: "마가리타" }, { id: "모히토" }, { id: "올드패션드" }, { id: "네그로니" }, { id: "미모사" },
        { id: "위스키" }, { id: "스카치위스키" }, { id: "버번위스키" }, { id: "아이리시위스키" }, { id: "일본위스키" },
        { id: "보드카" }, { id: "플레인보드카" }, { id: "플레이버보드카" },
        { id: "진" }, { id: "런던드라이진" }, { id: "올드톰진" }, { id: "네이비스트렝스진" }
    ],
    links: [
        { source: "맥주", target: "라거" }, { source: "맥주", target: "페일에일" }, { source: "맥주", target: "스타우트" },
        { source: "맥주", target: "IPA" }, { source: "맥주", target: "필스너" }, { source: "맥주", target: "포터" },
        { source: "와인", target: "레드와인" }, { source: "와인", target: "화이트와인" }, { source: "와인", target: "로제" },
        { source: "와인", target: "스파클링와인" }, { source: "와인", target: "디저트와인" },
        { source: "칵테일", target: "마티니" }, { source: "칵테일", target: "마가리타" }, { source: "칵테일", target: "모히토" },
        { source: "칵테일", target: "올드패션드" }, { source: "칵테일", target: "네그로니" }, { source: "칵테일", target: "미모사" },
        { source: "위스키", target: "스카치위스키" }, { source: "위스키", target: "버번위스키" }, 
        { source: "위스키", target: "아이리시위스키"},  {source:"위스키",target:"일본위스키"},
        {source:"보드카",target:"플레인보드카"},  {source:"보드카",target:"플레이버보드카"},
        {"source":"진","target":"런던드라이진"}, {"source":"진","target":"올드톰진"}, {"source":"진","target":"네이비스트렝스진"}
    ]
};

// 특정 종류의 노드와 링크 필터링 함수 (필터링할 주요 노드: mainNode, 관련된 노드 배열: relatedNodes)
const filterData = (mainNode, relatedNodes) => ({
    nodes: data.nodes.filter(d => d.id === mainNode || relatedNodes.includes(d.id)),
    links: data.links.filter(l => l.source === mainNode || l.target === mainNode)
});

const currentPath = decodeURIComponent(window.location.pathname);
let filteredData = data;



// URL 경로에 따른 데이터 필터링
const categories = {
    맥주:["라거","페일에일","스타우트","IPA","필스너","포터"],
    와인:["레드와인","화이트와인","로제","스파클링와인","디저트와인"],
    칵테일:["마티니","마가리타","모히토","올드패션드","네그로니","미모사"],
    위스키:["스카치위스키","버번위스키","아이리시위스키","일본위스키"],
    보드카:["플레인보드카","플레이버보드카"],
    진:["런던드라이진","올드톰진","네이비스트렝스진"]
};

// 현재 URL 경로가 특정 카테고리를 포함하는 경우 관련 데이터를 필터링
Object.keys(categories).forEach(category => {
    if (currentPath.includes(category)) {
        filteredData = filterData(category, categories[category]);
    }
});



// SVG 설정 및 크기 조정
const svg = d3.select("svg"),
      width = window.innerWidth,
      height = window.innerHeight * 0.8;

// 새로운 그룹 요소 추가
const svgGroup = svg.append("g");

// 줌 기능 설정
const zoom = d3.zoom()
    .scaleExtent([0.5, 3])  // 줌 배율의 최소 및 최대 값 설정
    .on("zoom", (event) => { // 줌 이벤트 발생 시 실행
        svgGroup.attr("transform", event.transform); // 그룹의 변환 적용

        const scaleFactor = event.transform.k;  // 현재 스케일 팩터 가져오기
        svgGroup.selectAll(".node circle")      // 모든 노드의 원 선택
            .attr("r", 8 * scaleFactor)         // 반지름 조정
            .style("opacity", 0.5 + 0.5 * scaleFactor); // 불투명도 조정
    });

// SVG에 줌 기능 적용
svg.call(zoom);

// 링크 그룹 추가 및 데이터 바인딩
const link = svgGroup.append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(filteredData.links)
    .enter().append("line")
    .attr("class", "link");

// 노드 그룹 추가 및 드래그 기능 등록
const node = svgGroup.append("g")
    .attr("class", "nodes")
    .selectAll("g")
    .data(filteredData.nodes)
    .enter().append("g")
    .call(d3.drag()
        .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        })
        .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
        })
        .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        })
    );

// 노드 색상 매핑    
const colorMap={
    맥주:"#FFD700",
    라거:"#FFA500", 페일에일:"#FFA500", 스타우트:"#FFA500", IPA:"#FFA500", 필스너:"#FFA500", 포터:"#FFA500",
    와인:"#8B0000",
    레드와인:"#800000", 화이트와인:"#800000", 로제:"#800000", 스파클링와인:"#800000", 디저트와인:"#800000",
    칵테일:"#FF69B4",
    마티니:"#FF6347", 마가리타:"#FF6347", 모히토:"#FF6347", 올드패션드:"#FF6347", 네그로니:"#FF6347", 미모사:"#FF6347",
    위스키:"#A52A2A",
    스카치위스키:"#D2691E", 버번위스키:"#D2691E", 아이리시위스키:"#D2691E", 일본위스키:"#D2691E",
    보드카:"#C0C0C0",
    플레인보드카:"#B0C4DE", 플레이버보드카:"#B0C4DE",
    진:"#4682B4",
    런던드라이진:"#5F9EA0", 올드톰진:"#5F9EA0", 네이비스트렝스진:"#5F9EA0"
};


node.append("circle")
    .attr("r", 8)
    .attr("fill", d => colorMap[d.id] || "#1f77b4")
    .on("click", (event, d) => {
        // 선택을 막고 싶은 노드 ID 목록
        const nonClickableNodes = ["맥주", "와인", "진", "위스키", "칵테일", "보드카"];
        
        if (nonClickableNodes.includes(d.id)) {
            event.stopPropagation(); // 클릭 이벤트 전파 차단
            return; // 아무 작업도 하지 않음
        }

        // 선택 가능한 노드의 동작
        d3.select("#selected-drink").text(`선택한 주류: ${d.id}`);   // 선택된 주류 표시
        svgGroup.selectAll(".node").classed("selected", false);     // 이전 선택 해제
        d3.select(event.currentTarget.parentNode).classed("selected", true);    // 현재 선택 표시
    });



// 노드에 텍스트 추가
node.append("text")
    .attr("dy", -10)                // 텍스트의 y 위치 조정
    .attr("text-anchor", "middle")  // 텍스트 정렬 설정
    .text(d => d.id);               // 노드 ID를 텍스트로 설정

// 힘 기반 시뮬레이션 설정
const simulation = d3.forceSimulation(filteredData.nodes)
    .force("link", d3.forceLink(filteredData.links).id(d => d.id).distance(width < 600 ? 60 : 50)) // 링크 힘 설정
    .force("charge", d3.forceManyBody().strength(width < 600 ? -50 : -100)) // 충전력 설정
    .force("center", d3.forceCenter(width / 2, height / 2)); // 중심점 설정

simulation.on("tick", () => {
    link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    node
        .attr("transform", d => `translate(${d.x},${d.y})`);
});




// "저장하기" 버튼 클릭 이벤트 리스너 추가
document.getElementById("next-btn").addEventListener("click", () => {
    // 선택된 주류 가져오기
    const selectedDrinkText = document.getElementById("selected-drink").textContent;
    const favDrinkName = selectedDrinkText.replace("선택한 주류: ", "").trim();

    // 선택된 주류가 없을 경우 처리
    if (!favDrinkName || favDrinkName === "없음") {
        alert("주류를 선택해주세요.");
        return;
    }

    // POST 요청 데이터 구성
    const postData = {
        fav_DrinkName: favDrinkName
    };

    // Fetch API로 POST 요청 보내기
    fetch("/api/v1/set_UserFavDrink", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(postData) // 데이터를 JSON 형식으로 변환
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.status === "success") {
                alert("저장되었습니다!");
            } else {
                alert(`저장 실패: ${data.error || "알 수 없는 오류"}`);
            }
        })
        .catch(error => {
            console.error("Error:", error);
            alert("요청 중 오류가 발생했습니다.");
        });
});