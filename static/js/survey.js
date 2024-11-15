

// X 버튼 클릭 시 안내 문구 숨김
document.getElementById("close-guide").addEventListener("click", () => {
    document.getElementById("guide").style.display = "none";
});

// 음료 종류를 나타내는 노드와 노드 간의 관계를 나타내는 링크
const data = {
    nodes: [
        { id: "Beer" }, { id: "Lager" }, { id: "Pale Ale" }, { id: "Stout" }, { id: "IPA" }, { id: "Pilsner" }, { id: "Porter" },
        { id: "Wine" }, { id: "Red Wine" }, { id: "White Wine" }, { id: "Rosé" }, { id: "Sparkling" }, { id: "Dessert Wine" },
        { id: "Cocktail" }, { id: "Martini" }, { id: "Margarita" }, { id: "Mojito" }, { id: "Old Fashioned" }, { id: "Negroni" }, { id: "Mimosa" },
        { id: "Whiskey" }, { id: "Scotch" }, { id: "Bourbon" }, { id: "Irish Whiskey" }, { id: "Japanese Whiskey" },
        { id: "Vodka" }, { id: "Plain Vodka" }, { id: "Flavored Vodka" },
        { id: "Gin" }, { id: "London Dry" }, { id: "Old Tom" }, { id: "Navy Strength" }
    ],
    links: [
        { source: "Beer", target: "Lager" }, { source: "Beer", target: "Pale Ale" }, { source: "Beer", target: "Stout" },
        { source: "Beer", target: "IPA" }, { source: "Beer", target: "Pilsner" }, { source: "Beer", target: "Porter" },
        { source: "Wine", target: "Red Wine" }, { source: "Wine", target: "White Wine" }, { source: "Wine", target: "Rosé" },
        { source: "Wine", target: "Sparkling" }, { source: "Wine", target: "Dessert Wine" },
        { source: "Cocktail", target: "Martini" }, { source: "Cocktail", target: "Margarita" }, { source: "Cocktail", target: "Mojito" },
        { source: "Cocktail", target: "Old Fashioned" }, { source: "Cocktail", target: "Negroni" }, { source: "Cocktail", target: "Mimosa" },
        { source: "Whiskey", target: "Scotch" }, { source: "Whiskey", target: "Bourbon" }, { source: "Whiskey", target: "Irish Whiskey" },
        { source: "Whiskey", target: "Japanese Whiskey" },
        { source: "Vodka", target: "Plain Vodka" }, { source: "Vodka", target: "Flavored Vodka" },
        { source: "Gin", target: "London Dry" }, { source: "Gin", target: "Old Tom" }, { source: "Gin", target: "Navy Strength" }
    ]
};

// 특정 종류의 노드와 링크 필터링 함수
// 'mainNode'는 필터링할 주요 노드, 'relatedNodes'는 관련된 노드 배열
const filterData = (mainNode, relatedNodes) => ({
    nodes: data.nodes.filter(d => d.id === mainNode || relatedNodes.includes(d.id)),
    links: data.links.filter(l => l.source === mainNode || l.target === mainNode)
});

const currentPath = decodeURIComponent(window.location.pathname);
let filteredData = data;

// URL 경로에 따른 데이터 필터링
const categories = {
    "맥주": ["Lager", "Pale Ale", "Stout", "IPA", "Pilsner", "Porter"],
    "와인": ["Red Wine", "White Wine", "Rosé", "Sparkling", "Dessert Wine"],
    "칵테일": ["Martini", "Margarita", "Mojito", "Old Fashioned", "Negroni", "Mimosa"],
    "위스키": ["Scotch", "Bourbon", "Irish Whiskey", "Japanese Whiskey"],
    "보드카": ["Plain Vodka", "Flavored Vodka"],
    "진": ["London Dry", "Old Tom", "Navy Strength"]
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
const colorMap = {
    "Beer": "#FFD700", 
    "Lager": "#FFA500", "Pale Ale": "#FFA500", "Stout": "#FFA500", "IPA": "#FFA500", "Pilsner": "#FFA500", "Porter": "#FFA500",
    "Wine": "#8B0000", 
    "Red Wine": "#800000", "White Wine": "#800000", "Rosé": "#800000", "Sparkling": "#800000", "Dessert Wine": "#800000",
    "Cocktail": "#FF69B4",
    "Martini": "#FF6347", "Margarita": "#FF6347", "Mojito": "#FF6347", "Old Fashioned": "#FF6347", "Negroni": "#FF6347", "Mimosa": "#FF6347",
    "Whiskey": "#A52A2A",
    "Scotch": "#D2691E", "Bourbon": "#D2691E", "Irish Whiskey": "#D2691E", "Japanese Whiskey": "#D2691E",
    "Vodka": "#C0C0C0",
    "Plain Vodka": "#B0C4DE", "Flavored Vodka": "#B0C4DE",
    "Gin": "#4682B4",
    "London Dry": "#5F9EA0", "Old Tom": "#5F9EA0", "Navy Strength": "#5F9EA0"
};

// 노드에 원형 추가 및 클릭 이벤트 설정
node.append("circle")
    .attr("r", 8) // 기본 반지름 설정
    .attr("fill", d => colorMap[d.id] || "#1f77b4") // 색상 설정
    .on("click", (event, d) => { // 클릭 시 실행될 함수
        d3.select("#selected-drink").text(`선택한 주류: ${d.id}`);  // 선택된 주류 표시
        svgGroup.selectAll(".node").classed("selected", false);    // 이전 선택 해제
        d3.select(event.currentTarget.parentNode).classed("selected", true); // 현재 선택 표시
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