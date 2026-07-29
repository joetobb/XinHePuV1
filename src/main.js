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
    tileset = await Cesium.Cesium3DTileset.fromIonAssetId(5096914, {
      // ========== 基础画质参数 ==========
      maximumScreenSpaceError: 8,
      skipLevelOfDetail: false, // 彻底关闭层级跳级，杜绝精度断层空洞
      
      // ========== 解决瓦片丢失核心参数 ==========
      // 关闭遮挡剔除：密集建筑区最常见的空洞元凶，避免误判“被挡住的瓦片不加载”
      occlusionCulling: false,
      // 关闭子瓦片边界裁剪：解决模型接缝、边缘处的小块透明缺失
      cullWithChildrenBounds: false,
      // 移动时不取消瓦片请求：视角快速拖动后，瓦片不会中断加载
      cullRequestsWhileMoving: false,
      // 加载失败自动重试：解决网络波动导致的偶发随机空洞
      retryFailedRequests: true,
      // 非可视区域瓦片也预加载：视角切换时不会出现大面积空白
      preloadWhenHidden: true,

      // ========== 动态精度（降低激进程度） ==========
      dynamicScreenSpaceError: true,
      dynamicScreenSpaceErrorDensity: 0.003,
      dynamicScreenSpaceErrorFactor: 3.0, // 收窄降质幅度，避免过度跳级

      // ========== 缓存与内存（避免瓦片被频繁卸载） ==========
      tileCacheSize: 3000,
      maximumMemoryUsage: 3072, // 放宽到3GB内存，保留更多高清瓦片
      maximumNumberOfLoadedTiles: 2000 // 放宽同时加载的瓦片数量上限
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
    console.log("✅ 模型加载成功");
  } catch (error) {
    console.error("❌ 模型加载失败：", error);
    alert("加载失败，请检查模型服务是否启动，或 URL 是否正确！");
  }
}

loadModel();
