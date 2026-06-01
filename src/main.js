// 1. 配置 Token
Cesium.Ion.defaultAccessToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxNTMyZjM4NC1jZmNkLTRhYjEtYjE2Mi1lMmFkYzc5NGVlMzAiLCJpZCI6MTgxOTI0LCJzdWIiOiIyMDIxMDgxODA4MzEyMCIsImlzcyI6Imh0dHBzOi8vYXBpLmNlc2l1bS5jb20iLCJhdWQiOiJITi1RaUxvdXNob3VjaGktcXV5dSIsImlhdCI6MTc3OTc3NjY5MH0.vR8hf0YreCInVUxeqoWENkVnf1w4cIcQ0KR5D7f4d6g`;

// 天地图KEY（你提供的，已填入）
const TDT_KEY = "c2a9e09d3d60275e7b2f067759fab1c0";
// 2. 创建 Viewer（只保留核心功能）
const viewer = new Cesium.Viewer('cesiumContainer', {
  animation: false,
  timeline: false,
  navigationHelpButton: false,
  baseLayerPicker: false,
  imageryProvider: false,
   //  【修复关键】使用 Cesium 自带默认椭球地形（100%稳定）
  terrainProvider: new Cesium.EllipsoidTerrainProvider()
});

// 强制显示地球（核心！）
viewer.scene.globe.show = true;
viewer.scene.globe.baseColor = Cesium.Color.TRANSPARENT;
viewer.scene.globe.depthTestAgainstTerrain = false;
viewer.scene.fog.enabled = false;

// ==============================================
// 【关键】加载 天地图卫星影像
// ==============================================
const tiandituImg = new Cesium.UrlTemplateImageryProvider({
  url: `https://t{s}.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=${TDT_KEY}`,
  subdomains: ["0", "1"，"2"，"3"]
  tilingScheme: new Cesium.WebMercatorTilingScheme(),
  maximumLevel: 18
});
viewer.imageryLayers.addImageryProvider(tiandituImg);



// 3. 优化场景稳定性
viewer.scene.globe.depthTestAgainstTerrain = false;
viewer.scene.fog.enabled = false;

// 定义 tileset 变量
let tileset;


// 4. 加载模型（带完整错误捕获，修复了异步写法）
async function loadModel() {
  try {
    const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(4839323, {
        // 画质与稳定性平衡配置
        maximumScreenSpaceError: 64,//模型清晰度（画质）控制,数字越小 → 越清晰、越精细、瓦片越多,数字越大 → 越模糊、越粗糙、瓦片越少
        skipLevelOfDetail: false,//是否允许 “跳层级加载”;不跳级，完整加载，模型更完整、不缺块,跳级加载，加载快，但模型会缺块、模糊
        dynamicScreenSpaceError: false,//是否开启 “动态自动优化画质”;固定清晰度，不动态变化 → 不闪烁、不跳动,镜头一动就自动改清晰度 → 会闪烁、会跳块
        cullRequestsWhileMoving: false,//移动镜头时，是否卸载已经加载好的瓦片
        tileCacheSize: 700000,//瓦片缓存数量（能存多少个瓦片）
        maximumMemoryUsage: 999999//允许浏览器给模型分配多大内存
      }
    );

     // 添加到场景
    viewer.scene.primitives.add(tileset);

     // 核心：模型整体抬高 10 米（就这一行）
     // ==============================================
    await tileset.readyPromise;

    const height = 10; // 抬高高度
    const center = tileset.boundingSphere.center;
    const cartographic = Cesium.Cartographic.fromCartesian(center);
    const surface = Cesium.Cartesian3.fromRadians(
      cartographic.longitude,
      cartographic.latitude,
    );
    const offset = Cesium.Cartesian3.fromRadians(
      cartographic.longitude,
      cartographic.latitude,
      height
    );
    const translation = Cesium.Cartesian3.subtract(offset, surface, new Cesium.Cartesian3());
    tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translation);

     // 模型加载完成后，自动飞到模型位置
    await tileset.readyPromise;
    viewer.flyTo(tileset, { duration: 2 });
    console.log("✅ 模型加载成功！");

  } catch (error) {
     // 捕获错误，控制台打印，不白屏
    console.error("❌ 模型加载失败：", error);
    alert("加载失败，请检查模型服务是否启动，或 URL 是否正确！");
  }
}

 // 启动加载
loadModel();
