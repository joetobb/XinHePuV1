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

// ========== 全局渲染：自动适配设备 ==========
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

if (isMobile) {
  // 移动端：降配保稳定，避免崩溃
  viewer.resolutionScale = 1.0; // 强制1:1渲染，降低GPU压力
  viewer.scene.msaaSamples = 1; // 关闭抗锯齿，移动端GPU性能不足
  viewer.camera.near = 0.5;     // 恢复默认近裁剪面，避免深度精度问题
} else {
  // PC端：保持高清画质
  viewer.resolutionScale = window.devicePixelRatio || 1;
  viewer.scene.msaaSamples = 4;
  viewer.camera.near = 0.1;
}

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

// 4. 加载模型：设备自适应参数
async function loadModel() {
  try {
    // 按设备区分加载参数
    const tilesetOptions = isMobile ? {
      // 移动端：稳定优先，低内存、低精度
      maximumScreenSpaceError: 16,
      skipLevelOfDetail: true,
      occlusionCulling: true,
      cullWithChildrenBounds: true,
      cullRequestsWhileMoving: true,
      retryFailedRequests: true,
      tileCacheSize: 500,
      maximumMemoryUsage: 512, // 移动端限制512MB内存，避免溢出崩溃
      maximumNumberOfLoadedTiles: 300,
      dynamicScreenSpaceError: true,
      dynamicScreenSpaceErrorDensity: 0.005,
      dynamicScreenSpaceErrorFactor: 6.0
    } : {
      // PC端：高清优先，防瓦片消失
      maximumScreenSpaceError: 4,
      skipLevelOfDetail: false,
      occlusionCulling: false,
      cullWithChildrenBounds: false,
      cullRequestsWhileMoving: false,
      cullRequestsWhileMovingMultiplier: 0,
      retryFailedRequests: true,
      preloadWhenHidden: true,
      tileCacheSize: 5000,
      maximumMemoryUsage: 4096,
      maximumNumberOfLoadedTiles: 3000,
      dynamicScreenSpaceError: true,
      dynamicScreenSpaceErrorDensity: 0.001,
      dynamicScreenSpaceErrorFactor: 1.0
    };

    tileset = await Cesium.Cesium3DTileset.fromIonAssetId(5096914, tilesetOptions);
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
    console.log(`✅ ${isMobile ? '移动端' : 'PC端'}模型加载成功`);
  } catch (error) {
    console.error("❌ 模型加载失败：", error);
    alert("加载失败，请检查模型服务是否启动，或 URL 是否正确！");
  }
}

loadModel();
