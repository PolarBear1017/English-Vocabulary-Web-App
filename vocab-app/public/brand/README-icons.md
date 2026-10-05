# Spaced 正式 App Icon / Favicon — 漸層 A

已選定：白底 + 原版漸層 Growing S。
品牌主色 #1F5EFF。直接由既有 spaced-symbol-master.svg 衍生，原 S 曲線、漸層色階與高光保留；既有 Master 與 Wordmark 未修改。

本資料夾包含所有指定部署資產。App / Apple / PWA PNG 為不透明白色方形，圓角由作業系統套用；preview.png 是圓角展示版，不作部署用途。Maskable 使用較小 Symbol，保留中央 80% 直徑圓形安全區。

favicon.svg 與 16px PNG 使用 optical small 版：原 S path 不變，增加 1 單位同漸層描邊；圓點半徑不變，兩顆圓點各向外移 5 單位。32px PNG 保留原始幾何。Favicon 圓角容器外透明。

將部署圖示放入網站 public/brand 資料夾，公開路徑為 /brand/。manifest.webmanifest 為範例，請合併進既有 manifest，保留網站原本的路徑和設定。

```html
<link rel="icon" href="/brand/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/brand/favicon-32x32.png" type="image/png" sizes="32x32">
<link rel="icon" href="/brand/favicon-16x16.png" type="image/png" sizes="16x16">
<link rel="apple-touch-icon" href="/brand/apple-touch-icon.png" sizes="180x180">
<link rel="manifest" href="/brand/manifest.webmanifest">
<meta name="theme-color" content="#1F5EFF">
```

已完成尺寸與背景透明度檢查。尚未套用到網站或部署。
