const DATA_FILE = "data/blackice_map_data.csv";

const map = L.map("map", { zoomControl: true }).setView([36.5, 127.8], 7);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

let rows = [];
let markerGroup = L.layerGroup().addTo(map);

function num(v){
  if(v === undefined || v === null || v === "") return NaN;
  return Number(String(v).replaceAll(",", "").trim());
}

function text(v){
  if(v === undefined || v === null || String(v).trim() === "" || String(v) === "nan") return "-";
  return String(v);
}

function pct(row, percentCol, rawCol){
  let p = num(row[percentCol]);
  if(Number.isNaN(p)){
    p = num(row[rawCol]);
    if(!Number.isNaN(p) && p <= 1) p = p * 100;
  }
  return Number.isNaN(p) ? "-" : p.toFixed(2) + "%";
}

function val(row, col, unit=""){
  const v = row[col];
  if(v === undefined || v === null || v === "" || String(v) === "nan") return "-";
  return unit ? `${v} ${unit}` : String(v);
}

function style(row){
  const type = row["구분"];
  const risk = row["위험도"];

  if(type === "블랙아이스 사고지점"){
    return {radius:9,color:"#7f1d1d",fillColor:"#dc2626",fillOpacity:.92,weight:2};
  }
  if(type === "결빙지역"){
    if(risk === "높음") return {radius:6,color:"#1e3a8a",fillColor:"#2563eb",fillOpacity:.75,weight:1};
    return {radius:5,color:"#1d4ed8",fillColor:"#60a5fa",fillOpacity:.58,weight:1};
  }
  return {radius:5,color:"#475569",fillColor:"#94a3b8",fillOpacity:.46,weight:1};
}

function badge(type){
  if(type === "블랙아이스 사고지점") return "badge badge-red";
  if(type === "결빙지역") return "badge badge-blue";
  return "badge badge-gray";
}

function popup(row){
  return `
    <div class="popup-title">${text(row["구분"])}</div>
    위험도: <b>${text(row["위험도"])}</b><br>
    결빙확률: <b>${pct(row, "결빙확률_percent", "결빙확률")}</b><br>
    블랙아이스 발생확률: <b>${pct(row, "블랙아이스_발생확률_percent", "블랙아이스_발생확률")}</b><br>
    기온: ${val(row, "기온", "℃")}<br>
    습도: ${val(row, "습도", "%")}<br>
    강수량: ${val(row, "강수량", "mm")}
  `;
}

function showDetail(row){
  const html = `
    <p><span class="${badge(row["구분"])}">${text(row["구분"])}</span></p>
    <div class="info"><span>위험도</span><b>${text(row["위험도"])}</b></div>
    <div class="info"><span>결빙확률</span><b>${pct(row, "결빙확률_percent", "결빙확률")}</b></div>
    <div class="info"><span>블랙아이스 발생확률</span><b>${pct(row, "블랙아이스_발생확률_percent", "블랙아이스_발생확률")}</b></div>
    <div class="info"><span>기온</span><b>${val(row, "기온", "℃")}</b></div>
    <div class="info"><span>습도</span><b>${val(row, "습도", "%")}</b></div>
    <div class="info"><span>강수량</span><b>${val(row, "강수량", "mm")}</b></div>
    <div class="info"><span>풍향</span><b>${val(row, "풍향")}</b></div>
    <div class="info"><span>풍속</span><b>${val(row, "풍속", "m/s")}</b></div>
    <div class="info"><span>추정노면온도</span><b>${val(row, "추정노면온도", "℃")}</b></div>
    <div class="info"><span>AWS 지점</span><b>${text(row["aws_지점"])}</b></div>
    <div class="info"><span>AWS 거리</span><b>${val(row, "aws_거리_km", "km")}</b></div>
    <div class="info"><span>교량</span><b>${text(row["교량"])}</b></div>
    <div class="info"><span>터널</span><b>${text(row["터널"])}</b></div>
    <div class="info"><span>도로등급</span><b>${text(row["ROAD_RANK"])}</b></div>
    <div class="info"><span>장소</span><b>${text(row["장소"])}</b></div>
    <div class="info"><span>위치</span><b>${text(row["위치"])}</b></div>
    <div class="info"><span>사고일시</span><b>${text(row["사고일시"])}</b></div>
    <div class="info"><span>위도/경도</span><b>${text(row["위도"])} / ${text(row["경도"])}</b></div>
  `;
  document.getElementById("detailBox").className = "detail-box";
  document.getElementById("detailBox").innerHTML = html;
}

function passFilters(row){
  const type = row["구분"];
  if(type === "결빙지역" && !document.getElementById("chkIce").checked) return false;
  if(type === "비결빙지역" && !document.getElementById("chkNonIce").checked) return false;
  if(type === "블랙아이스 사고지점" && !document.getElementById("chkBlackice").checked) return false;

  const risk = document.getElementById("riskSelect").value;
  if(risk !== "전체" && row["위험도"] !== risk) return false;

  const q = document.getElementById("searchInput").value.trim().toLowerCase();
  if(q){
    const target = [
      row["장소"], row["위치"], row["aws_지점"], row["fid"], row["구분"], row["위험도"]
    ].map(text).join(" ").toLowerCase();
    if(!target.includes(q)) return false;
  }
  return true;
}

function draw(){
  markerGroup.clearLayers();
  const bounds = [];

  rows.filter(passFilters).forEach(row => {
    const lat = num(row["위도"]);
    const lon = num(row["경도"]);
    if(Number.isNaN(lat) || Number.isNaN(lon)) return;

    const marker = L.circleMarker([lat, lon], style(row))
      .bindPopup(popup(row))
      .on("click", () => showDetail(row));

    marker.addTo(markerGroup);
    bounds.push([lat, lon]);
  });

  if(bounds.length > 0){
    map.fitBounds(bounds, {padding:[20,20], maxZoom: 10});
  }
}

function fillTable(){
  const tbody = document.getElementById("accidentTable");
  tbody.innerHTML = "";

  rows.filter(r => r["구분"] === "블랙아이스 사고지점").forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${text(row["구분"])}</td>
      <td>${text(row["장소"])}</td>
      <td>${text(row["사고일시"])}</td>
      <td>${text(row["위험도"])}</td>
      <td>${pct(row, "결빙확률_percent", "결빙확률")}</td>
      <td>${pct(row, "블랙아이스_발생확률_percent", "블랙아이스_발생확률")}</td>
      <td>${val(row, "기온", "℃")}</td>
      <td>${val(row, "습도", "%")}</td>
      <td>${val(row, "강수량", "mm")}</td>
    `;
    tbody.appendChild(tr);
  });
}

Papa.parse(DATA_FILE, {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: (result) => {
    rows = result.data.filter(r => r["구분"]);

    document.getElementById("totalCount").textContent = rows.length.toLocaleString();
    document.getElementById("iceCount").textContent = rows.filter(r => r["구분"] === "결빙지역").length.toLocaleString();
    document.getElementById("nonIceCount").textContent = rows.filter(r => r["구분"] === "비결빙지역").length.toLocaleString();
    document.getElementById("blackiceCount").textContent = rows.filter(r => r["구분"] === "블랙아이스 사고지점").length.toLocaleString();

    fillTable();
    draw();
  },
  error: (err) => {
    console.error(err);
    alert("data/blackice_map_data.csv 파일을 불러오지 못했습니다.");
  }
});

["chkIce", "chkNonIce", "chkBlackice", "riskSelect"].forEach(id => {
  document.addEventListener("change", e => {
    if(e.target.id === id) draw();
  });
});

document.addEventListener("input", e => {
  if(e.target.id === "searchInput") draw();
});
