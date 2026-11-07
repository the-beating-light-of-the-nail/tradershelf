# 第三方开源声明（Third-Party Notices）

## app/ — stock-market-cloud

`app/` 目录整体来自开源项目 **[FisherWenray/stock-market-cloud](https://github.com/FisherWenray/stock-market-cloud)**（A 股&美股&港股大盘云图），按其 **MIT License** 原样 vendor，并做了以下本地化改造：

- `vite.config.ts` 增加 `base: '/app'`（部署于 tradershelf.com/app 子目录）
- `index.html` 替换标题/描述/favicon，移除原站 canonical、OG 指向与第三方统计脚本，改为 `noindex`
- `src/components/HeaderBar.tsx`、`src/locales.ts` 品牌字样替换为 Trader Shelf
- 删除 `CNAME`、`public/robots.txt`、`public/sitemap.xml`（指向原域名）

```
MIT License

Copyright (c) 2025 FisherWenray

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

上游数据源（由其代码引入）：腾讯行情接口 `qt.gtimg.cn`、金融界 `gateway.jrj.com`、东方财富延迟接口 `push2delay.eastmoney.com`、Nasdaq Trader 目录文件。

## 其他参考

- `wenyuanw/a-share-heatmap`（MIT）：A股页面数据接口参数参考，未直接包含其代码。
