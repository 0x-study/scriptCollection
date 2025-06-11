import axios from "axios";
import { ipKey } from "./config.js";

const baseUrl = "https://api.nstproxy.com";

const paramsChannels = {
  page: 1,
  pageSize: 20,
  type: "residential",
  regionType: "country",
  status: 1,
  token: ipKey,
};
const paramsCountry = {
  token: ipKey,
  type: "residential",
};
const paramsState = {
  token: ipKey,
  type: "residential",
  countryId: "",
};

const paramsCity = {
  token: ipKey,
  type: "residential",
  stateId: "",
};
function parseProxyList(proxyList: string[]) {
  return proxyList.map((proxy) => {
    const parts = proxy.split(":");

    if (parts.length < 4) {
      throw new Error(`Invalid proxy format: ${proxy}`);
    }

    const host = parts[0];
    const port = Number(parts[1]);
    const password = parts.pop()!; // 取出最后一个元素作为密码
    const username = parts.slice(2).join(":"); // 剩下的拼接成 username

    // 确保添加协议前缀
    const protocol = "http"; // 默认使用http

    if (password && username) {
      return `${protocol}://${username}:${password}@${host}:${port}`;
    }
    return `${protocol}://${host}:${port}`;
  });
}

// 示例数据

export const fetchIpList = async (count) => {
  try {
    // 1. 获取 IP 分组列表
    const {
      data: { data: channels },
    } = await axios.get(`${baseUrl}/api/v1/api/channels`, {
      params: paramsChannels,
    });
    const {
      data: { data: Country },
    } = await axios.get(`${baseUrl}/api/v1/api/region/country`, {
      params: paramsCountry,
    });

    // 2. 找到美国的国家信息
    let findItem1 = channels.find((list) => list.country === "US");
    let findItem2 = Country.find((list) => list.value === "US");
    if (!findItem1 || !findItem2) {
      console.error("找不到美国的 channel 或 country");
      return;
    }

    // 3. 获取州列表
    paramsState.countryId = findItem2.regionId;
    const {
      data: { data: State },
    } = await axios.get(`${baseUrl}/api/v1/api/region/state`, {
      params: paramsState,
    });

    // 4. 获取城市列表（选取第一个州）
    paramsCity.stateId = State[0].regionId;
    const {
      data: { data: City },
    } = await axios.get(`${baseUrl}/api/v1/api/region/city`, {
      params: paramsCity,
    });
    let paramsProxies = {
      token: ipKey,
      channelId: findItem1.channelId,
      country: findItem2.value,
      state: State[0].value, // 选取第一个州
      city: City[0].value,
      protocol: "http",
      sessionDuration: 30,
      sense: "nike",
      count: count,
    };
    const {
      data: { data: proxies },
    } = await axios.get(`${baseUrl}/api/v1/api/proxies`, {
      params: paramsProxies,
    });

    return parseProxyList(proxies.proxies);
  } catch (error) {
    console.error("获取 IP 失败", error);
  }
};
