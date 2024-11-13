// X 버튼 클릭 시 안내 문구 숨김
document.getElementById("close-guide").addEventListener("click", () => {
    document.getElementById("guide").style.display = "none";
});

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

// URL 경로에 따라 관련 데이터만 필터링 (맥주 완료함 & 와인, 칵테일, 위스키, 보드카, 진도 만들어야됨)
const currentPath = decodeURIComponent(window.location.pathname);  // URL 디코딩
let filteredData = data;

if (currentPath.includes("맥주")) {
    console.log('맥주 관련 데이터 필터링');
    // 맥주와 관련된 노드만 필터링
    filteredData = {
        nodes: data.nodes.filter(d => d.id === "Beer" || ["Lager", "Pale Ale", "Stout", "IPA", "Pilsner", "Porter"].includes(d.id)),
        links: data.links.filter(l => l.source === "Beer" || l.target === "Beer")
    };
} else if (currentPath.includes("와인")) {
    console.log('와인 관련 데이터 필터링');
    // 와인과 관련된 노드만 필터링
    filteredData = {
        nodes: data.nodes.filter(d => d.id === "Wine" || ["Red Wine", "White Wine", "Rosé", "Sparkling", "Dessert Wine"].includes(d.id)),
        links: data.links.filter(l => l.source === "Wine" || l.target === "Wine")
    };
} else if (currentPath.includes("칵테일")) {
    console.log('칵테일 관련 데이터 필터링');
    // 칵테일과 관련된 노드만 필터링
    filteredData = {
        nodes: data.nodes.filter(d => d.id === "Cocktail" || ["Martini", "Margarita", "Mojito", "Old Fashioned", "Negroni", "Mimosa"].includes(d.id)),
        links: data.links.filter(l => l.source === "Cocktail" || l.target === "Cocktail")
    };
} else if (currentPath.includes("위스키")) {
    console.log('위스키 관련 데이터 필터링');
    // 위스키와 관련된 노드만 필터링
    filteredData = {
        nodes: data.nodes.filter(d => d.id === "Whiskey" || ["Scotch", "Bourbon", "Irish Whiskey", "Japanese Whiskey"].includes(d.id)),
        links: data.links.filter(l => l.source === "Whiskey" || l.target === "Whiskey")
    };
} else if (currentPath.includes("보드카")) {
    console.log('보드카 관련 데이터 필터링');
    // 보드카와 관련된 노드만 필터링
    filteredData = {
        nodes: data.nodes.filter(d => d.id === "Vodka" || ["Plain Vodka", "Flavored Vodka"].includes(d.id)),
        links: data.links.filter(l => l.source === "Vodka" || l.target === "Vodka")
    };
} else if (currentPath.includes("진")) {
    console.log('진 관련 데이터 필터링');
    // 진과 관련된 노드만 필터링
    filteredData = {
        nodes: data.nodes.filter(d => d.id === "Gin" || ["London Dry", "Old Tom", "Navy Strength"].includes(d.id)),
        links: data.links.filter(l => l.source === "Gin" || l.target === "Gin")
    };
}


const svg = d3.select("svg"),
      width = window.innerWidth,
      height = window.innerHeight * 0.8;

const zoom = d3.zoom()
    .scaleExtent([0.5, 3])
    .on("zoom", (event) => {
        svgGroup.attr("transform", event.transform);

        // Zoom level에 따른 효과 추가
        const scaleFactor = event.transform.k;
        svgGroup.selectAll(".node circle")
            .attr("r", 8 * scaleFactor)  // 확대/축소에 따라 크기 조절
            .style("opacity", 0.5 + 0.5 * scaleFactor);  // 확대/축소에 따라 투명도 조절
    });

svg.call(zoom);

const svgGroup = svg.append("g");

const link = svgGroup.append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(filteredData.links)
    .enter().append("line")
    .attr("class", "link");

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

node.append("circle")
    .attr("r", 8)
    .attr("fill", d => {
        if (d.id === "Beer") return "#FFD700";
        else if (["Lager", "Pale Ale", "Stout", "IPA", "Pilsner", "Porter"].includes(d.id)) return "#FFA500";
        else if (d.id === "Wine") return "#8B0000";
        else if (["Red Wine", "White Wine", "Rosé", "Sparkling", "Dessert Wine"].includes(d.id)) return "#800000";
        else if (d.id === "Cocktail") return "#FF69B4";
        else if (["Martini", "Margarita", "Mojito", "Old Fashioned", "Negroni", "Mimosa"].includes(d.id)) return "#FF6347";
        else if (d.id === "Whiskey") return "#A52A2A";
        else if (["Scotch", "Bourbon", "Irish Whiskey", "Japanese Whiskey"].includes(d.id)) return "#D2691E";
        else if (d.id === "Vodka") return "#C0C0C0";
        else if (["Plain Vodka", "Flavored Vodka"].includes(d.id)) return "#B0C4DE";
        else if (d.id === "Gin") return "#4682B4";
        else if (["London Dry", "Old Tom", "Navy Strength"].includes(d.id)) return "#5F9EA0";
        else return "#1f77b4";
    })
    .on("click", (event, d) => {
        d3.select("#selected-drink").text(`선택한 주류: ${d.id}`);
        svgGroup.selectAll(".node").classed("selected", false);
        d3.select(event.currentTarget.parentNode).classed("selected", true);
    });

node.append("text")
    .attr("dy", -10)
    .attr("text-anchor", "middle")
    .text(d => d.id);

const simulation = d3.forceSimulation(filteredData.nodes)
    .force("link", d3.forceLink(filteredData.links).id(d => d.id).distance(width < 600 ? 60 : 50))
    .force("charge", d3.forceManyBody().strength(width < 600 ? -50 : -100))
    .force("center", d3.forceCenter(width / 2, height / 2));

simulation.on("tick", () => {
    link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    node
        .attr("transform", d => `translate(${d.x},${d.y})`);
});