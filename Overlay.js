function main(config) {
  const SETTINGS = { 
    maxRatio: 4.0, 
    cache: 86400, 
    icon: "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/" 
  };
  const LOYAL = "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/";
  
  // 1. Define Regions
  const REGIONS = [
    { name: "香港节点 (HK)", pat: /香港|港|HK|HongKong/i, icon: "Hong_Kong.png" },
    { name: "台湾节点 (TW)", pat: /台湾|台|TW|Taiwan/i, icon: "Taiwan.png" },
    { name: "狮城节点 (SG)", pat: /新加坡|狮城|SG|Singapore/i, icon: "Singapore.png" },
    { name: "日本节点 (JP)", pat: /日本|日|JP|Japan/i, icon: "Japan.png" },
    { name: "美国节点 (US)", pat: /美国|美|US|USA|UnitedStates/i, icon: "United_States.png" },
    { name: "韩国节点 (KR)", pat: /韩国|韩|KR|Korea/i, icon: "South_Korea.png" },
    { name: "英国节点 (UK)", pat: /英国|英|UK|UnitedKingdom/i, icon: "United_Kingdom.png" },
    { name: "德国节点 (DE)", pat: /德国|德|Germany/i, icon: "Germany.png" }
  ];

  // 2. Proxy Filtering & Bucket Allocation
  const bucket = {}, otherProxies = [];
  (config.proxies || []).forEach(p => {
    const ratio = p.name.match(/(\d+(?:\.\d+)?)\s*(?:x|X|×|倍)/i);
    if (/邀请|返利|订阅|流量|到期|重置|tg|发布|会员|配置|网址|密钥/i.test(p.name) || (ratio && parseFloat(ratio[1]) > SETTINGS.maxRatio)) return;
    
    const region = REGIONS.find(r => r.pat.test(p.name));
    if (region) {
      if (!bucket[region.name]) bucket[region.name] = { icon: region.icon, list: [] };
      bucket[region.name].list.push(p.name);
    } else {
      otherProxies.push(p.name);
    }
  });
  if (otherProxies.length) bucket["其他节点 (Others)"] = { icon: "Global.png", list: otherProxies };

  // 3. Define Rule Sets with Default Options
  // "PROXY" maps to "节点选择 (Node Selection)"
  const RULE_MAPPING = {
    "applications": { name: "应用列表 (Apps)", icon: "Applications.png", default: "DIRECT" },
    "private":      { name: "私有网络 (Private)", icon: "Private.png", default: "DIRECT" },
    "reject":       { name: "广告拦截 (Ad Block)", icon: "Block.png", default: "REJECT" },
    "apple":        { name: "苹果服务 (Apple)", icon: "Apple.png", default: "DIRECT" },
    "icloud":       { name: "苹果云端 (iCloud)", icon: "iCloud.png", default: "DIRECT" },
    "google":       { name: "谷歌服务 (Google)", icon: "Google.png", default: "节点选择 (Node Selection)" },
    "telegramcidr": { name: "电报信息 (Telegram)", icon: "Telegram.png", default: "节点选择 (Node Selection)" },
    "gfw":          { name: "防火墙名单 (GFW)", icon: "GFW.png", default: "节点选择 (Node Selection)" },
    "proxy":        { name: "代理域名 (Proxy)", icon: "Proxy.png", default: "节点选择 (Node Selection)" },
    "tld-not-cn":   { name: "海外域名 (Global TLD)", icon: "Global.png", default: "节点选择 (Node Selection)" },
    "direct":       { name: "直连域名 (Direct)", icon: "Direct.png", default: "DIRECT" },
    "lancidr":      { name: "局域网 (LAN)", icon: "Local.png", default: "DIRECT" },
    "cncidr":       { name: "国内核心 (China IP)", icon: "China.png", default: "DIRECT" }
  };

  const ruleKeys = Object.keys(RULE_MAPPING);

  // 4. Build Strategy Groups
  const regionGroups = Object.keys(bucket).map(name => ({
    name, type: "url-test", icon: SETTINGS.icon + bucket[name].icon, 
    proxies: bucket[name].list, interval: 300, tolerance: 100
  }));

  const regionNames = regionGroups.map(g => g.name);
  const selectorChoices = ["节点选择 (Node Selection)", "手动切换 (Manual Switch)", "DIRECT"];

  config["proxy-groups"] = [
    { name: "节点选择 (Node Selection)", type: "select", icon: SETTINGS.icon + "Proxy.png", proxies: [...regionNames, "手动切换 (Manual Switch)", "DIRECT"] },
    { name: "手动切换 (Manual Switch)", type: "select", icon: SETTINGS.icon + "Available.png", "include-all": true },
    
    // Dynamically create groups with your specified defaults
    ...ruleKeys.map(key => {
      const config = RULE_MAPPING[key];
      let proxies = [...selectorChoices];
      if (key === "reject") proxies.unshift("REJECT");
      
      // Move the default choice to the front of the array
      proxies = [config.default, ...proxies.filter(p => p !== config.default)];

      return {
        name: config.name,
        type: "select",
        icon: SETTINGS.icon + config.icon,
        proxies: proxies
      };
    }),

    ...regionGroups,
    { name: "漏网之鱼 (Final)", type: "select", icon: SETTINGS.icon + "Final.png", proxies: ["节点选择 (Node Selection)", "手动切换 (Manual Switch)", "DIRECT"] }
  ];

  // 5. Rule Providers
  config["rule-providers"] = Object.fromEntries(ruleKeys.map(key => {
    let behavior = "domain";
    if (key.includes("cidr")) behavior = "ipcidr";
    else if (key === "applications") behavior = "classical";

    return [key, {
      type: "http", behavior, url: LOYAL + key + ".txt", path: `./ruleset/${key}.yaml`, interval: SETTINGS.cache
    }];
  }));

  // 6. Routing Rules (Ordered based on your reference)
  config["rules"] = [
    "DOMAIN,clash.razord.top,DIRECT",
    "DOMAIN,yacd.haishan.me,DIRECT",
    "RULE-SET,applications,应用列表 (Apps)",
    "RULE-SET,private,私有网络 (Private)",
    "RULE-SET,reject,广告拦截 (Ad Block)",
    "RULE-SET,icloud,苹果云端 (iCloud)",
    "RULE-SET,apple,苹果服务 (Apple)",
    "RULE-SET,google,谷歌服务 (Google)",
    "RULE-SET,proxy,代理域名 (Proxy)",
    "RULE-SET,direct,直连域名 (Direct)",
    "RULE-SET,lancidr,局域网 (LAN)",
    "RULE-SET,cncidr,国内核心 (China IP)",
    "RULE-SET,telegramcidr,电报信息 (Telegram)",
    "RULE-SET,gfw,防火墙名单 (GFW)",
    "RULE-SET,tld-not-cn,海外域名 (Global TLD)",
    "GEOIP,LAN,DIRECT",
    "GEOIP,CN,DIRECT",
    "MATCH,漏网之鱼 (Final)"
  ];

  return config;
}