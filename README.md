# 关西旅行计划 · GitHub Pages

2026年11月28日至12月2日的个人旅行工作台。纯HTML/CSS/JavaScript，无需服务器、数据库或构建依赖。

## 首次发布

1. 在自己的GitHub账号下创建仓库，建议名称 `kansai-trip`。GitHub Free的Pages使用公开仓库。
2. 上传本目录中的文件和子文件夹。`index.html`必须直接位于仓库根目录，`vendor/`保持原结构。
3. 仓库 **Settings → Pages → Build and deployment → Source → Deploy from a branch**。
4. 选择 **main** 和 **/(root)**，点击 **Save**。
5. 等待部署完成，在Pages设置中点击 **Visit site**。通常地址为 `https://你的用户名.github.io/kansai-trip/`；以GitHub实际显示的地址为准。

官方操作说明：https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## 后续更新

修改正式行程文件 `trip.json` 或页面代码，提交到 `main` 后Pages自动重新发布。不需要重新建仓库。

行程保留“确认”和“候选”的区分。30日在宇治至少到中午；1日嵯峨野8号12:30–12:56、4号车16A。其他景点、接驳时间和票价按各条目的状态、来源与核验日期理解。

这个仓库只保存静态行程，不连接本机TREK。不要上传TREK数据库、账号文件、订单凭证、私人备忘或整个本机项目。

网页新增的备忘、勾选和预算试算仅存在当前浏览器，不会写回GitHub或自动同步其他设备。换设备时使用“备份当前行程数据”导出JSON，在另一台设备“导入本机备忘”。导入只处理备忘与勾选，不覆盖正式行程；已有不同备忘会合并保留。

## 本地检查

有Node.js时执行 `npm run check`，预览执行 `npm run preview`，打开终端打印的Local地址。端口由系统分配，地址包含`/kansai-trip/`子路径以验证Pages兼容性。发布到GitHub后不需要运行Node。

## 页面访问范围

普通GitHub Pages网页公开可访问。页面的noindex标签只请求搜索引擎不索引，不提供身份验证。地图底图和Google Maps导航需要网络，连线只是顺序示意，不是实际道路。

Leaflet 1.9.4保留其BSD许可证（`vendor/LICENSE-Leaflet.txt`）；底图来自OpenStreetMap并保留署名。
