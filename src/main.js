// 1. 配置 Token
Cesium.Ion.defaultAccessToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5OGNlZmNjYS03NjY3LTRhMWItYjMxMy0yZjBmY2ExNTBkOWMiLCJpZCI6MTgxOTI0LCJzdWIiOiIyMDIxMDgxODA4MzEyMCIsImlzcyI6Imh0dHBzOi8vYXBpLmNlc2l1bS5jb20iLCJhdWQiOiJYaW5IZVB1LUwiLCJpYXQiOjE3ODUyOTcwOTh9.3oO1Po387eT3gDqmJudBPCUXqKla3w8LzkjUsMg_s7E`;

// 天地图KEY
const TDT_KEY = "c2a9e09d3d60275e7b2f067759fab1c0";

// 2. 创建 Viewer
const viewer = new Cesium.Viewer('cesiumContainer', {
  animation: false,
  timeline: false,
  navigationHelpButton: false,
  baseLayerPicker: false,
  imageryProvider: false,
  terrainProvider: new Cesium.EllipsoidTerrainProvider()
});

// 强制显示地球
viewer.scene.globe.show = true;
viewer.scene.globe.baseColor = Cesium.Color.TRANSPARENT;
viewer.scene.globe.depthTestAgainstTerrain = false;
viewer.scene.fog.enabled = false;

// 加载天地图卫星影像
const tiandituImg = new Cesium.UrlTemplateImageryProvider({
  url: `https://t{s}.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=${TDT_KEY}`,
  subdomains: ["0", "1", "2", "3"], // ✅ 英文逗号 + 补逗号
  tilingScheme: new Cesium.WebMercatorTilingScheme(),
  maximumLevel: 18
});
viewer.imageryLayers.addImageryProvider(tiandituImg);

// 优化场景稳定性
viewer.scene.globe.depthTestAgainstTerrain = false;
viewer.scene.fog.enabled = false;

let tileset;

// 4. 加载 ion 模型
async function loadModel() {
  try {
    const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(5096914, {
      maximumScreenSpaceError: 64,
      skipLevelOfDetail: false,
      dynamicScreenSpaceError: false,
      cullRequestsWhileMoving: false,
      tileCacheSize: 700000,
      maximumMemoryUsage: 999999
    });

    viewer.scene.primitives.add(tileset);

    await tileset.readyPromise;
    const height = 10;
    const center = tileset.boundingSphere.center;
    const cartographic = Cesium.Cartographic.fromCartesian(center);
    const surface = Cesium.Cartesian3.fromRadians(
      cartographic.longitude,
      cartographic.latitude,
      0
    );
    const offset = Cesium.Cartesian3.fromRadians(
      cartographic.longitude,
      cartographic.latitude,
      height
    );
    const translation = Cesium.Cartesian3.subtract(offset, surface, new Cesium.Cartesian3());
    tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translation);

    viewer.flyTo(tileset, { duration: 2 });
    console.log("✅ ion模型加载成功");
  } catch (error) {
    console.error("❌ 模型加载失败：", error);
    alert("加载失败，请检查模型服务是否启动，或 URL 是否正确！");
  }
}

loadModel();
