# Irys Faucet 批量自动领取脚本

## 🧹 功能简介

本脚本用于批量领取 [Irys](https://irys.xyz/faucet) 空投水龙头，具备以下功能：

- 使用代理池自动获取代理 IP
- 利用打码平台绕过 Cloudflare Turnstile 验证
- 支持 CSV 地址列表输入，批量处理
- 自带失败重试与并发控制

---

## 🔧 使用依赖

```ts
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { fetchIpList } from "../ip.ts";
import fs from "fs";
import readline from "readline";
import Papa from "papaparse";
import { noCaptchaUserToken, pcKey } from "../config.js";
```

---

## 🛡️ 打码服务：NoCaptcha

> ✅ 注册地址：[https://www.nocaptcha.io/register?c=JjCQjN](https://www.nocaptcha.io/register?c=JjCQjN)

- 平台用于绕过 Turnstile / Cloudflare / Recaptcha 等验证码保护
- 脚本中通过调用其 API 自动获取验证码 token：

```ts
const cloudFlareCrackerUrl =
  "http://api.nocaptcha.io/api/wanda/cloudflare/universal";

const cloudFlareData = {
  href: websiteURL,
  sitekey: websiteKey,
  debug: true,
  show_ad: false,
  timeout: 90,
};

const cloudFlareResponse = await axios.post(
  cloudFlareCrackerUrl,
  cloudFlareData,
  {
    headers: {
      "User-Token": noCaptchaUserToken,
      "Content-Type": "application/json",
    },
  }
);
```

---

## 🌍 代理服务：NST Proxy

> ✅ 注册地址：[https://app.nstproxy.com/register?i=LF5zjN](https://app.nstproxy.com/register?i=LF5zjN)

- 提供住宅级代理池
- 支持国家和地区选择
- 脚本中通过封装的 `fetchIpList()` 方法获取并自动挂载代理：

```ts
const agent = new HttpsProxyAgent(proxy);
const res = await axios.post("https://irys.xyz/api/faucet", {...}, { httpsAgent: agent });
```

---

## 📦 输入文件说明

- `data/add.csv` 是输入地址的 CSV 文件（只读第一列地址）
- 支持超过万条数据的批量处理

---

## 🔀 自动重试 & 并发控制

- 每个地址最多重试 2 次
- 默认最大并发处理数量为 `2`，可通过修改变量 `MAX_CONCURRENT_CLAIMS` 调整

---

## 🚀 启动方式

确保你已经安装依赖：

```bash
npm install
```

然后运行脚本：

```bash
npm run irys
```

---

## 🧠 提示

- 建议设置合理的代理频率与并发，避免被目标站点封锁 IP
- 推荐使用稳定、低延迟的代理池服务，如 NST Proxy
- 打码服务需要绑定余额（如使用 NoCaptcha）

---

## 📞 联系

如需脚本定制或问题反馈，可联系维护者。
