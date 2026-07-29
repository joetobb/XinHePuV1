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
      // 画质基础
      maximumScreenSpaceError: 4, // 近距离极致清晰，减少层级断层
      skipLevelOfDetail: false,

      // ========== 解决近距离瓦片消失核心参数 ==========
      // 1. 关闭遮挡剔除，杜绝建筑自身遮挡误删瓦片
      occlusionCulling: false,
      // 2. 关闭子边界裁剪，近距离建筑边缘不会被裁掉
      cullWithChildrenBounds: false,
      // 3. 关闭移动时取消瓦片请求，拉近镜头持续加载精细瓦片
      cullRequestsWhileMoving: false,
      cullRequestsWhileMovingMultiplier: 0,
      // 4. 加载失败自动重试，网络波动不会永久空洞
      retryFailedRequests: true,
      preloadWhenHidden: true,

      // ========== 缓存&内存扩容，保留近距离高清瓦片 ==========
      tileCacheSize: 5000,
      maximumMemoryUsage: 4096, // 4GB内存上限，缓存更多精细瓦片
      maximumNumberOfLoadedTiles: 3000, // 同时加载瓦片数量拉满

      // ========== 动态精度弱化，拉近不会自动降质 ==========
      dynamicScreenSpaceError: true,
      dynamicScreenSpaceErrorDensity: 0.001,
      dynamicScreenSpaceErrorFactor: 1.0,
    });

    viewer.scene.primitives.add(tileset);

    // ========== 全局相机近裁剪面修复（重中之重！） ==========
    // 拉近镜头时相机不会裁掉近处建筑瓦片
    viewer.camera.near = 0.1;
    viewer.camera.far = 100000;

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
    console.log("✅ 模型加载完成，近距离瓦片防丢失参数已启用");
  } catch (error) {
    console.error("❌ 模型加载失败：", error);
    alert("加载失败，请检查模型服务是否启动，或 URL 是否正确！");
  }
}

loadModel();
