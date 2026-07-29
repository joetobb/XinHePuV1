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

// ========== 新增：全局渲染画质优化（解决整体发虚、边缘锯齿） ==========
// 适配屏幕像素比，高分屏（2K/4K/笔记本屏）不再发虚
viewer.resolutionScale = window.devicePixelRatio || 1;
// 开启4倍多重采样抗锯齿，消除模型边缘锯齿感
viewer.scene.msaaSamples = 4;
// 关闭地形深度检测、关闭雾效，保留你原有配置
viewer.scene.globe.show = true;
viewer.scene.globe.baseColor = Cesium.Color.TRANSPARENT;
viewer.scene.globe.depthTestAgainstTerrain = false;
viewer.scene.fog.enabled = false;

// 加载天地图卫星影像
const tiandituImg = new Cesium.UrlTemplateImageryProvider({
  url: `https://t{s}.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=${TDT_KEY}`,
  subdomains: ["0", "1", "2", "3"],
  tilingScheme: new Cesium.WebMercatorTilingScheme(),
  maximumLevel: 18
});
viewer.imageryLayers.addImageryProvider(tiandituImg);

let tileset;

// 4. 加载 ion 模型（画质核心优化段）
async function loadModel() {
  try {
    // 修复：移除内部重复const声明，复用外层变量
    tileset = await Cesium.Cesium3DTileset.fromIonAssetId(5096914, {
      // ========== 核心画质参数：从64降到8，清晰度提升8倍 ==========
      // 屏幕空间误差：数值越小，模型纹理越清晰，推荐4~16
      maximumScreenSpaceError: 8,

      // 强制不跳级加载，避免远距离始终显示低清瓦片
      skipLevelOfDetail: false,

      // 开启动态精度：视角移动时降速保流畅，静止后自动加载高清瓦片
      dynamicScreenSpaceError: true,
      dynamicScreenSpaceErrorDensity: 0.002,
      dynamicScreenSpaceErrorFactor: 4.0,

      // 移动时不剔除瓦片请求，避免拖动过程中出现大面积模糊块
      cullRequestsWhileMoving: false,

      // ========== 缓存与内存：修正原不合理的超大数值 ==========
      tileCacheSize: 2000,          // 瓦片缓存数量，足够保留高清层级
      maximumMemoryUsage: 2048      // 最大内存占用（MB），2GB足够高清模型，避免溢出
    });

    viewer.scene.primitives.add(tileset);

    await tileset.readyPromise;
    const height = -10;
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
    console.log("✅ 高清模型加载成功");
  } catch (error) {
    console.error("❌ 模型加载失败：", error);
    alert("加载失败，请检查模型服务是否启动，或 URL 是否正确！");
  }
}

loadModel();
