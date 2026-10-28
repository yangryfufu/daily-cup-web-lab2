# 今日新杯 · PC端网页布局

Web前端实验2课程作品，以原生HTML、CSS、JavaScript实现六个相互链接的页面。

- 首页 `index.html`：上新日历、日期筛选、想喝清单。
- 品牌 `brands.html`：搜索、关注、品牌上新筛选。
- 手账 `journal.html`：网格/时间轴、新增本地照片与记录。
- 详情 `detail.html`：上新与手账详情、编辑、删除。
- 提醒 `reminders.html`：本地清单、提前时间、导出ICS。
- 我的 `profile.html`：统计、近期记录、JSON备份、重置本站数据。

## 运行

使用HBuilder“打开目录”打开本文件夹，打开index.html并在浏览器中运行。也可以使用任意静态HTTP服务器。无需npm安装或编译。

## 数据与功能范围

品牌、饮品、日期均为虚构教学示例。SVG插画为本项目原创矢量图，不引用品牌官方素材。记录和图片仅保存在当前浏览器localStorage；未接入云同步、AI识别、微信订阅或后台通知。ICS文件需要用户自行导入日历。

## 布局技术

最大1200px主体居中，外部css/main.css统一样式。使用HTML5语义标签、盒模型、Flex、Grid、相对/绝对定位与媒体查询，结合原生JavaScript处理页面交互。
