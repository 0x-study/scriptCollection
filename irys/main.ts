import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { fetchIpList } from "../ip.ts";
import fs from "fs";
import readline from "readline";
import Papa from "papaparse";
import { noCaptchaUserToken, pcKey } from "../config.js";

const MAX_CONCURRENT_CLAIMS = 2; // 并发数
const MAX_RETRY = 2; // 最大重试次数
const CSV_FILE_PATH = "data/add.csv"; // CSV 文件路径

const websiteURL = "https://irys.xyz/faucet/";
// const websiteKey = "0x4AAAAAAA8hNPuIp1dAT_d9";
const websiteKey = "0x4AAAAAAA6vnrvBCtS4FAl-";

const cloudFlareCrackerUrl =
  "http://api.nocaptcha.io/api/wanda/cloudflare/universal";

const fetchToken = async (attempt = 1) => {
  const cloudFlareData = {
    internal_host: true,
    href: websiteURL,
    sitekey: websiteKey,
    // proxy:
    //   "682C1198F51B1DC3-residential-country_US-r_30m-s_xyM7YJPhMK:mon2556@gate.nstproxy.io:24125",
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
  console.log(cloudFlareData);
  if (!cloudFlareResponse.data.data || !cloudFlareResponse.data.data.token) {
    console.error(
      "\n[CloudFlare] 验证响应:",
      JSON.stringify(cloudFlareResponse.data, null, 2)
    );
    throw new Error("CloudFlare验证失败：未获取到有效token");
  }
  return cloudFlareResponse.data.data.token;
};

const claim = async (proxy, address) => {
  // let requestVerification = await fetchRequestVerification()
  const agent = new HttpsProxyAgent(proxy);
  const visitorId = [...Array(32)]
    .map(() =>
      "abcdefghijklmnopqrstuvwxyz0123456789".charAt(
        Math.floor(Math.random() * 36)
      )
    )
    .join("");

  const recaptchaToken = await fetchToken();
  console.log(`地址: ${address}, Token: ${recaptchaToken}`);

  const res = await axios.post(
    "https://irys.xyz/api/faucet",
    {
      walletAddress: address,
      captchaToken: recaptchaToken,
    },
    {
      headers: {
        "Content-Type": "application/json",
        "cf-turnstile-response": recaptchaToken,
      },
      httpsAgent: agent,
    }
  );

  console.log(`✅ 领取成功: ${address}`, res.data);
};

/**
 * 失败重试机制（最多 3 次）
 */
const claimWithRetry = async (proxy, address, attempt = 1) => {
  try {
    await claim(proxy, address);
  } catch (error) {
    const errMsg = error.response?.data || error.message;
    console.warn(`❌ 领取失败 (${address}) [第 ${attempt} 次]:`, errMsg);

    if (attempt < MAX_RETRY) {
      const delay = [200, 500, 1000][attempt - 1]; // 递增的等待时间
      console.log(`⏳ ${delay}ms 后重试 ${address}...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return claimWithRetry(proxy, address, attempt + 1);
    } else {
      console.error(`🚨 领取失败 (${address}) [已达最大重试次数]`);
    }
  }
};

const fetchIpListWithRetry = async (count, retries = 2, delay = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const ipList = await fetchIpList(count);
      if (ipList && ipList.length === count) {
        return ipList;
      }
      console.warn(`⚠️ IP 获取不完整，尝试第 ${attempt} 次`);
    } catch (error) {
      console.error(`❌ 获取代理 IP 失败 (第 ${attempt} 次):`, error.message);
    }
    if (attempt < retries) {
      console.log(`⏳ ${delay}ms 后重试获取 IP...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("🚨 获取代理 IP 失败，已达最大重试次数");
};
const processBatch = async (batch) => {
  if (batch.length === 0) return;

  let ipList;
  try {
    ipList = await fetchIpListWithRetry(batch.length);
  } catch (error) {
    console.error(error.message);
    return;
  }

  console.log(`✅ 获取代理 IP (${batch.length}):`, ipList);

  const promises = [];
  for (let i = 0; i < batch.length; i++) {
    if (ipList[i]) {
      promises.push(claimWithRetry(ipList[i], batch[i]));
      if (promises.length >= MAX_CONCURRENT_CLAIMS) {
        await Promise.all(promises);
        promises.length = 0;
      }
    }
  }
  await Promise.all(promises);
  console.log(`🚀 当前批次完成: ${batch.length} 个地址`);
};

const batchClaim = async () => {
  const fileStream = fs.createReadStream(CSV_FILE_PATH, "utf8");
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
  let batch = [];
  let sum = 0;
  console.log(rl);
  for await (const line of rl) {
    // console.log(line)

    const parsed = Papa.parse(line).data;
    // console.log(parsed)

    sum++;
    if (sum <= 11551) {
      continue;
    }
    if (parsed && parsed.length > 0) {
      const address = parsed[0][0];
      console.log(address);
      if (address) {
        batch.push(address);
      }
    }

    // 每次取 5-10 个地址
    if (batch.length >= Math.floor(Math.random() * 8) + 10) {
      await processBatch(batch);
      batch = [];
    }
  }

  // 处理剩余的地址
  if (batch.length > 0) {
    await processBatch(batch);
  }

  console.log("🎉 所有 claim 任务完成");
};

batchClaim();
