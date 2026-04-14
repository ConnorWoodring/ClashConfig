function main(config) {
  const SETTINGS = { enableAds: false, enableGoogle: true, enableApple: true, enableTelegram: true, enableGlobal: true, enableChina: true, maxRatio: 4.0, checkInterval: 86400 };
  const ICON_BASE = "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/";
  const ADBLOCK_URL = "https://gcore.jsdelivr.net/gh/TG-Twilight/AWAvenue-Ads-Rule@main/Filters/AWAvenue-Ads-Rule-Clash.yaml";
  // "https://gcore.jsdelivr.net/gh/217heidai/adblockfilters@main/rules/adblockmihomo.yaml";
  const LOYAL_BASE = "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/";

  const ratioRegex = /(?:\[(\d+(?:\.\d+)?)\s*(?:x|X|×)\]|(\d+(?:\.\d+)?)\s*(?:x|X|×|倍)|(?:x|X|×|倍)\s*(\d+(?:\.\d+)?))/i;
  const blackListRegex = /邀请|返利|官方|网址|订阅|购买|续费|剩余|到期|过期|流量|备用|邮箱|客服|联系|工单|倒卖|防止|梯子|tg|发布|重置/i;

  const originalProxies = config.proxies || [];
  const filteredProxies = originalProxies.filter(p => {
    if (!p || !p.name || blackListRegex.test(p.name)) return false;
    if (p.name.indexOf("群") !== -1 && p.name.indexOf("集群") === -1) return false;
    const match = p.name.match(ratioRegex);
    return (match ? parseFloat(match[1] || match[2] || match[3]) : 1.0) <= SETTINGS.maxRatio;
  });

  const proxiesWithNorm = filteredProxies.map(p => ({
    ...p, __normName: p.name.trim().replace(/\s+/g, '').replace(/[【】[\]（）()]/g, '')
      .replace(/🇺🇸/g, 'US').replace(/🇯🇵/g, 'JP').replace(/🇸🇬/g, 'SG').replace(/🇭🇰/g, 'HK').replace(/🇹🇼/g, 'TW').replace(/🇰🇷/g, 'KR')
      .replace(/🇬🇧/g, 'UK').replace(/🇩🇪/g, 'DE').replace(/🇫🇷/g, 'FR').replace(/🇦🇺/g, 'AU').replace(/🇨🇦/g, 'CA')
  }));

  const REGIONS = [
    { name: "香港节点", pattern: "香港|港|HK|HongKong", icon: "Hong_Kong.png" },
    { name: "台湾节点", pattern: "台湾|台|TW|Taiwan", icon: "Taiwan.png" },
    { name: "狮城节点", pattern: "新加坡|狮城|SG|Singapore", icon: "Singapore.png" },
    { name: "日本节点", pattern: "日本|日|JP|Japan", icon: "Japan.png" },
    { name: "美国节点", pattern: "美国|美|US|USA|UnitedStates", icon: "United_States.png" },
    { name: "韩国节点", pattern: "韩国|韩|KR|Korea", icon: "South_Korea.png" },
    { name: "英国节点", pattern: "英国|英|UK|UnitedKingdom", icon: "United_Kingdom.png" },
    { name: "德国节点", pattern: "德国|德|DE|Germany", icon: "Germany.png" },
    { name: "法国节点", pattern: "法国|法|FR|France", icon: "France.png" },
    { name: "澳洲节点", pattern: "澳洲|AU|Australia", icon: "Australia.png" },
    { name: "加拿大节点", pattern: "加拿大|加|CA|Canada", icon: "Canada.png" }
  ].map(r => ({ ...r, proxies: proxiesWithNorm.filter(p => new RegExp(r.pattern, 'i').test(p.__normName)).map(p => p.name) })).filter(r => r.proxies.length > 0);

  // Add Uncategorized Region
  const categorizedNames = new Set(REGIONS.flatMap(r => r.proxies));
  const otherProxies = proxiesWithNorm.filter(p => !categorizedNames.has(p.name)).map(p => p.name);
  if (otherProxies.length) REGIONS.push({ name: "其他节点", icon: "Infrastructure.png", proxies: otherProxies });

  const regionNames = REGIONS.map(r => r.name);
  const proxyGroups = [
    { name: "节点选择", type: "select", icon: ICON_BASE + "Proxy.png", proxies: [...regionNames, "手动切换", "DIRECT"] },
    ...(SETTINGS.enableAds ? [{ name: "广告拦截", type: "select", icon: ICON_BASE + "Block.png", proxies: ["REJECT", "DIRECT", "节点选择"] }] : []),
    ...(SETTINGS.enableGoogle ? [{ name: "谷歌服务", type: "select", icon: ICON_BASE + "Google.png", proxies: ["节点选择", "DIRECT"] }] : []),
    ...(SETTINGS.enableApple ? [{ name: "苹果服务", type: "select", icon: ICON_BASE + "Apple.png", proxies: ["DIRECT", "节点选择"] }] : []),
    ...(SETTINGS.enableTelegram ? [{ name: "电报信息", type: "select", icon: ICON_BASE + "Telegram.png", proxies: ["节点选择", "DIRECT"] }] : []),
    ...(SETTINGS.enableGlobal ? [{ name: "全球代理", type: "select", icon: ICON_BASE + "Global.png", proxies: ["节点选择", "DIRECT", "手动切换"] }] : []),
    ...(SETTINGS.enableChina ? [{ name: "国内流量", type: "select", icon: ICON_BASE + "China.png", proxies: ["DIRECT", "节点选择"] }] : []),
    { name: "漏网之鱼", type: "select", icon: ICON_BASE + "Final.png", proxies: ["节点选择", "DIRECT", "手动切换"] },
    ...REGIONS.map(r => ({ name: r.name, type: "url-test", icon: ICON_BASE + (r.icon || "Proxy.png"), proxies: r.proxies, interval: 300, tolerance: 100 })),
    { name: "手动切换", type: "select", icon: ICON_BASE + "Available.png", "include-all": true },
    { name: "GLOBAL", type: "select", icon: ICON_BASE + "Global.png", proxies: ["节点选择", ...regionNames, "DIRECT"] }
  ];

  const createP = (name, behavior, url, extra = {}) => ({ [name]: { type: "http", behavior, url, path: `./ruleset/${name}.yaml`, interval: SETTINGS.checkInterval, ...extra } });
  config["rule-providers"] = {
    ...createP("applications", "classical", LOYAL_BASE + "applications.txt"),
    ...createP("private", "domain", LOYAL_BASE + "private.txt"),
    ...createP("lancidr", "ipcidr", LOYAL_BASE + "lancidr.txt"),
    ...(SETTINGS.enableAds ? { ...createP("AntiAd", "domain", ADBLOCK_URL, { format: "yaml" }), ...createP("reject", "domain", LOYAL_BASE + "reject.txt") } : {}),
    ...(SETTINGS.enableApple ? { ...createP("icloud", "domain", LOYAL_BASE + "icloud.txt"), ...createP("apple", "domain", LOYAL_BASE + "apple.txt") } : {}),
    ...(SETTINGS.enableGoogle ? createP("google", "domain", LOYAL_BASE + "google.txt") : {}),
    ...(SETTINGS.enableTelegram ? createP("telegramcidr", "ipcidr", LOYAL_BASE + "telegramcidr.txt") : {}),
    ...(SETTINGS.enableGlobal ? { ...createP("proxy", "domain", LOYAL_BASE + "proxy.txt"), ...createP("gfw", "domain", LOYAL_BASE + "gfw.txt"), ...createP("tld-not-cn", "domain", LOYAL_BASE + "tld-not-cn.txt") } : {}),
    ...(SETTINGS.enableChina ? { ...createP("direct", "domain", LOYAL_BASE + "direct.txt"), ...createP("cncidr", "ipcidr", LOYAL_BASE + "cncidr.txt") } : {})
  };

  config["rules"] = [
    "RULE-SET,applications,DIRECT", "RULE-SET,private,DIRECT", "RULE-SET,lancidr,DIRECT",
    ...(SETTINGS.enableAds ? ["RULE-SET,AntiAd,广告拦截", "RULE-SET,reject,广告拦截"] : []),
    ...(SETTINGS.enableTelegram ? ["RULE-SET,telegramcidr,电报信息"] : []),
    ...(SETTINGS.enableGoogle ? ["RULE-SET,google,谷歌服务"] : []),
    ...(SETTINGS.enableApple ? ["RULE-SET,icloud,苹果服务", "RULE-SET,apple,苹果服务"] : []),
    ...(SETTINGS.enableGlobal ? ["RULE-SET,gfw,全球代理", "RULE-SET,proxy,全球代理", "RULE-SET,tld-not-cn,全球代理"] : []),
    ...(SETTINGS.enableChina ? ["RULE-SET,direct,国内流量", "RULE-SET,cncidr,国内流量", "GEOIP,CN,国内流量"] : []),
    "MATCH,漏网之鱼"
  ];

  config["proxy-groups"] = proxyGroups;
  config.proxies = originalProxies;
  return config;
}
