# 今日新杯 移动端

WEB前端实验3课程作品。原生 HTML / CSS / JavaScript，无构建依赖。

## 使用

使用 HBuilder、VS Code 静态服务器或 `python -m http.server 8768` 打开 index.html。
六个页面共用样式和数据；320–640 CSS px 的手机布局，宽屏时在 640px 内居中。
640×1030 是课程建议设计参考；实际页面使用 viewport、弹性宽度与自然高度适配手机。

页面：上新首页、品牌关注、电子手账、内容详情、想喝清单、个人页。
使用底部固定导航、CSS Grid/Flex、媒体查询、safe-area-inset、原生 dialog。
手账、关注、提醒仅存于当前浏览器；移动端使用独立存储键，不覆盖PC版。
品牌、饮品、日期为虚构教学示例；没有真实上新接口、AI识别、云同步或微信推送。
网页与插画由 AI 辅助制作，应由成员检查、理解并按实际贡献填写实验说明。

线上入口：https://yangryfufu.github.io/daily-cup-web-lab2/mobile/
不要把 localhost / 127.0.0.1 地址用作提交或二维码内容。
