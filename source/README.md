# 关西旅行 · TREK 静态行程

此站发布到 https://bcbs-352.github.io/kansai-trip/ 。使用 TREK 5.1.0 原生只读分享组件展示日程、地图和交通住宿，并提供 Google Maps 导航、应急措施、费用试算、本机备忘、待办和导入导出。

## 使用与更新

- 2026-11-28 至 12-02；11月30日在宇治至少到中午；12月1日使用嵯峨野8号12:30–12:56，4号车16A。
- 候选景点与建议时间不代表预订；临空城酒店仍待确认。
- 地图虚线仅表示游览顺序。实际道路、公交与铁路换乘通过 Google Maps 链接查看，需要网络。
- 费用保留原核验日期，属于参考和试算。未提供的机票、火车票和住宿金额未被编造。
- 个人备忘和勾选只保存在当前浏览器，不提供账号登录或跨设备自动同步。换设备前在“备忘与待办”导出JSON，在另一设备导入。也可导出包含路线链接的完整Markdown行程。
- 正式行程由维护者修改数据、构建后重新发布。当前不连接本地TREK数据库；本地TREK中的编辑不会自动出现在这个网站。
- 此仓库和页面为公开访问；不会发布登录密码、加密密钥、TREK数据库或私人协作笔记。noindex只提示搜索引擎，不构成访问控制。
- 云托管方案暂不实施，无需常开电脑或付费后端。

## 源代码与许可

本页面实际复用了TREK的原生组件，包括SharedHero、SharedTabBar、SharedPlanView、SharedMap、SharedDayCard、SharedBookingsView、主题及翻译机制。并非完整服务端应用。未修改其身份验证机制，也不模拟登录。

TREK固定源代码：

- 仓库：https://github.com/liketrek/TREK
- 固定提交：https://github.com/liketrek/TREK/tree/dc36c21c08f681fd2806764fad8e17b270f6f175
- 完整上游源代码归档：https://github.com/liketrek/TREK/archive/dc36c21c08f681fd2806764fad8e17b270f6f175.tar.gz
- 许可：AGPL-3.0，见本站根目录的LICENSE；数据及字体等署名见NOTICE.md。

静态入口、新增交互、构建配置及发布快照的完整源文件位于source/。新增适配代码同样按AGPL-3.0提供。构建使用固定提交中的依赖锁文件，不需要任何服务端账号、数据库或私密环境变量。

静态构建将原分享页的矢量底图模块替换为OpenStreetMap栅格底图，以减少WebGL依赖；TREK原生地图标记、日程选取、游览顺序虚线和卡片组件保持复用。源码在source/src/StaticBasemap.tsx，构建别名在source/vite.pages.config.js。

## 复现构建

要求Git、npm和受TREK支持的Node版本，例如Node 24.15+。从此仓库根目录运行：

```sh
node source/rebuild.mjs
```

脚本检出上述固定上游提交，将source/src作为独立静态入口放入client/src/pagesStatic，安装锁定依赖、构建shared、再构建静态前端。输出在rebuilt/，不启动后端。

GitHub Pages从main分支根目录发布，`.nojekyll`关闭Jekyll处理。生产构建的资源基路径固定为`/kansai-trip/`，根入口可直接刷新，无需SPA后端路由。
